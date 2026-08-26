import SiteHeader from "./SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { buildTree, type Category, type CategoryNode } from "@/lib/catalog";
import { wishCount } from "@/lib/wishlist";

/**
 * Server Component que busca a árvore de categorias uma vez e entrega
 * ao cabeçalho. Sem isto o drawer buscaria a árvore em cada abertura,
 * numa tela que abre dezenas de vezes por sessão.
 */
export default async function SiteChrome() {
  let tree: CategoryNode[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("categories")
      .select("id, parent_id, slug, name, icon, image_path, path, depth, active, sort_order")
      .eq("active", true)
      .order("sort_order");
    tree = buildTree((data ?? []) as Category[]);
  } catch {
    // Catálogo indisponível não pode derrubar o cabeçalho do site.
    tree = [];
  }
  // Contagem em paralelo não adianta aqui: a árvore já voltou. É uma
  // consulta de contagem sobre chave primária — barata o bastante para
  // rodar em toda tela, e é o que faz o ♡ deixar de parecer vazio.
  const wishes = await wishCount();

  return <SiteHeader tree={tree} wishCount={wishes} />;
}
