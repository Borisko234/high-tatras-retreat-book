import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useI18n } from "@/lib/i18n";
import { getGalleryImages } from "@/lib/admin.functions";

export const Route = createFileRoute("/galeria")({
  head: () => ({
    meta: [
      { title: "Galéria – Červené maky" },
      { name: "description", content: "Fotografie domu Červené maky a okolia – Malý Slavkov, Vysoké Tatry." },
    ],
  }),
  component: GalleryPage,
});

type Image = { id: string; url: string; alt: string | null };

function GalleryPage() {
  const { t } = useI18n();
  const fetchImages = useServerFn(getGalleryImages);
  const { data: images = [], isLoading } = useQuery({
    queryKey: ["public-gallery"],
    queryFn: () => fetchImages() as Promise<Image[]>,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-12 pb-16 w-full">
        <header className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("nav.gallery")}</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl text-foreground">{t("gallery.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("gallery.intro")}</p>
        </header>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Načítavam…</p>
        ) : images.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Camera className="size-8 opacity-60" strokeWidth={1.4} />
            <p className="text-sm">{t("gallery.placeholder")}</p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {images.map((img, i) => (
              <div
                key={img.id}
                className={`relative overflow-hidden rounded-xl border border-border bg-muted ${
                  i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
                }`}
              >
                <img
                  src={img.url}
                  alt={img.alt ?? ""}
                  className="size-full object-cover transition-transform duration-700 hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
