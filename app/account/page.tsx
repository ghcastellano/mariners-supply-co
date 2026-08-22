import Link from "next/link";
import { redirect } from "next/navigation";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  const profile = data as Profile | null;
  const isAdmin = profile?.role === "admin";

  return (
    <>
      <TopBar />
      <main className="pb-nav">
        <div className="hero-mini">
          <p className="kicker">Crew account</p>
          <h2>{profile?.full_name || "Sailor"}</h2>
          <p className="mono" style={{ fontSize: 12.5 }}>
            {user.email}
            {isAdmin && (
              <span className="pill amber" style={{ marginLeft: 10 }}>
                STAFF
              </span>
            )}
          </p>
        </div>

        <div className="stack" style={{ marginTop: 10 }}>
          <Link href="/orders" className="btn ghost">
            📦 My orders
          </Link>
          <Link href="/shop" className="btn ghost">
            ⚓ Back to the shop
          </Link>
          {isAdmin && (
            <Link href="/admin" className="btn">
              🧭 Open staff panel
            </Link>
          )}
          <form action={signOut}>
            <button className="btn danger" type="submit">
              Sign out
            </button>
          </form>
          <p className="finehint">
            Questions about an order? Find us at Mariner&apos;s Bar or ping the WhatsApp on your
            order confirmation.
          </p>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
