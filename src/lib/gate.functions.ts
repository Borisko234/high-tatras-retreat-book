// Simple shared-credentials gate for the admin panel (email + password).
// Session lives in an encrypted, httpOnly cookie (7 days).
// Both credentials are stored in app_settings (keys: "admin_email", "admin_password")
// so they can be changed from the admin UI. Defaults: admin@example.com / 12345678.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export async function requireAdminUnlocked() {
  const { requireAdminUnlocked: impl } = await import("./gate.server");
  return impl();
}

/** Public: is this browser unlocked? */
export const getAdminGateStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { useSession } = await import("@tanstack/react-start/server");
  const { sessionConfig } = await import("./gate.server");
  const session = await useSession<{ unlocked?: boolean }>(sessionConfig());
  return { unlocked: Boolean(session.data.unlocked) };
});

/** Public: try email + password. */
export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().min(1).max(254),
        password: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { useSession } = await import("@tanstack/react-start/server");
    const { sessionConfig, eqString, readStoredPassword, readStoredEmail } = await import(
      "./gate.server"
    );
    const expectedPw = await readStoredPassword();
    const expectedEmail = await readStoredEmail();
    // Case-insensitive email compare, timing-safe.
    const emailOk = eqString(
      data.email.trim().toLowerCase(),
      expectedEmail.trim().toLowerCase(),
    );
    const pwOk = eqString(data.password, expectedPw);
    if (!emailOk || !pwOk) return { ok: false as const };
    const session = await useSession<{ unlocked?: boolean }>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

/** Admin: lock (sign out). */
export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { useSession } = await import("@tanstack/react-start/server");
  const { sessionConfig } = await import("./gate.server");
  const session = await useSession<{ unlocked?: boolean }>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

/** Admin: change stored password. */
export const changeAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        current: z.string().min(1),
        next: z.string().min(4).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdminUnlocked, eqString, readStoredPassword } = await import(
      "./gate.server"
    );
    await requireAdminUnlocked();
    const expected = await readStoredPassword();
    if (!eqString(data.current, expected)) throw new Error("Nesprávne aktuálne heslo");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "admin_password", value: data.next as any }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Admin: change stored email. */
export const changeAdminEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        currentPassword: z.string().min(1),
        nextEmail: z.string().trim().email().max(254),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdminUnlocked, eqString, readStoredPassword } = await import(
      "./gate.server"
    );
    await requireAdminUnlocked();
    const expected = await readStoredPassword();
    if (!eqString(data.currentPassword, expected))
      throw new Error("Nesprávne aktuálne heslo");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "admin_email", value: data.nextEmail as any }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
