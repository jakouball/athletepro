# DOCKER WORKFLOW

Spuštění AthletePro s lokální PostgreSQL v Dockeru.

## ✅ Quick Start

```bash
# 1. Spusť Docker (databázi)
docker-compose up -d

# 2. Čekej na healthy status
docker-compose ps  # Měl by vidět "healthy"

# 3. Spusť Next.js app
npm run dev

# 4. Otevři http://localhost:3000
```

## 🧑‍💻 Frontend Vývoj

```bash
# Terminal 1: Docker
docker-compose up -d

# Terminal 2: Next.js dev server
npm run dev

# App běží na http://localhost:3000
# API: http://localhost:3000/api/*
```

## 🗄️ Databáze

### Přístup k DB

```bash
# Via psql CLI
psql postgresql://athletepro:athletepro123@localhost:5432/athletepro

# Via pgAdmin UI
# URL: http://localhost:5050
# Email: admin@athletepro.local
# Password: admin123
```

### Reset databáze

```bash
# Zastavit kontejnery a smazat data
docker-compose down -v

# Znovu nahrát schema
docker-compose up -d
```

## 🛑 Zastavení

```bash
# Zastavit containers (data zůstává)
docker-compose down

# Zastavit + smazat vše
docker-compose down -v
```

## 📝 Přidání testovacích dat

```bash
# Připoj se k DB
psql postgresql://athletepro:athletepro123@localhost:5432/athletepro

# Vlož data:
INSERT INTO coaches (email, name) VALUES ('coach@test.com', 'Test Coach');
INSERT INTO clients (name, code, coach_id) VALUES ('John', 'TEST123', (SELECT id FROM coaches LIMIT 1));
```

## 🔧 Změny v DB schématu

Když chceš změnit schéma:

1. Edituj `docs/schema.sql`
2. Resetuj DB: `docker-compose down -v && docker-compose up -d`
3. DB se automaticky znovu nahraje

## ✨ Výhody lokálního Docker setup

- ✅ Stejné prostředí všichni vývojáři
- ✅ Snadno se shareuje (`docker-compose.yml`)
- ✅ Bez ruční instalace PostgreSQL
- ✅ Data persisted mezi restarty
- ✅ pgAdmin UI pro SQL queries
- ✅ Snadný reset databáze

Perfect! 🐳
