"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import WishButton from "./WishButton";
import { useCart } from "@/lib/cart";
import { BADGE_LABEL, imageUrl, type ProductImage, type ProductVariant } from "@/lib/catalog";
import { brl, discountPercent, usd } from "@/lib/money";
import { shortRegime } from "@/lib/taxregime";

type Head = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  badge: "promo" | "new" | "outlet" | null;
  sku: string | null;
  short_description: string | null;
  tax_class: "bonded" | "domestic" | "digital";
  min_qty: number;
  max_qty: number | null;
};

/**
 * Ficha do produto: galeria, variante, quantidade e a barra fixa de
 * compra.
 *
 * A barra fixa no rodapé é o detalhe que mais muda conversão no
 * celular: a ficha é longa (galeria + specs + relacionados) e sem ela
 * a pessoa precisa rolar de volta ao topo para comprar. Some quando o
 * produto está esgotado, para não oferecer o que não existe.
 */
export default function ProductBuy({
  product,
  images,
  variants,
  wished = false,
}: {
  product: Head;
  images: ProductImage[];
  variants: ProductVariant[];
  /** Já está na lista de desejos — o coração precisa nascer cheio. */
  wished?: boolean;
}) {
  const { items, add } = useCart();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [qty, setQty] = useState(Math.max(1, product.min_qty || 1));
  const [shot, setShot] = useState(0);

  const variant = useMemo(
    () => variants.find((v) => v.id === variantId) ?? variants[0],
    [variants, variantId]
  );

  const gallery = useMemo(() => {
    // A foto da variante, quando existe, entra na frente: escolher
    // "preto" e continuar vendo o branco é como se erra a compra.
    const list = [...images];
    if (variant?.image_path && !list.some((i) => i.path === variant.image_path)) {
      list.unshift({ id: "variant", path: variant.image_path, alt: product.name, sort_order: -1 });
    }
    return list;
  }, [images, variant, product.name]);

  const price = variant?.price_cents ?? 0;
  const was = variant?.compare_at_cents ?? null;
  const off = discountPercent(price, was);
  const stock = variant ? (variant.track_stock ? variant.stock_qty : 999) : 0;
  const soldOut = stock <= 0;
  const inCart = variant ? (items[variant.id] ?? 0) : 0;
  const max = Math.min(product.max_qty ?? 99, stock || 99);

  const current = gallery[Math.min(shot, Math.max(0, gallery.length - 1))];
  const src = imageUrl(current?.path);

  function addNow() {
    if (!variant || soldOut) return;
    add(variant.id, qty);
  }

  return (
    <>
      <section className="pdp">
        <div className="pdp-hero">
          {src ? (
            <Image
              src={src}
              alt={current?.alt ?? product.name}
              fill
              sizes="(max-width: 700px) 100vw, 430px"
              className="pdp-img"
              priority
            />
          ) : (
            <span className="pdp-noimg" aria-hidden>📦</span>
          )}
          {product.badge && (
            <span className={`pbadge ${product.badge}`}>{BADGE_LABEL[product.badge]}</span>
          )}
          {off && <span className="poff">−{off}%</span>}
        </div>

        {gallery.length > 1 && (
          <div className="pdp-thumbs">
            {gallery.map((g, i) => {
              const t = imageUrl(g.path);
              return (
                <button
                  key={g.id}
                  className={`pdp-thumb ${i === shot ? "on" : ""}`}
                  onClick={() => setShot(i)}
                  aria-label={`Photo ${i + 1} of ${gallery.length}`}
                >
                  {t && <Image src={t} alt="" fill sizes="64px" style={{ objectFit: "contain" }} />}
                </button>
              );
            })}
          </div>
        )}

        <div className="pdp-head">
          {product.brand && <span className="pbrand">{product.brand}</span>}
          <h1>{product.name}</h1>
          {product.short_description && <p className="lead">{product.short_description}</p>}
        </div>

        <div className="pdp-buy">
          <div className={`stockline ${soldOut ? "out" : ""}`}>
            <i />
            {soldOut ? "Out of stock" : variant?.track_stock && stock <= 5
              ? `Only ${stock} left`
              : "In stock"}
          </div>

          <dl className="pdp-facts">
            <div>
              <dt>SKU</dt>
              <dd className="mono">{variant?.sku ?? product.sku ?? "—"}</dd>
            </div>
            {variant?.options &&
              Object.entries(variant.options).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            <div>
              <dt>Tax</dt>
              {/* Antes dizia "Duty-free, handled by us" para tudo que não
                  fosse digital. Só é verdade quando o item embarca sob o
                  regime de fornecimento de bordo, e isso o canal decide. */}
              <dd>{shortRegime(product.tax_class)}</dd>
            </div>
          </dl>

          {variants.length > 1 && (
            <div className="field">
              <label htmlFor="variant">Option</label>
              <select
                id="variant"
                className="phone-country"
                style={{ width: "100%" }}
                value={variantId}
                onChange={(e) => {
                  setVariantId(e.target.value);
                  setShot(0);
                }}
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.track_stock && v.stock_qty <= 0}>
                    {v.option_label ?? v.sku}
                    {v.track_stock && v.stock_qty <= 0 ? " — out of stock" : ""} · {usd(v.price_cents)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pdp-price">
            {was ? <s className="was">{usd(was)}</s> : null}
            <b className="now">{usd(price)}</b>
            {/* O marinheiro pensa em dólar; quem paga no cais pensa em
                real. Mostrar os dois evita a conta de cabeça. */}
            <span className="alt">≈ {brl(price)} at today&apos;s rate</span>
          </div>

          <div className="pdp-actions">
            <div className="qty">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Less">−</button>
              <span className="mono">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label="More">+</button>
            </div>
            <button className="btn" onClick={addNow} disabled={soldOut}>
              {soldOut ? "Out of stock" : inCart ? `Add ${qty} more` : "Add to cart"}
            </button>
            {/* O coração faltava justamente aqui, onde a decisão de
                "agora não, mas depois" acontece: na ficha aberta. Quem
                não podia guardar o item só tinha a opção de comprar ou
                esquecer. */}
            <WishButton productId={product.id} name={product.name} initial={wished} />
          </div>
          {inCart > 0 && <p className="finehint">{inCart} already in your cart.</p>}
        </div>
      </section>

      {!soldOut && (
        <div className="buydock">
          <div className="thumb">
            {src && <Image src={src} alt="" fill sizes="46px" style={{ objectFit: "contain" }} />}
          </div>
          <div className="txt">
            <span className="nm">{product.name}</span>
            <span className="pr mono">{usd(price * qty)}</span>
          </div>
          <button className="btn small" onClick={addNow}>
            Add
          </button>
        </div>
      )}
    </>
  );
}
