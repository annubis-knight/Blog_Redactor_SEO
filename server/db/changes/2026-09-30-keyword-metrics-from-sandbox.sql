-- Mesures du bac à sable marquées (recette du 2026-09-30, lot 6 — FR-EXT-DATAFORSEO-SANDBOX).
-- `from_sandbox` passe à vrai dès qu'une donnée venue d'une source simulée
-- (bac à sable DataForSEO, IA simulée) est écrite dans la ligne ou dans ses
-- tables filles (relevé SERP) ; une écriture réelle ne l'efface pas. Au passage
-- en réel (bouton, ou démarrage du serveur en réel), les lignes marquées sont
-- effacées : `keyword_serp_results`, `keyword_serp_scrapes`,
-- `keyword_paa_questions` et `keyword_autocomplete` suivent par ON DELETE CASCADE.
-- Les lignes existantes valent `false` : les mesures factices déjà en base
-- avant ce changement ne sont pas reconnues (nettoyage manuel si besoin).
-- Idempotent : rejouable sans risque.
-- Appliqué par `npm run db:apply -- server/db/changes/2026-09-30-keyword-metrics-from-sandbox.sql`,
-- puis capturé par `npm run db:snapshot` (schema.sql + bootstrap.sql).
ALTER TABLE keyword_metrics ADD COLUMN IF NOT EXISTS from_sandbox BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN keyword_metrics.from_sandbox IS
  'Vrai si une donnée de la ligne ou de ses tables filles vient du mode simulé (bac à sable DataForSEO, IA simulée) ; effacée au passage en réel. FR-EXT-DATAFORSEO-SANDBOX.';

CREATE INDEX IF NOT EXISTS idx_keyword_metrics_from_sandbox
  ON keyword_metrics (keyword) WHERE from_sandbox;
