-- Dérogations aux portes de qualité (épopée qualité SEO, C2 — FR-INFRA-GATE-WAIVER).
-- Une ligne = l'utilisateur a pris la responsabilité de passer outre une alerte
-- 🟠 (accusé de lecture) ou 🔴 (catégorie + raison d'au moins 20 caractères)
-- pour des données précises (input_hash). Idempotent : rejouable sans risque.
-- Appliqué localement puis capturé par `npm run db:snapshot` (schema.sql + bootstrap.sql).
CREATE TABLE IF NOT EXISTS gate_waivers (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  gate_id TEXT NOT NULL,
  rule TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('attention', 'risque')),
  category TEXT CHECK (category IS NULL OR category IN ('longue-traine', 'donnee-manquante', 'marque', 'autre')),
  reason TEXT,
  input_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gate_waivers_unique UNIQUE (article_id, gate_id, rule, input_hash)
);
CREATE INDEX IF NOT EXISTS idx_gate_waivers_article ON gate_waivers (article_id);
