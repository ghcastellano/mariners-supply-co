import SiteHeader from "./SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { buildTree, type Category, type CategoryNode } from "@/lib/catalog";

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
  return <SiteHeader tree={tree} />;
}
