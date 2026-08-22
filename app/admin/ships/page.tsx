import { createClient } from "@/lib/supabase/server";
import { etaToLocalInput, hoursUntil, orderCloseAt } from "@/lib/format";
import type { Ship } from "@/lib/types";
import { saveShip } from "../actions";

export const dynamic = "force-dynamic";

function ShipForm({ ship }: { ship?: Ship }) {
  return (
    <form action={saveShip} className="adm-form">
      {ship && <input type="hidden" name="id" value={ship.id} />}
      <div className="field">
        <label>Vessel name</label>
        <input name="name" required defaultValue={ship?.name ?? ""} placeholder="MSC LORENA" />
      </div>
      <div className="form2">
        <div className="field">
          <label>Berth</label>
          <input name="berth" defaultValue={ship?.berth ?? ""} placeholder="39" />
        </div>
        <div className="field">
          <label>Cutoff (h before ETA)</label>
          <input
            name="cutoff_hours"
            type="number"
            min={1}
            max={240}
            defaultValue={ship?.cutoff_hours ?? 26}
          />
        </div>
      </div>
      <div className="field">
        <label>ETA — hora de Santos</label>
        <input
          name="eta"
          type="datetime-local"
          required
          defaultValue={ship ? etaToLocalInput(ship.eta) : ""}
        />
      </div>
      <label className="checkline">
        <input type="checkbox" name="active" defaultChecked={ship ? ship.active : true} />
        Visible in the line-up
      </label>
      <button className="btn small" type="submit">
        {ship ? "Save changes" : "+ Add vessel"}
      </button>
    </form>
  );
}

export default async function AdminShips() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ships")
    .select("id, name, berth, eta, cutoff_hours, active")
    .order("eta", { ascending: true });
  const ships = (data ?? []) as Ship[];

  return (
    <main className="pb-nav">
      <p className="subhead">New vessel</p>
      <ShipForm />

      <p className="subhead">Line-up ({ships.length})</p>
      {ships.map((s) => {
        const closeH = hoursUntil(orderCloseAt(s.eta, s.cutoff_hours));
        return (
          <div key={s.id}>
            <p className="subhead" style={{ paddingTop: 6 }}>
              {s.name} — {s.active ? (closeH > 0 ? `orders close in ${closeH}h` : "orders closed") : "hidden"}
            </p>
            <ShipForm ship={s} />
          </div>
        );
      })}
    </main>
  );
}
