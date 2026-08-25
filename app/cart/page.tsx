"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { useCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/env";
import { imageUrl } from "@/lib/catalog";
import { brl, splitOrder, usd } from "@/lib/money";

type Line = {
  id: string;
  sku: string;
  option_label: string | null;
  price_cents: number;
  compare_at_cents: number | null;
  stock_qty: number;
  track_stock: boolean;
  image_path: string | null;
  active: boolean;
  products: {
    name: string;
    slug: string;
    primary_image_path: string | null;
    active: boolean;
  } | null;
};

export default function CartPage() {
  const router = useRouter();
  const { items, change, count, ready } = useCart();
  const [lines, setLines] = useState<Line[] | null>(null);

  const ids = useMemo(() => Object.keys(items), [items]);

  useEffect(() => {
    if (!ready) return;
    if (!supabaseConfigured || ids.length === 0) {
      setLines([]);
      return;
    }
    // Busca só as variantes do carrinho. Puxar o catálogo inteiro para
    // achar 3 linhas funciona com 12 SKUs e mata a página com 2 mil.
    const supabase = createClient();
    supabase
      .from("product_variants")
      .select(
        `id, sku, option_label, price_cents, compare_at_cents, stock_qty,
         track_stock, image_path, active,
         products!inner(name, slug, primary_image_path, active)`
      )
      .in("id", ids)
      .then(({ data }) => setLines((data ?? []) as unknown as Line[]));
  }, [ready, ids.join(",")]);

  const rows = useMemo(
    () =>
      (lines ?? [])
        .filter((l) => l.active && l.products?.active)
        .map((l) => ({ ...l, qty: items[l.id] ?? 0 }))
        .filter((l) => l.qty > 0),
    [lines, items]
  );

  // Item que saiu do ar entre a adição e agora: some da conta, mas o
  // cliente precisa saber por que — sumir calado é pior que avisar.
  const dropped = useMemo(
    () => (lines === null ? 0 : ids.length - rows.length),
    [lines, ids.length, rows.length]
  );

  const subtotal = rows.reduce((s, l) => s + l.price_cents * l.qty, 0);
  const saved = rows.reduce(
    (s, l) => s + (l.compare_at_cents ? (l.compare_at_cents - l.price_cents) * l.qty : 0),
    0
  );
  const split = splitOrder(subtotal);

  return (
    <>
      <TopBar title="Your order" backHref="/shop" />
      <main className="pb-both">
        {lines === null || !ready ? (
          <div className="spin" aria-label="Loading" />
        ) : count === 0 || rows.length === 0 ? (
          <div className="empty">
            <div className="i">🛒</div>
            Your kit is empty, sailor.
            <p style={{ marginTop: 18 }}>
              <Link className="alink" href="/shop">
                ⚓ Browse the catalog →
              </Link>
            </p>
          </div>
        ) : (
          <>
            {dropped > 0 && (
              <div className="stack" style={{ paddingTop: 12 }}>
                <p className="alert">
                  {dropped} item{dropped === 1 ? "" : "s"} left the catalog since you added
                  {dropped === 1 ? " it" : " them"} — removed from your order.
                </p>
              </div>
            )}

            <div className="cart-list">
              {rows.map((l) => {
                const src = imageUrl(l.image_path ?? l.products?.primary_image_path);
                const low = l.track_stock && l.stock_qty > 0 && l.stock_qty < l.qty;
                return (
                  <div className="ci" key={l.id}>
                    <Link href={`/p/${l.products?.slug}`} className="ci-thumb" prefetch={false}>
                      {src ? (
                        <Image src={src} alt="" fill sizes="52px" style={{ objectFit: "contain" }} />
                      ) : (
                        <span aria-hidden>📦</span>
                      )}
                    </Link>
                    <div>
                      <div className="nm">{l.products?.name}</div>
                      {l.option_label && <div className="pr">{l.option_label}</div>}
                      <div className="pr mono">
                        {l.compare_at_cents && <s>{usd(l.compare_at_cents)}</s>}{" "}
                        {usd(l.price_cents)} each
                      </div>
                      <div className="sku mono">SKU {l.sku}</div>
                      {low && <div className="pr" style={{ color: "var(--amber)" }}>
                        Only {l.stock_qty} left
                      </div>}
                    </div>
                    <div className="qty">
                      <button onClick={() => change(l.id, -1)} aria-label="Less">−</button>
                      <b>{l.qty}</b>
                      <button onClick={() => change(l.id, 1)} aria-label="More">+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="summary">
              <div className="r">
                <span>Subtotal</span>
                <b>{usd(subtotal)}</b>
              </div>
              {saved > 0 && (
                <div className="r">
                  <span>You save</span>
                  <b style={{ color: "var(--teal)" }}>−{usd(saved)}</b>
                </div>
              )}
              <div className="r">
                <span>Delivery on board</span>
                <b style={{ color: "var(--teal)" }}>Free</b>
              </div>
              <div className="r total">
                <span>Deposit now (30%)</span>
                <b>{usd(split.deposit)}</b>
              </div>
              <div className="r">
                <span>Balance at the gangway</span>
                <b>{usd(split.balance)}</b>
              </div>
              <p className="hint">
                ≈ {brl(split.deposit)} charged now — your bank does the conversion, no house
                spread. If your ship skips Santos, the deposit becomes full credit for your next
                call. No paperwork.
              </p>
            </div>
          </>
        )}
      </main>
      {ready && rows.length > 0 && (
        <div className="cta-dock above-nav">
          <button className="cta" onClick={() => router.push("/checkout")}>
            <span>Continue to deposit</span>
            <span className="mono">{usd(split.deposit)}</span>
          </button>
        </div>
      )}
      <BottomNav />
    </>
  );
}
