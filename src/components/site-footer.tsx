import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t border-border/60 bg-[color:var(--color-forest)] text-[color:var(--color-forest-foreground)]">
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-[color:var(--color-primary)] text-xl">❀</span>
            <span className="font-display text-xl">Červené maky</span>
          </div>
          <p className="mt-3 text-sm opacity-80 max-w-xs">{t("footer.tagline")}</p>
        </div>
        <div className="text-sm">
          <h3 className="font-display text-base mb-3 opacity-95">{t("nav.home")}</h3>
          <ul className="space-y-2 opacity-80">
            <li><Link to="/" className="hover:opacity-100">{t("nav.home")}</Link></li>
            <li><Link to="/galeria" className="hover:opacity-100">{t("nav.gallery")}</Link></li>
            <li><Link to="/rezervacia" className="hover:opacity-100">{t("nav.booking")}</Link></li>
            <li><Link to="/kontakt" className="hover:opacity-100">{t("nav.contact")}</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <h3 className="font-display text-base mb-3 opacity-95">{t("nav.contact")}</h3>
          <p className="opacity-80">Malý Slavkov<br />Vysoké Tatry, Slovensko</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs opacity-70 flex flex-wrap justify-between gap-2">
          <span>© {new Date().getFullYear()} Červené maky · {t("footer.rights")}</span>
          <Link to="/admin" className="hover:opacity-100">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
