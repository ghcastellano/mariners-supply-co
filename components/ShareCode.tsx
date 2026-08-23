"use client";

import { useState } from "react";

export default function ShareCode({ code, link }: { code: string; link: string }) {
  const [label, setLabel] = useState("Share on WhatsApp");

  const msg =
    `Order from Mariners Supply with my code ${code} — delivered at the gangway ` +
    `in Santos. ${link}`;

  async function share() {
    // Web Share abre o WhatsApp direto no celular; no desktop cai no copiar.
    if (navigator.share) {
      try {
        await navigator.share({ title: "Mariners Supply", text: msg, url: link });
        return;
      } catch {
        // usuário cancelou — segue para o fallback
      }
    }
    try {
      await navigator.clipboard.writeText(msg);
      setLabel("Copied! ✓");
      setTimeout(() => setLabel("Share on WhatsApp"), 1800);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    }
  }

  return (
    <button className="share" onClick={share}>
      {label}
    </button>
  );
}
