import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart";

export const metadata: Metadata = {
  title: {
    default: "Mariners Supply",
    template: "%s · Mariners Supply",
  },
  description:
    "Pre-order supplies before docking — delivered at the gangway. Porto de Santos, by Mariner's Bar.",
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
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <CartProvider>
          <div className="shell">{children}</div>
        </CartProvider>
      </body>
    </html>
  );
}
