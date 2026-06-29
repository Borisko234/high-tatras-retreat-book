import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Mail, MapPin, Phone, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { submitContactMessage } from "@/lib/contact.functions";
import { getSettings } from "@/lib/admin.functions";

export const Route = createFileRoute("/kontakt")({
  head: () => ({
    meta: [
      { title: "Kontakt – Červené maky" },
      { name: "description", content: "Napíšte majiteľke domu Červené maky v Malom Slavkove pri Vysokých Tatrách." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useI18n();
  const send = useServerFn(submitContactMessage);
  const fetchSettings = useServerFn(getSettings);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const { data: settings = {} } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchSettings(),
  });
  const contactEmail = String(settings.contact_email ?? "");
  const contactPhone = String(settings.contact_phone ?? "");

  const mutation = useMutation({
    mutationFn: async () =>
      send({
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: form.message.trim(),
        },
      }),
    onSuccess: () => {
      toast.success(t("contact.success"));
      setForm({ name: "", email: "", phone: "", message: "" });
    },
    onError: () => toast.error(t("contact.error")),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-12 pb-16 w-full grid lg:grid-cols-2 gap-12">
        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("nav.contact")}</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl text-foreground">{t("contact.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("contact.intro")}</p>

          <ul className="mt-10 space-y-5 text-foreground">
            <li className="flex gap-4 items-start">
              <span className="size-10 rounded-full bg-accent inline-flex items-center justify-center shrink-0 text-primary">
                <MapPin className="size-5" strokeWidth={1.6} />
              </span>
              <div>
                <p className="text-sm uppercase tracking-wider text-muted-foreground">Adresa</p>
                <p>{t("contact.location")}</p>
              </div>
            </li>
            {contactEmail && (
              <li className="flex gap-4 items-start">
                <span className="size-10 rounded-full bg-accent inline-flex items-center justify-center shrink-0 text-primary">
                  <Mail className="size-5" strokeWidth={1.6} />
                </span>
                <div>
                  <p className="text-sm uppercase tracking-wider text-muted-foreground">E-mail</p>
                  <a href={`mailto:${contactEmail}`} className="hover:text-primary">{contactEmail}</a>
                </div>
              </li>
            )}
            {contactPhone && (
              <li className="flex gap-4 items-start">
                <span className="size-10 rounded-full bg-accent inline-flex items-center justify-center shrink-0 text-primary">
                  <Phone className="size-5" strokeWidth={1.6} />
                </span>
                <div>
                  <p className="text-sm uppercase tracking-wider text-muted-foreground">Telefón</p>
                  <a href={`tel:${contactPhone}`} className="hover:text-primary">{contactPhone}</a>
                </div>
              </li>
            )}
          </ul>
        </section>

        <form
          className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-[var(--shadow-card)] space-y-4 h-fit"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div>
            <Label htmlFor="cname">{t("contact.name")}</Label>
            <Input
              id="cname"
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="cemail">{t("contact.email")}</Label>
            <Input
              id="cemail"
              type="email"
              required
              maxLength={254}
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="cphone">{t("contact.phone")}</Label>
            <Input
              id="cphone"
              maxLength={40}
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="cmsg">{t("contact.message")}</Label>
            <Textarea
              id="cmsg"
              rows={5}
              required
              maxLength={4000}
              value={form.message}
              onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {t("contact.submit")}
          </Button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
