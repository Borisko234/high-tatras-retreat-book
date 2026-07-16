import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockAdmin } from "@/lib/gate.functions";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/admin-login")({
  validateSearch: (s) => searchSchema.parse(s),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect } = Route.useSearch();
  const unlock = useServerFn(unlockAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { ok } = await unlock({ data: { email, password } });
      if (!ok) {
        setErr("Nesprávny e-mail alebo heslo");
        return;
      }
      await router.invalidate();
      navigate({ to: redirect ?? "/admin" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Lock className="size-5 text-primary" />
          <h1 className="font-display text-2xl">Prihlásenie do administrácie</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Zadajte e-mail a heslo pre prístup do admin panelu.
        </p>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">Heslo</Label>
          <Input
            id="pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" disabled={busy || !email || !password} className="w-full">
          {busy ? "Overujem…" : "Prihlásiť sa"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Predvolené: <code>admin@example.com</code> / <code>12345678</code>. V Nastaveniach ich zmeňte.
        </p>
      </form>
    </div>
  );
}
