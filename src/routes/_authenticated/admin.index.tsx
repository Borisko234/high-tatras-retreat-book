import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, CalendarClock, RefreshCcw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboard } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const fn = useServerFn(getAdminDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fn(),
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Načítavam…</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Prehľad</h1>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
              <CalendarClock className="size-4" /> Čakajúce žiadosti
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-display">{data.pendingCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
              <Inbox className="size-4" /> Neprečítané správy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-display">{data.unreadMessages}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
              <RefreshCcw className="size-4" /> Aktívnych feedov
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-display">
            {data.feeds.filter((f) => f.enabled).length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Najbližšie rezervácie</CardTitle>
        </CardHeader>
        <CardContent>
          {data.upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žiadne nadchádzajúce rezervácie.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr><th className="py-2">Hosť</th><th>Termín</th><th>Hostí</th><th>Stav</th></tr>
              </thead>
              <tbody>
                {data.upcoming.map((b) => (
                  <tr key={b.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3">{b.guest_name}</td>
                    <td>{b.check_in} → {b.check_out}</td>
                    <td>{b.guests_count}</td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        b.status === "confirmed"
                          ? "bg-primary/15 text-primary"
                          : "bg-amber-500/15 text-amber-700"
                      }`}>{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {data.feeds.some((f) => f.last_error) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex gap-3">
          <AlertTriangle className="size-5 text-destructive shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Niektoré kalendárové feedy zlyhali pri poslednej synchronizácii.</p>
            <p className="text-muted-foreground mt-1">Otvorte sekciu Synchronizácia pre detaily.</p>
          </div>
        </div>
      )}
    </div>
  );
}
