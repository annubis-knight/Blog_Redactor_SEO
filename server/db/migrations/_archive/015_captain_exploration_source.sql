-- =====================================================
-- Migration 015 : captain_explorations.source (quick win)
-- =====================================================
-- Trace l'origine d'un candidat Capitaine :
--   - 'radar'    : card racine cochée depuis l'onglet Radar
--   - 'longtail' : suggestion longue-traîne IA (kpis null par construction)
--   - 'manual'   : saisie libre par l'utilisateur dans Capitaine
--   - NULL       : rows existantes / origine indéterminée (legacy)
--
-- Pas de contrainte CHECK : la validation des valeurs est faite côté Zod
-- (voir shared/schemas/long-tail-suggestions.schema.ts). Permet d'ajouter
-- de nouveaux types sans nouvelle migration.
-- =====================================================

ALTER TABLE captain_explorations ADD COLUMN IF NOT EXISTS source TEXT NULL;
