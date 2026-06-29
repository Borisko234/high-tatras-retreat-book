import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/sync-calendars")({
  server: {
    handlers: {
      POST: async () => {
        const { runFeedSync } = await import("@/lib/sync.server");
        try {
          const result = await runFeedSync();
          return Response.json(result);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
