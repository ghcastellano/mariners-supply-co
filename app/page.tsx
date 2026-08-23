import Link from "next/link";
import TopBar from "@/components/TopBar";
import ShipPicker from "@/components/ShipPicker";
import { createClient } from "@/lib/supabase/server";
import { CONTACT_EMAIL, supabaseConfigured } from "@/lib/env";
import type { Ship } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  let ships: Ship[] = [];
  let loadError = false;

  if (supabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("ships")
        .select("id, name, berth, eta, cutoff_hours, active")
        .eq("active", true)
        .gt("eta", new Date(Date.now() - 12 * 3600e3).toISOString())
        .order("eta", { ascending: true });
      if (error) loadError = true;
      else ships = (data ?? []) as Ship[];
    } catch {
      loadError = true;
    }
  }

  return (
    <>
      <TopBar chip={false} account />
      <main>
        <div className="hero-mini">
          <p className="kicker">Porto de Santos · by Mariner&apos;s Bar</p>
          <h2>Which ship are you on, sailor?</h2>
          <p>Your order rides with your vessel&apos;s ETA. Pick your ship — we handle the rest.</p>
        </div>

        {!supabaseConfigured ? (
          <div className="stack">
            <p className="alert">
              Backend not configured yet — set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (see README).
            </p>
          </div>
        ) : loadError ? (
          <div className="stack">
            <p className="alert">Couldn&apos;t load the line-up. Pull to refresh or try again shortly.</p>
          </div>
        ) : (
          <ShipPicker ships={ships} />
        )}
      </main>

      <footer className="foot">
        <p className="tag">Gangway delivery · pre-order by ETA · card payment</p>
        <a href={`mailto:${CONTACT_EMAIL}`}>✉️ {CONTACT_EMAIL}</a>
        <Link href="/login">Crew access — sign in / create account</Link>
        <Link href="/admin">Staff access</Link>
      </footer>
    </>
  );
}
