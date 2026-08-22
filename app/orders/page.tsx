import Link from "next/link";
import { redirect } from "next/navigation";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import { usd } from "@/lib/format";
import { STATUS_LABEL, STATUS_PILL, type OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  code: string;
  status: OrderStatus;
  subtotal_usd: number;
  deposit_usd: number;
  created_at: string;
  ships: { name: string; berth: string | null } | null;
  order_items: { qty: number }[];
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/orders");

  const { data } = await supabase
    .from("orders")
    .select(
      "id, code, status, subtotal_usd, deposit_usd, created_at, ships(name, berth), order_items(qty)"
    )
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as unknown as Row[];

  return (
    <>
      <TopBar />
      <main className="pb-nav">
        <div className="hero-mini">
          <p className="kicker">Your deliveries</p>
          <h2>Orders</h2>
          <p>Every kit rides with its ship&apos;s ETA — track each one here.</p>
        </div>

        {orders.length === 0 ? (
          <div className="empty">
            <div className="i">📦</div>
            No orders yet.
            <br />
            Your deliveries will show up here.
            <p style={{ marginTop: 18 }}>
              <Link className="alink" href="/shop">
                Start your kit →
              </Link>
            </p>
          </div>
        ) : (
          <div className="cart-list">
            {orders.map((o) => {
              const items = o.order_items.reduce((a, i) => a + i.qty, 0);
              return (
                <Link key={o.id} href={`/orders/${o.code}`} className="ocard">
                  <div className="head">
                    <span className="code">#{o.code}</span>
                    <span className={`pill ${STATUS_PILL[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </div>
                  <div className="meta">
                    {o.ships?.name ?? "—"}
                    {o.ships?.berth ? ` · BERTH ${o.ships.berth}` : ""} · {items} ITEMS ·{" "}
                    {usd(Number(o.subtotal_usd))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}
