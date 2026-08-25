import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import ProductCardView from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";
import {
  buildTree,
  listProducts,
  PAGE_SIZE,
  SORT_LABEL,
  type Category,
  type SortKey,
} from "@/lib/catalog";
import SortSelect from "@/components/SortSelect";

// A vitrine muda pouco e é lida muito: revalidação em vez de dinâmica
// por requisição. Alterar produto no painel revalida na hora seguinte,
// e a listagem serve do cache até lá.
export const revalidate = 300;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; cursor?: string; badge?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const sort = (sp.sort as SortKey) ?? "featured";
  const query = sp.q?.trim() || null;

  const [{ items, nextCursor }, cats] = await Promise.all([
    listProducts(supabase, {
      query,
      sort,
      cursor: sp.cursor ?? null,
      badge: sp.badge ?? null,
    }),
    supabase
      .from("categories")
      .select("id, parent_id, slug, name, icon, image_path, path, depth, active, sort_order")
      .eq("active", true)
      .order("sort_order"),
  ]);

  const roots = buildTree((cats.data ?? []) as Category[]);
  const keep = (extra: Record<string, string | null>) => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (sort !== "featured") p.set("sort", sort);
    if (sp.badge) p.set("badge", sp.badge);
    for (const [k, v] of Object.entries(extra)) v ? p.set(k, v) : p.delete(k);
    const s = p.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  return (
    <main>
      {/* Sem caixa de busca na página: a do cabeçalho global é a mesma do
          Sunny, e duas na mesma tela dividem o gesto ao meio. */}
      <Breadcrumb
        trail={
          query
            ? [{ label: "Shop", href: "/shop" }, { label: `“${query}”` }]
            : [{ label: "Shop" }]
        }
      />
      <h1 className="secttl left">{query ? `“${query}”` : "Shop"}</h1>

      {!query && !sp.cursor && !sp.badge && (
        <>
          <p className="subhead">Browse</p>
          <div className="catgrid">
            {roots.map((c) => (
              <Link key={c.id} href={`/c/${c.slug}`} className="catcard" prefetch={false}>
                <span className="ic" aria-hidden>
                  {c.icon ?? "▪"}
                </span>
                <span className="tx">
                  <span className="nm">{c.name}</span>
                  {c.children.length > 0 && (
                    <span className="ct">{c.children.length} sections</span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="listbar">
        <span className="count">
          {query ? `${items.length} result${items.length === 1 ? "" : "s"}` : "All products"}
        </span>
        <SortSelect value={sort} options={SORT_LABEL} />
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <div className="i">🧭</div>
          {query ? (
            <>
              Nothing matches “{query}”.
              <br />
              Try the brand name, or browse the categories above.
            </>
          ) : (
            <>The shelves are being stocked. Check back shortly.</>
          )}
        </div>
      ) : (
        <div className="pgrid">
          {items.map((p, i) => (
            <ProductCardView key={p.id} p={p} priority={i < 4} />
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="stack" style={{ paddingTop: 6 }}>
          <Link className="btn ghost" href={keep({ cursor: nextCursor })} prefetch={false}>
            Load {PAGE_SIZE} more
          </Link>
        </div>
      )}
    </main>
  );
}
