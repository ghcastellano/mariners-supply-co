/**
 * Catálogo — tipos e leitura.
 *
 * Toda listagem passa pela RPC list_products, que pagina por keyset.
 * A regra que sustenta isso: nenhuma tela busca "todos os produtos"
 * para filtrar na memória do navegador. Funciona com 12 SKUs e mata
 * a loja com 2 mil.
 */

import { SUPABASE_URL } from "./env.ts";

export const PRODUCT_BUCKET = "product-images";
export const PAGE_SIZE = 24;

export type Category = {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  icon: string | null;
  image_path: string | null;
  path: string;
  depth: number;
  active: boolean;
  sort_order: number;
};

export type Brand = { id: string; slug: string; name: string; logo_path: string | null };

/** Linha da listagem — é exatamente o que a RPC devolve, nada a mais. */
export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  brand_name: string | null;
  price_cents: number;
  compare_at_cents: number | null;
  max_price_cents: number | null;
  stock_qty: number;
  variant_count: number;
  primary_image_path: string | null;
  badge: "promo" | "new" | "outlet" | null;
  sku: string | null;
  cursor: string;
};

export type ProductVariant = {
  id: string;
  sku: string;
  ean: string | null;
  option_label: string | null;
  options: Record<string, string>;
  price_cents: number;
  compare_at_cents: number | null;
  stock_qty: number;
  track_stock: boolean;
  image_path: string | null;
  active: boolean;
  sort_order: number;
};

export type ProductImage = {
  id: string;
  path: string;
  alt: string | null;
  sort_order: number;
};

export type ProductDetail = ProductCard & {
  description: string | null;
  specs: string[] | null;
  tax_class: "bonded" | "domestic" | "digital";
  min_qty: number;
  max_qty: number | null;
  primary_category_id: string | null;
  product_variants: ProductVariant[];
  product_images: ProductImage[];
};

export type SortKey = "featured" | "price_asc" | "price_desc" | "newest";

export const SORT_LABEL: Record<SortKey, string> = {
  featured: "Featured",
  price_asc: "Price ↑",
  price_desc: "Price ↓",
  newest: "Newest",
};

/**
 * Caminho no Storage → URL pública.
 *
 * O bucket é público de propósito (é vitrine), então a URL é estável
 * e cacheável na CDN. Link assinado em foto de catálogo só serve para
 * furar cache e deixar a loja lenta.
 */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path; // já é absoluta (import externo)
  return `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export const BADGE_LABEL: Record<string, string> = {
  promo: "Promo",
  new: "New",
  outlet: "Outlet",
};

/** Monta a árvore a partir da lista plana — uma passada, sem recursão em consulta. */
export function buildTree(rows: Category[]) {
  const byId = new Map<string, Category & { children: Category[] }>();
  for (const c of rows) byId.set(c.id, { ...c, children: [] });
  const roots: (Category & { children: Category[] })[] = [];
  for (const c of byId.values()) {
    if (c.parent_id && byId.has(c.parent_id)) byId.get(c.parent_id)!.children.push(c);
    else roots.push(c);
  }
  const sort = (a: Category, b: Category) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name);
  roots.sort(sort);
  for (const c of byId.values()) c.children.sort(sort);
  return roots;
}

export type ListArgs = {
  category?: string | null; // caminho: '/electronics/'
  brand?: string | null;
  query?: string | null;
  badge?: string | null;
  sort?: SortKey;
  cursor?: string | null;
  limit?: number;
};

type Rpc = {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

export async function listProducts(
  supabase: Rpc,
  args: ListArgs = {}
): Promise<{ items: ProductCard[]; nextCursor: string | null }> {
  const limit = args.limit ?? PAGE_SIZE;
  const { data, error } = await supabase.rpc("list_products", {
    p_category: args.category ?? null,
    p_brand: args.brand ?? null,
    p_query: args.query ?? null,
    p_badge: args.badge ?? null,
    p_sort: args.sort ?? "featured",
    p_cursor: args.cursor ?? null,
    p_limit: limit,
  });
  if (error) return { items: [], nextCursor: null };

  const items = (data ?? []) as ProductCard[];
  // Página cheia significa "pode haver mais": um cursor a mais é
  // barato, uma página vazia no fim é aceitável.
  const nextCursor = items.length === limit ? (items[items.length - 1]?.cursor ?? null) : null;
  return { items, nextCursor };
}

/** Preço mostrado no card: "USD 12.00" ou "from USD 12.00" quando há variantes. */
export function priceRange(p: Pick<ProductCard, "price_cents" | "max_price_cents">) {
  return {
    from: p.price_cents,
    hasRange: p.max_price_cents != null && p.max_price_cents > p.price_cents,
  };
}

export const inStock = (p: Pick<ProductCard, "stock_qty">) => p.stock_qty > 0;
