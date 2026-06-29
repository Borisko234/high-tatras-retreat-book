import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { generateICS, type ParsedEvent } from "@/lib/ical.server";

export const Route = createFileRoute("/api/public/calendar.ics")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const todayIso = new Date().toISOString().slice(0, 10);
        const [{ data: bookings }, { data: blocks }] = await Promise.all([
          supabaseAdmin
            .from("bookings")
            .select("id, check_in, check_out, status")
            .eq("status", "confirmed")
            .gte("check_out", todayIso),
          supabaseAdmin.from("manual_blocks").select("id, starts_on, ends_on, reason").gte("ends_on", todayIso),
        ]);

        const events: ParsedEvent[] = [];
        for (const b of bookings ?? []) {
          events.push({
            uid: `booking-${b.id}@cervene-maky`,
            summary: "Reserved - Direct",
            start: b.check_in,
            end: b.check_out,
          });
        }
        for (const m of blocks ?? []) {
          events.push({
            uid: `block-${m.id}@cervene-maky`,
            summary: m.reason || "Blocked",
            start: m.starts_on,
            end: m.ends_on,
          });
        }

        const body = generateICS(events, "Cervene maky");
        return new Response(body, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="cervene-maky.ics"',
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
