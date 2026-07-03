import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Save, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSettings, updateSetting } from "@/lib/admin.functions";
import { changeAdminPassword } from "@/lib/gate.functions";

export const Route = createFileRoute("/_authenticated/admin/nastavenia")({
  component: SettingsPage,
});

function SettingsPage() {
  const getS = useServerFn(getSettings);
  const upS = useServerFn(updateSetting);
  const changePw = useServerFn(changeAdminPassword);
  const qc = useQueryClient();

  const { data: settings = {} } = useQuery({ queryKey: ["settings"], queryFn: () => getS() });

  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const changePwMut = useMutation({
    mutationFn: (vars: { current: string; next: string }) => changePw({ data: vars }),
    onSuccess: () => {
      toast.success("Heslo bolo zmenené");
      setCurrentPw("");
      setNextPw("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [price, setPrice] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    setPrice(String(settings.base_nightly_price ?? ""));
    setContactEmail(String(settings.contact_email ?? ""));
    setContactPhone(String(settings.contact_phone ?? ""));
  }, [settings]);

  const saveSetting = useMutation({
    mutationFn: (vars: { key: string; value: string | number | null }) => upS({ data: vars }),
    onSuccess: () => {
      toast.success("Uložené");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
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
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary" />
          <h2 className="font-display text-xl">Heslo do administrácie</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Admin panel je chránený heslom. Predvolené heslo je <code className="text-foreground">12345678</code> – odporúčame ho zmeniť.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Aktuálne heslo</Label>
            <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
          </div>
          <div>
            <Label>Nové heslo</Label>
            <Input type="password" value={nextPw} onChange={(e) => setNextPw(e.target.value)} />
          </div>
        </div>
        <Button
          disabled={changePwMut.isPending || !currentPw || nextPw.length < 4}
          onClick={() => changePwMut.mutate({ current: currentPw, next: nextPw })}
        >
          Zmeniť heslo
        </Button>
      </section>
    </div>
  );
}

