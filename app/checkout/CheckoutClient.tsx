"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import { useCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";
import { brl, DEPOSIT_PCT, hoursUntil, usd } from "@/lib/format";
import type { Product } from "@/lib/types";
import { placeOrder } from "./actions";

export default function CheckoutClient({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const router = useRouter();
  const { ship, items, count, ready, clear } = useCart();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [useCredit, setUseCredit] = useState(true);
  const [contactName, setContactName] = useState(defaultName);
  const [whatsapp, setWhatsapp] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [placed, setPlaced] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("products")
      .select("id, name, description, emoji, category, price_usd, active, sort_order")
      .then(({ data }) => setProducts((data ?? []) as Product[]));
    supabase
      .rpc("my_credit_balance")
      .then(({ data }) => setCreditBalance(Math.max(0, Number(data ?? 0))));
  }, []);

  useEffect(() => {
    // "placed" evita voltar pro carrinho no instante em que ele é esvaziado pós-pedido
    if (ready && !placed && (count === 0 || !ship)) router.replace("/cart");
  }, [ready, placed, count, ship, router]);

  const subtotal = useMemo(() => {
    if (!products) return 0;
    return Object.entries(items).reduce((s, [id, q]) => {
      const p = products.find((x) => x.id === id);
      return p ? s + Number(p.price_usd) * q : s;
    }, 0);
  }, [products, items]);

  const deposit = subtotal * DEPOSIT_PCT;
  const creditApplied = useCredit ? Math.min(creditBalance, deposit) : 0;
  const payNow = Math.max(0, deposit - creditApplied);
  const coveredByCredit = creditApplied > 0 && payNow <= 0.009;

  function submit() {
    if (!ship) return;
    setErr(null);
    startTransition(async () => {
      const res = await placeOrder({
        shipId: ship.id,
        applyCredit: useCredit && creditBalance > 0,
        contactName,
        contactWhatsapp: whatsapp,
        note,
        items: Object.entries(items).map(([id, qty]) => ({ id, qty })),
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setPlaced(true);
      clear();
      if (res.payUrl) {
        // página segura do Stripe (cartão · Apple Pay · Google Pay · PIX)
        window.location.assign(res.payUrl);
        return;
      }
      router.push(`/orders/${res.code}?placed=1${res.paid ? "&paid=1" : ""}`);
    });
  }

  return (
    <>
      <TopBar title="Deposit — secure your window" backHref="/cart" />
      <main className="pb-dock">
        {!ready || products === null ? (
          <div className="spin" aria-label="Loading" />
        ) : (
          <>
            <div className="summary">
              <div className="r">
                <span>
                  {count} items · {ship?.name ?? "—"}
                </span>
                <b>{usd(subtotal)}</b>
              </div>
              <div className="r">
                <span>Delivery window</span>
                <b>
                  {ship ? `BERTH ${ship.berth ?? "—"} · ETA ${hoursUntil(ship.eta)}H` : "—"}
                </b>
              </div>
              <div className="r">
                <span>Deposit (30%)</span>
                <b>{usd(deposit)}</b>
              </div>
              {creditApplied > 0 && (
                <div className="r">
                  <span>🧢 Captain credit</span>
                  <b style={{ color: "var(--teal)" }}>−{usd(creditApplied)}</b>
                </div>
              )}
              <div className="r total">
                <span>Pay now</span>
                <b>{usd(payNow)}</b>
              </div>
              <div className="r">
                <span>Balance at the gangway</span>
                <b>{usd(subtotal - deposit)}</b>
              </div>
              <p className="hint">
                {coveredByCredit
                  ? "Your Captain credit covers the whole deposit — nothing to pay now."
                  : `≈ ${brl(payNow)} no cartão agora. Se o navio desviar de Santos, o depósito vira crédito integral para a próxima escala — sem burocracia.`}
              </p>
            </div>

            {creditBalance > 0 && (
              <div className="stack">
                <label className="payopt">
                  <input
                    type="checkbox"
                    checked={useCredit}
                    onChange={(e) => setUseCredit(e.target.checked)}
                  />
                  <span>
                    <b>Use my Captain credit ({usd(creditBalance)})</b>
                    <span className="sub">Earned from your crew&apos;s orders — never expires</span>
                  </span>
                </label>
              </div>
            )}

            <p className="subhead">Delivery contact</p>
            <div className="stack">
              <div className="field">
                <label htmlFor="cname">Name at the gangway</label>
                <input
                  id="cname"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Who receives the kit"
                />
              </div>
              <div className="field">
                <label htmlFor="wa">WhatsApp (optional)</label>
                <input
                  id="wa"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+55 13 9…"
                />
              </div>
              <div className="field">
                <label htmlFor="note">Note (optional)</label>
                <input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything we should know"
                />
              </div>
              {err && <p className="alert">{err}</p>}
              <p className="finehint">
                Signed in as <span className="mono">{email}</span>.{" "}
                {coveredByCredit
                  ? "Confirming places your order instantly."
                  : "Next: our secure payment page — card, Apple Pay, Google Pay or PIX. The balance is paid at the gangway on delivery."}
              </p>
            </div>
          </>
        )}
      </main>
      <div className="cta-dock">
        <button className="cta" onClick={submit} disabled={pending || !ready || count === 0}>
          <span>
            {pending
              ? "Placing order…"
              : coveredByCredit
                ? "Confirm order"
                : "Confirm & pay deposit"}
          </span>
          <span className="mono">{usd(payNow)}</span>
        </button>
      </div>
    </>
  );
}
