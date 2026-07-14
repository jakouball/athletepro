-- Seed default coach
-- password_hash zde není nastaven (ve formátu "salt:scryptHash") - buď ho
-- doplň ručně, nebo se přihlas s libovolným heslem přes budoucí
-- registrační/reset flow, jakmile bude existovat.
INSERT INTO coaches (id, email, name, slug) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'admin@athletepro.local',
  'Admin Coach',
  'admin'
);

-- Seed default training groups
INSERT INTO training_groups (name, code, coach_id) VALUES
  ('WLB - Weight Lifting Basics', 'WLB', '00000000-0000-0000-0000-000000000000'),
  ('RSP - Raw Strength Power', 'RSP', '00000000-0000-0000-0000-000000000000');
