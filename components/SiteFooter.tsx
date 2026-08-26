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
const SECTIONS = [
  {
    title: "Customer Service",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Ports & delivery schedule", href: "/ports" },
      { label: "Contact us", href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
  {
    title: "Relevant Links",
    links: [
      { label: "Catalog & flyers", href: "/brochures" },
      { label: "Photo credits", href: "/attributions" },
      { label: "Promotions", href: "/shop?badge=promo" },
      { label: "New arrivals", href: "/shop?badge=new" },
      { label: "Captain rewards", href: "/captain" },
    ],
  },
  {
    title: "My Account",
    links: [
      { label: "My orders", href: "/orders" },
      { label: "My wish list", href: "/wishlist" },
      { label: "Account information", href: "/account" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    title: "Our Offices",
    links: [
      { label: "Mariner's Bar — Porto de Santos, Brazil", href: "/" },
      { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
];

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

      <div className="paywall" aria-label="Accepted payment methods">
        <span>Apple&nbsp;Pay</span>
        <span>G&nbsp;Pay</span>
        <span>Mastercard</span>
        <span>VISA</span>
        <span>PIX</span>
      </div>

      <div className="sunfoot-legal">
        © {new Date().getFullYear()} Mariners Supply — by Mariner&apos;s Bar, Porto de Santos.
        <br />
        <Link href="/terms">Terms &amp; Conditions</Link> · <Link href="/privacy">Privacy Policy</Link>
      </div>
    </footer>
  );
}
