// Server-only helpers for the admin gate. Not importable from client code.
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

const DEFAULT_PASSWORD = "12345678";

export type GateSession = { unlocked?: boolean };

export function sessionConfig() {
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

export function eqPassword(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export async function readStoredPassword(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "admin_password")
    .maybeSingle();
  const v = data?.value as unknown;
  if (typeof v === "string" && v.length > 0) return v;
  return DEFAULT_PASSWORD;
}

export async function requireAdminUnlocked() {
  const session = await useSession<GateSession>(sessionConfig());
  if (!session.data.unlocked) {
    throw new Error("Unauthorized");
  }
}
