import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSettings,
  updateSetting,
  getAdminEmail,
  updateAdminEmail,
  updateAdminPassword,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/nastavenia")({
  component: SettingsPage,
});

function SettingsPage() {
  const getS = useServerFn(getSettings);
  const upS = useServerFn(updateSetting);
  const getE = useServerFn(getAdminEmail);
  const upE = useServerFn(updateAdminEmail);
  const upP = useServerFn(updateAdminPassword);
  const qc = useQueryClient();

  const { data: settings = {} } = useQuery({ queryKey: ["settings"], queryFn: () => getS() });
  const { data: emailData } = useQuery({ queryKey: ["admin-email"], queryFn: () => getE() });

  const [price, setPrice] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    setPrice(String(settings.base_nightly_price ?? ""));
    setContactEmail(String(settings.contact_email ?? ""));
    setContactPhone(String(settings.contact_phone ?? ""));
  }, [settings]);
  useEffect(() => {
    if (emailData) setAdminEmail(emailData.email);
  }, [emailData]);

  const saveSetting = useMutation({
    mutationFn: (vars: { key: string; value: string | number | null }) =>
      upS({ data: vars }),
    onSuccess: () => {
      toast.success("Uložené");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
  const saveEmail = useMutation({
    mutationFn: () => upE({ data: { email: adminEmail } }),
    onSuccess: () => toast.success("E-mail zmenený"),
    onError: (e: Error) => toast.error(e.message),
  });
  const savePwd = useMutation({
    mutationFn: () => upP({ data: { password: newPassword } }),
    onSuccess: () => {
      toast.success("Heslo zmenené");
      setNewPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="font-display text-3xl">Nastavenia</h1>

      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-display text-xl">Cena a kontakt</h2>
        <div>
          <Label>Základná cena za noc (€)</Label>
          <div className="flex gap-2">
            <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
            <Button
              variant="outline"
              onClick={() => saveSetting.mutate({ key: "base_nightly_price", value: Number(price) || 0 })}
            >
              <Save className="size-4" />
            </Button>
          </div>
        </div>
        <div>
          <Label>Kontaktný e-mail (zobrazený na webe)</Label>
          <div className="flex gap-2">
            <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            <Button
              variant="outline"
              onClick={() => saveSetting.mutate({ key: "contact_email", value: contactEmail })}
            >
              <Save className="size-4" />
            </Button>
          </div>
        </div>
        <div>
          <Label>Kontaktný telefón</Label>
          <div className="flex gap-2">
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            <Button
              variant="outline"
              onClick={() => saveSetting.mutate({ key: "contact_phone", value: contactPhone })}
            >
              <Save className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-display text-xl">Prihlasovacie údaje</h2>
        <p className="text-sm text-muted-foreground">
          Zmena sa prejaví okamžite. Pre prihlásenie použite nový e-mail / heslo.
        </p>
        <div>
          <Label>Prihlasovací e-mail</Label>
          <div className="flex gap-2">
            <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            <Button onClick={() => saveEmail.mutate()} disabled={saveEmail.isPending || !adminEmail}>
              <Save className="size-4" /> Uložiť
            </Button>
          </div>
        </div>
        <div>
          <Label>Nové heslo (min. 8 znakov)</Label>
          <div className="flex gap-2">
            <Input
              type="password"
              value={newPassword}
              minLength={8}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Button onClick={() => savePwd.mutate()} disabled={savePwd.isPending || newPassword.length < 8}>
              <Save className="size-4" /> Zmeniť heslo
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
