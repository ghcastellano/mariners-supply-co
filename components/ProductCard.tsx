import Image from "next/image";
import Link from "next/link";
import AddToCart from "./AddToCart";
import { BADGE_LABEL, imageUrl, type ProductCard as Card } from "@/lib/catalog";
import { discountPercent, usd } from "@/lib/money";

/**
 * Card da grade.
 *
 * Duas diferenças deliberadas em relação ao card do concorrente, que
 * ocupa quase uma tela inteira por produto no celular:
 *
 * 1. Grade de duas colunas. Quem navega um catálogo de milhares de
 *    itens no wifi do navio precisa ver mais por rolagem, não uma
 *    vitrine bonita e vazia.
 * 2. O preço anterior fica ACIMA do atual, riscado e discreto, com a
 *    porcentagem em selo. Preço grande embaixo é o que a pessoa lê
 *    primeiro; o riscado é contexto, não protagonista.
 *
 * É Server Component: só o botão de adicionar é cliente. Uma grade de
 * 24 cards não manda 24 componentes interativos para o navegador.
 */
export default function ProductCardView({
  p,
  priority = false,
}: {
  p: Card;
  priority?: boolean;
}) {
  const src = imageUrl(p.primary_image_path);
  const off = discountPercent(p.price_cents, p.compare_at_cents);
  const soldOut = p.stock_qty <= 0;
  const from = p.max_price_cents != null && p.max_price_cents > p.price_cents;

  return (
    <article className={`pcard ${soldOut ? "out" : ""}`}>
      <Link href={`/p/${p.slug}`} className="pcard-media" prefetch={false}>
        {src ? (
          <Image
            src={src}
            alt={p.name}
            fill
            sizes="(max-width: 700px) 46vw, 210px"
            className="pcard-img"
            priority={priority}
          />
        ) : (
          <span className="pcard-noimg" aria-hidden>
            📦
          </span>
        )}
        {p.badge && <span className={`pbadge ${p.badge}`}>{BADGE_LABEL[p.badge]}</span>}
        {off && <span className="poff">−{off}%</span>}
        {soldOut && <span className="pout">Out of stock</span>}
      </Link>

      <div className="pcard-body">
        {p.brand_name && <span className="pbrand">{p.brand_name}</span>}
        <Link href={`/p/${p.slug}`} className="pname" prefetch={false}>
          {p.name}
        </Link>

        <div className="pprice">
          {p.compare_at_cents ? (
            <s className="was">{usd(p.compare_at_cents)}</s>
          ) : null}
          <b className="now">
            {from && <i className="from">from </i>}
            {usd(p.price_cents)}
          </b>
        </div>

        <AddToCart
          variantId={p.default_variant_id}
          slug={p.slug}
          name={p.name}
          variantCount={p.variant_count}
          soldOut={soldOut}
        />
      </div>
    </article>
  );
}
