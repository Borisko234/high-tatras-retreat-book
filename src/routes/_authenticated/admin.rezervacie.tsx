import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, X, Trash2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listBookings, updateBookingStatus, deleteBooking } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/rezervacie")({
  component: BookingsPage,
});

function BookingsPage() {
  const fn = useServerFn(listBookings);
  const upd = useServerFn(updateBookingStatus);
  const del = useServerFn(deleteBooking);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["bookings"], queryFn: () => fn() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["bookings"] });

  const setStatus = useMutation({
    mutationFn: (vars: { id: string; status: "pending" | "confirmed" | "cancelled" }) =>
      upd({ data: vars }),
    onSuccess: () => { toast.success("Aktualizované"); invalidate(); qc.invalidateQueries({ queryKey: ["blocked-ranges"] }); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Zmazané"); invalidate(); qc.invalidateQueries({ queryKey: ["blocked-ranges"] }); },
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Rezervácie</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Načítavam…</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground">Žiadne rezervácie.</p>
      ) : (
        <div className="space-y-3">
          {data.map((b) => (
            <div key={b.id} className="bg-card border border-border rounded-xl p-4 md:p-5 shadow-sm">
              <div className="flex flex-wrap gap-4 justify-between">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-medium text-lg">{b.guest_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      b.status === "confirmed" ? "bg-primary/15 text-primary" :
                      b.status === "pending" ? "bg-amber-500/15 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    }`}>{b.status}</span>
                    <span className="text-xs text-muted-foreground">{b.source}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {b.check_in} → {b.check_out} · {b.guests_count} hostí{b.total_price ? ` · ${b.total_price} €` : ""}
                  </div>
                  <div className="text-sm flex flex-wrap gap-4 mt-1">
                    <a href={`mailto:${b.guest_email}`} className="inline-flex items-center gap-1 hover:text-primary">
                      <Mail className="size-3.5" /> {b.guest_email}
                    </a>
                    {b.guest_phone && (
                      <a href={`tel:${b.guest_phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                        <Phone className="size-3.5" /> {b.guest_phone}
                      </a>
                    )}
                  </div>
                  {b.message && (
                    <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-3 mt-2">
                      {b.message}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 self-start">
                  {b.status !== "confirmed" && (
                    <Button size="sm" onClick={() => setStatus.mutate({ id: b.id, status: "confirmed" })}>
                      <Check className="size-4" /> Potvrdiť
                    </Button>
                  )}
                  {b.status !== "cancelled" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: b.id, status: "cancelled" })}>
                      <X className="size-4" /> Zrušiť
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Naozaj zmazať?")) remove.mutate(b.id); }}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
