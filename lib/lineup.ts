/**
 * Line-up do Porto de Santos — busca e interpretação.
 *
 * Desenho proposital: a fonte é PLUGÁVEL. Hoje lê o HTML público da
 * APS; amanhã pode ser AIS ou uma API paga sem tocar no resto do app.
 * O parser é tolerante — se a APS mudar o layout, o sync devolve 0
 * linhas e registra o motivo em vez de gravar lixo no banco.
 */

export type LineupRow = {
  name: string;
  eta: string; // ISO
  berth?: string | null;
  imo?: string | null;
  voyage?: string | null;
};

export const LINEUP_SOURCES = [
  "https://www.portodesantos.com.br/informacoes-operacionais/operacoes-portuarias/navegacao-e-movimento-de-navios/navios-esperados/",
  "https://www.portodesantos.com.br/wp-content/uploads/navios-esperados.html",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export async function fetchLineupHtml(
  url: string,
  timeoutMs = 20000
): Promise<{ ok: boolean; status: number; html: string; error?: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      cache: "no-store",
    });
    const html = await res.text();
    return { ok: res.ok, status: res.status, html };
  } catch (e) {
    return { ok: false, status: 0, html: "", error: (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

const stripTags = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;?/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

/** Extrai as linhas de todas as tabelas do HTML como matriz de células. */
export function tableRows(html: string): string[][] {
  const rows: string[][] = [];
  for (const m of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
      stripTags(c[1])
    );
    if (cells.length) rows.push(cells);
  }
  return rows;
}

/**
 * Datas do line-up vêm como dd/mm/yyyy [hh:mm] em hora de Santos.
 * Convertemos para ISO fixando UTC-3 (o Brasil não tem mais DST).
 */
export function parseBrDate(raw: string): string | null {
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})(?:[\sT]+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const [, d, mo, y, h = "12", mi = "00"] = m;
  const iso = `${y}-${mo}-${d}T${h.padStart(2, "0")}:${mi}:00-03:00`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const HEADER_HINTS = {
  name: ["navio", "embarcacao", "embarcação", "vessel", "ship"],
  eta: ["previsao", "previsão", "chegada", "eta", "atracacao", "atracação", "data"],
  berth: ["berco", "berço", "atracacao", "terminal", "local"],
  imo: ["imo"],
  voyage: ["viagem", "voyage"],
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function findColumns(header: string[]) {
  const idx: Record<string, number> = {};
  header.forEach((cell, i) => {
    const c = norm(cell);
    for (const [key, hints] of Object.entries(HEADER_HINTS)) {
      if (idx[key] === undefined && hints.some((h) => c.includes(norm(h)))) idx[key] = i;
    }
  });
  return idx;
}

/**
 * Interpreta o HTML em linhas de line-up. Estratégia em dois passos:
 * 1. tenta achar cabeçalho de tabela e mapear colunas por nome;
 * 2. se não houver cabeçalho reconhecível, cai num modo heurístico
 *    (célula com data = ETA, célula alfabética mais longa = navio).
 */
export function parseLineup(html: string): { rows: LineupRow[]; note: string } {
  const all = tableRows(html);
  if (!all.length) return { rows: [], note: "nenhuma tabela encontrada no HTML" };

  const out: LineupRow[] = [];
  let headerIdx: Record<string, number> | null = null;

  for (const cells of all) {
    const maybe = findColumns(cells);
    if (maybe.name !== undefined && maybe.eta !== undefined) {
      headerIdx = maybe;
      continue;
    }

    const pick = (k: keyof typeof HEADER_HINTS) =>
      headerIdx && headerIdx[k] !== undefined ? cells[headerIdx[k]] : undefined;

    let name = pick("name");
    let etaRaw = pick("eta");

    // heurística quando o cabeçalho não foi reconhecido
    if (!name || !etaRaw) {
      const dateCell = cells.find((c) => /\d{2}\/\d{2}\/\d{4}/.test(c));
      if (!dateCell) continue;
      const nameCell = cells
        .filter((c) => c !== dateCell && /[A-Za-zÀ-ÿ]{3,}/.test(c) && !/^\d+$/.test(c))
        .sort((a, b) => b.length - a.length)[0];
      if (!nameCell) continue;
      name = name || nameCell;
      etaRaw = etaRaw || dateCell;
    }

    const eta = etaRaw ? parseBrDate(etaRaw) : null;
    if (!name || !eta) continue;

    const clean = name.replace(/\s{2,}/g, " ").trim();
    if (clean.length < 3 || clean.length > 80) continue;

    const imoRaw = pick("imo");
    out.push({
      name: clean.toUpperCase(),
      eta,
      berth: pick("berth")?.slice(0, 20) || null,
      imo: imoRaw && /\d{7}/.test(imoRaw) ? imoRaw.match(/\d{7}/)![0] : null,
      voyage: pick("voyage")?.slice(0, 30) || null,
    });
  }

  // dedup por navio+ETA
  const seen = new Set<string>();
  const rows = out.filter((r) => {
    const k = `${r.name}|${r.eta}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    rows,
    note: headerIdx ? "cabeçalho reconhecido" : "modo heurístico (sem cabeçalho)",
  };
}
