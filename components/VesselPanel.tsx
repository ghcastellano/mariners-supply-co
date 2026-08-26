import Link from "next/link";
import { orderCloseAt, santosTime } from "@/lib/format";

/**
 * O navio da pessoa, com o que ela precisa saber antes de pedir.
 *
 * A versão anterior era uma tira com ícone, nome e "Alongside now" —
 * três linhas num painel que, no desktop, esticava até a altura do herói
 * e ficava com duzentos pixels de nada embaixo. Bonito não era, e útil
 * menos ainda: dizia o nome de um navio que a própria pessoa cadastrou.
 *
 * O banco já tinha o resto — berço, IMO, viagem, bandeira, ATA, atraso e
 * cutoff_hours — e nada disso aparecia em lugar nenhum da loja. O número
 * que decide a compra é o PRAZO: a tripulação não quer saber que o navio
 * chega quinta, quer saber até quando dá para pedir. Esse virou o
 * destaque do cartão; o resto é contexto ao redor dele.
 */

export type VesselFacts = {
  name: string;
  berth: string | null;
  eta: string;
  ata: string | null;
  imo: string | null;
  voyage: string | null;
  flag: string | null;
  cutoffHours: number;
  delayHours: number | null;
};

/** Bandeira em ISO-2 vira emoji somando o offset dos Regional Indicators. */
function bandeira(iso: string | null): string | null {
  if (!iso || !/^[A-Za-z]{2}$/.test(iso)) return null;
  return String.fromCodePoint(
    ...iso.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

/** "14h", "3d 6h", "agora". Sem casa decimal: ninguém pede por meia hora. */
function restante(ms: number): string {
  if (ms <= 0) return "closed";
  const horas = Math.floor(ms / 3600e3);
  if (horas < 1) return `${Math.max(1, Math.round(ms / 60e3))}min`;
  if (horas < 48) return `${horas}h`;
  return `${Math.floor(horas / 24)}d ${horas % 24}h`;
}

export default function VesselPanel({ v }: { v: VesselFacts }) {
  const fecha = orderCloseAt(v.eta, v.cutoffHours);
  const faltaMs = fecha.getTime() - Date.now();
  const aberto = faltaMs > 0;
  const alongside = Boolean(v.ata) || new Date(v.eta).getTime() <= Date.now();

  // A barra mede a janela inteira de pedidos, do momento em que o navio
  // entrou no line-up até o corte. Sem um começo real ela mentiria, então
  // a referência é a própria janela: cutoff_hours antes do ETA, contra as
  // 72h que a operação usa como antecedência típica de line-up.
  const janelaMs = Math.max(v.cutoffHours, 72) * 3600e3;
  const usado = Math.min(100, Math.max(0, ((janelaMs - faltaMs) / janelaMs) * 100));

  const atrasado = (v.delayHours ?? 0) >= 1;

  return (
    <aside className={`vpanel${aberto ? "" : " fechado"}`} aria-label="Your vessel">
      <header>
        <span className="lb">Your vessel</span>
        <span className={`dot${alongside ? " on" : ""}`} aria-hidden />
        <span className="st">{alongside ? "Alongside" : "En route"}</span>
      </header>

      <p className="nome">
        {v.name}
        {bandeira(v.flag) && (
          <span className="fl" aria-hidden>
            {bandeira(v.flag)}
          </span>
        )}
      </p>

      {(v.imo || v.voyage) && (
        <p className="ids">
          {v.imo && <>IMO {v.imo}</>}
          {v.imo && v.voyage && " · "}
          {v.voyage && <>Voy {v.voyage}</>}
        </p>
      )}

      <dl className="dados">
        <div>
          <dt>Berth</dt>
          <dd>{v.berth ? v.berth : "—"}</dd>
        </div>
        <div>
          <dt>{alongside ? "Arrived" : "ETA"}</dt>
          <dd>
            {santosTime(v.ata ?? v.eta)}
            {atrasado && !alongside && (
              <span className="atraso" title="Later than the previous ETA">
                +{Math.round(v.delayHours as number)}h
              </span>
            )}
          </dd>
        </div>
      </dl>

      {/* O bloco do prazo é o assunto do cartão: fundo próprio, número
          grande e barra. É o que decide se a pessoa compra hoje. */}
      <div className="corte">
        <span className="ct">Order cut-off</span>
        <strong>{aberto ? restante(faltaMs) : "Closed"}</strong>
        <span className="qd">
          {aberto ? `closes ${santosTime(fecha)}` : `closed ${santosTime(fecha)}`}
        </span>
        <span className="barra" aria-hidden>
          <i style={{ width: `${usado}%` }} />
        </span>
      </div>

      <Link href={aberto ? "/shop" : "/ports"} className="btn acao" prefetch={false}>
        {aberto ? "Shop for this call" : "See the next call"}
      </Link>
    </aside>
  );
}
