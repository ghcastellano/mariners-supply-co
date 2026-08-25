import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Foto de produto vem do Storage público do Supabase. next/image
    // faz o resize e serve AVIF/WebP: numa grade de 24 cards isso é a
    // diferença entre 6 MB e 300 KB no wifi do navio.
    remotePatterns: [
      { protocol: "https", hostname: "cuaocjxofaizefzcxlyc.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
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
