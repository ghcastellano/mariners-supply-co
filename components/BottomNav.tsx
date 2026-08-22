"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";

const TABS = [
  { href: "/shop", label: "Shop", icon: "⚓" },
  { href: "/cart", label: "Cart", icon: "🛒" },
  { href: "/orders", label: "Orders", icon: "📦" },
  { href: "/account", label: "Account", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { count, ready } = useCart();

  return (
    <nav className="nav" aria-label="Navigation">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={pathname.startsWith(t.href) ? "on" : ""}>
          <span className="i">{t.icon}</span>
          {t.label}
          {t.href === "/cart" && (
            <span className={`badge ${ready && count > 0 ? "show" : ""}`}>{count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
