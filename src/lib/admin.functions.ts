// All admin server functions are unauthenticated on purpose — this is a
// single-owner tool. If you want to lock it down later, put the /admin route
// behind a simple shared password or restore Supabase auth.
import { createServerFn } from "@tanstack/react-start";
import { requireAdminUnlocked } from "./gate.functions";
import { z } from "zod";

/** Kept for backwards compatibility with /auth page — always returns admin=true. */
export const ensureAdminBootstrap = createServerFn({ method: "POST" }).handler(async () => {
  return { seeded: false };
});
export const getMyRole = createServerFn({ method: "GET" }).handler(async () => {
  return { isAdmin: true };
});

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function normalizeUrl(u: string): string {
  const trimmed = u.trim();
  if (trimmed.toLowerCase().startsWith("webcal://")) return "https://" + trimmed.slice(9);
  return trimmed;
}

/** Admin: dashboard summary. */
export const getAdminDashboard = createServerFn({ method: "GET" }).handler(async () => {
    await requireAdminUnlocked();
  const sb = await admin();
  const today = new Date().toISOString().slice(0, 10);
  const [pending, upcoming, unread, feeds] = await Promise.all([
    sb.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb
      .from("bookings")
      .select("id, guest_name, check_in, check_out, status, guests_count, total_price")
      .gte("check_out", today)
      .in("status", ["confirmed", "pending"])
      .order("check_in", { ascending: true })
      .limit(10),
    sb.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false),
    sb.from("ical_feeds").select("id, label, last_synced_at, last_error, enabled"),
  ]);
  return {
    pendingCount: pending.count ?? 0,
    unreadMessages: unread.count ?? 0,
    upcoming: upcoming.data ?? [],
    feeds: feeds.data ?? [],
  };
});

/** Admin: list bookings. */
export const listBookings = createServerFn({ method: "GET" }).handler(async () => {
    await requireAdminUnlocked();
  const sb = await admin();
  const { data } = await sb.from("bookings").select("*").order("created_at", { ascending: false });
  return data ?? [];
});

/** Admin: update booking status. */
export const updateBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "confirmed", "cancelled"]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    const { error } = await sb.from("bookings").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: delete booking. */
export const deleteBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    const { error } = await sb.from("bookings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list iCal feeds. */
export const listFeeds = createServerFn({ method: "GET" }).handler(async () => {
    await requireAdminUnlocked();
  const sb = await admin();
  const { data } = await sb.from("ical_feeds").select("*").order("created_at", { ascending: true });
  return data ?? [];
});

/** Admin: add iCal feed. */
export const addFeed = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const raw = z
      .object({
        label: z.string().trim().min(1).max(80),
        url: z.string().trim().min(1).max(2000),
        color: z.string().trim().max(20).optional(),
      })
      .parse(d);
    const url = normalizeUrl(raw.url);
    // Only require it parses as a URL after normalization; accept http(s).
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("URL musí začínať http://, https:// alebo webcal://");
      }
    } catch {
      throw new Error("Neplatná URL adresa");
    }
    return { ...raw, url };
  })
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    const { error } = await sb
      .from("ical_feeds")
      .insert({ label: data.label, url: data.url, color: data.color || "#888888" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: delete iCal feed. */
export const deleteFeed = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    const { error } = await sb.from("ical_feeds").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: trigger a sync now. */
export const syncFeedsNow = createServerFn({ method: "POST" }).handler(async () => {
    await requireAdminUnlocked();
  const { runFeedSync } = await import("./sync.server");
  return runFeedSync();
});

/** Admin: list manual blocks. */
export const listManualBlocks = createServerFn({ method: "GET" }).handler(async () => {
    await requireAdminUnlocked();
  const sb = await admin();
  const { data } = await sb.from("manual_blocks").select("*").order("starts_on", { ascending: true });
  return data ?? [];
});

/** Admin: add a manual block. */
export const addManualBlock = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason: z.string().trim().max(200).optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    if (data.endsOn <= data.startsOn) throw new Error("Invalid range");
    const { error } = await sb
      .from("manual_blocks")
      .insert({ starts_on: data.startsOn, ends_on: data.endsOn, reason: data.reason || null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: delete manual block. */
export const deleteManualBlock = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    const { error } = await sb.from("manual_blocks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list contact messages. */
export const listMessages = createServerFn({ method: "GET" }).handler(async () => {
    await requireAdminUnlocked();
  const sb = await admin();
  const { data } = await sb.from("contact_messages").select("*").order("created_at", { ascending: false });
  return data ?? [];
});

/** Admin: toggle message read. */
export const markMessageRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), read: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    await sb.from("contact_messages").update({ read: data.read }).eq("id", data.id);
    return { ok: true };
  });

/** Admin: delete message. */
export const deleteMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    await sb.from("contact_messages").delete().eq("id", data.id);
    return { ok: true };
  });

/** Public: read settings. Only non-sensitive keys are exposed. */
type SettingValue = string | number | boolean | null;
const PUBLIC_SETTING_KEYS = ["base_nightly_price", "contact_email", "contact_phone"] as const;
export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data } = await sb
    .from("app_settings")
    .select("*")
    .in("key", PUBLIC_SETTING_KEYS as unknown as string[]);
  const map: Record<string, SettingValue> = {};
  for (const row of data ?? []) map[row.key] = row.value as SettingValue;
  return map;
});

/** Admin: read all settings (including sensitive keys). */
export const getAllSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminUnlocked();
  const sb = await admin();
  const { data } = await sb.from("app_settings").select("*");
  const map: Record<string, SettingValue> = {};
  for (const row of data ?? []) map[row.key] = row.value as SettingValue;
  return map;
});

/** Admin: update a setting. */
export const updateSetting = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      key: z.string().min(1).max(80),
      value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    const { error } = await sb
      .from("app_settings")
      .upsert({ key: data.key, value: data.value as any }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
