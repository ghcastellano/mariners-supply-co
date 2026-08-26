import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/env";

/**
 * Rodapé em acordeão, como o do Sunny. Fechado por padrão: no celular
 * um rodapé aberto com quatro colunas é uma tela inteira de rolagem
 * que ninguém lê.
 *
 * [otim] <details>/<summary> nativos em vez de estado em JavaScript —
 * abre mesmo antes de o React hidratar e funciona com leitor de tela
 * sem nenhuma aria extra.
 */
/**
 * Três colunas de peso parecido, e não cinco desiguais.
 *
 * Estavam 3, 5, 4 e 2 links — a última com um endereço postal
 * disfarçado de link para a home, que é afordância mentirosa: clicar
 * num endereço tem de fazer algo com o endereço, ou não ser link.
 * Rodapé com colunas de alturas muito diferentes lê como lista de
 * sobras, não como mapa do site.
 *
 * "Photo credits" saiu daqui e foi para a linha legal: é obrigação de
 * licença, e mora junto de termos e privacidade.
 */
const SECTIONS = [
  {
    title: "Shop",
    links: [
      { label: "Catalog & flyers", href: "/brochures" },
      { label: "New arrivals", href: "/shop?sort=newest" },
      { label: "Promotions", href: "/shop?badge=promo" },
      { label: "Captain rewards", href: "/captain" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Ports & delivery schedule", href: "/ports" },
      { label: "Contact us", href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
  {
    title: "My Account",
    links: [
      { label: "My orders", href: "/orders" },
      { label: "My wish list", href: "/wishlist" },
      { label: "Account information", href: "/account" },
    ],
  },
];

/**
 * Marcas de pagamento em uma linha discreta.
 *
 * Eram cinco retângulos BRANCOS com texto preto — o elemento mais claro
 * de uma página escura inteira, e o menos importante dela. Selo de
 * pagamento é para tranquilizar quem já decidiu comprar; quando ele
 * grita mais que o produto, o efeito se inverte e a página passa a
 * parecer aquelas lojas que precisam provar que aceitam cartão.
 */
const PAGAMENTO = ["Apple Pay", "Google Pay", "Mastercard", "VISA", "PIX"];

export default function SiteFooter() {
  return (
    <footer className="sunfoot">
      {/* Coluna de marca: só aparece no desktop, onde o rodapé vira
          colunas em vez de acordeão. No celular o CSS a esconde e o
          acordeão continua exatamente como está — ele foi validado. */}
      <div className="sunfoot-brand">
        <p className="bl">
          Mariners <b>Supply</b>
        </p>
        <p>
          Pre-order before docking. 30% deposit now, the rest at the gangway. Porto de Santos, by
          Mariner&apos;s Bar.
        </p>
        <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>
      </div>
      {SECTIONS.map((s) => (
        <details key={s.title} className="sunfoot-sec">
          <summary>{s.title}</summary>
          <div className="sunfoot-body">
            {s.links.map((l) => (
              <Link key={l.label} href={l.href}>
                {l.label}
              </Link>
            ))}
          </div>
        </details>
      ))}

      {/* Pagamento e linha legal num bloco só. Eram dois itens da grade,
          cada um com o próprio border-top, e o column-gap abria um corte
          visível no meio do fio — um traço partido lê como defeito de
          renderização. */}
      <div className="sunfoot-base">
      <p className="paywall">
        <span className="lb">We accept</span>
        {PAGAMENTO.join(" · ")}
      </p>

      <div className="sunfoot-legal">
        © {new Date().getFullYear()} Mariners Supply — by Mariner&apos;s Bar, Porto de Santos.
        <br />
        <Link href="/terms">Terms &amp; Conditions</Link> ·{" "}
        <Link href="/privacy">Privacy Policy</Link> ·{" "}
        <Link href="/attributions">Photo credits</Link>
      </div>
      </div>
    </footer>
  );
}
