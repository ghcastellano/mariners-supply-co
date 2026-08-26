import Link from "next/link";
import { IconCap, IconHeart, IconPackage, IconUser } from "./Icon";
import CategoryIcon from "./CategoryIcon";

/**
 * Navegação das telas de conta, à direita a partir de 1024px.
 *
 * Não é componente inventado: é o mesmo `.catgrid` de `.catcard` que já
 * vivia dentro de app/account/page.tsx, recortado para servir as três
 * telas em vez de ser repetido em cada uma. Server Component, sem JS.
 *
 * Os dois blocos precisam vir juntos daqui porque `position: sticky`
 * não gruda dois irmãos: o Sign Out entra como filho, não como vizinho.
 */

type Item = { href: string; icon: React.ReactNode; nome: string; nota: string };

/* Traço da família no lugar do emoji: o rail vive ao lado dos catcards
   da home, que já usam o traço — dois estilos de ícone na mesma classe
   liam como duas interfaces. */
const ITENS: Item[] = [
  { href: "/account", icon: <IconUser className="ic" size={19} />, nome: "My Account", nota: "Name, vessel and port" },
  { href: "/orders", icon: <IconPackage className="ic" size={19} />, nome: "My Orders", nota: "Track every delivery" },
  { href: "/wishlist", icon: <IconHeart className="ic" size={19} />, nome: "My Wish List", nota: "Saved for the next call" },
  { href: "/captain", icon: <IconCap className="ic" size={19} />, nome: "Captain rewards", nota: "Your code and credit" },
];

export default function AccountRail({
  current,
  isAdmin = false,
  children,
}: {
  /** Rota da tela atual — sai da lista e marca aria-current nas outras. */
  current: string;
  isAdmin?: boolean;
  /** O .stack do Sign Out, que só a tela de conta tem. */
  children?: React.ReactNode;
}) {
  const itens = ITENS.filter((i) => i.href !== current);

  return (
    <nav className="acct-rail" aria-label="My account">
      <div className="catgrid">
        {itens.map((i) => (
          <Link key={i.href} href={i.href} className="catcard">
            {i.icon}
            <span className="tx">
              <span className="nm">{i.nome}</span>
              <span className="ct">{i.nota}</span>
            </span>
            <span className="chev" aria-hidden>
              ›
            </span>
          </Link>
        ))}
        {isAdmin && (
          <Link href="/admin" className="catcard">
            {/* o traço de "tools" já existe no CategoryIcon — reúso, não desenho novo */}
            <CategoryIcon slug="tools" size={19} />
            <span className="tx">
              <span className="nm">Staff panel</span>
              <span className="ct">Orders, catalog and line-up</span>
            </span>
            <span className="chev" aria-hidden>
              ›
            </span>
          </Link>
        )}
      </div>
      {children}
    </nav>
  );
}
