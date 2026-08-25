"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CategoryDrawer from "./CategoryDrawer";
import { useCart } from "@/lib/cart";
import type { CategoryNode } from "@/lib/catalog";

/**
 * Cabeçalho na estrutura do Sunny: barra de anúncio, depois a fileira
 * hambúrguer / logo / conta / wishlist / carrinho, depois a busca de
 * largura cheia.
 *
 * A ordem dos ícones e a busca embaixo são o que a tripulação já tem
 * na memória muscular. Não é lugar para criatividade.
 */
export default function SiteHeader({ tree }: { tree: CategoryNode[] }) {
  const router = useRouter();
  const { count, ready } = useCart();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const acct = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (acct.current && !acct.current.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <>
      <Link className="announce" href="/brochures">
        View Catalog &amp; Flyers
      </Link>

      <header className="sunhead">
        <div className="sunhead-row">
          <button className="hamb" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer}>
            ☰
          </button>

          <Link href="/" className="sunlogo">
            Mariners <b>Supply</b>
          </Link>

          <div className="headicons">
            <div className="acctwrap" ref={acct}>
              <button
                className="headicon"
                onClick={() => setMenu((m) => !m)}
                aria-label="Account menu"
                aria-expanded={menu}
              >
                👤
              </button>
              {menu && (
                <div className="acctmenu" role="menu">
                  <Link href="/account" role="menuitem" onClick={() => setMenu(false)}>My Account</Link>
                  <Link href="/account" role="menuitem" onClick={() => setMenu(false)}>My Account Information</Link>
                  <Link href="/orders" role="menuitem" onClick={() => setMenu(false)}>My Orders</Link>
                  <Link href="/captain" role="menuitem" onClick={() => setMenu(false)}>Captain rewards</Link>
                  <Link href="/wishlist" role="menuitem" onClick={() => setMenu(false)}>My Wish List</Link>
                  <hr />
                  <Link href="/login" role="menuitem" onClick={() => setMenu(false)}>Sign in / Sign out</Link>
                </div>
              )}
            </div>

            <Link href="/wishlist" className="headicon" aria-label="Wish list">♡</Link>

            <Link href="/cart" className="headicon" aria-label="Cart">
              🛒
              {ready && count > 0 && <span className="cartbadge">{count}</span>}
            </Link>
          </div>
        </div>

        <form
          className="sunsearch"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const term = q.trim();
            router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
          }}
        >
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search entire store here…"
            aria-label="Search entire store"
            enterKeyHint="search"
          />
          <button type="submit" aria-label="Search">🔍</button>
        </form>
      </header>

      <CategoryDrawer open={drawer} onClose={() => setDrawer(false)} tree={tree} cartCount={count} />
    </>
  );
}
