import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // nodemailer usa require dinâmico: bundlar quebra o transporte.
  serverExternalPackages: ["nodemailer"],
  experimental: {
    serverActions: {
      // A foto da entrega já sai encolhida do navegador (~250 KB),
      // mas HEIC que o canvas não decodifica sobe original. 8 MB é o
      // mesmo teto do bucket — os dois limites falam a mesma língua.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
