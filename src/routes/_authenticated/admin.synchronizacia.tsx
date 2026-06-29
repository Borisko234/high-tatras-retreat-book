import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Copy, RefreshCw, Trash2, Plus, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listFeeds, addFeed, deleteFeed, syncFeedsNow } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/synchronizacia")({
  component: SyncPage,
});

function SyncPage() {
  const list = useServerFn(listFeeds);
  const add = useServerFn(addFeed);
  const del = useServerFn(deleteFeed);
  const sync = useServerFn(syncFeedsNow);
  const qc = useQueryClient();

  const { data: feeds = [] } = useQuery({ queryKey: ["feeds"], queryFn: () => list() });
  const [exportUrl, setExportUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setExportUrl(`${window.location.origin}/api/public/calendar.ics`);
  }, []);

  const [form, setForm] = useState({ label: "", url: "", color: "#888888" });

  const addM = useMutation({
    mutationFn: () => add({ data: form }),
    onSuccess: () => {
      toast.success("Feed pridaný");
      setForm({ label: "", url: "", color: "#888888" });
      qc.invalidateQueries({ queryKey: ["feeds"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feeds"] });
      qc.invalidateQueries({ queryKey: ["blocked-ranges"] });
    },
  });

  const syncM = useMutation({
    mutationFn: () => sync(),
    onSuccess: (r) => {
      const ok = r.results.filter((x) => !x.error).length;
      const fail = r.results.length - ok;
      toast.success(`Synchronizované: ${ok} OK${fail ? `, ${fail} chýb` : ""}`);
      qc.invalidateQueries({ queryKey: ["feeds"] });
      qc.invalidateQueries({ queryKey: ["blocked-ranges"] });
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Synchronizácia kalendárov</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Prepojte web s Booking, Airbnb, Housy a Megaubytovanie cez iCal feedy. Dva smery:
          (1) <strong>z portálov sem</strong> – pridajte iCal URL každého portálu nižšie;
          (2) <strong>zo siete na portály</strong> – vložte URL nižšie do nastavenia kalendára na každom portáli.
        </p>
      </div>

      {/* Export URL */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-3">
        <h2 className="font-display text-xl">URL kalendára Červené maky</h2>
        <p className="text-sm text-muted-foreground">
          Skopírujte túto adresu a vložte ju na Booking, Airbnb, Housy a Megaubytovanie pod <em>Import kalendára</em>.
          Po každej priamej rezervácii (alebo manuálnom bloku) sa termín objaví v tomto feede a portály ho automaticky zablokujú.
        </p>
        <div className="flex gap-2">
          <Input value={exportUrl} readOnly className="font-mono text-sm" />
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(exportUrl);
              toast.success("Skopírované");
            }}
          >
            <Copy className="size-4" /> Kopírovať
          </Button>
        </div>
      </section>

      {/* Imported feeds */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl">Importované kalendáre</h2>
          <Button onClick={() => syncM.mutate()} disabled={syncM.isPending} variant="outline">
            <RefreshCw className={`size-4 ${syncM.isPending ? "animate-spin" : ""}`} /> Synchronizovať teraz
          </Button>
        </div>

        {feeds.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatiaľ žiadne. Pridajte prvý nižšie.</p>
        ) : (
          <ul className="divide-y divide-border">
            {feeds.map((f) => (
              <li key={f.id} className="py-3 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ background: f.color }} />
                    <span className="font-medium">{f.label}</span>
                    {f.last_error ? (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive"><XCircle className="size-3" /> chyba</span>
                    ) : f.last_synced_at ? (
                      <span className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="size-3" /> OK</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{f.url}</div>
                  {f.last_synced_at && (
                    <div className="text-xs text-muted-foreground">Posledná synchronizácia: {new Date(f.last_synced_at).toLocaleString("sk")}</div>
                  )}
                  {f.last_error && <div className="text-xs text-destructive">{f.last_error}</div>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => delM.mutate(f.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add feed */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-display text-xl">Pridať kalendár</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Názov</Label>
            <Input
              placeholder="Booking.com"
              value={form.label}
              onChange={(e) => setForm((s) => ({ ...s, label: e.target.value }))}
            />
          </div>
          <div>
            <Label>Farba</Label>
            <Input type="color" value={form.color} onChange={(e) => setForm((s) => ({ ...s, color: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>iCal URL</Label>
            <Input
              placeholder="https://admin.booking.com/...ics"
              value={form.url}
              onChange={(e) => setForm((s) => ({ ...s, url: e.target.value }))}
            />
          </div>
        </div>
        <Button onClick={() => addM.mutate()} disabled={!form.label || !form.url || addM.isPending}>
          <Plus className="size-4" /> Pridať feed
        </Button>
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">Kde nájdem iCal URL?</summary>
          <ul className="mt-2 space-y-1 list-disc pl-5">
            <li><strong>Booking.com:</strong> Extranet → Sadzby a dostupnosť → Synchronizácia kalendárov → Exportovať kalendár.</li>
            <li><strong>Airbnb:</strong> Listing → Availability → Sync calendars → Export calendar.</li>
            <li><strong>Housy:</strong> Nastavenia kalendára → iCal export.</li>
            <li><strong>Megaubytovanie:</strong> Nastavenia ubytovania → Synchronizácia → URL pre export.</li>
          </ul>
        </details>
      </section>
    </div>
  );
}
