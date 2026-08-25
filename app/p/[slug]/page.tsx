import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import ProductBuy from "@/components/ProductBuy";
import ProductCardView from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";
import { listProducts, type ProductDetail } from "@/lib/catalog";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name, short_description")
    .eq("slug", slug)
    .maybeSingle();
  return {
    title: data?.name ? `${data.name} — Mariners Supply` : "Mariners Supply",
    description: data?.short_description ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(
      `id, slug, name, short_description, description, specs, badge, sku, tax_class,
       min_qty, max_qty, price_cents, compare_at_cents, max_price_cents, stock_qty,
       variant_count, primary_image_path, primary_category_id, brand_id,
       brands(name, slug),
       product_images(id, path, alt, sort_order),
       product_variants(id, sku, ean, option_label, options, price_cents,
                        compare_at_cents, stock_qty, track_stock, image_path,
                        active, sort_order)`
    )
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!data) notFound();

  const p = data as unknown as ProductDetail & {
    brands: { name: string; slug: string } | null;
  };
  const variants = (p.product_variants ?? [])
    .filter((v) => v.active)
    .sort((a, b) => a.sort_order - b.sort_order || a.price_cents - b.price_cents);
  const images = (p.product_images ?? []).sort((a, b) => a.sort_order - b.sort_order);

  // Relacionados da mesma categoria — busca barata, e é o que segura a
  // pessoa navegando em vez de voltar para a listagem.
  const { data: cat } = p.primary_category_id
    ? await supabase.from("categories").select("path, slug, name").eq("id", p.primary_category_id).maybeSingle()
    : { data: null };

  const related = cat
    ? (await listProducts(supabase, { category: cat.path, limit: 8 })).items.filter(
        (r) => r.id !== p.id
      )
    : [];

  return (
    <>
      <TopBar title={p.brands?.name ?? "Product"} backHref={cat ? `/c/${cat.slug}` : "/shop"} />
      <main className="pb-dock">
        <ProductBuy
          product={{
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brands?.name ?? null,
            badge: p.badge,
            sku: p.sku,
            short_description: p.short_description,
            tax_class: p.tax_class,
            min_qty: p.min_qty,
            max_qty: p.max_qty,
          }}
          images={images.length ? images : p.primary_image_path
            ? [{ id: "primary", path: p.primary_image_path, alt: p.name, sort_order: 0 }]
            : []}
          variants={variants}
        />

        {(p.specs?.length || p.description) && (
          <section className="pdp-block">
            <h3>Description</h3>
            {p.specs?.length ? (
              <ul className="specs">
                {p.specs.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="pdp-text">{p.description}</p>
            )}
          </section>
        )}

        <section className="pdp-block">
          <h3>Duty-free, delivered</h3>
          <ul className="specs">
            <li>Customs paperwork handled by us — nothing for you to sign.</li>
            <li>30% deposit now, balance at the gangway.</li>
            <li>Photo proof of delivery on your order page.</li>
          </ul>
        </section>

        {related.length > 0 && (
          <>
            <p className="subhead">More in {cat?.name}</p>
            <div className="pgrid">
              {related.slice(0, 4).map((r) => (
                <ProductCardView key={r.id} p={r} />
              ))}
            </div>
            <div className="stack" style={{ paddingTop: 2 }}>
              <Link className="btn ghost" href={`/c/${cat?.slug}`} prefetch={false}>
                See all {cat?.name}
              </Link>
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}
