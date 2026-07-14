-- Athletes Pro Database Schema

-- Tabulka trenérů. Každý trenér má vlastní izolovaná data (klienti, tréninky,
-- skupiny) a vlastní přihlašovací slug pro sdílení klientského loginu
-- (/client?coach=<slug>). password_hash je ve formátu "salt:scryptHash".
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  slug VARCHAR(50) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabulka tréninkových skupin (WLB, RSP, ...) - spravuje trenér v adminu.
-- Kód skupiny je unikátní jen v rámci jednoho trenéra, ne globálně.
CREATE TABLE training_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (coach_id, code)
);

-- Tabulka klientů
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vazební tabulka: klient může patřit do více tréninkových skupin zároveň
CREATE TABLE client_training_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  training_group_id UUID NOT NULL REFERENCES training_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, training_group_id)
);

-- Tabulka tréninků
-- workout_type = 'group' (patří tréninkové skupině přes training_group_id)
--             nebo 'individual' (patří jednomu klientovi přes client_id)
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  workout_type VARCHAR(20) NOT NULL DEFAULT 'group' CHECK (workout_type IN ('group', 'individual')),
  training_group_id UUID REFERENCES training_groups(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabulka cviků
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  result_type VARCHAR(50) NOT NULL CHECK (result_type IN ('reps', 'weight', 'time', 'distance', 'rounds', 'custom')),
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabulka výsledků tréninků
CREATE TABLE workout_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabulka přihlášení klienta na trénink (zapisuje trenér v adminu před tréninkem)
CREATE TABLE workout_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workout_id, client_id)
);

-- Indexy pro výkon
CREATE INDEX idx_clients_coach_id ON clients(coach_id);
CREATE INDEX idx_workouts_coach_id ON workouts(coach_id);
CREATE INDEX idx_workouts_date ON workouts(date);
CREATE INDEX idx_exercises_workout_id ON exercises(workout_id);
CREATE INDEX idx_results_client_id ON workout_results(client_id);
CREATE INDEX idx_results_exercise_id ON workout_results(exercise_id);
CREATE INDEX idx_results_created_at ON workout_results(created_at);
CREATE INDEX idx_checkins_workout_id ON workout_checkins(workout_id);
CREATE INDEX idx_checkins_client_id ON workout_checkins(client_id);
CREATE INDEX idx_workouts_client_id ON workouts(client_id);
CREATE INDEX idx_workouts_training_group_id ON workouts(training_group_id);
CREATE INDEX idx_client_training_groups_client_id ON client_training_groups(client_id);
CREATE INDEX idx_client_training_groups_group_id ON client_training_groups(training_group_id);
