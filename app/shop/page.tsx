import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import ProductCardView from "@/components/ProductCard";
import FacetRail from "@/components/FacetRail";
import { createClient } from "@/lib/supabase/server";
import { wishedProductIds } from "@/lib/wishlist";
import {
  BADGE_LABEL,
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

  // O coração precisa nascer no estado certo, senão parece que não salvou.
  const wished = await wishedProductIds(items.map((i) => i.id));

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
    <main className="pg-list">
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

      {/* Duas colunas a partir de 1024px: trilho de categorias à
          esquerda, lista à direita. Abaixo disso o CSS achata tudo de
          volta numa coluna e o trilho some — o celular não muda. */}
      <div className="shop-body">
        <FacetRail tree={roots} activeSlug={null} />
        <div className="listcol">

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
        <span className="offers wide-only">
          {(["promo", "new", "outlet"] as const).map((b) => (
            <Link
              key={b}
              href={keep({ badge: sp.badge === b ? null : b, cursor: null })}
              className={sp.badge === b ? "on" : ""}
              prefetch={false}
            >
              {BADGE_LABEL[b]}
            </Link>
          ))}
        </span>
        <span className="sortlbl" aria-hidden>
          Sort by
        </span>
        <SortSelect value={sort} options={SORT_LABEL} />
      </div>

      {/* O que está filtrando agora, e como sair. Sem isto, quem chega
          por link com ?badge= não descobre por que a lista é curta. */}
      {(query || sp.badge) && (
        <div className="chips wide-only">
          {query && (
            <Link href={keep({ q: null, cursor: null })} prefetch={false}>
              <b>Search</b> “{query}”
            </Link>
          )}
          {sp.badge && (
            <Link href={keep({ badge: null, cursor: null })} prefetch={false}>
              <b>Offer</b> {BADGE_LABEL[sp.badge as "promo" | "new" | "outlet"]}
            </Link>
          )}
        </div>
      )}

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
            <ProductCardView key={p.id} p={p} priority={i < 4} wished={wished.has(p.id)} />
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="stack">
          {/* "Load 24 more" mentia: a paginação é keyset, então a página
              seguinte SUBSTITUI as 24 anteriores, não soma. */}
          {sp.cursor && (
            <Link className="btn ghost back" href={keep({ cursor: null })} prefetch={false}>
              ← Back to start
            </Link>
          )}
          <Link className="btn ghost" href={keep({ cursor: nextCursor })} prefetch={false}>
            Next {PAGE_SIZE} →
          </Link>
        </div>
      )}
        </div>
      </div>
    </main>
  );
}
