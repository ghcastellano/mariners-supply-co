import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../../../lib/env.ts";
import {
  LINEUP_SOURCES,
  fetchLineupHtml,
  parseLineup,
  tableRows,
} from "../../../../lib/lineup.ts";

export const maxDuration = 60;

/**
 * Sync do line-up do Porto de Santos (Vercel Cron, de hora em hora).
 *
 * Segurança: exige CRON_SECRET (o Vercel Cron manda no Authorization).
 * O mesmo segredo autoriza sync_ship_eta no banco — nenhuma chave de
 * service role no app.
 *
 * ?debug=1 devolve um diagnóstico da fonte (status, tamanho, amostra
 * das tabelas) para calibrar o parser sem gravar nada.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "not configured" }, { status: 503 });

  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const provided = auth?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("key");
  if (provided !== secret) return Response.json({ error: "unauthorized" }, { status: 401 });

  const debug = url.searchParams.get("debug") === "1";
  const dryRun = debug || url.searchParams.get("dry") === "1";

  const attempts: Array<Record<string, unknown>> = [];
  let rows: ReturnType<typeof parseLineup>["rows"] = [];
  let usedSource: string | null = null;

  for (const source of LINEUP_SOURCES) {
    const res = await fetchLineupHtml(source);
    const parsed = res.ok ? parseLineup(res.html, source) : { rows: [], note: "fetch falhou" };
    attempts.push({
      source,
      status: res.status,
      error: res.error,
      bytes: res.html.length,
      tables: res.ok ? tableRows(res.html).length : 0,
      parsed: parsed.rows.length,
      note: parsed.note,
      ...(debug
        ? {
            titleSample: res.html.match(/<title[^>]*>([\s\S]{0,120})/i)?.[1],
            firstRows: tableRows(res.html).slice(0, 6),
            firstParsed: parsed.rows.slice(0, 5),
          }
        : {}),
    });
    if (parsed.rows.length) {
      rows = parsed.rows;
      usedSource = source;
      break;
    }
  }

  if (dryRun) {
    return Response.json({ dryRun: true, found: rows.length, source: usedSource, attempts });
  }

  if (!rows.length) {
    // fonte fora do ar não é erro fatal: o staff segue cadastrando à mão
    return Response.json({ ok: false, reason: "no rows parsed", attempts }, { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const summary = { created: 0, eta_changed: 0, unchanged: 0, failed: 0 };
  const changes: Array<Record<string, unknown>> = [];

  // Janela útil: só o que chega nos próximos 21 dias
  const horizon = Date.now() + 21 * 24 * 3600e3;

  for (const r of rows) {
    if (new Date(r.eta).getTime() > horizon) continue;
    const { data, error } = await supabase.rpc("sync_ship_eta", {
      p_name: r.name,
      p_eta: r.eta,
      p_berth: r.berth,
      p_imo: r.imo,
      p_voyage: r.voyage,
      p_source: "port_lineup",
      p_secret: secret,
    });
    const action = (data as { action?: string } | null)?.action;
    if (error || !data) summary.failed++;
    else if (action === "created") summary.created++;
    else if (action === "eta_changed") {
      summary.eta_changed++;
      changes.push(data as Record<string, unknown>);
    } else summary.unchanged++;
  }

  return Response.json({ ok: true, source: usedSource, seen: rows.length, ...summary, changes });
}
