"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { useCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/env";
import { hoursUntil, orderCloseAt, usd } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function ShopPage() {
  const router = useRouter();
  const { ship, ready, items, add } = useCart();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState("All");

  useEffect(() => {
    if (ready && !ship) router.replace("/");
  }, [ready, ship, router]);

  useEffect(() => {
    if (!supabaseConfigured) {
      setProducts([]);
      setError("Backend not configured — see README.");
      return;
    }
    const supabase = createClient();
    supabase
      .from("products")
      .select("id, name, description, emoji, category, price_usd, active, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError("Couldn't load the catalog — try again in a moment.");
        else setProducts((data ?? []) as Product[]);
      });
  }, []);

  const cats = useMemo(() => {
    const seen: string[] = [];
    for (const p of products ?? []) if (!seen.includes(p.category)) seen.push(p.category);
    return ["All", ...seen];
  }, [products]);

  const list = useMemo(
    () => (products ?? []).filter((p) => cat === "All" || p.category === cat),
    [products, cat]
  );

  const closeH = ship ? hoursUntil(orderCloseAt(ship.eta, ship.cutoff_hours)) : 0;
  const windowOpen = closeH > 0;

  return (
    <>
      <TopBar />
      <main className="pb-nav">
        {ship && (
          <div className="deadline">
            ⏱{" "}
            {windowOpen ? (
              <span>
                ORDERS FOR <b>{ship.name}</b> CLOSE IN {closeH}H — delivery at the gangway on docking
              </span>
            ) : (
              <span>
                ORDERS FOR <b>{ship.name}</b> ARE CLOSED — pick another vessel or contact us
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="stack" style={{ paddingTop: 14 }}>
            <p className="alert">{error}</p>
          </div>
        )}

        {products === null ? (
          <div className="spin" aria-label="Loading" />
        ) : (
          <>
            <div className="cats-tabs">
              {cats.map((c) => (
                <button key={c} className={`tab ${c === cat ? "on" : ""}`} onClick={() => setCat(c)}>
                  {c}
                </button>
              ))}
            </div>
            <div className="grid">
              {list.map((p) => {
                const q = items[p.id] ?? 0;
                return (
                  <article key={p.id} className="prod">
                    <div className="ph">{p.emoji}</div>
                    <div className="b">
                      <div className="nm">{p.name}</div>
                      <div className="ds">{p.description}</div>
                      <div className="row">
                        <span className="pr">{usd(Number(p.price_usd))}</span>
                        <button
                          className={`add ${q ? "inCart" : ""}`}
                          onClick={() => add(p.id)}
                          disabled={!windowOpen}
                          aria-label={`Add ${p.name}`}
                        >
                          {q ? `×${q}` : "+"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}
