import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import {
  Inbox,
  CalendarClock,
  RefreshCcw,
  AlertTriangle,
  CalendarCheck,
  CalendarX,
  BedDouble,
  LogIn,
  LogOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminDashboard } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

function Dashboard() {
  const fn = useServerFn(getAdminDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fn(),
  });

  const today = iso(new Date());
  const in7 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return iso(d);
  }, []);

  if (isLoading || !data) return <p className="text-muted-foreground">Načítavam…</p>;

  const upcoming = data.upcoming ?? [];
  const arrivalsToday = upcoming.filter((b) => b.check_in === today);
  const departuresToday = upcoming.filter((b) => b.check_out === today);
  const stayingNow = upcoming.filter((b) => b.check_in <= today && b.check_out > today);
  const next7 = upcoming.filter((b) => b.check_in >= today && b.check_in <= in7);
  const pending = upcoming.filter((b) => b.status === "pending");
  const failedFeeds = data.feeds.filter((f) => f.last_error);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Prehľad</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<LogIn className="size-4" />} label="Príchody dnes" value={arrivalsToday.length} />
        <StatCard icon={<LogOut className="size-4" />} label="Odchody dnes" value={departuresToday.length} />
        <StatCard icon={<BedDouble className="size-4" />} label="Hosťujú teraz" value={stayingNow.length} />
        <StatCard icon={<CalendarClock className="size-4" />} label="Čakajúce žiadosti" value={data.pendingCount} />
        <StatCard icon={<Inbox className="size-4" />} label="Neprečítané správy" value={data.unreadMessages} />
        <StatCard icon={<RefreshCcw className="size-4" />} label="Aktívne feedy" value={data.feeds.filter((f) => f.enabled).length} />
        <StatCard icon={<CalendarCheck className="size-4" />} label="Najbližších 7 dní" value={next7.length} />
        <StatCard icon={<CalendarX className="size-4" />} label="Chybné feedy" value={failedFeeds.length} tone={failedFeeds.length ? "warn" : undefined} />
      </div>

      <Tabs defaultValue="prichody">
        <TabsList>
          <TabsTrigger value="prichody">Príchody a odchody</TabsTrigger>
          <TabsTrigger value="today">Dnes</TabsTrigger>
          <TabsTrigger value="pending">
            Čakajúce {pending.length > 0 && <span className="ml-1 text-xs">({pending.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Najbližšie</TabsTrigger>
          <TabsTrigger value="sync">
            Synchronizácia {failedFeeds.length > 0 && <span className="ml-1 text-xs text-destructive">({failedFeeds.length})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prichody">
          <ArrivalsDeparturesTimeline bookings={upcoming} today={today} />
        </TabsContent>

        <TabsContent value="today" className="space-y-4">
          <BookingSection title="Príchody dnes" bookings={arrivalsToday} empty="Dnes nikto neprichádza." />
          <BookingSection title="Odchody dnes" bookings={departuresToday} empty="Dnes nikto neodchádza." />
          <BookingSection title="Hosťujú teraz" bookings={stayingNow} empty="Momentálne nie sú u vás hostia." />
        </TabsContent>

        <TabsContent value="pending">
          <BookingSection title="Čakajú na potvrdenie" bookings={pending} empty="Žiadne čakajúce rezervácie." />
        </TabsContent>

        <TabsContent value="upcoming">
          <BookingSection title="Najbližších 10 rezervácií" bookings={upcoming} empty="Žiadne nadchádzajúce rezervácie." />
        </TabsContent>

        <TabsContent value="sync" className="space-y-3">
          {data.feeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Zatiaľ nemáte pridaný žiadny externý kalendár.</p>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-xl bg-card">
              {data.feeds.map((f) => (
                <li key={f.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.last_synced_at ? `Naposledy: ${new Date(f.last_synced_at).toLocaleString("sk-SK")}` : "Zatiaľ nesynchronizované"}
                    </div>
                    {f.last_error && <div className="text-xs text-destructive mt-1">{f.last_error}</div>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${f.enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {f.enabled ? "Aktívny" : "Vypnutý"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/synchronizacia" className="text-sm text-primary hover:underline inline-block">
            Otvoriť synchronizáciu →
          </Link>
        </TabsContent>
      </Tabs>

      {failedFeeds.length > 0 && (
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

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "warn" }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
          {icon} {label}
        </CardTitle>
      </CardHeader>
      <CardContent className={`text-3xl font-display ${tone === "warn" && value > 0 ? "text-destructive" : ""}`}>{value}</CardContent>
    </Card>
  );
}

type BookingRow = {
  id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
  guests_count: number;
};

function BookingSection({ title, bookings, empty }: { title: string; bookings: BookingRow[]; empty: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2">Hosť</th>
                <th>Termín</th>
                <th>Hostí</th>
                <th>Stav</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
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
  );
}

function ArrivalsDeparturesTimeline({ bookings, today }: { bookings: BookingRow[]; today: string }) {
  type Event = { date: string; type: "in" | "out"; booking: BookingRow };
  const events: Event[] = [];
  for (const b of bookings) {
    if (b.check_in >= today) events.push({ date: b.check_in, type: "in", booking: b });
    if (b.check_out >= today) events.push({ date: b.check_out, type: "out", booking: b });
  }
  events.sort((a, b) => (a.date === b.date ? (a.type === "out" ? -1 : 1) : a.date.localeCompare(b.date)));

  const grouped = new Map<string, Event[]>();
  for (const e of events) {
    if (!grouped.has(e.date)) grouped.set(e.date, []);
    grouped.get(e.date)!.push(e);
  }

  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "long" });

  if (grouped.size === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Žiadne nadchádzajúce príchody ani odchody.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Kto prichádza a odchádza</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {Array.from(grouped.entries()).map(([date, evs]) => (
          <div key={date}>
            <div className={`text-sm font-medium mb-2 ${date === today ? "text-primary" : "text-foreground"}`}>
              {fmt(date)}{date === today && " · dnes"}
            </div>
            <ul className="space-y-1.5">
              {evs.map((e, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                      e.type === "in"
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-amber-500/15 text-amber-700"
                    }`}
                  >
                    {e.type === "in" ? <><LogIn className="size-3" /> Príchod</> : <><LogOut className="size-3" /> Odchod</>}
                  </span>
                  <span className="font-medium">{e.booking.guest_name}</span>
                  <span className="text-muted-foreground text-xs">
                    {e.booking.check_in} → {e.booking.check_out} · {e.booking.guests_count} hostí
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

