"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleWish } from "@/app/wishlist/actions";

/**
 * Coração de wishlist, no mesmo lugar do Sunny: ao lado do botão de
 * adicionar, em círculo claro.
 *
 * Estado otimista: o coração enche no toque e só volta atrás se o
 * servidor recusar. Numa conexão de navio a ida e volta pode levar
 * segundos, e um botão que não responde é um botão que a pessoa
 * aperta de novo.
 */
export default function WishButton({
  productId,
  name,
  initial = false,
}: {
  productId: string;
  name: string;
  initial?: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className={`wish ${on ? "on" : ""}`}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from wish list` : `Add ${name} to wish list`}
      disabled={pending}
      onClick={() => {
        const next = !on;
        setOn(next);
        start(async () => {
          const res = await toggleWish(productId);
          if (res.needsAuth) {
            setOn(false);
            router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
            return;
          }
          if (!res.ok) setOn(!next);
          else setOn(res.wished);
        });
      }}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
