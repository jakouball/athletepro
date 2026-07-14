# AthletePro Development Status

## ✅ Hotovo

- [x] Next.js projekt s TypeScript
- [x] Supabase integrace
- [x] Základní API routes (clients, workouts, results)
- [x] Admin stránka (základní UI)
- [x] Klientská přihlašovací stránka
- [x] Klientská workout stránka (skeleton)
- [x] Type definice

## 🚧 TODO - Priorita 1 (MVP kritické)

### Backend
- [x] SQL schema vytvoření (docs/schema.sql, lokální Postgres v Dockeru)
- [x] Auth middleware pro API routes (admin session cookie + proxy.ts chrání /admin a mutující routy)
- [ ] Error handling & validace (zatím jen základní)

### Admin Panel
- [x] Přihlášení trenéra (admin_session cookie, /admin/login, proxy.ts redirect)
- [x] Správa tréninků (CREATE, EDIT, DELETE)
- [x] Správa cviků u tréninku
- [x] Výběr typu výsledku u cviku
- [x] Docházka: trenér v sekci "Dnešní trénink" zaškrtává, kdo dnes přišel (workout_checkins), a vidí jejich živé výsledky
- [x] Přehled výsledků per klient (+ edit/delete)
- [x] Edit tréninku

### Klientská Appka
- [x] Načtení klientů ze API (SELECT dropdown)
- [x] Validace přihlášení (kontrola kódu + session token)
- [x] Zobrazení cviků v tréninku — jen pokud trenér klienta na dnešní trénink přihlásil (jinak info hláška)
- [x] Formuláře pro zápis výsledků (6 typů)
- [ ] Pole pro RPE (optional) — backend podporuje, UI zatím nesbírá
- [x] Pole pro poznámky (optional)
- [x] Submit výsledků na backend (+ lokální draft do localStorage)

## 📋 TODO - Priorita 2 (Nice-to-have)

- [ ] Responsivní design
- [ ] Pokročilé error messages
- [ ] Loading states
- [ ] Animace
- [ ] Přehled historie výsledků

## 🔧 TODO - Infrastruktura

- [ ] Supabase nastavení
- [ ] Vercel deployment
- [ ] Environment variables
- [ ] CI/CD (GitHub Actions?)

## 📱 Cesty v appce

```
/                       - Redirect na /admin nebo /client
/admin                  - Admin dashboard
/admin/workouts         - Správa tréninků
/admin/clients          - Správa klientů
/admin/calendar         - Kalendář s tréninky
/client                 - Login stránka
/client/workout         - Zobrazení dnešního tréninku + zápis
```
