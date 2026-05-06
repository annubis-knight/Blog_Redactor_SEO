-- =====================================================
-- Migration 017 — chantier pain-intent-expected-signal
-- Ajoute la colonne `intent_label` sur `keyword_metrics`.
--
-- Contexte : `intent_raw` stocke la PROBABILITÉ (number) renvoyée par
-- DataForSEO, mais le LABEL ('commercial' | 'transactional' |
-- 'informational' | 'navigational') était jusqu'ici jeté après le fetch.
-- Sans le label, le 5e signal du Score Pertinence (Intent SERP × Intent
-- éditorial) ne peut pas être calculé.
--
-- FR concernés : FR-CAP-RELEVANCE-INTENT-SIGNAL.
--
-- Nullable : valeur optionnelle. Absente → 5e signal neutralisé à 50/100
-- (dégradation gracieuse, cohérent avec le comportement actuel).
-- =====================================================

ALTER TABLE keyword_metrics
  ADD COLUMN IF NOT EXISTS intent_label TEXT
    CHECK (intent_label IS NULL OR intent_label IN ('commercial', 'transactional', 'informational', 'navigational'));

COMMENT ON COLUMN keyword_metrics.intent_label IS
  'Label intent SERP renvoyé par DataForSEO search_intent.keyword_intent.label. NULL = inconnu (5e signal Pertinence neutralisé). cf. FR-CAP-RELEVANCE-INTENT-SIGNAL.';
