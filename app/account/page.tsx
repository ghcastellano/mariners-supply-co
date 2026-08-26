"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import PhoneInput from "@/components/PhoneInput";
import SearchSelect, { type SelectOption } from "@/components/SearchSelect";
import VesselSearch, { type VesselValue } from "@/components/VesselSearch";
import { COUNTRIES } from "@/lib/countries";
import { CONTACT_EMAIL } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { saveProfile, signOut } from "./actions";

/**
 * "My Account Information" na estrutura do Sunny: um formulário só, com
 * exatamente os campos que o checkout confirma — e, embaixo, os cartões
 * de atalho das outras seções da conta.
 *
 * A tela inteira é cliente, ao contrário do resto da loja. Não é
 * preferência: VesselSearch, SearchSelect e PhoneInput são campos com
 * estado, e o valor de um deles (o navio) sai de uma busca no servidor.
 * Um formulário partido em ilhas custaria mais round-trips do que a
 * consulta única que a montagem faz aqui — é a mesma escolha do /signup.
 */

const DEPARTMENT: Record<string, string> = {
  deck: "Deck",
  engine: "Engine",
  catering: "Catering",
  other: "Other",
};

/** Nacionalidade é código ISO no banco — o rótulo pode ser reescrito, ele não. */
const NATIONALITIES: SelectOption[] = COUNTRIES.map((c) => ({
  value: c.code,
  label: `${c.flag} ${c.name}`,
}));

type PortRow = { id: string; name: string; country_code: string };

type ProfileRow = {
  full_name: string | null;
  rank_slug: string | null;
  nationality: string | null;
  whatsapp: string | null;
  port_id: string | null;
  ship_id: string | null;
  vessel_name: string | null;
  vessel_imo: string | null;
  vessel_flag: string | null;
  role: string | null;
  ships: { name: string; imo: string | null; flag: string | null } | null;
};

export default function AccountPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [rank, setRank] = useState("");
  const [nationality, setNationality] = useState("");
  const [phone, setPhone] = useState("");
  const [savedPhone, setSavedPhone] = useState("");
  const [vessel, setVessel] = useState<VesselValue | null>(null);
  const [portId, setPortId] = useState("");

  const [ranks, setRanks] = useState<SelectOption[]>([]);
  const [ports, setPorts] = useState<PortRow[]>([]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) {
        router.replace("/login?next=/account");
        return;
      }

      // As três consultas são independentes: em série custariam três
      // idas ao satélite para montar uma tela só.
      const [profile, rankRows, portRows] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            `full_name, rank_slug, nationality, whatsapp, port_id, ship_id,
             vessel_name, vessel_imo, vessel_flag, role,
             ships!profiles_ship_id_fkey(name, imo, flag)`
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("crew_ranks").select("slug, name, department").order("sort_order"),
        supabase
          .from("ports")
          .select("id, name, country_code")
          .eq("active", true)
          .order("sort_order"),
      ]);
      if (!alive) return;

      const p = (profile.data ?? null) as ProfileRow | null;

      setEmail(user.email ?? "");
      setIsAdmin(p?.role === "admin");

      // O banco guarda um nome só. O primeiro token vira First Name e todo
      // o resto vai para Last Name — assim juntar de volta devolve
      // exatamente o que estava lá, que é o que a prancha de embarque usa.
      const parts = (p?.full_name ?? "").trim().split(/\s+/).filter(Boolean);
      setFirst(parts[0] ?? "");
      setLast(parts.slice(1).join(" "));

      setRank(p?.rank_slug ?? "");
      setNationality(p?.nationality ?? "");
      setSavedPhone(p?.whatsapp ?? "");
      setPortId(p?.port_id ?? "");

      // O navio pode vir nulo mesmo com ship_id: a RLS de ships só devolve
      // os do line-up, e casco cadastrado pela tripulação nasce inativo.
      // Nome, IMO e bandeira desnormalizados no perfil sustentam a tela.
      const shipName = (p?.ships?.name ?? p?.vessel_name ?? "").trim();
      setVessel(
        shipName
          ? {
              id: p?.ship_id ?? null,
              name: shipName,
              imo: p?.ships?.imo ?? p?.vessel_imo ?? null,
              flag: p?.ships?.flag ?? p?.vessel_flag ?? null,
            }
          : null
      );

      setRanks(
        (rankRows.data ?? []).map((r) => ({
          value: r.slug as string,
          label: r.name as string,
          group: DEPARTMENT[r.department as string] ?? (r.department as string),
        }))
      );
      setPorts((portRows.data ?? []) as PortRow[]);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaved(false);
    setBusy(true);

    const res = await saveProfile({
      firstName: first,
      lastName: last,
      rankSlug: rank,
      nationality,
      whatsapp: phone,
      portId,
      shipId: vessel?.id ?? null,
      vesselName: vessel?.name ?? "",
      vesselImo: vessel?.imo ?? null,
      vesselFlag: vessel?.flag ?? null,
    });

    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setSaved(true);
    if (phone) setSavedPhone(phone);
    // O cabeçalho e o checkout leem o perfil no servidor.
    router.refresh();
  }

  if (loading)
    return (
      <main>
        <div className="spin" aria-label="Loading" />
      </main>
    );

  return (
    <main>
      <Breadcrumb trail={[{ label: "My Account" }]} />

      <h1 className="secttl left">My Account Information</h1>
      <p className="finehint" style={{ padding: "0 16px" }}>
        Signed in as <span className="mono">{email}</span>
      </p>

      <form onSubmit={submit} className="stack">
        <div className="field">
          <label htmlFor="first">First Name</label>
          <input
            id="first"
            required
            autoComplete="given-name"
            enterKeyHint="next"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder="As on your seaman's book"
          />
        </div>

        <div className="field">
          <label htmlFor="last">Last Name</label>
          <input
            id="last"
            required
            autoComplete="family-name"
            enterKeyHint="next"
            value={last}
            onChange={(e) => setLast(e.target.value)}
          />
        </div>

        <SearchSelect
          label="Rank"
          options={ranks}
          value={rank}
          onChange={setRank}
          placeholder="Search your rank"
        />

        <SearchSelect
          label="Nationality"
          options={NATIONALITIES}
          value={nationality}
          onChange={setNationality}
          placeholder="Search your country"
        />

        {/* O PhoneInput monta o E.164 e sempre começa em branco. Por isso o
            número salvo aparece aqui embaixo: sem ele, campo vazio parece
            cadastro perdido, e a ação de salvar mantém o antigo quando
            ninguém digita nada. */}
        <PhoneInput
          value={phone}
          onChange={setPhone}
          required
          label="Telephone"
          countryHint={nationality}
        />
        {savedPhone && !phone && (
          <p className="finehint" style={{ marginTop: -6 }}>
            Currently saved: <span className="mono">{savedPhone}</span> — leave the field empty to
            keep it.
          </p>
        )}

        <VesselSearch value={vessel} onChange={setVessel} />

        {/* <select> nativo: são três portos, e no celular o nativo vira a
            roda do sistema — mais rápida que qualquer combobox nosso. */}
        <div className="field">
          <label htmlFor="port">Home port</label>
          <select id="port" value={portId} onChange={(e) => setPortId(e.target.value)}>
            <option value="">Select your home port</option>
            {ports.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} [{p.country_code.toUpperCase()}]
              </option>
            ))}
          </select>
          <p className="finehint">
            Where we meet your vessel. The delivery date comes from this port&apos;s grid.
          </p>
        </div>

        {err && (
          <p className="alert" role="alert">
            {err}
          </p>
        )}
        {saved && (
          <p className="note" role="status">
            Your details are saved.
          </p>
        )}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        <p className="finehint">
          Checkout confirms these details instead of asking again — it can&apos;t take payment
          while the name, vessel, port or telephone is missing.
        </p>
      </form>

      {/* Atalhos das outras seções da conta, um cartão cada, na ordem do
          menu 👤 do cabeçalho. */}
      <div className="catgrid" style={{ paddingTop: 14 }}>
        <Link href="/orders" className="catcard">
          <span className="ic" aria-hidden>
            📦
          </span>
          <span className="tx">
            <span className="nm">My Orders</span>
            <span className="ct">Track every delivery</span>
          </span>
          <span className="chev" aria-hidden>
            ›
          </span>
        </Link>

        <Link href="/wishlist" className="catcard">
          <span className="ic" aria-hidden>
            ♡
          </span>
          <span className="tx">
            <span className="nm">My Wish List</span>
            <span className="ct">Saved for the next call</span>
          </span>
          <span className="chev" aria-hidden>
            ›
          </span>
        </Link>

        <Link href="/captain" className="catcard">
          <span className="ic" aria-hidden>
            🧭
          </span>
          <span className="tx">
            <span className="nm">Captain rewards</span>
            <span className="ct">Your code and credit</span>
          </span>
          <span className="chev" aria-hidden>
            ›
          </span>
        </Link>

        {isAdmin && (
          <Link href="/admin" className="catcard">
            <span className="ic" aria-hidden>
              ⚙️
            </span>
            <span className="tx">
              <span className="nm">Staff panel</span>
              <span className="ct">Orders, catalog, line-up</span>
            </span>
            <span className="chev" aria-hidden>
              ›
            </span>
          </Link>
        )}
      </div>

      <div className="stack">
        <form action={signOut}>
          <button className="btn danger" type="submit">
            Sign Out
          </button>
        </form>
        <p className="finehint">
          Questions about an order? Write{" "}
          <a className="alink" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          or find us at Mariner&apos;s Bar.
        </p>
      </div>
    </main>
  );
}
