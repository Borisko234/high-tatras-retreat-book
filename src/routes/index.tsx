import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, BedDouble, Home, Bath, Toilet, MapPin, Mountain, Trees, Waves } from "lucide-react";
import heroImage from "@/assets/hero.jpg";
import poppiesImage from "@/assets/poppies.jpg";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Červené maky – chalupa pri Vysokých Tatrách, Malý Slavkov" },
      {
        name: "description",
        content:
          "Súkromný dom Červené maky v Malom Slavkove pri Vysokých Tatrách. 9 lôžok, 3 spálne, golfové ihrisko v susedstve. Rezervujte online priamo u majiteľky.",
      },
      { property: "og:title", content: "Červené maky – Vysoké Tatry" },
      { property: "og:description", content: "Útulný dom pre rodiny, 9 lôžok, pri golfovom ihrisku." },
      { property: "og:image", content: heroImage },
    ],
  }),
  component: HomePage,
});

const facts = [
  { icon: Users, key: "facts.guests", value: "9" },
  { icon: Home, key: "facts.rooms", value: "3" },
  { icon: BedDouble, key: "facts.beds", value: "9" },
  { icon: Bath, key: "facts.bath", value: "2" },
  { icon: Toilet, key: "facts.wc", value: "3" },
];

function HomePage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Drevený dom Červené maky s makovou lúkou a Vysokými Tatrami v pozadí"
            className="size-full object-cover"
            width={1920}
            height={1280}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/65" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pt-24 pb-32 md:pt-36 md:pb-44 text-white">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] opacity-90">
            <MapPin className="size-3.5" /> {t("hero.eyebrow")}
          </p>
          <h1 className="mt-5 font-display text-5xl md:text-7xl leading-[1.05] max-w-3xl">
            {t("hero.title")}
          </h1>
          <p className="mt-5 max-w-xl text-base md:text-lg opacity-90 leading-relaxed">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/rezervacia">{t("hero.cta.book")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-white/10 border-white/40 text-white hover:bg-white/20 hover:text-white backdrop-blur"
            >
              <Link to="/galeria">{t("hero.cta.gallery")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FACTS STRIP */}
      <section className="-mt-12 md:-mt-16 relative z-10 px-4">
        <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] p-6 md:p-8 grid grid-cols-2 sm:grid-cols-5 gap-6">
          {facts.map((f) => (
            <div key={f.key} className="flex flex-col items-center text-center">
              <f.icon className="size-6 text-primary" strokeWidth={1.5} />
              <div className="mt-2 font-display text-3xl text-foreground">{f.value}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-0.5">
                {t(f.key)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="mx-auto max-w-5xl px-4 py-20 md:py-28 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <h2 className="font-display text-3xl md:text-4xl text-foreground">{t("about.title")}</h2>
          <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">
            {t("about.body")}
          </p>
          <div className="mt-8">
            <Button asChild variant="outline" size="lg">
              <Link to="/rezervacia">{t("hero.cta.book")} →</Link>
            </Button>
          </div>
        </div>
        <div className="relative aspect-[5/6] rounded-2xl overflow-hidden border border-border shadow-[var(--shadow-card)]">
          <img
            src={poppiesImage}
            alt="Červené maky kvitnúce v horskej lúke"
            className="size-full object-cover"
            width={1600}
            height={1000}
            loading="lazy"
          />
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="bg-[color:var(--color-forest)] text-[color:var(--color-forest-foreground)]">
        <div className="mx-auto max-w-5xl px-4 py-20 md:py-28">
          <h2 className="font-display text-3xl md:text-4xl">{t("highlights.title")}</h2>
          <div className="mt-10 grid sm:grid-cols-2 gap-6">
            {[
              { icon: Trees, key: "highlights.golf" },
              { icon: Mountain, key: "highlights.tatry" },
              { icon: Mountain, key: "highlights.ski" },
              { icon: Trees, key: "highlights.hike" },
              { icon: Waves, key: "highlights.aqua" },
              { icon: MapPin, key: "highlights.kezmarok" },
            ].map(({ icon: Icon, key }) => (
              <div key={key} className="flex gap-4 items-start">
                <span className="size-10 rounded-full bg-white/10 inline-flex items-center justify-center shrink-0">
                  <Icon className="size-5" strokeWidth={1.6} />
                </span>
                <p className="text-base opacity-95 pt-2">{t(key)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-4 py-24 md:py-32 text-center">
        <h2 className="font-display text-3xl md:text-5xl text-foreground">
          {t("hero.cta.book")}
        </h2>
        <p className="mt-4 text-muted-foreground">
          {t("booking.intro")}
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/rezervacia">{t("nav.booking")} →</Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
