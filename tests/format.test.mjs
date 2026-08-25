// Testes do núcleo puro de regras (dinheiro, janelas, navegação).
// Roda com o runner nativo: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

const fmt = await import("../lib/format.ts");

test("usd formata com 2 casas", () => {
  assert.equal(fmt.usd(36), "USD 36.00");
  assert.equal(fmt.usd(10.8), "USD 10.80");
  assert.equal(fmt.usd(0), "USD 0.00");
});

test("depósito de 30% bate com o protótipo (36 → 10.80 / 25.20)", () => {
  const subtotal = 36;
  const dep = subtotal * fmt.DEPOSIT_PCT;
  assert.equal(fmt.usd(dep), "USD 10.80");
  assert.equal(fmt.usd(subtotal - dep), "USD 25.20");
});

test("hoursUntil nunca é negativo e arredonda", () => {
  // 100min = 1.67h → 2. Evita o limite exato de .5, que oscilaria com
  // os milissegundos de execução do próprio teste.
  const in100m = new Date(Date.now() + 100 * 60e3).toISOString();
  assert.equal(fmt.hoursUntil(in100m), 2);
  const past = new Date(Date.now() - 3600e3).toISOString();
  assert.equal(fmt.hoursUntil(past), 0);
});

test("janela de pedido fecha exatamente cutoff horas antes do ETA", () => {
  const eta = new Date(Date.now() + 30 * 3600e3); // 30h
  assert.equal(fmt.orderWindowOpen(eta, 26), true); // fecha em 4h
  assert.equal(fmt.orderWindowOpen(eta, 31), false); // já fechou
  const close = fmt.orderCloseAt(eta, 26);
  assert.equal(eta.getTime() - close.getTime(), 26 * 3600e3);
});

test("shortShipName pega a última palavra", () => {
  assert.equal(fmt.shortShipName("CMA CGM MELODY"), "MELODY");
  assert.equal(fmt.shortShipName("MSC LORENA"), "LORENA");
  assert.equal(fmt.shortShipName("  NYK  CONSTELLATION  "), "CONSTELLATION");
});

test("safeNext só aceita caminhos internos", () => {
  assert.equal(fmt.safeNext("/checkout"), "/checkout");
  assert.equal(fmt.safeNext("/orders/MS-1"), "/orders/MS-1");
  assert.equal(fmt.safeNext("//evil.com"), "/shop");
  assert.equal(fmt.safeNext("https://evil.com"), "/shop");
  assert.equal(fmt.safeNext(null), "/shop");
  assert.equal(fmt.safeNext(undefined, "/"), "/");
});

test("ETA ida-e-volta no fuso de Santos (UTC-3, sem DST)", () => {
  const local = "2026-12-24T18:30";
  const iso = fmt.localInputToIso(local);
  assert.equal(iso, "2026-12-24T21:30:00.000Z");
  assert.equal(fmt.etaToLocalInput(iso), local);
});
