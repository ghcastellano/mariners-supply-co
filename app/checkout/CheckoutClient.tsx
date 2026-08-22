"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import { useCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";
import { brl, DEPOSIT_PCT, hoursUntil, usd } from "@/lib/format";
import { PAYMENT_LABEL, type PaymentMethod, type Product } from "@/lib/types";
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
  const [payment, setPayment] = useState<PaymentMethod>("card");
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

  function submit() {
    if (!ship) return;
    setErr(null);
    startTransition(async () => {
      const res = await placeOrder({
        shipId: ship.id,
        payment,
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
      router.push(`/orders/${res.code}?placed=1`);
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
                  {ship
                    ? `BERTH ${ship.berth ?? "—"} · ETA ${hoursUntil(ship.eta)}H`
                    : "—"}
                </b>
              </div>
              <div className="r total">
                <span>Deposit now (30%)</span>
                <b>{usd(deposit)}</b>
              </div>
              <div className="r">
                <span>Balance at the gangway</span>
                <b>{usd(subtotal - deposit)}</b>
              </div>
              <p className="hint">
                Charged in BRL (≈ {brl(deposit)}) by your card&apos;s own FX — transparent, no house
                spread.
              </p>
            </div>

            <p className="subhead">How will you pay the deposit?</p>
            <div className="stack">
              <div className="paybox">
                {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
                  <label key={m} className="payopt">
                    <input
                      type="radio"
                      name="pm"
                      checked={payment === m}
                      onChange={() => setPayment(m)}
                    />
                    <span>
                      <b>{PAYMENT_LABEL[m]}</b>
                      <span className="sub">
                        {m === "card" && "Visa · Mastercard · Amex — charged in BRL by your issuer"}
                        {m === "wallet" && "One tap, on-ship friendly"}
                        {m === "pix" && "For BRL accounts"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

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
                Signed in as <span className="mono">{email}</span>. After confirming, we send your
                secure payment link for the {Math.round(DEPOSIT_PCT * 100)}% deposit — the balance
                is paid at the gangway on delivery.
              </p>
            </div>
          </>
        )}
      </main>
      <div className="cta-dock">
        <button className="cta" onClick={submit} disabled={pending || !ready || count === 0}>
          <span>{pending ? "Placing order…" : "Confirm order"}</span>
          <span className="mono">{usd(deposit)}</span>
        </button>
      </div>
    </>
  );
}
