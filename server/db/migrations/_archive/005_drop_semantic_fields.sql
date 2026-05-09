-- =====================================================
-- Migration 005 : Drop article_semantic_fields (orphan)
-- =====================================================
-- Table créée en migration 001, enrichie en 003 (source column).
-- 3 routes API existaient (GET/PUT/POST /articles/:id/semantic-field).
-- Aucun composant front ne consommait ces routes (le store Pinia exposait
-- 4 fonctions — fetchSemanticField, saveSemanticField, addSemanticTerms,
-- getSemanticField — mais aucun composant ne les appelait).
-- L'affichage lexique côté SEO panel est alimenté par seoStore.score.lexiqueCoverage,
-- lui-même calculé à partir de article_keywords.lexique[] + HTML — indépendant
-- de cette table.
--
-- Suppression complète (table + index implicites + contraintes FK).
-- =====================================================

DROP TABLE IF EXISTS article_semantic_fields CASCADE;
