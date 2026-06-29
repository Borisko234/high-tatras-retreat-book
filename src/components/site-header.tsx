import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/galeria", label: t("nav.gallery") },
    { to: "/rezervacia", label: t("nav.booking") },
    { to: "/kontakt", label: t("nav.contact") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-primary text-xl" aria-hidden>❀</span>
          <span className="font-display text-lg md:text-xl tracking-tight text-foreground group-hover:text-primary transition-colors">
            Červené maky
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-medium"
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-1 rounded-full border border-border bg-card px-1 py-0.5 text-xs">
            <button
              onClick={() => setLang("sk")}
              className={`px-2 py-1 rounded-full transition-colors ${lang === "sk" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              SK
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-2 py-1 rounded-full transition-colors ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              EN
            </button>
          </div>
          <Button asChild size="sm">
            <Link to="/rezervacia">{t("nav.booking")}</Link>
          </Button>
        </nav>

        <button
          aria-label="Menu"
          className="md:hidden p-2 -mr-2 text-foreground"
          onClick={() => setOpen((s) => !s)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="text-base py-1 text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <div className="flex items-center gap-2 pt-2 border-t border-border/60">
              <span className="text-xs text-muted-foreground mr-1">Jazyk / Language:</span>
              <button
                onClick={() => setLang("sk")}
                className={`px-3 py-1 rounded-full text-xs ${lang === "sk" ? "bg-primary text-primary-foreground" : "border border-border"}`}
              >
                SK
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-1 rounded-full text-xs ${lang === "en" ? "bg-primary text-primary-foreground" : "border border-border"}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
