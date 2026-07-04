# Červené Maky – Hotel / Apartment Booking Site

A small, self-contained booking website: public pages (home, gallery, contact,
booking request) + a password-gated admin panel (bookings, availability,
iCal sync, messages, settings). Built to be **cloned per property** — swap
copy, colors and images in a few files and you have a new site.

---

## 1. Tech stack (short version)

| Layer              | What it is                                                              |
| ------------------ | ----------------------------------------------------------------------- |
| Framework          | **TanStack Start** (React 19 + Vite 7, file-based routing, SSR)         |
| Styling            | **Tailwind v4** (tokens in `src/styles.css`) + shadcn/ui components     |
| Backend            | **Lovable Cloud** (managed Supabase) — Postgres + auth + storage        |
| Server logic       | `createServerFn` in `src/lib/*.functions.ts` (no separate API server)   |
| Admin gate         | Simple shared-password cookie session (`src/lib/gate.*`)                |
| i18n               | `src/lib/i18n.tsx` — Slovak default, English toggle                     |

You never run a separate backend. Anything server-side lives in a
`*.functions.ts` (RPC) or `*.server.ts` (helper) file and runs in the same
deploy.

---

## 2. Folder map (only what matters)

```
src/
├── routes/                      ← every file here IS a URL
│   ├── __root.tsx               ← app shell (html/head, header, footer, providers)
│   ├── index.tsx                ← "/"  homepage
│   ├── galeria.tsx              ← "/galeria"
│   ├── kontakt.tsx              ← "/kontakt"
│   ├── rezervacia.tsx           ← "/rezervacia" (booking form)
│   ├── admin-login.tsx          ← "/admin-login" (password page)
│   ├── auth.tsx                 ← redirect helper → /admin-login
│   ├── _authenticated/          ← gated subtree (requires unlocked cookie)
│   │   ├── route.tsx            ← guard: redirects to /admin-login if locked
│   │   ├── admin.tsx            ← admin shell (tabs, header, "Odhlásiť")
│   │   ├── admin.index.tsx      ← "/admin" dashboard
│   │   ├── admin.rezervacie.tsx ← bookings list
│   │   ├── admin.kalendar.tsx   ← calendar + manual blocks
│   │   ├── admin.synchronizacia.tsx ← iCal feeds
│   │   ├── admin.spravy.tsx     ← guest messages
│   │   └── admin.nastavenia.tsx ← price, contact info, password
│   └── api/public/…             ← webhooks / feeds (public iCal export, cron)
│
├── components/
│   ├── site-header.tsx          ← public header (nav + language switch)
│   ├── site-footer.tsx          ← public footer
│   ├── availability-calendar.tsx← reusable month calendar
│   └── ui/                      ← shadcn primitives (button, input, dialog…)
│
├── lib/
│   ├── i18n.tsx                 ← ALL user-facing strings (SK + EN)
│   ├── dates.ts                 ← date helpers
│   ├── availability.functions.ts← public: is-this-range-free, list months
│   ├── contact.functions.ts     ← public: submit contact message + booking
│   ├── admin.functions.ts       ← admin: bookings, feeds, blocks, messages, settings
│   ├── gate.functions.ts        ← admin gate RPCs (unlock / lock / status)
│   ├── gate.server.ts           ← server-only gate helpers (cookie + hash)
│   ├── ical.server.ts           ← .ics parser
│   └── sync.server.ts           ← fetches each iCal feed and stores events
│
├── integrations/supabase/       ← auto-generated, do NOT edit
├── styles.css                   ← Tailwind + design tokens (colors, fonts)
└── router.tsx / start.ts / server.ts   ← framework bootstrap (rarely touched)

supabase/
├── config.toml                  ← auto-generated project config
└── migrations/                  ← SQL migrations (schema history)
```

**Rule of thumb**
- Want to change how the site looks / reads → `src/routes/*`, `src/components/*`, `src/styles.css`, `src/lib/i18n.tsx`.
- Want to change what the server does → `src/lib/*.functions.ts` (+ `*.server.ts`).
- Want to change the database → new file in `supabase/migrations/`.

---

## 3. First-run setup (new hotel, from scratch)

1. **Duplicate the project** in Lovable → this gives you a fresh Lovable Cloud
   (Supabase) backend and re-runs the migrations under `supabase/migrations/`.
2. **Set project secrets** (Lovable → Backend → Secrets). Only one is really
   needed for the admin gate; the Supabase ones are already wired for you:
   - `SESSION_SECRET` – any random 32+ char string (encrypts the admin cookie).
   - *(auto)* `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **Log into the admin** at `/admin-login` with default password **`12345678`**.
4. In the admin **Nastavenia** tab, change:
   - `contact_email`, `contact_phone`, `base_nightly_price`
   - the admin password (recommended)
5. In **Synchronizácia**, paste iCal URLs from Booking.com / Airbnb / etc.
6. Replace hero image, gallery images, and copy (see next section).

That's it — no separate server to deploy, no email provider to configure.

---

## 4. Rebranding for another property (the 5-minute checklist)

Everything you need to touch to turn this into a different hotel:

| What                | Where                                                      |
| ------------------- | ---------------------------------------------------------- |
| Property name       | `src/lib/i18n.tsx` (`brand`, headings) + `src/routes/__root.tsx` (title/meta) |
| Colors / fonts      | `src/styles.css` – all colors are semantic tokens (`--primary`, `--background`, …). Change tokens, not component classes. |
| Hero + gallery      | `src/assets/*` – replace files, keep the filenames, or update the imports in `src/routes/index.tsx` and `src/routes/galeria.tsx`. |
| Nav / footer links  | `src/components/site-header.tsx`, `src/components/site-footer.tsx` |
| Homepage copy       | `src/routes/index.tsx` (uses `t("home.*")` keys from `i18n.tsx`) |
| SEO (title/desc/og) | `head()` in `src/routes/__root.tsx` and each leaf route     |
| Default admin pw    | `DEFAULT_PASSWORD` in `src/lib/gate.server.ts` (change once, then set a real one via the UI) |
| Contact info        | Admin UI → **Nastavenia** (no code change)                  |
| Nightly price       | Admin UI → **Nastavenia** (no code change)                  |

**Do NOT touch** (unless you know what you're doing):
`src/integrations/supabase/*`, `src/routeTree.gen.ts`, `supabase/config.toml`,
`.env`, `src/router.tsx`, `src/server.ts`, `src/start.ts`.

---

## 5. How the admin login works

- One shared password – there are no user accounts.
- Password is stored in the `app_settings` table under key `admin_password`.
  If the row is missing it falls back to `DEFAULT_PASSWORD` in
  `src/lib/gate.server.ts` (currently `12345678`).
- On successful `/admin-login`, an encrypted, httpOnly cookie `cm-admin` is
  set for 7 days. The `_authenticated/route.tsx` guard checks that cookie.
- To log out, click **Odhlásiť** in the admin header, or clear cookies.
- To reset a forgotten password: delete the row in the DB
  (`DELETE FROM app_settings WHERE key='admin_password';`) — the default
  will apply again.

Cookie is `SameSite=None; Secure` so it works inside the Lovable preview
iframe as well as on the published domain.

---

## 6. How the calendar / iCal sync works

- **Sources of blocks** on the availability calendar:
  1. `bookings` rows that are `confirmed` or `pending`.
  2. `manual_blocks` you add in the admin.
  3. `imported_events` synced from external iCal feeds (Booking, Airbnb…).
- Add a feed in admin → **Synchronizácia** → paste URL. `webcal://` is auto-
  converted to `https://`.
- Click **Synchronizovať** to run manually. It:
  1. Downloads each enabled feed.
  2. Parses it with `src/lib/ical.server.ts`.
  3. Replaces `imported_events` for that feed.
- There is also a public webhook route
  `src/routes/api/public/hooks/sync-calendars.ts` you can hit from a cron
  service (e.g. cron-job.org) every hour to keep it fresh without opening
  the admin.
- Your **outgoing** iCal (what you paste into Booking / Airbnb so THEY
  block your dates) is `/calendar.ics`, served by
  `src/routes/api/public/calendar[.]ics.ts`.

---

## 7. How the "messaging" works

There is no email provider – guests submit a form, it lands in the DB, and
you see it in the admin.

- Guest fills the form on `/kontakt` or the request field on `/rezervacia`.
- `src/lib/contact.functions.ts` inserts a row into `contact_messages`.
- Admin **Správy** tab lists messages, mark them read, delete them.

If you later want real email, add a Resend/Postmark call inside
`submitContactMessage` in `src/lib/contact.functions.ts`. That's the only
file you need to change.

---

## 8. Data model (tables, quick view)

- `bookings` – guest reservations (name, dates, guests, price, status).
- `manual_blocks` – dates you block manually (maintenance, private use).
- `ical_feeds` – external calendar URLs.
- `imported_events` – events pulled from those feeds.
- `contact_messages` – guest messages / requests.
- `app_settings` – key/value store (price, contact info, admin password).

RLS is enabled everywhere. Public reads are limited to what the site needs
(availability info, three specific keys in `app_settings`). Everything else
goes through admin-gated server functions.

---

## 9. Common tasks – where to click

| Task                                     | File(s)                                     |
| ---------------------------------------- | ------------------------------------------- |
| Change primary color                     | `src/styles.css` → `--primary` token         |
| Change all Slovak/English wording        | `src/lib/i18n.tsx`                           |
| Add a new public page                    | New file in `src/routes/`, e.g. `faq.tsx`   |
| Add a new admin page                     | New file `src/routes/_authenticated/admin.<name>.tsx` + tab in `admin.tsx` |
| Add a new admin action                   | New `export const doX = createServerFn(...)` in `src/lib/admin.functions.ts` with `await requireAdminUnlocked()` at the top |
| Send email on new booking                | Extend `submitBookingRequest` in `src/lib/contact.functions.ts` |
| Change default admin password (before UI change) | `DEFAULT_PASSWORD` in `src/lib/gate.server.ts` |

---

## 10. Deploying

Click **Publish** in Lovable. That's the whole deploy. Custom domain lives
under Lovable → Publish → Domains. The published URL runs the exact same
code you see in preview.

---

## 11. Troubleshooting

- **Login says wrong password even though I typed it right** – clear the
  `cm-admin` cookie and try again. If you changed it in the UI and forgot
  it, delete the row: `DELETE FROM app_settings WHERE key='admin_password';`.
- **iCal sync shows an error** – check the `last_error` column in the
  Synchronizácia tab. Portal URLs sometimes expire; regenerate them and
  paste the new one.
- **"Failed to resolve import"** – you deleted or renamed a file that a
  route still imports. Recreate it or fix the import.
- **Blank admin page after login** – the `_authenticated/route.tsx` gate
  probably threw; refresh, and if it persists check that the `SESSION_SECRET`
  env var is set.
