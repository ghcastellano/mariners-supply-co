"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { SITE_URL, USD_BRL_RATE } from "@/lib/env";
import { DEPOSIT_PCT, orderWindowOpen, usd } from "@/lib/format";

export type PlaceOrderInput = {
  shipId: string;
  applyCredit: boolean;
  contactName: string;
  contactWhatsapp: string;
  note: string;
  items: { id: string; qty: number }[];
};

export type PlaceOrderResult =
  | { ok: true; code: string; payUrl?: string; creditApplied: number; paid: boolean }
  | { ok: false; error: string };

const round2 = (v: number) => Math.round(v * 100) / 100;

async function siteOrigin(): Promise<string> {
  const h = await headers();
  return h.get("origin") ?? SITE_URL;
}

type SessionInput = {
  orderId: string;
  code: string;
  shipName: string;
  amountUsd: number;
  balanceUsd: number;
  email?: string;
};

// Sessão do Stripe Checkout em BRL: o banco do tripulante faz o câmbio,
// evitando a taxa de conversão de moeda do Stripe.
async function createDepositSession(input: SessionInput, origin: string) {
  const stripe = getStripe();
  const brlCents = Math.max(100, Math.round(input.amountUsd * USD_BRL_RATE * 100));
  return stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: input.orderId,
    customer_email: input.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: brlCents,
          product_data: {
            name: `Deposit — Order ${input.code}`,
            description: `${input.shipName} · gangway delivery in Santos · balance ${usd(
              input.balanceUsd
            )} on delivery`,
          },
        },
      },
    ],
    metadata: {
      order_id: input.orderId,
      order_code: input.code,
      amount_usd: String(input.amountUsd),
      fx_rate: String(USD_BRL_RATE),
    },
    success_url: `${origin}/orders/${input.code}?paid=1`,
    cancel_url: `${origin}/orders/${input.code}?placed=1`,
  });
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to sign in to place an order." };

  // WhatsApp é obrigatório: é o único canal que alcança um tripulante
  // que já embarcou. Validado no servidor, não só na tela.
  const wa = (input.contactWhatsapp ?? "").replace(/[^\d+]/g, "");
  if (!/^\+\d{8,15}$/.test(wa)) {
    return { ok: false, error: "A valid WhatsApp number is required." };
  }

  const items = (input.items ?? []).filter(
    (i) => typeof i.id === "string" && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 99
  );
  if (items.length === 0) return { ok: false, error: "Your kit is empty." };

  const { data: ship } = await supabase
    .from("ships")
    .select("id, name, eta, cutoff_hours, active")
    .eq("id", input.shipId)
    .single();
  if (!ship || !ship.active) return { ok: false, error: "Vessel not found — pick your ship again." };
  if (!orderWindowOpen(ship.eta, ship.cutoff_hours))
    return { ok: false, error: `Orders for ${ship.name} are closed.` };

  const ids = items.map((i) => i.id);
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, emoji, price_usd, active")
    .in("id", ids);
  if (prodErr) return { ok: false, error: "Couldn't validate the catalog — try again." };

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  for (const i of items) {
    const p = byId.get(i.id);
    if (!p || !p.active)
      return { ok: false, error: "An item in your kit is no longer available — review your cart." };
  }

  // Preços SEMPRE do banco — nunca do cliente.
  const subtotal = round2(
    items.reduce((s, i) => s + Number(byId.get(i.id)!.price_usd) * i.qty, 0)
  );
  const deposit = round2(subtotal * DEPOSIT_PCT);
  const balance = round2(subtotal - deposit);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = "MS-" + Math.floor(1000 + Math.random() * 9000);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        code,
        user_id: user.id,
        ship_id: ship.id,
        status: "awaiting_deposit",
        subtotal_usd: subtotal,
        deposit_usd: deposit,
        balance_usd: balance,
        contact_name: input.contactName?.slice(0, 120) || null,
        contact_whatsapp: wa,
        note: input.note?.slice(0, 500) || null,
      })
      .select("id, code")
      .single();

    if (error) {
      if (error.code === "23505") continue; // código repetido — tenta outro
      return { ok: false, error: "Couldn't place the order — try again." };
    }

    const rows = items.map((i) => {
      const p = byId.get(i.id)!;
      return {
        order_id: order.id,
        product_id: p.id,
        name: p.name,
        emoji: p.emoji,
        unit_price_usd: Number(p.price_usd),
        qty: i.qty,
      };
    });
    const { error: itemsErr } = await supabase.from("order_items").insert(rows);
    if (itemsErr) {
      await supabase.from("orders").delete().eq("id", order.id);
      return { ok: false, error: "Couldn't save your items — try again." };
    }

    // Abatimento do crédito Captain (função atômica no banco)
    let applied = 0;
    if (input.applyCredit) {
      const { data: appliedData } = await supabase.rpc("apply_order_credit", {
        p_order: order.id,
      });
      applied = Number(appliedData ?? 0);
    }
    const dueNow = round2(deposit - applied);

    if (dueNow <= 0.009) {
      // crédito cobriu tudo — pedido já está deposit_paid
      return { ok: true, code: order.code, creditApplied: applied, paid: true };
    }

    if (stripeConfigured) {
      try {
        const session = await createDepositSession(
          {
            orderId: order.id,
            code: order.code,
            shipName: ship.name,
            amountUsd: dueNow,
            balanceUsd: balance,
            email: user.email ?? undefined,
          },
          await siteOrigin()
        );
        if (session.url) {
          return {
            ok: true,
            code: order.code,
            payUrl: session.url,
            creditApplied: applied,
            paid: false,
          };
        }
      } catch {
        // Stripe indisponível não pode matar o pedido — cai no fluxo manual
      }
    }

    return { ok: true, code: order.code, creditApplied: applied, paid: false };
  }

  return { ok: false, error: "Couldn't generate an order code — try again." };
}

// Retomada de pagamento (ex.: fechou o Stripe no meio) a partir da página do pedido
export async function payOrderDeposit(code: string): Promise<{ url?: string; error?: string }> {
  if (!stripeConfigured) return { error: "Online payment isn't enabled yet." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const { data: order } = await supabase
    .from("orders")
    .select("id, code, status, deposit_usd, credit_applied_usd, balance_usd, ships(name)")
    .eq("code", code.toUpperCase())
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) return { error: "Order not found." };
  if (order.status !== "awaiting_deposit") return { error: "This deposit is already settled." };

  const dueNow = round2(Number(order.deposit_usd) - Number(order.credit_applied_usd));
  if (dueNow <= 0.009) return { error: "This deposit is already covered by credit." };

  const shipName =
    (order.ships as unknown as { name: string } | null)?.name ?? "your vessel";

  try {
    const session = await createDepositSession(
      {
        orderId: order.id,
        code: order.code,
        shipName,
        amountUsd: dueNow,
        balanceUsd: Number(order.balance_usd),
        email: user.email ?? undefined,
      },
      await siteOrigin()
    );
    if (session.url) return { url: session.url };
    return { error: "Couldn't start the payment — try again." };
  } catch {
    return { error: "Couldn't start the payment — try again." };
  }
}
