# AthletePro MVP

Tréninkový app pro WLB skupinu (vzpírání). Klienti si zapisují výsledky z tréninků, trenér spravuje klienty a tréninky.

## 🚀 Snadný start

### 1. Spusť Docker (databázi)
```bash
docker-compose up -d
```

### 2. Čekej na zdravý status
```bash
docker-compose ps
# postgres: healthy ✅
```

### 3. Spusť development server
```bash
npm run dev
```

Otevři: [http://localhost:3000](http://localhost:3000)

## 📁 Projekt Struktura

```
/app
  /admin              - Admin dashboard (trenér)
  /client             - Klientská přihlašovací část
  /client/workout     - Dnešní trénink + zápis výsledků
  /api
    /clients          - CRUD pro klienty
    /workouts         - CRUD pro tréninky
    /results          - Storage výsledků
/lib
  /supabase.ts        - Supabase config + TypeScript typy
/docs
  /mvp-scope-v1.md        - Requirements
  /SUPABASE_SETUP.md      - Database schema & setup
/TODO.md              - Development checklist
```

## 🎯 MVP Funkcionality

### Klientská appka (`/client`)
- ✅ Přihlášení (výběr jména + kód)
- ✅ Zobrazení dnešního tréninku
- ⚙️ Zápis výsledků (6 typů: reps, weight, time, distance, rounds, custom)
- ⚙️ RPE (1-10) - optional
- ⚙️ Textové poznámky - optional
- ⚙️ Paměť přihlášení (localStorage)

### Admin panel (`/admin`)
- ⚙️ Správa klientů (Create, Read, Delete)
- ⚙️ Tvorba tréninků
- ⚙️ Přiřazení tréninků do kalendáře
- ⚙️ Přehled výsledků per klient
- ⚙️ Editace tréninků

Legend: ✅ = Done, ⚙️ = In Progress, ❌ = TODO

## 🔧 Tech Stack

- **Frontend**: Next.js 14 + React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Docker)
- **Hosting**: Vercel (later)

## 📖 Dokumentace

- [MVP Scope & Requirements](docs/mvp-scope-v1.md)
- [Docker Setup Guide](docs/DOCKER_SETUP.md)
- [Docker Workflow](DOCKER.md)
- [Development TODO List](TODO.md)

## 🚢 Deployment

```bash
# Vercel (recommended)
npm run build
# Push to GitHub, connect Vercel
```

Free tier: plenty pro MVP! 🎉
