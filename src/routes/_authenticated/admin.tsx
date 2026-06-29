import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { LayoutDashboard, CalendarDays, Inbox, RefreshCcw, Settings, LogOut, BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { getMyRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const role = useServerFn(getMyRole);

  const { data, isLoading } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => role(),
  });

  useEffect(() => {
    if (data && !data.isAdmin) {
      supabase.auth.signOut().then(() => navigate({ to: "/auth" }));
    }
  }, [data, navigate]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("common.loading")}</div>;
  }
  if (!data?.isAdmin) return null;

  const links = [
    { to: "/admin", label: t("admin.dashboard"), icon: LayoutDashboard, exact: true },
    { to: "/admin/rezervacie", label: t("admin.bookings"), icon: BookOpenCheck },
    { to: "/admin/kalendar", label: t("admin.calendar"), icon: CalendarDays },
    { to: "/admin/synchronizacia", label: t("admin.sync"), icon: RefreshCcw },
    { to: "/admin/spravy", label: t("admin.messages"), icon: Inbox },
    { to: "/admin/nastavenia", label: t("admin.settings"), icon: Settings },
  ];

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-primary">❀</span>
            <span className="font-display text-lg">Červené maky <span className="text-muted-foreground font-sans text-sm">/ Admin</span></span>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4" /> {t("admin.logout")}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl grid md:grid-cols-[220px_1fr] gap-6 px-4 py-6">
        <nav className="md:sticky md:top-6 h-fit">
          <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {links.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  activeOptions={l.exact ? { exact: true } : undefined}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted whitespace-nowrap [&.active]:bg-primary/10 [&.active]:text-primary [&.active]:font-medium"
                >
                  <l.icon className="size-4" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
