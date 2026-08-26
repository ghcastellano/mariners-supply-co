#!/usr/bin/env node
/**
 * Sobe uma planilha de catálogo — com as fotos — de linha de comando.
 *
 * A importação do admin (/admin/catalog/import) faz o mesmo e é a via
 * normal. Este script existe para o carregamento inicial, que são
 * dezenas de fotos baixadas de fora: numa Server Action isso estoura o
 * tempo da requisição, e no terminal não.
 *
 * Precisa de uma sessão de admin, porque é `is_admin()` que libera o
 * bucket das fotos e a escrita no catálogo. Não existe chave
 * service_role no projeto, de propósito.
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *     node scripts/importar-catalogo.mjs catalogo.csv [--seco]
 *
 * `--seco` mostra o que faria e não grava nada.
 *
 * Idempotente: casa por SKU. Rodar de novo atualiza, não duplica, e não
 * rebaixa foto de produto que já tem capa.
 */

import { readFileSync, existsSync } from "node:fs";

/**
 * Lê .env.local sem depender de `set -a && . ./.env.local` na frente do
 * comando: comando composto não casa com a regra de permissão, e o
 * script que precisa da variável é quem deve saber onde ela mora.
 */
function carregarEnv(arquivo = ".env.local") {
  try {
    for (const linha of readFileSync(arquivo, "utf-8").split("\n")) {
      const m = linha.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const valor = m[2].replace(/^["']|["']$/g, "");
      if (!process.env[m[1]]) process.env[m[1]] = valor;
    }
  } catch {
    // sem arquivo: as variáveis podem já vir do ambiente
  }
}
carregarEnv();
import { createClient } from "@supabase/supabase-js";

const CSV = process.argv[2];
const SECO = process.argv.includes("--seco");
/**
 * Credenciais: do ambiente, ou do arquivo que conta-servico.mjs deixou.
 * Pelo arquivo é melhor — senha em variável de ambiente aparece na linha
 * de comando e no histórico do shell.
 */
const ARQUIVO_CONTA = "/tmp/conta-servico.json";
let { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if ((!ADMIN_EMAIL || !ADMIN_PASSWORD) && existsSync(ARQUIVO_CONTA)) {
  const c = JSON.parse(readFileSync(ARQUIVO_CONTA, "utf-8"));
  ADMIN_EMAIL = c.email;
  ADMIN_PASSWORD = c.senha;
}

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET = "product-images";

function morre(msg) {
  console.error(msg);
  process.exit(1);
}
if (!CSV) morre("uso: importar-catalogo.mjs <arquivo.csv> [--seco]");
if (!URL_SB || !ANON) morre("faltam NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY");
if (!SECO && (!ADMIN_EMAIL || !ADMIN_PASSWORD)) morre("faltam ADMIN_EMAIL / ADMIN_PASSWORD");

/* ---- CSV: aspas duplas com escape doblado, que é o que o Excel gera ---- */
function lerCsv(texto) {
  const linhas = [];
  let campo = "";
  let linha = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas.filter((l) => l.some((v) => v !== ""));
  return resto.map((l) => Object.fromEntries(cab.map((k, i) => [k.trim(), (l[i] ?? "").trim()])));
}

const slug = (v) =>
  v.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ---- Crédito de foto: espelha lib/fotolicenca.ts ---- */
const ACERVOS = {
  "images.openfoodfacts.org": ["https://world.openfoodfacts.org", "Open Food Facts"],
  "images.openbeautyfacts.org": ["https://world.openbeautyfacts.org", "Open Beauty Facts"],
  "images.openproductsfacts.org": ["https://world.openproductsfacts.org", "Open Products Facts"],
};
function credito(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  const a = ACERVOS[u.hostname];
  if (!a) return null;
  const m = u.pathname.match(/\/images\/products\/([0-9/]+)\/[^/]+$/);
  const ean = m ? m[1].replace(/\//g, "") : null;
  return {
    license: "CC BY-SA 3.0",
    attribution: `${a[1]} contributors · CC BY-SA 3.0`,
    source_url: ean ? `${a[0]}/product/${ean}` : a[0],
    source_title: a[1],
  };
}

/* ------------------------------------------------------------------ */

const linhas = lerCsv(readFileSync(CSV, "utf-8"));
console.log(`${linhas.length} linha(s) em ${CSV}${SECO ? "  [ensaio]" : ""}`);
if (SECO) {
  for (const l of linhas) console.log(`  ${l.sku}  ${l.name}  $${l.price}  ${l.category}  foto:${l.image_url ? "sim" : "não"}`);
  process.exit(0);
}

const db = createClient(URL_SB, ANON, { auth: { persistSession: false } });
const { error: erroLogin } = await db.auth.signInWithPassword({
  email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
});
if (erroLogin) morre(`login: ${erroLogin.message}`);

// Confere o papel antes de tentar gravar: erro de RLS no meio do laço é
// difícil de ler, e "não é admin" é a causa em nove de cada dez vezes.
const { data: eu } = await db.auth.getUser();
const { data: perfil } = await db.from("profiles").select("role").eq("id", eu.user.id).single();
if (perfil?.role !== "admin") morre(`${ADMIN_EMAIL} não é admin (role=${perfil?.role ?? "?"})`);

/**
 * Endereço público do produto.
 *
 * O admin monta `nome-sku`, o que numa planilha com SKU de código de
 * barras vira /p/cafe-pilao-tradicional-250-g-ean-7896089011982. O
 * código não ajuda ninguém a ler nem a achar; entra só quando dois
 * produtos disputam o mesmo endereço.
 *
 * Produto que já existe MANTÉM o endereço que tem: trocar slug de item
 * publicado quebra link que a tripulação já mandou por WhatsApp.
 */
async function enderecoDe(l, jaExiste) {
  if (jaExiste?.slug) return jaExiste.slug;
  const limpo = slug(l.name);
  const { data } = await db.from("products").select("id").eq("slug", limpo).maybeSingle();
  return data ? slug(`${l.name}-${l.sku}`) : limpo;
}

/* Categorias e marcas, resolvidas de uma vez. */
const { data: cats } = await db.from("categories").select("id, slug");
const catPorSlug = new Map((cats ?? []).map((c) => [c.slug, c.id]));

const marcas = [...new Set(linhas.map((l) => l.brand).filter(Boolean))];
if (marcas.length) {
  await db.from("brands").upsert(marcas.map((n) => ({ slug: slug(n), name: n })),
    { onConflict: "slug", ignoreDuplicates: true });
}
const { data: bs } = await db.from("brands").select("id, slug");
const marcaPorSlug = new Map((bs ?? []).map((b) => [b.slug, b.id]));

let gravados = 0, comFoto = 0, falhas = 0;

for (const l of linhas) {
  const catId = l.category ? catPorSlug.get(l.category) : null;
  if (l.category && !catId) { console.error(`  ✗ ${l.sku}: categoria "${l.category}" não existe`); falhas++; continue; }

  const { data: atual } = await db.from("products")
    .select("id, slug, primary_image_path").eq("sku", l.sku).maybeSingle();

  const { data: prod, error: e1 } = await db.from("products").upsert({
    sku: l.sku,
    slug: await enderecoDe(l, atual),
    name: l.name,
    short_description: l.short_description || null,
    brand_id: l.brand ? (marcaPorSlug.get(slug(l.brand)) ?? null) : null,
    primary_category_id: catId,
    tax_class: "bonded",
    active: l.active !== "false",
  }, { onConflict: "sku" }).select("id, primary_image_path").single();
  if (e1) { console.error(`  ✗ ${l.sku}: ${e1.message}`); falhas++; continue; }

  const cents = Math.round(Number(l.price) * 100);
  const { error: e2 } = await db.from("product_variants").upsert({
    product_id: prod.id,
    sku: l.sku,
    ean: l.ean || null,
    price_cents: cents,
    stock_qty: Number(l.stock || 0),
    track_stock: false, // o chandler repõe do fornecedor a cada escala
    active: l.active !== "false",
  }, { onConflict: "sku" });
  if (e2) { console.error(`  ✗ ${l.sku} variante: ${e2.message}`); falhas++; continue; }

  if (catId) {
    await db.from("product_categories").upsert(
      { product_id: prod.id, category_id: catId },
      { onConflict: "product_id,category_id", ignoreDuplicates: true }
    );
  }

  // Foto só quando ainda não há capa: reimportar não sobrescreve a foto
  // do fornecedor que alguém já subiu por cima da do acervo.
  if (l.image_url && !prod.primary_image_path) {
    const ok = await subirFoto(prod.id, l.image_url, l.name);
    if (ok) comFoto++;
  }

  gravados++;
  console.log(`  ✓ ${l.sku}  ${l.name}  $${l.price}`);
}

console.log(`\n${gravados} produto(s), ${comFoto} foto(s) nova(s), ${falhas} falha(s).`);
await db.auth.signOut();

async function subirFoto(produtoId, url, alt) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "MarinersSupply/1.0 (ahoy@marinerssupplyco.com)" } });
    if (!r.ok) { console.error(`    foto HTTP ${r.status}`); return false; }
    const tipo = (r.headers.get("content-type") || "").split(";")[0].trim();
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[tipo];
    if (!ext) { console.error(`    foto de tipo ${tipo || "?"}`); return false; }
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.byteLength < 5000 || buf.byteLength > 5 * 1024 * 1024) {
      console.error(`    foto de ${buf.byteLength} bytes, fora da faixa`); return false;
    }
    const caminho = `products/${produtoId}/openfacts.${ext}`;
    const { error } = await db.storage.from(BUCKET)
      .upload(caminho, buf, { contentType: tipo, upsert: true });
    if (error) { console.error(`    upload: ${error.message}`); return false; }

    const c = credito(url);
    const { error: e } = await db.from("product_images").insert({
      product_id: produtoId, path: caminho, alt, sort_order: 0, ...(c ?? {}),
    });
    if (e) { console.error(`    product_images: ${e.message}`); return false; }
    return true;
  } catch (err) {
    console.error(`    foto: ${err.message}`);
    return false;
  }
}
