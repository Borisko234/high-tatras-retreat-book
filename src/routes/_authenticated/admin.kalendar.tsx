import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { type DateRange } from "react-day-picker";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminAvailabilityCalendar, type ColoredRange } from "@/components/admin-availability-calendar";
import { listManualBlocks, addManualBlock, deleteManualBlock, updateManualBlock, listFeeds } from "@/lib/admin.functions";
import { getAdminBlockedRanges } from "@/lib/availability.functions";
import { toISODate } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/admin/kalendar")({
  component: AdminCalendarPage,
});

function AdminCalendarPage() {
  const list = useServerFn(listManualBlocks);
  const add = useServerFn(addManualBlock);
  const del = useServerFn(deleteManualBlock);
  const upd = useServerFn(updateManualBlock);
  const feedsFn = useServerFn(listFeeds);
  const ranges = useServerFn(getAdminBlockedRanges);
  const qc = useQueryClient();

  const { data: manual = [] } = useQuery({ queryKey: ["manual-blocks"], queryFn: () => list() });
  const { data: blocked = [] } = useQuery({ queryKey: ["admin-blocked-ranges"], queryFn: () => ranges() });
  const { data: feeds = [] } = useQuery({ queryKey: ["feeds"], queryFn: () => feedsFn() });

  const [range, setRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState("");
  const [color, setColor] = useState("#94a3b8");

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["manual-blocks"] });
    qc.invalidateQueries({ queryKey: ["admin-blocked-ranges"] });
    qc.invalidateQueries({ queryKey: ["blocked-ranges"] });
  };

  const addM = useMutation({
    mutationFn: () =>
      add({
        data: {
          startsOn: toISODate(range!.from!),
          endsOn: toISODate(range!.to ?? range!.from!),
          reason,
          color,
        },
      }),
    onSuccess: () => {
      toast.success("Pridané");
      setRange(undefined);
      setReason("");
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: invalidateAll,
  });

  const updM = useMutation({
    mutationFn: (v: { id: string; color: string }) => upd({ data: v }),
    onSuccess: invalidateAll,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Kalendár</h1>
      <p className="text-sm text-muted-foreground">
        Farebný pruh pod dňom označuje zdroj obsadenia: zelená = potvrdená rezervácia, oranžová = čakajúca, farba portálu = importovaný feed, sivá alebo vlastná = manuálny blok. Môžete vybrať aj jediný deň.
      </p>

      <Legend feeds={feeds} />

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <AdminAvailabilityCalendar
          ranges={blocked as ColoredRange[]}
          selected={range}
          onSelect={setRange}
        />
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-display text-lg">Pridať manuálny blok</h2>
          <div className="text-sm text-muted-foreground">
            {range?.from ? (
              <>
                {toISODate(range.from)} → {toISODate(range.to ?? range.from)}
                {!range.to && <span className="ml-1 text-xs">(1 deň)</span>}
              </>
            ) : (
              "Vyberte deň alebo termín v kalendári."
            )}
          </div>
          <div>
            <Label htmlFor="reason">Dôvod (nepovinné)</Label>
            <Input id="reason" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="color">Farba</Label>
            <Input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <Button
            className="w-full"
            disabled={!range?.from || addM.isPending}
            onClick={() => addM.mutate()}
          >
            <Plus className="size-4" /> Pridať blok
          </Button>
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl mb-3">Existujúce manuálne bloky</h2>
        {manual.length === 0 ? (
          <p className="text-sm text-muted-foreground">Žiadne.</p>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-xl bg-card">
            {manual.map((b) => (
              <li key={b.id} className="p-4 flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="size-4 rounded-sm shrink-0" style={{ background: b.color || "#94a3b8" }} />
                  <div className="min-w-0">
                    <div className="font-medium">{b.starts_on} → {b.ends_on}</div>
                    {b.reason && <div className="text-sm text-muted-foreground truncate">{b.reason}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="size-8 rounded border border-input bg-background cursor-pointer"
                    value={b.color || "#94a3b8"}
                    onChange={(e) => updM.mutate({ id: b.id, color: e.target.value })}
                  />
                  <Button size="icon" variant="ghost" onClick={() => delM.mutate(b.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Legend({ feeds }: { feeds: Array<{ id: string; label: string; color: string }> }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <LegendItem color="#16a34a" label="Potvrdená rezervácia" />
      <LegendItem color="#f59e0b" label="Čakajúca rezervácia" />
      {feeds.map((f) => (
        <LegendItem key={f.id} color={f.color} label={f.label} />
      ))}
    </div>
  );
}
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="size-3 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
