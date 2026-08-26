"use client";

import Link from "next/link";

import { Suspense, useEffect, useRef, useState } from "react";
import CategoryDrawer from "./CategoryDrawer";
import HeaderSearch from "./HeaderSearch";
import MiniCart from "./MiniCart";
import { IconAnchor, IconCart, IconHeart, IconMenu, IconUser } from "./Icon";
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
export default function SiteHeader({
  tree,
  wishCount = 0,
}: {
  tree: CategoryNode[];
  /** Favoritos da pessoa logada. Zero esconde o selo. */
  wishCount?: number;
}) {
  const { count, ready } = useCart();
  const [drawer, setDrawer] = useState(false);
  const [cart, setCart] = useState(false);
  const [menu, setMenu] = useState(false);
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

          {/* O nome acessível precisa CONTER o texto visível (WCAG 2.5.3).
              Os dois spans colavam em "MarinersSupply" — sem o espaço, e
              com o travessão no aria-label, nada batia: quem usa comando
              de voz dizia "clicar Mariners Supply" e não achava o link. */}
          <Link href="/" className="sunlogo" aria-label="Mariners Supply home">
            <IconAnchor className="mark" />
            <span className="word">
              <span className="l1">Mariners</span>{" "}
              <span className="l2">Supply</span>
            </span>
          </Link>

          <div className="headicons">
            <div className="acctwrap" ref={acct}>
              <button
                className="headicon"
                onClick={() => setMenu((m) => !m)}
                aria-label="Account menu"
                aria-expanded={menu}
              >
                <IconUser />
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

            {/* O selo repete o que o carrinho já fazia. Sem ele o ♡ era
                mudo: dois itens guardados e nenhum sinal na tela — a
                pessoa abria a lista para descobrir se tinha algo. */}
            <Link
              href="/wishlist"
              className="headicon"
              aria-label={wishCount > 0 ? `Wish list, ${wishCount} items` : "Wish list"}
            >
              <IconHeart />
              {wishCount > 0 && <span className="cartbadge wishcount">{wishCount}</span>}
            </Link>

            {/* No Sunny o ícone abre o mini-carrinho em vez de navegar:
                quem está no meio da listagem confere sem perder o lugar. */}
            <button
              className="headicon"
              onClick={() => setCart(true)}
              aria-label={`Cart${ready && count > 0 ? `, ${count} items` : ""}`}
              aria-expanded={cart}
            >
              <IconCart />
              {ready && count > 0 && <span className="cartbadge">{count}</span>}
            </button>
          </div>
        </div>

        {/* Suspense porque useSearchParams força render no cliente de
            tudo acima na árvore — e o cabeçalho mora no layout raiz. */}
        <Suspense fallback={<div className="sunsearch" aria-hidden />}>
          <HeaderSearch />
        </Suspense>
      </header>

      <CategoryDrawer open={drawer} onClose={() => setDrawer(false)} tree={tree} cartCount={count} />
      <MiniCart open={cart} onClose={() => setCart(false)} />
    </>
  );
}
