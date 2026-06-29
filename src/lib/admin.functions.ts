import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DEFAULT_ADMIN_EMAIL = "cervene.maky.privat@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "12345678";

/** Public: ensures a seeded admin user exists. Idempotent no-op once an admin is created. */
export const ensureAdminBootstrap = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if ((count ?? 0) > 0) {
    return { seeded: false, email: DEFAULT_ADMIN_EMAIL };
  }

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
    email_confirm: true,
  });
  // If user already exists in auth but has no role, the DB trigger only fires on first ever user.
  // In that case, ensure a role is granted now.
  if (error && !/already.*registered/i.test(error.message)) {
    throw new Error(error.message);
  }
  const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
  const existing = usersList.users.find((u) => u.email === DEFAULT_ADMIN_EMAIL);
  if (existing) {
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: existing.id, role: "admin" }, { onConflict: "user_id,role" });
  }

  return { seeded: true, email: DEFAULT_ADMIN_EMAIL };
});

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

/** Returns whether the signed-in user is an admin. */
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    return { isAdmin: (data ?? []).some((r: { role: string }) => r.role === "admin") };
  });

/** Admin: dashboard summary. */
export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const today = new Date().toISOString().slice(0, 10);
    const [pending, upcoming, unread, feeds] = await Promise.all([
      context.supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      context.supabase
        .from("bookings")
        .select("id, guest_name, check_in, check_out, status, guests_count, total_price")
        .gte("check_out", today)
        .in("status", ["confirmed", "pending"])
        .order("check_in", { ascending: true })
        .limit(10),
      context.supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("read", false),
      context.supabase.from("ical_feeds").select("id, label, last_synced_at, last_error, enabled"),
    ]);
    return {
      pendingCount: pending.count ?? 0,
      unreadMessages: unread.count ?? 0,
      upcoming: upcoming.data ?? [],
      feeds: feeds.data ?? [],
    };
  });

/** Admin: list bookings. */
export const listBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

/** Admin: update booking status. */
export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "confirmed", "cancelled"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: delete booking. */
export const deleteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("bookings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list iCal feeds. */
export const listFeeds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("ical_feeds")
      .select("*")
      .order("created_at", { ascending: true });
    return data ?? [];
  });

/** Admin: add iCal feed. */
export const addFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      label: z.string().trim().min(1).max(80),
      url: z.string().trim().url().max(2000),
      color: z.string().trim().max(20).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("ical_feeds")
      .insert({ label: data.label, url: data.url, color: data.color || "#888888" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: delete iCal feed. */
export const deleteFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("ical_feeds").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: trigger a sync now. */
export const syncFeedsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { runFeedSync } = await import("./sync.server");
    return runFeedSync();
  });

/** Admin: list manual blocks. */
export const listManualBlocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("manual_blocks")
      .select("*")
      .order("starts_on", { ascending: true });
    return data ?? [];
  });

/** Admin: add a manual block. */
export const addManualBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason: z.string().trim().max(200).optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    if (data.endsOn <= data.startsOn) throw new Error("Invalid range");
    const { error } = await context.supabase
      .from("manual_blocks")
      .insert({ starts_on: data.startsOn, ends_on: data.endsOn, reason: data.reason || null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: delete manual block. */
export const deleteManualBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("manual_blocks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list contact messages. */
export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

/** Admin: toggle message read. */
export const markMessageRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), read: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    await context.supabase.from("contact_messages").update({ read: data.read }).eq("id", data.id);
    return { ok: true };
  });

/** Admin: delete message. */
export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    await context.supabase.from("contact_messages").delete().eq("id", data.id);
    return { ok: true };
  });

/** Public: read settings. */
type SettingValue = string | number | boolean | null;
export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("app_settings").select("*");
  const map: Record<string, SettingValue> = {};
  for (const row of data ?? []) map[row.key] = row.value as SettingValue;
  return map;
});


/** Admin: update a setting. */
export const updateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      key: z.string().min(1).max(80),
      value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {

    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("app_settings")
      .upsert({ key: data.key, value: data.value as any }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: change own email (uses admin API so no confirmation link needed). */
export const updateAdminEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      email: data.email,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: change own password. */
export const updateAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ password: z.string().min(8).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Returns the admin's current email for the settings page. */
export const getAdminEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return { email: (context.claims as any).email ?? "" };
  });
