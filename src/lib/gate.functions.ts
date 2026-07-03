// Simple shared-password gate for the admin panel.
// Session lives in an encrypted, httpOnly cookie (7 days).
// The password itself is stored in app_settings (key: "admin_password")
// so it can be changed from the admin UI. Default: "12345678".
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const DEFAULT_PASSWORD = "12345678";

function sessionConfig() {
  return {
    password:
      process.env.SESSION_SECRET ??
      "cervene-maky-fallback-session-secret-change-me-please-32chars",
    name: "cm-admin",
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

type GateSession = { unlocked?: boolean };

function eq(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function readStoredPassword(): Promise<string> {
  const sb = await adminClient();
  const { data } = await sb
    .from("app_settings")
    .select("value")
    .eq("key", "admin_password")
    .maybeSingle();
  const v = data?.value as unknown;
  if (typeof v === "string" && v.length > 0) return v;
  return DEFAULT_PASSWORD;
}

/** Throw if session cookie is not unlocked. Use inside any admin server fn. */
export async function requireAdminUnlocked() {
  const session = await useSession<GateSession>(sessionConfig());
  if (!session.data.unlocked) {
    throw new Error("Unauthorized");
  }
}

/** Public: is this browser unlocked? */
export const getAdminGateStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  return { unlocked: Boolean(session.data.unlocked) };
});

/** Public: try the password. */
export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ password: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const expected = await readStoredPassword();
    if (!eq(data.password, expected)) return { ok: false as const };
    const session = await useSession<GateSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

/** Admin: lock (sign out). */
export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
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
    await requireAdminUnlocked();
    const expected = await readStoredPassword();
    if (!eq(data.current, expected)) throw new Error("Nesprávne aktuálne heslo");
    const sb = await adminClient();
    const { error } = await sb
      .from("app_settings")
      .upsert({ key: "admin_password", value: data.next as any }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
