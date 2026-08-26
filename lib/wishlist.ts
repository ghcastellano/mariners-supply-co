/**
 * Leitura da lista de desejos para as telas de catálogo.
 *
 * Existe porque o coração da grade nascia SEMPRE vazio: o cliente
 * marcava, navegava, voltava e via o coração apagado. Pior que a
 * confusão, o efeito prático — ele tocava de novo achando que não
 * tinha salvado, e o segundo toque REMOVE. O item entrava e saía
 * pelas mãos da própria pessoa, e a lista da conta ficava vazia.
 *
 * Mora aqui, e não em lib/catalog.ts, porque abre o cliente do
 * Supabase pelo cookie da sessão (next/headers) e catalog.ts é
 * importado por componentes de cliente — arrastar next/headers para
 * lá quebra o bundle do navegador.
 *
 * Pergunta só pelos ids já carregados, em vez de baixar a lista
 * inteira: numa vitrine de 24 cards a consulta tem o tamanho da
 * página, não o do histórico da pessoa.
 */

import { createClient } from "@/lib/supabase/server";

export async function wishedProductIds(productIds: string[]): Promise<Set<string>> {
  const empty = new Set<string>();
  if (productIds.length === 0) return empty;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Visitante deslogado: nem vai ao banco, e o coração nasce vazio de
  // verdade — o próprio toque manda para o login.
  if (!user) return empty;

  const { data, error } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", user.id)
    .in("product_id", productIds);

  // Falhou a leitura: mostra o coração vazio em vez de derrubar a
  // vitrine inteira. Ninguém perde a compra por causa do favorito.
  if (error) return empty;

  return new Set((data ?? []).map((r) => r.product_id as string));
}
