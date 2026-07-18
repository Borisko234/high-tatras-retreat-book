import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Save, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllSettings, updateSetting } from "@/lib/admin.functions";
import { changeAdminPassword, changeAdminEmail } from "@/lib/gate.functions";

export const Route = createFileRoute("/_authenticated/admin/nastavenia")({
  component: SettingsPage,
});

type S = Record<string, string | number | boolean | null>;

function useSettingSaver(qc: ReturnType<typeof useQueryClient>) {
  const upS = useServerFn(updateSetting);
  return useMutation({
    mutationFn: (vars: { key: string; value: string | number | boolean | null }) =>
      upS({ data: vars }),
    onSuccess: () => {
      toast.success("Uložené");
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["all-settings"] });
    },
  });
}

function SettingsPage() {
  const getS = useServerFn(getAllSettings);
  const changePw = useServerFn(changeAdminPassword);
  const changeEm = useServerFn(changeAdminEmail);
  const qc = useQueryClient();
  const save = useSettingSaver(qc);

  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ["all-settings"],
    queryFn: () => getS(),
    retry: 2,
    refetchOnMount: "always",
  });

  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [pwForEmail, setPwForEmail] = useState("");
  const [nextEmail, setNextEmail] = useState("");

  const changePwMut = useMutation({
    mutationFn: (v: { current: string; next: string }) => changePw({ data: v }),
    onSuccess: () => { toast.success("Heslo bolo zmenené"); setCurrentPw(""); setNextPw(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const changeEmMut = useMutation({
    mutationFn: (v: { currentPassword: string; nextEmail: string }) => changeEm({ data: v }),
    onSuccess: () => { toast.success("E-mail bol zmenený"); setPwForEmail(""); setNextEmail(""); qc.invalidateQueries({ queryKey: ["all-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [f, setF] = useState({
    base_nightly_price: "",
    base_occupancy: "2",
    extra_adult_price: "0",
    child_price: "0",
    child_age_max: "12",
    pet_fee: "0",
    pet_fee_mode: "per_stay",
    cleaning_fee: "0",
    max_guests: "9",
    currency: "EUR",
    contact_email: "",
    contact_phone: "",
    auto_confirm: false,
    payments_mode: "off",
    deposit_percent: "30",
    ask_children: true,
    ask_pets: true,
  });

  useEffect(() => {
    if (!settings) return;
    setF({
      base_nightly_price: String(settings.base_nightly_price ?? ""),
      base_occupancy: String(settings.base_occupancy ?? "2"),
      extra_adult_price: String(settings.extra_adult_price ?? "0"),
      child_price: String(settings.child_price ?? "0"),
      child_age_max: String(settings.child_age_max ?? "12"),
      pet_fee: String(settings.pet_fee ?? "0"),
      pet_fee_mode: String(settings.pet_fee_mode ?? "per_stay"),
      cleaning_fee: String(settings.cleaning_fee ?? "0"),
      max_guests: String(settings.max_guests ?? "9"),
      currency: String(settings.currency ?? "EUR"),
      contact_email: String(settings.contact_email ?? ""),
      contact_phone: String(settings.contact_phone ?? ""),
      auto_confirm: Boolean(settings.auto_confirm),
      payments_mode: String(settings.payments_mode ?? "off"),
      deposit_percent: String(settings.deposit_percent ?? "30"),
      ask_children: settings.ask_children == null ? true : Boolean(settings.ask_children),
      ask_pets: settings.ask_pets == null ? true : Boolean(settings.ask_pets),
    });
  }, [settings]);

  const num = (v: string) => (v === "" ? 0 : Number(v) || 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl">Nastavenia</h1>
        <p className="text-muted-foreground">Načítavam…</p>
      </div>
    );
  }
  if (isError || !settings) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl">Nastavenia</h1>
        <p className="text-destructive">Nepodarilo sa načítať nastavenia.</p>
        <Button onClick={() => refetch()}>Skúsiť znova</Button>
      </div>
    );
  }

  const s: S = settings;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-display text-3xl">Nastavenia</h1>

      <Tabs defaultValue="ceny">
        <TabsList>
          <TabsTrigger value="ceny">Ceny a poplatky</TabsTrigger>
          <TabsTrigger value="rezervacie">Rezervácie</TabsTrigger>
          <TabsTrigger value="kontakt">Kontakt</TabsTrigger>
          <TabsTrigger value="prihlasenie">Prihlásenie</TabsTrigger>
        </TabsList>

        <TabsContent value="ceny" className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-display text-xl">Ceny a poplatky</h2>
            <p className="text-sm text-muted-foreground">
              Základná cena platí pre pobyt do stanoveného počtu dospelých. Za každého ďalšieho dospelého alebo dieťa sa pripočíta príplatok za noc. Poplatky za zvieratá a upratovanie sa pripočítajú buď za pobyt alebo za noc podľa nastavenia.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Základná cena / noc ({f.currency === "EUR" ? "€" : f.currency})</Label>
                <Input type="number" min={0} value={f.base_nightly_price}
                  onChange={(e) => setF((x) => ({ ...x, base_nightly_price: e.target.value }))} />
              </div>
              <div>
                <Label>Základný počet dospelých v cene</Label>
                <Input type="number" min={1} max={20} value={f.base_occupancy}
                  onChange={(e) => setF((x) => ({ ...x, base_occupancy: e.target.value }))} />
              </div>
              <div>
                <Label>Príplatok za ďalšieho dospelého / noc</Label>
                <Input type="number" min={0} value={f.extra_adult_price}
                  onChange={(e) => setF((x) => ({ ...x, extra_adult_price: e.target.value }))} />
              </div>
              <div>
                <Label>Cena za dieťa / noc</Label>
                <Input type="number" min={0} value={f.child_price}
                  onChange={(e) => setF((x) => ({ ...x, child_price: e.target.value }))} />
              </div>
              <div>
                <Label>Cena za dieťa platí do veku</Label>
                <Input type="number" min={0} max={18} value={f.child_age_max}
                  onChange={(e) => setF((x) => ({ ...x, child_age_max: e.target.value }))} />
              </div>
              <div>
                <Label>Poplatok za zviera</Label>
                <Input type="number" min={0} value={f.pet_fee}
                  onChange={(e) => setF((x) => ({ ...x, pet_fee: e.target.value }))} />
              </div>
              <div>
                <Label>Poplatok za zviera – režim</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={f.pet_fee_mode}
                  onChange={(e) => setF((x) => ({ ...x, pet_fee_mode: e.target.value }))}
                >
                  <option value="per_stay">Za pobyt</option>
                  <option value="per_night">Za noc</option>
                </select>
              </div>
              <div>
                <Label>Poplatok za upratovanie (za pobyt)</Label>
                <Input type="number" min={0} value={f.cleaning_fee}
                  onChange={(e) => setF((x) => ({ ...x, cleaning_fee: e.target.value }))} />
              </div>
              <div>
                <Label>Max. hostí</Label>
                <Input type="number" min={1} max={30} value={f.max_guests}
                  onChange={(e) => setF((x) => ({ ...x, max_guests: e.target.value }))} />
              </div>
              <div>
                <Label>Mena</Label>
                <Input value={f.currency}
                  onChange={(e) => setF((x) => ({ ...x, currency: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => {
                const pairs: Array<[string, string | number]> = [
                  ["base_nightly_price", num(f.base_nightly_price)],
                  ["base_occupancy", num(f.base_occupancy)],
                  ["extra_adult_price", num(f.extra_adult_price)],
                  ["child_price", num(f.child_price)],
                  ["child_age_max", num(f.child_age_max)],
                  ["pet_fee", num(f.pet_fee)],
                  ["pet_fee_mode", f.pet_fee_mode],
                  ["cleaning_fee", num(f.cleaning_fee)],
                  ["max_guests", num(f.max_guests)],
                  ["currency", f.currency],
                ];
                Promise.all(pairs.map(([key, value]) => save.mutateAsync({ key, value })))
                  .then(() => toast.success("Ceny uložené"))
                  .catch(() => toast.error("Chyba pri ukladaní"));
              }}>
                <Save className="size-4" /> Uložiť ceny
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="rezervacie" className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-display text-xl">Pravidlá rezervácií</h2>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">Automaticky potvrdiť rezervácie</div>
                <p className="text-sm text-muted-foreground">Ak je zapnuté, nové rezervácie idú rovno do stavu „potvrdená“. Inak čakajú na manuálne schválenie.</p>
              </div>
              <Switch
                checked={f.auto_confirm}
                onCheckedChange={(v) => {
                  setF((x) => ({ ...x, auto_confirm: v }));
                  save.mutate({ key: "auto_confirm", value: v });
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <div>
                <div className="font-medium">Pýtať sa na počet detí</div>
                <p className="text-sm text-muted-foreground">Zobrazí pole „Deti“ vo formulári rezervácie a zohľadní detskú cenu.</p>
              </div>
              <Switch
                checked={f.ask_children}
                onCheckedChange={(v) => {
                  setF((x) => ({ ...x, ask_children: v }));
                  save.mutate({ key: "ask_children", value: v });
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <div>
                <div className="font-medium">Pýtať sa na domáce zvieratá</div>
                <p className="text-sm text-muted-foreground">Zobrazí pole „Zvieratá“ vo formulári rezervácie a zohľadní poplatok za zviera.</p>
              </div>
              <Switch
                checked={f.ask_pets}
                onCheckedChange={(v) => {
                  setF((x) => ({ ...x, ask_pets: v }));
                  save.mutate({ key: "ask_pets", value: v });
                }}
              />
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="font-medium">Platby online</div>
              <p className="text-sm text-muted-foreground">
                Vypnuté: bez online platby. Záloha: hosť zaplatí percentuálnu časť pri rezervácii. Plná suma: hosť zaplatí celú sumu online.
                Skutočné spracovanie platieb vyžaduje prepojenie so Stripe – dajte vedieť, keď to chcete zapnúť.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Režim</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={f.payments_mode}
                    onChange={(e) => {
                      setF((x) => ({ ...x, payments_mode: e.target.value }));
                      save.mutate({ key: "payments_mode", value: e.target.value });
                    }}
                  >
                    <option value="off">Vypnuté</option>
                    <option value="deposit">Záloha (%)</option>
                    <option value="full">Plná suma online</option>
                  </select>
                </div>
                {f.payments_mode === "deposit" && (
                  <div>
                    <Label>Výška zálohy (%)</Label>
                    <div className="flex gap-2">
                      <Input type="number" min={1} max={100} value={f.deposit_percent}
                        onChange={(e) => setF((x) => ({ ...x, deposit_percent: e.target.value }))} />
                      <Button variant="outline" onClick={() => save.mutate({ key: "deposit_percent", value: num(f.deposit_percent) })}>
                        <Save className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="kontakt" className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-display text-xl">Kontakt na webe</h2>
            <div>
              <Label>Kontaktný e-mail</Label>
              <div className="flex gap-2">
                <Input value={f.contact_email} onChange={(e) => setF((x) => ({ ...x, contact_email: e.target.value }))} />
                <Button variant="outline" onClick={() => save.mutate({ key: "contact_email", value: f.contact_email })}>
                  <Save className="size-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Kontaktný telefón</Label>
              <div className="flex gap-2">
                <Input value={f.contact_phone} onChange={(e) => setF((x) => ({ ...x, contact_phone: e.target.value }))} />
                <Button variant="outline" onClick={() => save.mutate({ key: "contact_phone", value: f.contact_phone })}>
                  <Save className="size-4" />
                </Button>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="prihlasenie" className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              <h2 className="font-display text-xl">Prihlasovací e-mail</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Aktuálny e-mail: <code className="text-foreground">{String(s.admin_email ?? "admin@example.com")}</code>
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Aktuálne heslo</Label>
                <Input type="password" value={pwForEmail} onChange={(e) => setPwForEmail(e.target.value)} />
              </div>
              <div>
                <Label>Nový e-mail</Label>
                <Input type="email" value={nextEmail} onChange={(e) => setNextEmail(e.target.value)} />
              </div>
            </div>
            <Button
              disabled={changeEmMut.isPending || !pwForEmail || !nextEmail}
              onClick={() => changeEmMut.mutate({ currentPassword: pwForEmail, nextEmail })}
            >
              Zmeniť e-mail
            </Button>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              <h2 className="font-display text-xl">Heslo do administrácie</h2>
            </div>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
