import Link from "next/link";
import type { BrandOption, CategoryNode } from "@/lib/catalog";

/**
 * Trilho de categorias da listagem, à esquerda, a partir de 1024px.
 *
 * Server Component de propósito: é navegação, não interação — zero JS
 * no navegador. O CategoryDrawer não servia porque é o hambúrguer do
 * celular, é client, e abre por cima da tela em vez de morar ao lado.
 *
 * Abre os filhos SÓ do ramo em que a pessoa está. A árvore inteira
 * aberta são 28 linhas de uma vez — vira parede, não navegação.
 */

function ramoAberto(root: CategoryNode, activeSlug: string | null): boolean {
  if (!activeSlug) return false;
  if (root.slug === activeSlug) return true;
  const desce = (n: CategoryNode): boolean =>
    n.children.some((c) => c.slug === activeSlug || desce(c));
  return desce(root);
}

export default function FacetRail({
  tree,
  activeSlug,
  brands = [],
  activeBrand = null,
  brandHref,
}: {
  tree: CategoryNode[];
  /** Slug da categoria aberta; null em /shop. */
  activeSlug: string | null;
  /** Só marcas com produto ativo — filtro que devolve vazio é armadilha. */
  brands?: BrandOption[];
  activeBrand?: string | null;
  /** Monta a URL preservando o resto dos filtros. */
  brandHref?: (slug: string | null) => string;
}) {
  if (tree.length === 0) return null;

  return (
    <aside className="facets" aria-label="Filters">
      <div className="facet">
        <h2 className="facet-t">Categories</h2>
        <ul className="facet-l">
          <li>
            <Link href="/shop" className={activeSlug ? "" : "on"}>
              All products
            </Link>
          </li>
          {tree.map((root) => (
            <li key={root.id}>
              <Link href={`/c/${root.slug}`} className={root.slug === activeSlug ? "on" : ""}>
                <span className="ic" aria-hidden>
                  {root.icon ?? "▪"}
                </span>
                {root.name}
                {root.children.length > 0 && <span className="ct">{root.children.length}</span>}
              </Link>
              {ramoAberto(root, activeSlug) && root.children.length > 0 && (
                <ul className="sub">
                  {root.children.map((c) => (
                    <li key={c.id}>
                      <Link href={`/c/${c.slug}`} className={c.slug === activeSlug ? "on" : ""}>
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Some inteira quando não há marca cadastrada — seção vazia lê
          como filtro quebrado. */}
      {brands.length > 0 && brandHref && (
        <div className="facet">
          <h2 className="facet-t">Brands</h2>
          <ul className="facet-l">
            {activeBrand && (
              <li>
                <Link href={brandHref(null)}>All brands</Link>
              </li>
            )}
            {brands.map((b) => (
              <li key={b.id}>
                <Link
                  href={brandHref(b.slug === activeBrand ? null : b.slug)}
                  className={b.slug === activeBrand ? "on" : ""}
                >
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
