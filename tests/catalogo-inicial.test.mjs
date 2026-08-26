// A planilha que vai ao ar tem de atravessar o parser do admin inteira.
// Este teste existe porque o caminho de importação já falhou calado duas
// vezes em produção, e "sobe pelo admin" só é uma instrução honesta se
// alguém conferiu que o arquivo passa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { parseCsvRows } = await import("../lib/csv.ts");
const { buildImportPlan } = await import("../lib/import.ts");

/**
 * UM arquivo, não três.
 *
 * catalogo-demo.csv saiu primeiro: nasceu antes do filtro "vendido no
 * Brasil" e trazia Indomie, Lucky Me e Century Tuna com código do país
 * de origem — a comida que a tripulação quer, mas que nenhum
 * distribuidor de Santos entrega.
 *
 * catalogo-inicial.csv saiu depois, por três motivos que se somam:
 * disputava quatro SKUs com este (SKU repetido em dois arquivos deixa a
 * ORDEM da importação decidir o preço, em silêncio); trazia nome de
 * produto em português numa loja que é toda em inglês; e o preço era
 * ad-hoc, item a item, enquanto aqui ele sai do custo por uma margem
 * única e conferível.
 *
 * Sobrar um arquivo é o ponto: catálogo com duas fontes é catálogo em
 * que ninguém sabe qual venceu.
 */
const ARQUIVO = "docs/catalogo-santos.csv";
/** Seis categorias, de 10 a 15 cada. O piso e o teto são requisito.
 *  82 → 78 na faxina de fotos: onze itens saíram porque a ÚNICA foto
 *  registrada era inaceitável (na mão, prateleira de mercado, fundo de
 *  cozinha) e quatro entraram no lugar para segurar o piso de 10. Foto
 *  ruim não é vaga: derruba a categoria inteira. */
const ESPERADAS = 78;

const plano = buildImportPlan(parseCsvRows(readFileSync(ARQUIVO, "utf-8")));

test(`${ARQUIVO}: as ${ESPERADAS} linhas passam sem apontamento`, () => {
  assert.equal(plano.valid.length, ESPERADAS);
  assert.deepEqual(plano.issues, []);
  assert.deepEqual(plano.duplicates, []);
});

test("cada categoria tem de 10 a 15 produtos", () => {
  // Requisito de negócio, não de gosto: categoria com três itens não é
  // corredor, é prateleira vazia — e categoria com quarenta some do
  // alcance de quem compra do celular a bordo.
  const porCat = {};
  for (const p of plano.valid) porCat[p.categorySlug] = (porCat[p.categorySlug] ?? 0) + 1;
  for (const [cat, n] of Object.entries(porCat)) {
    assert.ok(n >= 10 && n <= 15, `${cat} com ${n} produto(s), fora da faixa 10–15`);
  }
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
