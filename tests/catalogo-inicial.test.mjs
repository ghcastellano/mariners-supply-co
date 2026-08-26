// A planilha que vai ao ar tem de atravessar o parser do admin inteira.
// Este teste existe porque o caminho de importação já falhou calado duas
// vezes em produção, e "sobe pelo admin" só é uma instrução honesta se
// alguém conferiu que o arquivo passa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { parseCsvRows } = await import("../lib/csv.ts");
const { buildImportPlan } = await import("../lib/import.ts");

const ARQUIVOS = [
  ["docs/catalogo-inicial.csv", 31],
  ["docs/catalogo-demo.csv", 47],
];

const plano = buildImportPlan(
  ARQUIVOS.flatMap(([a]) => parseCsvRows(readFileSync(a, "utf-8")))
);

for (const [arquivo, quantas] of ARQUIVOS) {
  test(`${arquivo}: as ${quantas} linhas passam sem apontamento`, () => {
    const p = buildImportPlan(parseCsvRows(readFileSync(arquivo, "utf-8")));
    assert.equal(p.valid.length, quantas);
    assert.deepEqual(p.issues, []);
    assert.deepEqual(p.duplicates, []);
  });
}

test("os dois arquivos não disputam SKU entre si", () => {
  // Casamento é por SKU: se o mesmo item aparecesse nos dois com preço
  // diferente, a ordem de importação decidiria o preço — silenciosamente.
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
