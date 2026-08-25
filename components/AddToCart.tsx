"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";

/**
 * Botão de adicionar da grade.
 *
 * Produto com mais de uma variante não entra no carrinho daqui: leva
 * para a ficha, porque adicionar "um tamanho qualquer" é como o
 * pedido chega errado na prancha. Com variante única, adiciona no
 * lugar e o botão passa a mostrar a quantidade — sem tirar a pessoa
 * da grade no meio da navegação.
 */
export default function AddToCart({
  variantId,
  slug,
  name,
  variantCount,
  soldOut,
}: {
  variantId: string | null;
  slug: string;
  name: string;
  variantCount: number;
  soldOut: boolean;
}) {
  const router = useRouter();
  const { items, add } = useCart();
  const qty = variantId ? (items[variantId] ?? 0) : 0;

  if (soldOut) {
    return (
      <button className="padd" disabled>
        Out of stock
      </button>
    );
  }

  if (variantCount > 1 || !variantId) {
    return (
      <button className="padd ghost" onClick={() => router.push(`/p/${slug}`)}>
        Choose option
      </button>
    );
  }

  return (
    <button
      className={`padd ${qty ? "in" : ""}`}
      onClick={() => add(variantId)}
      aria-label={`Add ${name} to cart`}
    >
      {qty ? `In cart · ${qty}` : "Add to cart"}
    </button>
  );
}
