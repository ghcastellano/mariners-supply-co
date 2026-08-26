// A planilha que vai ao ar tem de atravessar o parser do admin inteira.
// Este teste existe porque o caminho de importação já falhou calado duas
// vezes em produção, e "sobe pelo admin" só é uma instrução honesta se
// alguém conferiu que o arquivo passa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { parseCsvRows } = await import("../lib/csv.ts");
const { buildImportPlan } = await import("../lib/import.ts");

const plano = buildImportPlan(parseCsvRows(readFileSync("docs/catalogo-inicial.csv", "utf-8")));

test("as 31 linhas do catálogo inicial passam sem apontamento", () => {
  assert.equal(plano.valid.length, 31);
  assert.deepEqual(plano.issues, []);
  assert.deepEqual(plano.duplicates, []);
});

test("cada item tem o que a vitrine precisa", () => {
  for (const p of plano.valid) {
    assert.ok(p.priceCents > 0, `${p.sku} sem preço`);
    assert.ok(p.categorySlug, `${p.sku} sem categoria`);
    assert.ok(p.brand, `${p.sku} sem marca`);
    // Sem EAN a foto não é comprovadamente daquele item — que é o ponto
    // inteiro de importar deste jeito em vez de buscar por nome.
    assert.match(p.ean ?? "", /^\d{8,14}$/, `${p.sku} sem código de barras`);
    assert.match(p.imageUrl ?? "", /^https:\/\/images\.open(food|beauty|products)facts\.org\//, `${p.sku} sem foto de acervo`);
  }
});

test("o SKU carrega o código de barras, para reimportar casar", () => {
  for (const p of plano.valid) assert.equal(p.sku, `EAN-${p.ean}`);
});
