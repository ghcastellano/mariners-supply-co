"use server";

import { createClient } from "@/lib/supabase/server";
import { DEPOSIT_PCT, orderWindowOpen } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

export type PlaceOrderInput = {
  shipId: string;
  payment: PaymentMethod;
  contactName: string;
  contactWhatsapp: string;
  note: string;
  items: { id: string; qty: number }[];
};

export type PlaceOrderResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

const round2 = (v: number) => Math.round(v * 100) / 100;

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to sign in to place an order." };

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

  const payment: PaymentMethod = (["card", "wallet", "pix"] as const).includes(input.payment)
    ? input.payment
    : "card";

  // Código curto tipo MS-4821, com retry em colisão
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = "MS-" + Math.floor(1000 + Math.random() * 9000);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        code,
        user_id: user.id,
        ship_id: ship.id,
        status: "awaiting_deposit",
        payment_method: payment,
        subtotal_usd: subtotal,
        deposit_usd: deposit,
        balance_usd: balance,
        contact_name: input.contactName?.slice(0, 120) || null,
        contact_whatsapp: input.contactWhatsapp?.slice(0, 40) || null,
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

    return { ok: true, code: order.code };
  }

  return { ok: false, error: "Couldn't generate an order code — try again." };
}
