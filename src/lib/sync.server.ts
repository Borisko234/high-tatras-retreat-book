// Server-only: fetches each enabled iCal feed, parses it, and replaces the feed's
// imported_events. Used by the admin "Sync now" button and the scheduled cron route.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseICS } from "./ical.server";

export async function runFeedSync() {
  const { data: feeds, error } = await supabaseAdmin
    .from("ical_feeds")
    .select("id, label, url, enabled")
    .eq("enabled", true);
  if (error) throw new Error(error.message);

  const results: Array<{ id: string; label: string; events: number; error?: string }> = [];

  for (const feed of feeds ?? []) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "Cervene-Maky-Calendar-Sync/1.0" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const events = parseICS(text);

      // replace strategy: delete old, insert fresh
      await supabaseAdmin.from("imported_events").delete().eq("feed_id", feed.id);

      if (events.length > 0) {
        const rows = events.map((e) => ({
          feed_id: feed.id,
          uid: e.uid,
          summary: e.summary,
          starts_on: e.start,
          ends_on: e.end,
        }));
        const { error: insertErr } = await supabaseAdmin.from("imported_events").insert(rows);
        if (insertErr) throw new Error(insertErr.message);
      }

      await supabaseAdmin
        .from("ical_feeds")
        .update({ last_synced_at: new Date().toISOString(), last_error: null })
        .eq("id", feed.id);

      results.push({ id: feed.id, label: feed.label, events: events.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabaseAdmin
        .from("ical_feeds")
        .update({ last_synced_at: new Date().toISOString(), last_error: msg })
        .eq("id", feed.id);
      results.push({ id: feed.id, label: feed.label, events: 0, error: msg });
    }
  }

  return { results, syncedAt: new Date().toISOString() };
}
