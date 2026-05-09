-- =====================================================
-- Migration 014 — Sprint S5
-- Ajoute la colonne `pain_intent_expected` sur la table `articles`.
-- Type d'intent attendu derrière la douleur de l'article (commercial /
-- transactional / informational / navigational).
-- Permet de détecter le mismatch entre intent désirée et intent réelle
-- d'un mot-clé candidat (cf. computeRelevanceScore).
-- Nullable : valeur optionnelle, fallback neutre 50 dans le scoring.
-- =====================================================

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS pain_intent_expected TEXT
    CHECK (pain_intent_expected IS NULL OR pain_intent_expected IN ('commercial', 'transactional', 'informational', 'navigational'));

COMMENT ON COLUMN articles.pain_intent_expected IS
  'Type d''intent attendu derrière le painPoint. NULL = inconnu (scoring neutre). cf. docs/pain-point-editorial-backbone.md';
