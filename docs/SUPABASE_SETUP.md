# AthletePro - Setup Supabase

Tady je SQL pro vytvoření tabulek v Supabase. Kopíruj to do SQL Editoru v Supabase Console.

## Spusť v Supabase SQL Editor:

```sql
-- Tabulka klientů
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  coach_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabulka tréninků
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  coach_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabulka cviků
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  result_type TEXT NOT NULL CHECK (result_type IN ('reps', 'weight', 'time', 'distance', 'rounds', 'custom')),
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabulka výsledků
CREATE TABLE workout_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabulka trenérů
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexy pro lepší výkon
CREATE INDEX idx_clients_coach_id ON clients(coach_id);
CREATE INDEX idx_workouts_coach_id ON workouts(coach_id);
CREATE INDEX idx_workouts_date ON workouts(date);
CREATE INDEX idx_results_client_id ON workout_results(client_id);
CREATE INDEX idx_results_exercise_id ON workout_results(exercise_id);
```

## Po vytvoření:

1. Jdi na **Authentication** → **Providers** → Enable **Email**
2. Jdi na **SQL Editor** a spusť SQL výše
3. Zkopíruj **Project URL** a **Anon Public Key**
4. Vlož je do `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

Hotovo! 🚀
