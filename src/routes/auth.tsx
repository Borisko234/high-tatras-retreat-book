import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ensureAdminBootstrap } from "@/lib/admin.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin – Červené maky" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const bootstrap = useServerFn(ensureAdminBootstrap);

  const [email, setEmail] = useState("cervene.maky.privat@gmail.com");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    // Ensure default admin exists (no-op after first run). Then redirect if already signed in.
    (async () => {
      try {
        await bootstrap();
      } catch (e) {
        console.error("bootstrap failed", e);
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/admin" });
      setBootstrapping(false);
    })();
  }, [bootstrap, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) {
      toast.error(t("auth.error"));
      return;
    }
    navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <span className="text-primary text-2xl">❀</span>
        <span className="font-display text-2xl">Červené maky</span>
      </Link>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-[var(--shadow-card)] space-y-4"
      >
        <h1 className="font-display text-2xl text-foreground">{t("auth.title")}</h1>
        <div>
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending || bootstrapping}>
          {(pending || bootstrapping) && <Loader2 className="size-4 animate-spin" />}
          {t("auth.signin")}
        </Button>
        <p className="text-xs text-muted-foreground text-center pt-2">
          Predvolené heslo: <code className="text-foreground">12345678</code> – po prvom prihlásení ho zmeňte v Nastaveniach.
        </p>
      </form>
    </div>
  );
}
