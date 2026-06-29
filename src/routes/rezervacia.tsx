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
import { getBlockedRanges, submitBooking } from "@/lib/availability.functions";
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
  const [form, setForm] = useState({ name: "", email: "", phone: "", guests: "2", message: "" });
  const [done, setDone] = useState(false);

  const nights =
    range?.from && range?.to ? nightsBetween(toISODate(range.from), toISODate(range.to)) : 0;
  const basePrice = Number(settings.base_nightly_price ?? 0);
  const total = nights * basePrice;
  const currency = String(settings.currency ?? "EUR");

  const canSubmit =
    range?.from &&
    range?.to &&
    nights > 0 &&
    form.name.trim() &&
    form.email.trim() &&
    Number(form.guests) >= 1;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!range?.from || !range?.to) throw new Error("no range");
      return submit({
        data: {
          checkIn: toISODate(range.from),
          checkOut: toISODate(range.to),
          guests: Number(form.guests),
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

            {basePrice > 0 && (
              <div className="text-sm text-muted-foreground flex justify-between border-t border-border pt-3">
                <span>{t("booking.priceNote")}</span>
                <span>{basePrice} {currency === "EUR" ? "€" : currency}</span>
              </div>
            )}
            {nights > 0 && total > 0 && (
              <div className="text-base text-foreground flex justify-between font-medium border-t border-border pt-3">
                <span>{t("booking.total")}</span>
                <span>{total} {currency === "EUR" ? "€" : currency}</span>
              </div>
            )}

            <form
              className="space-y-3 pt-3 border-t border-border"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <div>
                <Label htmlFor="guests">{t("booking.guests")}</Label>
                <Input
                  id="guests"
                  type="number"
                  min={1}
                  max={9}
                  value={form.guests}
                  onChange={(e) => setForm((s) => ({ ...s, guests: e.target.value }))}
                  required
                />
              </div>
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
