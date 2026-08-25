import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import ProductCardView from "@/components/ProductCard";
import SortSelect from "@/components/SortSelect";
import { createClient } from "@/lib/supabase/server";
import { listProducts, PAGE_SIZE, SORT_LABEL, type Category, type SortKey } from "@/lib/catalog";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("name, description")
    .eq("slug", slug)
    .maybeSingle();
  return {
    title: data?.name ?? undefined,
    description: data?.description ?? undefined,
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

  // Filhos e produtos na mesma ida: o caminho materializado resolve a
  // subárvore inteira com um LIKE, sem consulta recursiva.
  const [{ data: children }, { items, nextCursor }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name, icon, sort_order")
      .eq("parent_id", category.id)
      .eq("active", true)
      .order("sort_order"),
    listProducts(supabase, { category: category.path, sort, cursor: sp.cursor ?? null }),
  ]);

  const more = (cursor: string) => {
    const p = new URLSearchParams();
    if (sort !== "featured") p.set("sort", sort);
    p.set("cursor", cursor);
    return `/c/${slug}?${p.toString()}`;
  };

  return (
    <>
      <TopBar title={category.name} backHref="/shop" />
      <main className="pb-nav">
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
              <ProductCardView key={p.id} p={p} priority={i < 4} />
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
      <BottomNav />
    </>
  );
}
