import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import ReferralClaim from "@/components/ReferralClaim";
import DesktopStage from "@/components/DesktopStage";
import SiteChrome from "@/components/SiteChrome";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://mariners-supply.vercel.app"),
  title: {
    default: "Mariners Supply",
    template: "%s · Mariners Supply",
  },
  description:
    "Pre-order supplies before docking — delivered at the gangway. Porto de Santos, by Mariner's Bar.",
  openGraph: {
    siteName: "Mariners Supply",
    title: "Mariners Supply — gangway delivery at Porto de Santos",
    description:
      "Your order rides with your vessel's ETA. Pre-order before docking, pay a 30% deposit, receive at the gangway.",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    title: "Mariners",
    statusBarStyle: "black-translucent",
  },
};

// Correção do bug de viewport mobile: theme-color escuro + viewport-fit=cover
// fazem o app pintar o viewport inteiro, sem faixa clara sobrando.
export const viewport: Viewport = {
  themeColor: "#01060D",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <div className="page">
            <DesktopStage />
            {/* Cabeçalho e rodapé no layout, não por página: no Sunny
                são globais, e o cliente conta com eles em toda tela. */}
            <div className="shell">
              <SiteChrome />
              {children}
              <SiteFooter />
            </div>
          </div>
        </CartProvider>
        <ReferralClaim />
      </body>
    </html>
  );
}
