import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const bookingInputSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(9),
  children: z.number().int().min(0).max(9).default(0),
  pets: z.number().int().min(0).max(9).default(0),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type BlockedRange = { start: string; end: string };
export type AdminBlockedRange = BlockedRange & {
  source: "booking" | "imported" | "manual";
  color: string;
  label?: string | null;
};

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Compute total price server-side from settings. */
export function computeTotal(opts: {
  nights: number;
  adults: number;
  children: number;
  pets: number;
  settings: Record<string, unknown>;
}) {
  const s = opts.settings;
  const base = num(s.base_nightly_price);
  const baseOccupancy = Math.max(1, num(s.base_occupancy, 2));
  const extraAdultPrice = num(s.extra_adult_price);
  const childPrice = num(s.child_price);
  const petFee = num(s.pet_fee);
  const petFeeMode = String(s.pet_fee_mode ?? "per_stay"); // "per_stay" | "per_night"
  const cleaning = num(s.cleaning_fee);

  const extraAdults = Math.max(0, opts.adults - baseOccupancy);
  const nightly =
    base + extraAdults * extraAdultPrice + opts.children * childPrice;
  const petsTotal =
    petFeeMode === "per_night"
      ? petFee * opts.pets * opts.nights
      : petFee * opts.pets;
  const total = nightly * opts.nights + petsTotal + cleaning;
  return {
    nights: opts.nights,
    base,
    extraAdults,
    extraAdultsTotal: extraAdults * extraAdultPrice * opts.nights,
    childrenTotal: opts.children * childPrice * opts.nights,
    petsTotal,
    cleaning,
    total,
  };
}

/** Public: returns all blocked date ranges. */
export const getBlockedRanges = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const todayIso = new Date().toISOString().slice(0, 10);
  const [{ data: bookings }, { data: imported }, { data: blocks }] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select("check_in, check_out, status")
      .in("status", ["pending", "confirmed"])
      .gte("check_out", todayIso),
    supabaseAdmin.from("imported_events").select("starts_on, ends_on").gte("ends_on", todayIso),
    supabaseAdmin.from("manual_blocks").select("starts_on, ends_on").gte("ends_on", todayIso),
  ]);
  const ranges: BlockedRange[] = [];
  for (const b of bookings ?? []) ranges.push({ start: b.check_in, end: b.check_out });
  for (const e of imported ?? []) ranges.push({ start: e.starts_on, end: e.ends_on });
  for (const m of blocks ?? []) ranges.push({ start: m.starts_on, end: m.ends_on });
  return ranges;
});

/** Admin: same ranges but with per-range source + color + label for the admin calendar. */
export const getAdminBlockedRanges = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdminUnlocked } = await import("./gate.server");
  await requireAdminUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const todayIso = new Date().toISOString().slice(0, 10);
  const [{ data: bookings }, { data: imported }, { data: blocks }, { data: feeds }] =
    await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select("check_in, check_out, status, guest_name")
        .in("status", ["pending", "confirmed"])
        .gte("check_out", todayIso),
      supabaseAdmin
        .from("imported_events")
        .select("starts_on, ends_on, summary, feed_id")
        .gte("ends_on", todayIso),
      supabaseAdmin
        .from("manual_blocks")
        .select("starts_on, ends_on, reason, color")
        .gte("ends_on", todayIso),
      supabaseAdmin.from("ical_feeds").select("id, color, label"),
    ]);

  const feedMap = new Map<string, { color: string; label: string }>();
  for (const f of feeds ?? [])
    feedMap.set(f.id, { color: f.color || "#888888", label: f.label });

  const ranges: AdminBlockedRange[] = [];
  for (const b of bookings ?? [])
    ranges.push({
      start: b.check_in,
      end: b.check_out,
      source: "booking",
      color: b.status === "confirmed" ? "#16a34a" : "#f59e0b",
      label: `${b.status === "confirmed" ? "Potvrdená" : "Čakajúca"} · ${b.guest_name}`,
    });
  for (const e of imported ?? []) {
    const f = e.feed_id ? feedMap.get(e.feed_id) : null;
    ranges.push({
      start: e.starts_on,
      end: e.ends_on,
      source: "imported",
      color: f?.color || "#6366f1",
      label: `${f?.label ?? "Portál"} · ${e.summary ?? ""}`,
    });
  }
  for (const m of blocks ?? [])
    ranges.push({
      start: m.starts_on,
      end: m.ends_on,
      source: "manual",
      color: m.color || "#94a3b8",
      label: m.reason || "Manuálny blok",
    });
  return ranges;
});

/** Public: submit a booking request. Server re-validates against current availability. */
export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bookingInputSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.checkOut <= data.checkIn) throw new Error("Invalid date range");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const todayIso = new Date().toISOString().slice(0, 10);
    const [
      { data: bookings },
      { data: imported },
      { data: blocks },
      { data: settingsRows },
    ] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select("check_in, check_out")
        .in("status", ["pending", "confirmed"])
        .gte("check_out", todayIso),
      supabaseAdmin.from("imported_events").select("starts_on, ends_on").gte("ends_on", todayIso),
      supabaseAdmin.from("manual_blocks").select("starts_on, ends_on").gte("ends_on", todayIso),
      supabaseAdmin.from("app_settings").select("*"),
    ]);

    const overlap = [
      ...(bookings ?? []).map((b) => ({ s: b.check_in, e: b.check_out })),
      ...(imported ?? []).map((b) => ({ s: b.starts_on, e: b.ends_on })),
      ...(blocks ?? []).map((b) => ({ s: b.starts_on, e: b.ends_on })),
    ].some((r) => data.checkIn < r.e && data.checkOut > r.s);

    if (overlap) throw new Error("UNAVAILABLE");

    const settings: Record<string, unknown> = {};
    for (const row of settingsRows ?? []) settings[row.key] = row.value as unknown;

    const nights = Math.round(
      (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 86400000,
    );
    const price = computeTotal({
      nights,
      adults: data.adults,
      children: data.children,
      pets: data.pets,
      settings,
    });

    const autoConfirm = Boolean(settings.auto_confirm);
    const paymentsMode = String(settings.payments_mode ?? "off");
    const depositPercent = num(settings.deposit_percent, 30);
    const depositAmount =
      paymentsMode === "deposit"
        ? Math.round((price.total * depositPercent) / 100)
        : paymentsMode === "full"
          ? price.total
          : null;

    const { data: inserted, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        guest_name: data.name,
        guest_email: data.email,
        guest_phone: data.phone || null,
        guests_count: data.adults + data.children,
        adults_count: data.adults,
        children_count: data.children,
        pets_count: data.pets,
        check_in: data.checkIn,
        check_out: data.checkOut,
        message: data.message || null,
        status: autoConfirm ? "confirmed" : "pending",
        source: "direct",
        total_price: price.total,
        deposit_amount: depositAmount,
        payment_status: paymentsMode === "off" ? "not_required" : "unpaid",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return {
      id: inserted.id,
      total: price.total,
      depositAmount,
      paymentsMode,
      autoConfirmed: autoConfirm,
    };
  });
