// Detecção de país e montagem do número: erra aqui e o cliente fica
// inalcançável — é o único canal que chega em quem já embarcou.
import { test } from "node:test";
import assert from "node:assert/strict";

const { detectCountry, buildPhone, dialOf, COUNTRIES } = await import("../lib/countries.ts");

function withEnv({ languages, timeZone }, fn) {
  const origNav = globalThis.navigator;
  const origResolved = Intl.DateTimeFormat.prototype.resolvedOptions;
  try {
    if (languages) {
      Object.defineProperty(globalThis, "navigator", {
        value: { languages, language: languages[0] },
        configurable: true,
      });
    } else {
      // simula ambiente sem navigator (SSR)
      Object.defineProperty(globalThis, "navigator", { value: undefined, configurable: true });
    }
    if (timeZone) {
      Intl.DateTimeFormat.prototype.resolvedOptions = function () {
        return { timeZone };
      };
    }
    return fn();
  } finally {
    Object.defineProperty(globalThis, "navigator", { value: origNav, configurable: true });
    Intl.DateTimeFormat.prototype.resolvedOptions = origResolved;
  }
}

test("detecta país pela região da língua do navegador", () => {
  assert.equal(withEnv({ languages: ["en-PH", "fil"] }, detectCountry), "PH");
  assert.equal(withEnv({ languages: ["pt-BR"] }, detectCountry), "BR");
  assert.equal(withEnv({ languages: ["ru-UA"] }, detectCountry), "UA");
});

test("ignora língua sem região e usa a próxima pista", () => {
  assert.equal(withEnv({ languages: ["en", "hi-IN"] }, detectCountry), "IN");
});

test("cai no fuso do aparelho quando a língua não diz a região", () => {
  assert.equal(withEnv({ languages: ["en"], timeZone: "Asia/Manila" }, detectCountry), "PH");
  assert.equal(withEnv({ languages: ["en"], timeZone: "Europe/Kyiv" }, detectCountry), "UA");
});

test("usa o padrão quando nada identifica o país", () => {
  assert.equal(withEnv({ languages: ["en"], timeZone: "Antarctica/Troll" }, detectCountry), "BR");
  assert.equal(withEnv({ languages: null, timeZone: "Antarctica/Troll" }, detectCountry), "BR");
});

test("buildPhone monta E.164 e derruba o zero do tronco", () => {
  assert.equal(buildPhone("PH", "912 345 678"), "+63912345678");
  assert.equal(buildPhone("BR", "13 99999-8888"), "+5513999998888");
  assert.equal(buildPhone("IN", "09876543210"), "+919876543210"); // zero inicial some
});

test("buildPhone recusa número curto, vazio ou lixo", () => {
  assert.equal(buildPhone("BR", ""), null);
  assert.equal(buildPhone("BR", "123"), null);
  assert.equal(buildPhone("BR", "abc"), null);
  assert.equal(buildPhone("BR", "9".repeat(20)), null); // acima de 15 dígitos
});

test("todo país da lista tem dial válido e código único", () => {
  const codes = new Set();
  for (const c of COUNTRIES) {
    assert.match(c.dial, /^\+\d{1,4}$/, `dial inválido em ${c.code}`);
    assert.equal(codes.has(c.code), false, `código repetido: ${c.code}`);
    codes.add(c.code);
    assert.equal(dialOf(c.code), c.dial);
  }
  assert.ok(COUNTRIES.length >= 60);
});

test("nações que mais fornecem tripulação aparecem no topo da lista", () => {
  const top5 = COUNTRIES.slice(0, 5).map((c) => c.code);
  assert.deepEqual(top5, ["PH", "IN", "CN", "ID", "RU"]);
});
