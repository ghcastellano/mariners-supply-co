"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localInputToIso } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

async function adminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return null;
  return supabase;
}

// Transições permitidas no board (RLS garante que só admin atualiza)
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_deposit: ["deposit_paid", "cancelled"],
  deposit_paid: ["preparing", "credited", "cancelled"],
  preparing: ["at_gangway", "credited", "cancelled"],
  at_gangway: ["delivered", "credited"],
  delivered: [],
  credited: [],
  cancelled: [],
};

export async function setOrderStatus(formData: FormData) {
  const supabase = await adminClient();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  const to = String(formData.get("to") ?? "") as OrderStatus;
  if (!id || !to) return;

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!order) return;
  if (!TRANSITIONS[order.status as OrderStatus]?.includes(to)) return;

  await supabase.from("orders").update({ status: to }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/admin/shopping-list");
}

export async function saveShip(formData: FormData) {
  const supabase = await adminClient();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().toUpperCase();
  const berth = String(formData.get("berth") ?? "").trim();
  const etaLocal = String(formData.get("eta") ?? "");
  const cutoff = Math.max(1, Math.min(240, Number(formData.get("cutoff_hours") ?? 26)));
  const active = formData.get("active") === "on";
  if (!name || !etaLocal) return;

  const row = {
    name,
    berth: berth || null,
    eta: localInputToIso(etaLocal),
    cutoff_hours: cutoff,
    active,
  };

  if (id) await supabase.from("ships").update(row).eq("id", id);
  else await supabase.from("ships").insert(row);

  revalidatePath("/admin/ships");
  revalidatePath("/");
}

export async function saveProduct(formData: FormData) {
  const supabase = await adminClient();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "📦").trim() || "📦";
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "General").trim() || "General";
  const price = Number(formData.get("price_usd") ?? 0);
  const sort = Number.isFinite(Number(formData.get("sort_order")))
    ? Number(formData.get("sort_order"))
    : 100;
  const active = formData.get("active") === "on";
  if (!name || !Number.isFinite(price) || price < 0) return;

  const row = {
    name,
    emoji,
    description: description || null,
    category,
    price_usd: Math.round(price * 100) / 100,
    sort_order: sort,
    active,
  };

  if (id) await supabase.from("products").update(row).eq("id", id);
  else await supabase.from("products").insert(row);

  revalidatePath("/admin/products");
}
