import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import ProductCardView from "@/components/ProductCard";
import SortSelect from "@/components/SortSelect";
import { createClient } from "@/lib/supabase/server";
import { listProducts, PAGE_SIZE, SORT_LABEL, type Category, type SortKey } from "@/lib/catalog";
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
  searchParams: Promise<{ sort?: string; cursor?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const sort = (sp.sort as SortKey) ?? "featured";

  const { data: cat } = await supabase
    .from("categories")
    .select("id, parent_id, slug, name, icon, image_path, path, depth, active, sort_order")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (!cat) notFound();
  const category = cat as Category;

  // Filhos, produtos e o pai da migalha na mesma ida: o caminho
  // materializado resolve a subárvore inteira com um LIKE, sem consulta
  // recursiva, e a trilha não custa mais um salto ao banco.
  const [{ data: children }, { items, nextCursor }, parentRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name, icon, sort_order")
      .eq("parent_id", category.id)
      .eq("active", true)
      .order("sort_order"),
    listProducts(supabase, { category: category.path, sort, cursor: sp.cursor ?? null }),
    category.parent_id
      ? supabase.from("categories").select("slug, name").eq("id", category.parent_id).maybeSingle()
      : null,
  ]);
  const parent = parentRes?.data ?? null;

  // O coração precisa nascer no estado certo: vazio quando já está
  // salvo vira toque duplo, e o toque duplo desmarca.
  const wished = await wishedProductIds(items.map((i) => i.id));

  const more = (cursor: string) => {
    const p = new URLSearchParams();
    if (sort !== "featured") p.set("sort", sort);
    p.set("cursor", cursor);
    return `/c/${slug}?${p.toString()}`;
  };

  return (
    <main>
      <Breadcrumb
        trail={[
          { label: "Shop", href: "/shop" },
          ...(parent ? [{ label: parent.name, href: `/c/${parent.slug}` }] : []),
          { label: category.name },
        ]}
      />
      <h1 className="secttl left">{category.name}</h1>

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
        <SortSelect value={sort} options={SORT_LABEL} />
      </div>

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
        <div className="stack" style={{ paddingTop: 6 }}>
          <Link className="btn ghost" href={more(nextCursor)} prefetch={false}>
            Load {PAGE_SIZE} more
          </Link>
        </div>
      )}
    </main>
  );
}
