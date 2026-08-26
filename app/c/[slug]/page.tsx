import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import ProductCardView from "@/components/ProductCard";
import FacetRail from "@/components/FacetRail";
import SortSelect from "@/components/SortSelect";
import { createClient } from "@/lib/supabase/server";
import {
  BADGE_LABEL,
  buildTree,
  listProducts,
  PAGE_SIZE,
  SORT_LABEL,
  type Category,
  type CategoryNode,
  type SortKey,
} from "@/lib/catalog";
import { wishedProductIds } from "@/lib/wishlist";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("name, description")
    .eq("slug", slug)
    .maybeSingle();
  const nome = data?.name;
  return {
    title: nome ?? undefined,
    // Nenhuma das categorias tem descrição no banco ainda, e sem esta
    // linha toda página de categoria ia para o buscador sem resumo. O
    // texto diz o que a página é de verdade — não é enfeite de SEO.
    description:
      data?.description ??
      (nome
        ? `${nome} for your vessel's next call at Porto de Santos. Pre-order before docking, pay a 30% deposit, receive at the gangway.`
        : undefined),
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; cursor?: string; badge?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const sort = (sp.sort as SortKey) ?? "featured";

  // Uma consulta só da árvore ativa, em vez de três (categoria, filhos
  // e pai): o trilho de filtros precisa da árvore inteira de qualquer
  // jeito, e pai e filhos saem dela de graça, em memória.
  const { data: todas } = await supabase
    .from("categories")
    .select("id, parent_id, slug, name, icon, image_path, path, depth, active, sort_order")
    .eq("active", true)
    .order("sort_order");

  const planas = (todas ?? []) as Category[];
  const roots = buildTree(planas);
  const achada = planas.find((c) => c.slug === slug);
  if (!achada) notFound();
  const category = achada;

  const children = planas.filter((c) => c.parent_id === category.id);
  const parent = category.parent_id
    ? (planas.find((c) => c.id === category.parent_id) ?? null)
    : null;

  const { items, nextCursor } = await listProducts(supabase, {
    category: category.path,
    sort,
    badge: (sp.badge as "promo" | "new" | "outlet" | undefined) ?? null,
    cursor: sp.cursor ?? null,
  });

  // O coração precisa nascer no estado certo: vazio quando já está
  // salvo vira toque duplo, e o toque duplo desmarca.
  const wished = await wishedProductIds(items.map((i) => i.id));

  // Preserva sort E badge. O more() antigo só carregava o sort, então
  // paginar dentro de um filtro apagava o filtro em silêncio.
  const keep = (extra: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const atual: Record<string, string | null> = {
      sort: sort !== "featured" ? sort : null,
      badge: sp.badge ?? null,
      cursor: sp.cursor ?? null,
      ...extra,
    };
    for (const [k, v] of Object.entries(atual)) if (v) p.set(k, v);
    const qs = p.toString();
    return `/c/${slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="pg-list">
      <Breadcrumb
        trail={[
          { label: "Shop", href: "/shop" },
          ...(parent ? [{ label: parent.name, href: `/c/${parent.slug}` }] : []),
          { label: category.name },
        ]}
      />
      <h1 className="secttl left">{category.name}</h1>

      <div className="shop-body">
        <FacetRail tree={roots as CategoryNode[]} activeSlug={slug} />
        <div className="listcol">

      {(children ?? []).length > 0 && (
        <div className="cats-tabs" style={{ paddingTop: 12 }}>
          <span className="tab on">All</span>
          {(children ?? []).map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="tab" prefetch={false}>
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <div className="listbar">
        <span className="count">
          {items.length}
          {nextCursor ? "+" : ""} item{items.length === 1 ? "" : "s"}
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

      {sp.badge && (
        <div className="chips wide-only">
          <Link href={keep({ badge: null, cursor: null })} prefetch={false}>
            <b>Offer</b> {BADGE_LABEL[sp.badge as "promo" | "new" | "outlet"]}
          </Link>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <div className="i">{category.icon ?? "📦"}</div>
          Nothing in {category.name} yet.
          <br />
          <Link href="/shop" style={{ color: "var(--amber)" }}>
            Browse the whole store
          </Link>
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
