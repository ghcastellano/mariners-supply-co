import Link from "next/link";
import HeroSteps from "@/components/HeroSteps";
import { unstable_cache } from "next/cache";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import CategoryIcon from "@/components/CategoryIcon";
import ProductCardView from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";
import { listProducts, type Category, type ProductCard } from "@/lib/catalog";
import { wishedProductIds } from "@/lib/wishlist";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/env";
import { hoursUntil } from "@/lib/format";
import { DEPOSIT_PCT } from "@/lib/money";

/**
 * Home = vitrine, na ordem do Sunny: hero, "Categories", grade de
 * categorias raiz, e as faixas "On promo now" e "New arrivals".
 * O seletor de navio saiu daqui — navio agora mora no perfil, e a
 * pessoa chega na loja querendo ver o que tem, não preencher um passo.
 *
 * A rota é dinâmica porque a tira do navio lê a sessão, e sessão não
 * cabe em página estática. Isso NÃO custa o cache: as quatro consultas
 * públicas da vitrine ficam em unstable_cache por 300s (o revalidate
 * que a espec pede), então o que renderiza por requisição é só a tira.
 */
export const dynamic = "force-dynamic";

type RootCat = Pick<Category, "id" | "slug" | "name" | "icon">;

type Storefront = {
  roots: RootCat[];
  counts: Record<string, number>;
  promo: ProductCard[];
  fresh: ProductCard[];
};

const EMPTY: Storefront = { roots: [], counts: {}, promo: [], fresh: [] };

/**
 * Cliente anônimo, sem cookie, de propósito: unstable_cache não pode
 * tocar em nada de escopo de requisição (cookies() aborta o cache), e
 * catálogo é o mesmo para toda a tripulação. RLS de leitura pública
 * cobre categories e products ativos, então anon vê o que deve ver.
 */
const loadStorefront = unstable_cache(
  async (): Promise<Storefront> => {
    if (!supabaseConfigured) return EMPTY;
    try {
      const db = createAnonClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const [cats, counts, promo, fresh] = await Promise.all([
        db
          .from("categories")
          .select("id, slug, name, icon")
          .eq("active", true)
          .eq("depth", 0)
          .order("sort_order"),
        db.rpc("category_counts"),
        listProducts(db, { badge: "promo", limit: 8 }),
        listProducts(db, { sort: "newest", limit: 8 }),
      ]);

      // Objeto simples, não Map: o valor atravessa a serialização do
      // cache e Map volta vazio do outro lado.
      const byId: Record<string, number> = {};
      for (const r of (counts.data ?? []) as { category_id: string; product_count: number }[]) {
        byId[r.category_id] = Number(r.product_count) || 0;
      }

      return {
        roots: (cats.data ?? []) as RootCat[],
        counts: byId,
        promo: promo.items,
        fresh: fresh.items,
      };
    } catch {
      // Catálogo fora do ar não pode devolver erro na porta de entrada.
      return EMPTY;
    }
  },
  ["home-storefront"],
  { revalidate: 300, tags: ["catalog"] }
);

type Crew =
  | { kind: "vessel"; name: string; hours: number }
  | { kind: "invite" }
  | null;

type CrewRow = {
  ship_id: string | null;
  ships: { name: string; eta: string } | null;
};

/** Perfil do usuário logado — só o que a tira do navio precisa. */
async function loadCrew(): Promise<Crew> {
  if (!supabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("ship_id, ships(name, eta)")
      .eq("id", user.id)
      .maybeSingle();

    const row = data as CrewRow | null;
    // ship_id sem ships significa navio inativo — já zarpou. A tira vira
    // convite para escolher a próxima escala, que é mais útil que um
    // nome de escala vencida.
    //
    // Perfil SEM navio nenhum não chega mais aqui: o middleware barra
    // cadastro incompleto antes da home. Então esta tira quer dizer uma
    // coisa só, e o texto pode ser específico.
    if (!row?.ship_id || !row.ships) return { kind: "invite" };
    return { kind: "vessel", name: row.ships.name, hours: hoursUntil(row.ships.eta) };
  } catch {
    return null;
  }
}

export default async function Home() {
  const [store, crew] = await Promise.all([loadStorefront(), loadCrew()]);

  // Fora do cache da vitrine de propósito: a lista de desejos é de
  // cada pessoa, e um cache compartilhado mostraria o coração de
  // outro marinheiro. As faixas são cacheadas; o estado do coração,
  // não.
  const wished = await wishedProductIds([...store.promo, ...store.fresh].map((p) => p.id));

  // Categoria vazia não entra na vitrine. "Promo · 0 items" convida o
  // toque e entrega uma página em branco — pior que não oferecer. Elas
  // continuam no drawer, que é onde se navega a estrutura inteira.
  // Retaguarda: se NENHUMA tiver produto, mostra todas, senão a home
  // fica sem porta de entrada enquanto o catálogo não chega.
  const withStock = store.roots.filter((c) => (store.counts[c.id] ?? 0) > 0);
  const shown = withStock.length > 0 ? withStock : store.roots;

  return (
    <main className="pg-home">
      <section className="homehero">
        <p className="kicker">Porto de Santos · by Mariner&apos;s Bar</p>
        <h1>Delivered to your gangway at Porto de Santos</h1>
        <p className="lead">
          Pre-order before you dock, pay a {DEPOSIT_PCT}% deposit, collect at the gangway.
        </p>
          {/* Chamadas do herói: só aparecem no desktop. No celular a
              tela já é curta e a grade de categorias vem logo abaixo. */}
          <div className="herocta">
            <Link href="/shop" className="btn" prefetch={false}>
              Shop all supplies
            </Link>
            <Link href="/ports" className="btn ghost" prefetch={false}>
              Port line-up &amp; cut-offs
            </Link>
          </div>
      </section>

      <h2 className="secttl">
            Categories
            <Link href="/shop" className="allx" prefetch={false}>
              Browse all ›
            </Link>
          </h2>

      {shown.length === 0 ? (
        <div className="empty">
          <div className="i">🧭</div>
          The shelves are being stocked. Check back shortly.
        </div>
      ) : (
        <div className="catgrid">
          {shown.map((c) => {
            const n = store.counts[c.id] ?? 0;
            return (
              <Link key={c.id} href={`/c/${c.slug}`} className="catcard" prefetch={false}>
<CategoryIcon slug={c.slug} fallback={c.icon} />
                <span className="tx">
                  <span className="nm">{c.name}</span>
                  {n > 0 && (
                    <span className="ct">{n === 1 ? "1 item" : `${n} items`}</span>
                  )}
                </span>
                <span className="chev" aria-hidden>
                  ›
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* A fileira do herói divide-se em dois no desktop. Quem tem navio
          vê o painel do navio; quem não tem via 40% de preto — e é o
          estado de todo visitante novo, inclusive o que chega pelo
          Google. Os dois nunca aparecem juntos. */}
      {!crew && <HeroSteps />}

      {crew?.kind === "vessel" && (
        <Link href="/account" className="vstrip">
          <span className="ic" aria-hidden>
            ⚓
          </span>
          <span className="tx">
            <span className="lb">Your vessel</span>
            <span className="nm">{crew.name}</span>
          </span>
          <span className="eta">{crew.hours > 0 ? `${crew.hours}h to berth` : "Alongside now"}</span>
        </Link>
      )}

      {crew?.kind === "invite" && (
        <Link href="/account" className="vstrip">
          <span className="ic" aria-hidden>
            ⚓
          </span>
          <span className="tx">
            <span className="lb">Your vessel</span>
            <span className="nm">No call scheduled — pick your next vessel</span>
          </span>
          <span className="eta">Update ›</span>
        </Link>
      )}

      {/* Faixa some inteira quando não há promoção: prateleira vazia
          com título é pior do que prateleira nenhuma. */}
      {store.promo.length > 0 && (
        <section>
          <h2 className="secttl">
            On promo now
            <Link href="/shop?badge=promo" className="allx" prefetch={false}>
              Browse all ›
            </Link>
          </h2>
          <div className="rail">
            {store.promo.map((p) => (
              // Nenhuma imagem com priority: no celular a grade de
              // categorias empurra as faixas para fora da primeira
              // tela, e priority em foto que ninguém vê rouba banda
              // do LCP real — que aqui é o texto do hero.
              <ProductCardView key={p.id} p={p} wished={wished.has(p.id)} sizes="(max-width: 620px) 92vw, (max-width: 767px) 46vw, (max-width: 1023px) 30vw, 360px" />
            ))}
          </div>
        </section>
      )}

      {store.fresh.length > 0 && (
        <section>
          <h2 className="secttl">
            New arrivals
            <Link href="/shop?sort=newest" className="allx" prefetch={false}>
              Browse all ›
            </Link>
          </h2>
          <div className="rail">
            {store.fresh.map((p) => (
              <ProductCardView key={p.id} p={p} wished={wished.has(p.id)} sizes="(max-width: 620px) 92vw, (max-width: 767px) 46vw, (max-width: 1023px) 30vw, 360px" />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
