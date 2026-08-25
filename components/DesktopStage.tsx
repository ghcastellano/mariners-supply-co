import QRCode from "qrcode";
import { SITE_URL } from "@/lib/env";

/**
 * Painel de marca que só existe em telas grandes (>=1080px).
 * O tripulante compra no celular — no desktop a página vira vitrine
 * com QR para levar a loja ao aparelho onde ela é usada de verdade.
 * Fica fora do fluxo de leitura em mobile (display:none), então não
 * custa nada no aparelho que importa.
 */
export default async function DesktopStage() {
  const qr = await QRCode.toString(SITE_URL, {
    type: "svg",
    margin: 1,
    color: { dark: "#040D1A", light: "#EEF4F8" },
  });

  return (
    <aside className="stage-panel" aria-hidden="true">
      <div className="stage-inner">
        <p className="stage-logo">
          Mariners <b>Supply</b>
        </p>
        <h1 className="stage-title">
          Your kit rides with
          <br />
          your ship&apos;s ETA.
        </h1>
        <p className="stage-sub">
          Pre-order before docking. Pay 30% now, the rest at the gangway. Porto de Santos, by
          Mariner&apos;s Bar.
        </p>

        <ul className="stage-list">
          <li>
            <b>⚓</b> Pick your vessel from the live port line-up
          </li>
          <li>
            <b>📦</b> We shop fresh in Santos, matched to your ETA
          </li>
          <li>
            <b>🤝</b> Delivered at the gangway — photo proof
          </li>
        </ul>

        <div className="stage-qr">
          <div className="qr-box" dangerouslySetInnerHTML={{ __html: qr }} />
          <p>
            <b>Open on your phone</b>
            <br />
            Scan to order from the mess room
          </p>
        </div>
      </div>
    </aside>
  );
}
