import Image from "next/image";
import Link from "next/link";
import AddToCart from "./AddToCart";
import WishButton from "./WishButton";
import { BADGE_LABEL, imageUrl, type ProductCard as Card } from "@/lib/catalog";
import { discountPercent, usd } from "@/lib/money";

/**
 * Card da grade, na anatomia do Sunny: foto em fundo branco, selo
 * circular no canto, nome em MAIÚSCULAS centralizado, preço anterior
 * riscado acima do atual, botão largo "Add to Cart" e o coração de
 * wishlist ao lado.
 *
 * Uma coluna no celular, como o deles. Cheguei a fazer duas por
 * densidade, mas a navegação já está validada com a mesma tripulação:
 * mudar o que a pessoa já sabe usar custa mais do que a rolagem
 * economizada. A densidade volta por outro caminho — desempenho.
 *
 * [otim] É Server Component: só o botão e o coração viram JavaScript.
 * Uma grade de 24 cards não manda 24 componentes interativos para o
 * navegador, que é o que pesa no Magento deles.
 */
export default function ProductCardView({
  p,
  priority = false,
  wished = false,
  sizes = "(max-width: 620px) 92vw, (max-width: 900px) 46vw, 300px",
}: {
  p: Card;
  priority?: boolean;
  /** Já está na wishlist — usado na página da lista, para o coração nascer cheio. */
  wished?: boolean;
  /** O trilho da home mostra o card a ~74vw; a grade, a ~92vw. Servir a
   *  imagem no tamanho errado é foto borrada de um lado ou byte jogado
   *  fora do outro. */
  sizes?: string;
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
            sizes={sizes}
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

        <div className="paddrow">
          <AddToCart
            variantId={p.default_variant_id}
            slug={p.slug}
            name={p.name}
            variantCount={p.variant_count}
            soldOut={soldOut}
          />
          <WishButton productId={p.id} name={p.name} initial={wished} />
        </div>
      </div>
    </article>
  );
}
