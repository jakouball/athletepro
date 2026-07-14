# Docker Setup - AthletePro

Lokální PostgreSQL databáze v Dockeru.

## 🚀 Spuštění

### 1. Spusť Docker containers
```bash
docker-compose up -d
```

Čeká na zdraví DB (~10 sekund):
- **PostgreSQL** běží na `localhost:5432`
- **pgAdmin** (UI) na `http://localhost:5050`

### 2. Verifikuj zdraví
```bash
docker-compose ps
```

Měl by vidět `healthy` status u `athletepro-db`.

### 3. Zkontroluj databázi
```bash
# Připoj se přímě k DB
psql postgresql://athletepro:athletepro123@localhost:5432/athletepro

# Nebo přes pgAdmin:
# - URL: http://localhost:5050
# - Email: admin@athletepro.local
# - Heslo: admin123
```

## 📊 Schéma Databáze

Schema je automaticky nahráno při startu z `docs/schema.sql`.

**Tabulky:**
- `coaches` - trenéři
- `clients` - klienti
- `workouts` - tréninky
- `exercises` - cviky
- `workout_results` - výsledky

## 🛑 Zastavení

```bash
# Zastavit containers (data zůstává)
docker-compose down

# Zastavit + smazat data
docker-compose down -v
```

## 🐛 Troubleshooting

### Port 5432 je obsazený
```bash
# Změní port v docker-compose.yml
# nebo
docker-compose down && docker-compose up -d
```

### DB se nenačítá správně
```bash
# Zkontroluj logs
docker-compose logs postgres

# Vyčisti a spusť znovu
docker-compose down -v
docker-compose up -d
```

### pgAdmin se nemůže připojit
```bash
# Ujisti se, že postgres je healthy
docker-compose ps

# Restartuj pgAdmin
docker-compose restart pgadmin
```

## 📝 Přidání seed dat

Vytvoř `docs/seed.sql`:
```sql
INSERT INTO coaches (email, name) VALUES ('admin@athletepro.local', 'Admin Coach');
INSERT INTO clients (name, code, coach_id) VALUES 
  ('Jakub', 'ABC123', '...uuid...');
```

Pak:
```bash
psql postgresql://athletepro:athletepro123@localhost:5432/athletepro -f docs/seed.sql
```

## 🔄 Workflow

1. Spusť Docker: `docker-compose up -d`
2. Spusť app: `npm run dev`
3. Vyvíjej - DB je v Dockeru
4. Commituj - ostatní si spustí `docker-compose up -d`

Jednoduché! 🚀
