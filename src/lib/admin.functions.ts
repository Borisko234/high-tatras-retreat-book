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

/** Admin: add a manual block. Single-day blocks are allowed (endsOn = startsOn). */
export const addManualBlock = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason: z.string().trim().max(200).optional().or(z.literal("")),
      color: z.string().trim().max(20).optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    // Allow single-day: normalize endsOn to startsOn + 1 day when they're equal.
    let endsOn = data.endsOn;
    if (endsOn === data.startsOn) {
      const dt = new Date(data.startsOn + "T00:00:00Z");
      dt.setUTCDate(dt.getUTCDate() + 1);
      endsOn = dt.toISOString().slice(0, 10);
    } else if (endsOn < data.startsOn) {
      throw new Error("Neplatný rozsah");
    }
    const { error } = await sb.from("manual_blocks").insert({
      starts_on: data.startsOn,
      ends_on: endsOn,
      reason: data.reason || null,
      color: data.color || "#94a3b8",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: update a manual block color / reason. */
export const updateManualBlock = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      color: z.string().trim().max(20).optional(),
      reason: z.string().trim().max(200).optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    const patch: { color?: string; reason?: string | null } = {};
    if (data.color) patch.color = data.color;
    if (data.reason !== undefined) patch.reason = data.reason || null;
    const { error } = await sb.from("manual_blocks").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: update an iCal feed (color / label). */
export const updateFeed = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      color: z.string().trim().max(20).optional(),
      label: z.string().trim().max(80).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    const patch: { color?: string; label?: string } = {};
    if (data.color) patch.color = data.color;
    if (data.label) patch.label = data.label;
    const { error } = await sb.from("ical_feeds").update(patch).eq("id", data.id);
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
const PUBLIC_SETTING_KEYS = [
  "base_nightly_price",
  "base_occupancy",
  "extra_adult_price",
  "child_price",
  "child_age_max",
  "pet_fee",
  "pet_fee_mode",
  "cleaning_fee",
  "currency",
  "contact_email",
  "contact_phone",
  "payments_mode",
  "deposit_percent",
  "max_guests",
  "ask_children",
  "ask_pets",
] as const;


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

/* ============================== GALLERY ============================== */

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

async function withSignedUrls(sb: Awaited<ReturnType<typeof admin>>, rows: Array<{ id: string; storage_path: string; alt: string | null; position: number; active: boolean }>) {
  if (rows.length === 0) return [];
  const paths = rows.map((r) => r.storage_path);
  const { data: signed } = await sb.storage.from("gallery").createSignedUrls(paths, SIGNED_URL_TTL);
  const map = new Map<string, string>();
  for (const s of signed ?? []) if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
  return rows.map((r) => ({ ...r, url: map.get(r.storage_path) ?? "" }));
}

/** Public: list active gallery images with signed URLs, ordered. */
export const getGalleryImages = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data } = await sb
    .from("gallery_images")
    .select("id, storage_path, alt, position, active")
    .eq("active", true)
    .order("position", { ascending: true });
  return withSignedUrls(sb, data ?? []);
});

/** Admin: list all gallery images (active + inactive) with signed URLs. */
export const listGalleryImages = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminUnlocked();
  const sb = await admin();
  const { data } = await sb
    .from("gallery_images")
    .select("id, storage_path, alt, position, active")
    .order("position", { ascending: true });
  return withSignedUrls(sb, data ?? []);
});

/** Admin: upload a new image. `dataUrl` is a base64 data URL. */
export const uploadGalleryImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      dataUrl: z.string().min(20).max(15_000_000),
      filename: z.string().trim().min(1).max(200),
      alt: z.string().trim().max(200).optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const match = data.dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) throw new Error("Neplatný obrázok");
    const contentType = match[1];
    const buf = Buffer.from(match[2], "base64");
    if (buf.byteLength > 10 * 1024 * 1024) throw new Error("Obrázok je väčší ako 10 MB");
    const ext = (data.filename.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const sb = await admin();
    const up = await sb.storage.from("gallery").upload(path, buf, { contentType, upsert: false });
    if (up.error) throw new Error(up.error.message);
    // Position: after the last one
    const { data: last } = await sb.from("gallery_images").select("position").order("position", { ascending: false }).limit(1);
    const nextPos = ((last?.[0]?.position ?? -1) as number) + 1;
    const { error } = await sb.from("gallery_images").insert({
      storage_path: path,
      alt: data.alt || null,
      position: nextPos,
      active: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: delete a gallery image. */
export const deleteGalleryImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    const { data: row } = await sb.from("gallery_images").select("storage_path").eq("id", data.id).maybeSingle();
    if (row?.storage_path) await sb.storage.from("gallery").remove([row.storage_path]);
    const { error } = await sb.from("gallery_images").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: reorder gallery. Pass full ordered list of ids. */
export const reorderGalleryImages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    await Promise.all(
      data.ids.map((id, idx) => sb.from("gallery_images").update({ position: idx }).eq("id", id)),
    );
    return { ok: true };
  });

/** Admin: toggle active. */
export const toggleGalleryImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminUnlocked();
    const sb = await admin();
    const { error } = await sb.from("gallery_images").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

