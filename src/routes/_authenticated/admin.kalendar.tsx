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
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { listManualBlocks, addManualBlock, deleteManualBlock } from "@/lib/admin.functions";
import { getBlockedRanges } from "@/lib/availability.functions";
import { toISODate } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/admin/kalendar")({
  component: AdminCalendarPage,
});

function AdminCalendarPage() {
  const list = useServerFn(listManualBlocks);
  const add = useServerFn(addManualBlock);
  const del = useServerFn(deleteManualBlock);
  const blocks = useServerFn(getBlockedRanges);
  const qc = useQueryClient();

  const { data: manual = [] } = useQuery({ queryKey: ["manual-blocks"], queryFn: () => list() });
  const { data: blocked = [] } = useQuery({ queryKey: ["blocked-ranges"], queryFn: () => blocks() });

  const [range, setRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState("");

  const addM = useMutation({
    mutationFn: () =>
      add({
        data: {
          startsOn: toISODate(range!.from!),
          endsOn: toISODate(range!.to!),
          reason,
        },
      }),
    onSuccess: () => {
      toast.success("Pridané");
      setRange(undefined);
      setReason("");
      qc.invalidateQueries({ queryKey: ["manual-blocks"] });
      qc.invalidateQueries({ queryKey: ["blocked-ranges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manual-blocks"] });
      qc.invalidateQueries({ queryKey: ["blocked-ranges"] });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Kalendár</h1>
      <p className="text-sm text-muted-foreground">
        Tu vidíte všetky obsadené dni (rezervácie z webu + importované feedy + manuálne bloky). Manuálne bloky použite napr. na údržbu alebo vlastný pobyt.
      </p>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <AvailabilityCalendar blocked={blocked} selected={range} onSelect={setRange} />
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-display text-lg">Pridať manuálny blok</h2>
          <div className="text-sm text-muted-foreground">
            {range?.from && range?.to ? (
              <>{toISODate(range.from)} → {toISODate(range.to)}</>
            ) : (
              "Vyberte termín v kalendári."
            )}
          </div>
          <div>
            <Label htmlFor="reason">Dôvod (nepovinné)</Label>
            <Input id="reason" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <Button
            className="w-full"
            disabled={!range?.from || !range?.to || addM.isPending}
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
              <li key={b.id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{b.starts_on} → {b.ends_on}</div>
                  {b.reason && <div className="text-sm text-muted-foreground">{b.reason}</div>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => delM.mutate(b.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
