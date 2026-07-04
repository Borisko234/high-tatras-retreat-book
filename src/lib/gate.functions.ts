// Simple shared-password gate for the admin panel.
// Session lives in an encrypted, httpOnly cookie (7 days).
// The password itself is stored in app_settings (key: "admin_password")
// so it can be changed from the admin UI. Default: "12345678".
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

/** Public: try the password. */
export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ password: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { useSession } = await import("@tanstack/react-start/server");
    const { sessionConfig, eqPassword, readStoredPassword } = await import("./gate.server");
    const expected = await readStoredPassword();
    if (!eqPassword(data.password, expected)) return { ok: false as const };
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

/** Admin: change the stored password. */
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
    const { requireAdminUnlocked, eqPassword, readStoredPassword } = await import("./gate.server");
    await requireAdminUnlocked();
    const expected = await readStoredPassword();
    if (!eqPassword(data.current, expected)) throw new Error("Nesprávne aktuálne heslo");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "admin_password", value: data.next as any }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
