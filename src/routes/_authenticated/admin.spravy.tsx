import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Phone, Trash2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listMessages, markMessageRead, deleteMessage } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/spravy")({
  component: MessagesPage,
});

function MessagesPage() {
  const list = useServerFn(listMessages);
  const mark = useServerFn(markMessageRead);
  const del = useServerFn(deleteMessage);
  const qc = useQueryClient();

  const { data = [] } = useQuery({ queryKey: ["messages"], queryFn: () => list() });

  const markM = useMutation({
    mutationFn: (v: { id: string; read: boolean }) => mark({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Správy od hostí</h1>
      {data.length === 0 ? (
        <p className="text-muted-foreground">Žiadne správy.</p>
      ) : (
        data.map((m) => (
          <div
            key={m.id}
            className={`rounded-xl border p-5 ${m.read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}
          >
            <div className="flex justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-medium">{m.name}</h3>
                <div className="text-sm flex gap-3 text-muted-foreground mt-1 flex-wrap">
                  <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 hover:text-primary">
                    <Mail className="size-3.5" /> {m.email}
                  </a>
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                      <Phone className="size-3.5" /> {m.phone}
                    </a>
                  )}
                  <span>{new Date(m.created_at).toLocaleString("sk")}</span>
                </div>
              </div>
              <div className="flex gap-2 self-start">
                <Button size="sm" variant="outline" onClick={() => markM.mutate({ id: m.id, read: !m.read })}>
                  <CheckCheck className="size-4" /> {m.read ? "Neprečítané" : "Prečítané"}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => delM.mutate(m.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{m.message}</p>
          </div>
        ))
      )}
    </div>
  );
}
