"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type WishResult = { ok: boolean; wished: boolean; needsAuth?: boolean };

/**
 * Liga/desliga o item na lista de desejos.
 *
 * Devolve `needsAuth` em vez de redirecionar: quem chama é um botão no
 * meio da grade, e arrancar a pessoa da listagem para uma tela de
 * login no meio da navegação é o jeito mais rápido de perder a visita.
 * O botão manda para o login guardando o caminho de volta.
 */
export async function toggleWish(productId: string): Promise<WishResult> {
  if (!productId) return { ok: false, wished: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, wished: false, needsAuth: true };

  const { data: existing } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
    revalidatePath("/wishlist");
    return { ok: true, wished: false };
  }

  const { error } = await supabase
    .from("wishlists")
    .insert({ user_id: user.id, product_id: productId });
  if (error) return { ok: false, wished: false };

  revalidatePath("/wishlist");
  return { ok: true, wished: true };
}
