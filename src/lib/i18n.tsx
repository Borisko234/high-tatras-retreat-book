import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "sk" | "en";

type Dict = Record<string, string>;

const sk: Dict = {
  "nav.home": "Domov",
  "nav.gallery": "Galéria",
  "nav.booking": "Rezervácia",
  "nav.contact": "Kontakt",
  "nav.admin": "Admin",

  "hero.eyebrow": "Vysoké Tatry · Malý Slavkov",
  "hero.title": "Červené maky",
  "hero.subtitle":
    "Útulný rodinný dom pri golfovom ihrisku na okraji Vysokých Tatier. Tri spálne, deväť lôžok, dvor s výhľadom na hory.",
  "hero.cta.book": "Skontrolovať dostupnosť",
  "hero.cta.gallery": "Prezrieť galériu",

  "facts.guests": "hostí",
  "facts.rooms": "spálne",
  "facts.beds": "lôžok",
  "facts.bath": "kúpeľne",
  "facts.wc": "WC",

  "about.title": "Domov v horách",
  "about.body":
    "Červené maky je súkromný dom určený na krátkodobý prenájom pre rodiny a väčšie skupiny. Sme v Malom Slavkove, v tichej časti pri golfovom rezorte Black Stork, len pár minút autom od Kežmarku a brán Vysokých Tatier. Hory na lyžovanie, túry, kúpaliská aj výlety máte všetko v dosahu.",

  "highlights.title": "Čo máte na dosah",
  "highlights.golf": "Golfové ihrisko Black Stork hneď vedľa",
  "highlights.tatry": "Vysoké Tatry – 15 minút autom",
  "highlights.ski": "Lyžiarske strediská Tatranská Lomnica a Štrbské Pleso",
  "highlights.hike": "Tatranský národný park, jazerá, vodopády",
  "highlights.aqua": "Aquacity Poprad, AquaPark Tatralandia",
  "highlights.kezmarok": "Historické mesto Kežmarok – 5 minút",

  "gallery.title": "Galéria",
  "gallery.intro": "Fotografie domu a okolia – majiteľka ich postupne doplní.",
  "gallery.placeholder": "Miesto pre fotografiu",

  "booking.title": "Rezervácia",
  "booking.intro":
    "Vyberte si termín priamo v kalendári. Zaberané dni z Booking, Airbnb a ďalších portálov sú automaticky blokované.",
  "booking.checkin": "Príchod",
  "booking.checkout": "Odchod",
  "booking.guests": "Počet hostí",
  "booking.nights": "noci",
  "booking.total": "Spolu",
  "booking.name": "Meno a priezvisko",
  "booking.email": "E-mail",
  "booking.phone": "Telefón (nepovinné)",
  "booking.message": "Správa pre majiteľku (nepovinné)",
  "booking.submit": "Odoslať žiadosť o rezerváciu",
  "booking.pickRange": "Vyberte termín pobytu",
  "booking.unavailable": "Niektoré z vybraných dní už nie sú voľné. Vyberte iný termín.",
  "booking.success": "Ďakujeme! Žiadosť bola odoslaná, ozveme sa vám čo najskôr.",
  "booking.error": "Niečo sa pokazilo, skúste to prosím znova.",
  "booking.legend.available": "Voľné",
  "booking.legend.blocked": "Obsadené",
  "booking.legend.selected": "Váš výber",
  "booking.priceNote": "Cena za noc",

  "contact.title": "Kontakt",
  "contact.intro": "Napíšte nám – otázky, špeciálne požiadavky alebo dlhodobý prenájom.",
  "contact.name": "Meno",
  "contact.email": "E-mail",
  "contact.phone": "Telefón (nepovinné)",
  "contact.message": "Správa",
  "contact.submit": "Odoslať správu",
  "contact.success": "Správa odoslaná, ďakujeme!",
  "contact.error": "Správu sa nepodarilo odoslať.",
  "contact.location": "Malý Slavkov, Vysoké Tatry, Slovensko",

  "footer.tagline": "Súkromný dom pri Vysokých Tatrách",
  "footer.rights": "Všetky práva vyhradené",

  "auth.title": "Prihlásenie do administrácie",
  "auth.email": "E-mail",
  "auth.password": "Heslo",
  "auth.signin": "Prihlásiť sa",
  "auth.error": "Nesprávne prihlasovacie údaje",

  "admin.dashboard": "Prehľad",
  "admin.bookings": "Rezervácie",
  "admin.calendar": "Kalendár",
  "admin.sync": "Synchronizácia",
  "admin.messages": "Správy",
  "admin.settings": "Nastavenia",
  "admin.logout": "Odhlásiť sa",

  "common.loading": "Načítavam…",
  "common.save": "Uložiť",
  "common.cancel": "Zrušiť",
  "common.delete": "Zmazať",
  "common.confirm": "Potvrdiť",
  "common.add": "Pridať",
  "common.from": "Od",
  "common.to": "Do",
  "common.eur": "€",
};

const en: Dict = {
  "nav.home": "Home",
  "nav.gallery": "Gallery",
  "nav.booking": "Booking",
  "nav.contact": "Contact",
  "nav.admin": "Admin",

  "hero.eyebrow": "High Tatras · Malý Slavkov",
  "hero.title": "Červené maky",
  "hero.subtitle":
    "A cozy family house next to the golf course at the foot of the High Tatras. Three bedrooms, nine beds, mountain views from the yard.",
  "hero.cta.book": "Check availability",
  "hero.cta.gallery": "View gallery",

  "facts.guests": "guests",
  "facts.rooms": "bedrooms",
  "facts.beds": "beds",
  "facts.bath": "bathrooms",
  "facts.wc": "WC",

  "about.title": "Your mountain home",
  "about.body":
    "Červené maky is a private house for short-term family rental. We're in Malý Slavkov, a quiet village next to the Black Stork golf resort, minutes from Kežmarok and the gates of the High Tatras. Hiking, skiing, lakes, waterfalls and water parks are all close by.",

  "highlights.title": "What's nearby",
  "highlights.golf": "Black Stork golf course right next door",
  "highlights.tatry": "High Tatras – 15 minutes by car",
  "highlights.ski": "Tatranská Lomnica & Štrbské Pleso ski resorts",
  "highlights.hike": "Tatra National Park, lakes, waterfalls",
  "highlights.aqua": "Aquacity Poprad, AquaPark Tatralandia",
  "highlights.kezmarok": "Historic town of Kežmarok – 5 minutes",

  "gallery.title": "Gallery",
  "gallery.intro": "Photos of the house and surroundings – the owner will add real photos shortly.",
  "gallery.placeholder": "Photo placeholder",

  "booking.title": "Booking",
  "booking.intro":
    "Pick your dates in the calendar. Days already booked on Booking, Airbnb or other portals are blocked automatically.",
  "booking.checkin": "Check-in",
  "booking.checkout": "Check-out",
  "booking.guests": "Guests",
  "booking.nights": "nights",
  "booking.total": "Total",
  "booking.name": "Full name",
  "booking.email": "Email",
  "booking.phone": "Phone (optional)",
  "booking.message": "Message to the host (optional)",
  "booking.submit": "Send booking request",
  "booking.pickRange": "Select your stay",
  "booking.unavailable": "Some of the selected dates are no longer available. Please pick another range.",
  "booking.success": "Thank you! Your request was sent, we'll reply as soon as possible.",
  "booking.error": "Something went wrong, please try again.",
  "booking.legend.available": "Available",
  "booking.legend.blocked": "Booked",
  "booking.legend.selected": "Your selection",
  "booking.priceNote": "Price per night",

  "contact.title": "Contact",
  "contact.intro": "Send us a message – questions, special requests or long-term stays.",
  "contact.name": "Name",
  "contact.email": "Email",
  "contact.phone": "Phone (optional)",
  "contact.message": "Message",
  "contact.submit": "Send message",
  "contact.success": "Message sent, thank you!",
  "contact.error": "Could not send your message.",
  "contact.location": "Malý Slavkov, High Tatras, Slovakia",

  "footer.tagline": "Private house at the foot of the High Tatras",
  "footer.rights": "All rights reserved",

  "auth.title": "Admin sign in",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signin": "Sign in",
  "auth.error": "Invalid credentials",

  "admin.dashboard": "Dashboard",
  "admin.bookings": "Bookings",
  "admin.calendar": "Calendar",
  "admin.sync": "Sync",
  "admin.messages": "Messages",
  "admin.settings": "Settings",
  "admin.logout": "Sign out",

  "common.loading": "Loading…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.confirm": "Confirm",
  "common.add": "Add",
  "common.from": "From",
  "common.to": "To",
  "common.eur": "€",
};

const dicts: Record<Lang, Dict> = { sk, en };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const I18nContext = createContext<Ctx>({ lang: "sk", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("sk");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("lang") as Lang | null) : null;
    if (stored === "sk" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
    if (typeof document !== "undefined") document.documentElement.lang = l;
  };

  const t = (k: string) => dicts[lang][k] ?? dicts.sk[k] ?? k;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
