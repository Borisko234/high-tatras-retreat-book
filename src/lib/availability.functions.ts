import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const bookingInputSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(9),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type BlockedRange = { start: string; end: string };

/** Public: returns all blocked date ranges (confirmed/pending bookings + imported events + manual blocks). */
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

/** Public: submit a booking request. Server re-validates against current availability. */
export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bookingInputSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.checkOut <= data.checkIn) {
      throw new Error("Invalid date range");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Re-check availability server-side
    const todayIso = new Date().toISOString().slice(0, 10);
    const [{ data: bookings }, { data: imported }, { data: blocks }] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select("check_in, check_out")
        .in("status", ["pending", "confirmed"])
        .gte("check_out", todayIso),
      supabaseAdmin.from("imported_events").select("starts_on, ends_on").gte("ends_on", todayIso),
      supabaseAdmin.from("manual_blocks").select("starts_on, ends_on").gte("ends_on", todayIso),
    ]);

    const overlap = [
      ...(bookings ?? []).map((b) => ({ s: b.check_in, e: b.check_out })),
      ...(imported ?? []).map((b) => ({ s: b.starts_on, e: b.ends_on })),
      ...(blocks ?? []).map((b) => ({ s: b.starts_on, e: b.ends_on })),
    ].some((r) => data.checkIn < r.e && data.checkOut > r.s);

    if (overlap) {
      throw new Error("UNAVAILABLE");
    }

    const { data: priceRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "base_nightly_price")
      .maybeSingle();
    const nights = Math.round(
      (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 86400000,
    );
    const basePrice = Number(priceRow?.value ?? 0);
    const total = Number.isFinite(basePrice) ? basePrice * nights : null;

    const { data: inserted, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        guest_name: data.name,
        guest_email: data.email,
        guest_phone: data.phone || null,
        guests_count: data.guests,
        check_in: data.checkIn,
        check_out: data.checkOut,
        message: data.message || null,
        status: "pending",
        source: "direct",
        total_price: total,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });
