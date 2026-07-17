import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listGalleryImages,
  uploadGalleryImage,
  deleteGalleryImage,
  reorderGalleryImages,
  toggleGalleryImage,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/galeria")({
  component: AdminGalleryPage,
});

type Image = {
  id: string;
  storage_path: string;
  alt: string | null;
  position: number;
  active: boolean;
  url: string;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function AdminGalleryPage() {
  const listFn = useServerFn(listGalleryImages);
  const upFn = useServerFn(uploadGalleryImage);
  const delFn = useServerFn(deleteGalleryImage);
  const reorderFn = useServerFn(reorderGalleryImages);
  const toggleFn = useServerFn(toggleGalleryImage);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");

  const { data: images = [] } = useQuery({
    queryKey: ["admin-gallery"],
    queryFn: () => listFn() as Promise<Image[]>,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-gallery"] });
    qc.invalidateQueries({ queryKey: ["public-gallery"] });
  };

  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        const dataUrl = await fileToDataUrl(f);
        await upFn({ data: { dataUrl, filename: f.name, alt } });
      }
    },
    onSuccess: () => {
      toast.success("Obrázky nahrané");
      setAlt("");
      if (fileRef.current) fileRef.current.value = "";
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: invalidate,
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggleFn({ data: v }),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderFn({ data: { ids } }),
    onSuccess: invalidate,
  });

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const ids = images.map((i) => i.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Galéria</h1>
      <p className="text-sm text-muted-foreground">
        Nahrajte fotografie, ktoré sa zobrazia hosťom v galérii. Poradie meníte šípkami. Skryté obrázky zostanú uložené, ale nezobrazia sa návštevníkom.
      </p>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-display text-lg">Nahrať obrázky</h2>
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <Label htmlFor="alt">Popis (voliteľný, pre všetky nahrávané)</Label>
            <Input id="alt" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} />
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && e.target.files.length > 0 && upload.mutate(e.target.files)}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Vybrať súbory
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Max. 10 MB na obrázok. Podporované formáty: JPG, PNG, WEBP.</p>
      </section>

      <section>
        <h2 className="font-display text-xl mb-3">Obrázky ({images.length})</h2>
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatiaľ žiadne obrázky.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {images.map((img, i) => (
              <li key={img.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="relative aspect-video bg-muted">
                  {img.url && (
                    <img
                      src={img.url}
                      alt={img.alt ?? ""}
                      className={`size-full object-cover ${img.active ? "" : "opacity-40"}`}
                    />
                  )}
                  {!img.active && (
                    <span className="absolute top-2 left-2 text-xs bg-background/90 rounded px-2 py-0.5">
                      Skryté
                    </span>
                  )}
                </div>
                <div className="p-3 flex items-center gap-1 flex-wrap">
                  <span className="text-xs text-muted-foreground mr-auto">#{i + 1} {img.alt ?? ""}</span>
                  <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} title="Posunúť hore">
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={i === images.length - 1} onClick={() => move(i, 1)} title="Posunúť dole">
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => toggle.mutate({ id: img.id, active: !img.active })}
                    title={img.active ? "Skryť" : "Zobraziť"}
                  >
                    {img.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Zmazať obrázok?")) del.mutate(img.id);
                    }}
                    title="Zmazať"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
