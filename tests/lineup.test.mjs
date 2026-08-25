// Parser do line-up: a peça mais frágil do sync (depende de HTML de
// terceiro). Testa cabeçalho reconhecido, modo heurístico e recusa de lixo.
import { test } from "node:test";
import assert from "node:assert/strict";

const { parseLineup, parseBrDate, tableRows } = await import("../lib/lineup.ts");

test("parseBrDate entende dd/mm/yyyy hh:mm em hora de Santos (UTC-3)", () => {
  assert.equal(parseBrDate("24/12/2026 18:30"), "2026-12-24T21:30:00.000Z");
  assert.equal(parseBrDate("01/03/2027"), "2027-03-01T15:00:00.000Z"); // meio-dia local
  assert.equal(parseBrDate("sem data aqui"), null);
  assert.equal(parseBrDate("99/99/9999"), null);
});

test("tableRows extrai células de todas as tabelas", () => {
  const html = "<table><tr><th>Navio</th><th>ETA</th></tr><tr><td>MSC X</td><td>01/09/2026</td></tr></table>";
  const rows = tableRows(html);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], ["Navio", "ETA"]);
  assert.deepEqual(rows[1], ["MSC X", "01/09/2026"]);
});

test("cabeçalho reconhecido mapeia navio, ETA, berço e IMO", () => {
  const html = `
    <table>
      <tr><th>Navio</th><th>Previsão de Chegada</th><th>Berço</th><th>IMO</th></tr>
      <tr><td>MSC LORENA</td><td>05/09/2026 14:00</td><td>39</td><td>9876543</td></tr>
      <tr><td>CMA CGM MELODY</td><td>07/09/2026 08:30</td><td>33</td><td>1234567</td></tr>
    </table>`;
  const { rows, note } = parseLineup(html);
  assert.match(note, /cabeçalho/);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "MSC LORENA");
  assert.equal(rows[0].eta, "2026-09-05T17:00:00.000Z");
  assert.equal(rows[0].berth, "39");
  assert.equal(rows[0].imo, "9876543");
});

test("modo heurístico funciona sem cabeçalho reconhecível", () => {
  const html = `
    <table>
      <tr><td>123</td><td>MAERSK LOTA</td><td>11/09/2026 06:00</td></tr>
    </table>`;
  const { rows, note } = parseLineup(html);
  assert.match(note, /heur/);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "MAERSK LOTA");
});

test("linhas sem data são ignoradas (não grava lixo)", () => {
  const html = "<table><tr><td>Rodapé do site</td><td>Fale conosco</td></tr></table>";
  assert.equal(parseLineup(html).rows.length, 0);
});

test("HTML sem tabela devolve motivo em vez de quebrar", () => {
  const { rows, note } = parseLineup("<html><body><p>manutenção</p></body></html>");
  assert.equal(rows.length, 0);
  assert.match(note, /nenhuma tabela/);
});

test("duplicatas de navio+ETA são removidas", () => {
  const row = "<tr><td>NYK CONSTELLATION</td><td>09/09/2026 10:00</td></tr>";
  const html = `<table><tr><th>Navio</th><th>ETA</th></tr>${row}${row}</table>`;
  assert.equal(parseLineup(html).rows.length, 1);
});
