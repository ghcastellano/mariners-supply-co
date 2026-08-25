"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { useCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/env";
import { brl, DEPOSIT_PCT, hoursUntil, orderCloseAt, usd } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function CartPage() {
  const router = useRouter();
  const { ship, items, change, count, ready } = useCart();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setProducts([]);
      return;
    }
    const supabase = createClient();
    supabase
      .from("products")
      .select("id, name, description, emoji, category, price_usd, active, sort_order")
      .then(({ data }) => setProducts((data ?? []) as Product[]));
  }, []);

  const lines = useMemo(() => {
    if (!products) return [];
    return Object.entries(items)
      .map(([id, q]) => {
        const p = products.find((x) => x.id === id);
        return p ? { ...p, q } : null;
      })
      .filter(Boolean) as (Product & { q: number })[];
  }, [products, items]);

  const subtotal = lines.reduce((s, l) => s + Number(l.price_usd) * l.q, 0);
  const deposit = subtotal * DEPOSIT_PCT;
  const windowOpen = ship ? hoursUntil(orderCloseAt(ship.eta, ship.cutoff_hours)) > 0 : false;
  const canCheckout = ready && count > 0 && !!ship && windowOpen;

  return (
    <>
      <TopBar title="Your order" backHref="/shop" />
      <main className="pb-both">
        {products === null || !ready ? (
          <div className="spin" aria-label="Loading" />
        ) : count === 0 ? (
          <div className="empty">
            <div className="i">🛒</div>
            Your kit is empty, sailor.
            <br />
            Everything you order rides with your ship&apos;s ETA.
            <p style={{ marginTop: 18 }}>
              <Link className="alink" href="/shop">
                ⚓ Browse the catalog →
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="cart-list">
              {lines.map((l) => (
                <div className="ci" key={l.id}>
                  <div className="em">{l.emoji}</div>
                  <div>
                    <div className="nm">{l.name}</div>
                    <div className="pr">{usd(Number(l.price_usd))} each</div>
                  </div>
                  <div className="qty">
                    <button onClick={() => change(l.id, -1)} aria-label="Less">
                      −
                    </button>
                    <b>{l.q}</b>
                    <button onClick={() => change(l.id, 1)} aria-label="More">
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="summary">
              <div className="r">
                <span>Subtotal</span>
                <b>{usd(subtotal)}</b>
              </div>
              <div className="r">
                <span>Gangway delivery — {ship ? ship.name : "select ship"}</span>
                <b>USD 0.00</b>
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
                ≈ {brl(deposit)} charged now — your bank does the conversion, no house spread. If
                your ship skips Santos, the deposit becomes full credit for your next call. No
                paperwork.
              </p>
            </div>
            {!ship && (
              <div className="stack">
                <p className="alert">Pick your ship first so we can match your delivery window.</p>
              </div>
            )}
            {ship && !windowOpen && (
              <div className="stack">
                <p className="alert">
                  Orders for {ship.name} are closed. Pick another vessel on the home screen.
                </p>
              </div>
            )}
          </>
        )}
      </main>
      {ready && count > 0 && (
        <div className="cta-dock above-nav">
          <button className="cta" disabled={!canCheckout} onClick={() => router.push("/checkout")}>
            <span>Continue to deposit</span>
            <span className="mono">{usd(deposit)}</span>
          </button>
        </div>
      )}
      <BottomNav />
    </>
  );
}
