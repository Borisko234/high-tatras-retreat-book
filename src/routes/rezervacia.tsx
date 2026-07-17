import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { type DateRange } from "react-day-picker";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { getBlockedRanges, submitBooking, computeTotal } from "@/lib/availability.functions";
import { getSettings } from "@/lib/admin.functions";
import { toISODate, nightsBetween } from "@/lib/dates";

export const Route = createFileRoute("/rezervacia")({
  head: () => ({
    meta: [
      { title: "Rezervácia – Červené maky" },
      { name: "description", content: "Skontrolujte dostupnosť a rezervujte si pobyt v dome Červené maky online." },
    ],
  }),
  component: BookingPage,
});

function BookingPage() {
  const { t } = useI18n();
  const fetchBlocked = useServerFn(getBlockedRanges);
  const fetchSettings = useServerFn(getSettings);
  const submit = useServerFn(submitBooking);

  const { data: blocked = [] } = useQuery({
    queryKey: ["blocked-ranges"],
    queryFn: () => fetchBlocked(),
  });

  const { data: settings = {} } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchSettings(),
  });

  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    adults: "2",
    children: "0",
    pets: "0",
    message: "",
  });
  const [done, setDone] = useState(false);

  const nights =
    range?.from && range?.to ? nightsBetween(toISODate(range.from), toISODate(range.to)) : 0;
  const currency = String(settings.currency ?? "EUR");
  const curSym = currency === "EUR" ? "€" : currency;
  const paymentsMode = String(settings.payments_mode ?? "off");
  const depositPercent = Number(settings.deposit_percent ?? 30);
  const askChildren = settings.ask_children == null ? true : Boolean(settings.ask_children);
  const askPets = settings.ask_pets == null ? true : Boolean(settings.ask_pets);


  const childrenNum = askChildren ? Number(form.children) || 0 : 0;
  const petsNum = askPets ? Number(form.pets) || 0 : 0;

  const breakdown =
    nights > 0
      ? computeTotal({
          nights,
          adults: Number(form.adults) || 1,
          children: childrenNum,
          pets: petsNum,
          settings: settings as Record<string, unknown>,
        })
      : null;


  const depositDue =
    breakdown && paymentsMode === "deposit"
      ? Math.round((breakdown.total * depositPercent) / 100)
      : breakdown && paymentsMode === "full"
        ? breakdown.total
        : 0;

  const canSubmit =
    range?.from &&
    range?.to &&
    nights > 0 &&
    form.name.trim() &&
    form.email.trim() &&
    Number(form.adults) >= 1;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!range?.from || !range?.to) throw new Error("no range");
      return submit({
        data: {
          checkIn: toISODate(range.from),
          checkOut: toISODate(range.to),
          adults: Number(form.adults),
          children: childrenNum,
          pets: petsNum,

          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: form.message.trim(),
        },
      });
    },
    onSuccess: () => {
      setDone(true);
      toast.success(t("booking.success"));
    },
    onError: (err: Error) => {
      if (err.message?.includes("UNAVAILABLE")) toast.error(t("booking.unavailable"));
      else toast.error(t("booking.error"));
    },
  });

  if (done) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="max-w-md text-center bg-card border border-border rounded-2xl p-10 shadow-[var(--shadow-card)]">
            <CheckCircle2 className="size-12 text-primary mx-auto" strokeWidth={1.5} />
            <h1 className="mt-4 font-display text-3xl text-foreground">{t("booking.success")}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {form.name} · {range?.from && toISODate(range.from)} → {range?.to && toISODate(range.to)} · {nights} {t("booking.nights")}
            </p>
            {depositDue > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                {paymentsMode === "deposit" ? "Záloha" : "Suma na úhradu"}: <strong>{depositDue} {curSym}</strong>. Platobné pokyny vám pošleme e-mailom.
              </p>
            )}
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-12 pb-16 w-full">
        <header className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("nav.booking")}</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl text-foreground">{t("booking.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("booking.intro")}</p>
        </header>

        <div className="mt-10 grid lg:grid-cols-[1fr_380px] gap-8 items-start">
          <AvailabilityCalendar blocked={blocked} selected={range} onSelect={setRange} />

          <aside className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)] space-y-5 sticky top-24">
            <div>
              <h2 className="font-display text-xl text-foreground">{t("booking.pickRange")}</h2>
              {nights > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {range?.from && toISODate(range.from)} → {range?.to && toISODate(range.to)} · {nights} {t("booking.nights")}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{t("booking.intro")}</p>
              )}
            </div>

            {breakdown && breakdown.total > 0 && (
              <div className="space-y-1 text-sm border-t border-border pt-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Ubytovanie ({nights} × {breakdown.base} {curSym})</span>
                  <span>{breakdown.base * nights} {curSym}</span>
                </div>
                {breakdown.extraAdultsTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Ďalší dospelí ({breakdown.extraAdults})</span>
                    <span>{breakdown.extraAdultsTotal} {curSym}</span>
                  </div>
                )}
                {breakdown.childrenTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Deti ({form.children})</span>
                    <span>{breakdown.childrenTotal} {curSym}</span>
                  </div>
                )}
                {breakdown.petsTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Domáce zvieratá ({form.pets})</span>
                    <span>{breakdown.petsTotal} {curSym}</span>
                  </div>
                )}
                {breakdown.cleaning > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Poplatok za upratovanie</span>
                    <span>{breakdown.cleaning} {curSym}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-foreground pt-2 border-t border-border">
                  <span>{t("booking.total")}</span>
                  <span>{breakdown.total} {curSym}</span>
                </div>
                {paymentsMode === "deposit" && depositDue > 0 && (
                  <div className="flex justify-between text-primary text-xs pt-1">
                    <span>Záloha ({depositPercent}%)</span>
                    <span>{depositDue} {curSym}</span>
                  </div>
                )}
                {paymentsMode === "full" && (
                  <div className="text-xs text-primary pt-1">Platba online v plnej výške po odoslaní.</div>
                )}
              </div>
            )}

            <form
              className="space-y-3 pt-3 border-t border-border"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <div className={`grid gap-2 ${askChildren && askPets ? "grid-cols-3" : askChildren || askPets ? "grid-cols-2" : "grid-cols-1"}`}>
                <div>
                  <Label htmlFor="adults">Dospelí</Label>
                  <Input
                    id="adults" type="number" min={1} max={9}
                    value={form.adults}
                    onChange={(e) => setForm((s) => ({ ...s, adults: e.target.value }))}
                    required
                  />
                </div>
                {askChildren && (
                  <div>
                    <Label htmlFor="children">Deti</Label>
                    <Input
                      id="children" type="number" min={0} max={9}
                      value={form.children}
                      onChange={(e) => setForm((s) => ({ ...s, children: e.target.value }))}
                    />
                  </div>
                )}
                {askPets && (
                  <div>
                    <Label htmlFor="pets">Zvieratá</Label>
                    <Input
                      id="pets" type="number" min={0} max={9}
                      value={form.pets}
                      onChange={(e) => setForm((s) => ({ ...s, pets: e.target.value }))}
                    />
                  </div>
                )}
              </div>
              {askChildren && settings.child_age_max != null && Number(form.children) > 0 && (
                <p className="text-xs text-muted-foreground -mt-1">
                  Cena pre deti platí do {String(settings.child_age_max)} rokov.
                </p>
              )}

              <div>
                <Label htmlFor="name">{t("booking.name")}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  required
                  maxLength={120}
                />
              </div>
              <div>
                <Label htmlFor="email">{t("booking.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  required
                  maxLength={254}
                />
              </div>
              <div>
                <Label htmlFor="phone">{t("booking.phone")}</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  maxLength={40}
                />
              </div>
              <div>
                <Label htmlFor="msg">{t("booking.message")}</Label>
                <Textarea
                  id="msg"
                  value={form.message}
                  onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                  maxLength={2000}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={!canSubmit || mutation.isPending}>
                {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {t("booking.submit")}
              </Button>
            </form>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
