import { createFileRoute } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import heroImage from "@/assets/hero.jpg";
import poppiesImage from "@/assets/poppies.jpg";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/galeria")({
  head: () => ({
    meta: [
      { title: "Galéria – Červené maky" },
      { name: "description", content: "Fotografie domu Červené maky a okolia – Malý Slavkov, Vysoké Tatry." },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const { t } = useI18n();

  // 8 placeholder slots; the first two use the generated images, rest are visual placeholders
  const items = [
    { src: heroImage, label: "Pohľad na dom" },
    { src: poppiesImage, label: "Maková lúka" },
    null, null, null, null, null, null,
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-12 pb-16 w-full">
        <header className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("nav.gallery")}</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl text-foreground">{t("gallery.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("gallery.intro")}</p>
        </header>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {items.map((item, i) => (
            <div
              key={i}
              className={`relative overflow-hidden rounded-xl border border-border bg-muted ${
                i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
              }`}
            >
              {item ? (
                <img
                  src={item.src}
                  alt={item.label}
                  className="size-full object-cover transition-transform duration-700 hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="size-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Camera className="size-6 opacity-60" strokeWidth={1.4} />
                  <span className="text-xs">{t("gallery.placeholder")}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
