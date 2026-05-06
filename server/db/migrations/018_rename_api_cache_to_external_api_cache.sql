-- =====================================================
-- Migration 018 — Sprint 16 : Renommage api_cache → external_api_cache
--
-- Contexte (décision Sprint 10.5 / Sprint 16) : la table `api_cache` est
-- progressivement vidée de ses anciens types (paa, serp, discovery, intent,
-- local-seo, content-gap, lexique, paa_reverse_index, discussions, suggest)
-- qui ont été migrés vers des tables dédiées `*_explorations`. Reste essen-
-- tiellement les types `validate` (KPIs DataForSEO bruts) et `autocomplete`.
--
-- Le nom `api_cache` est trompeur (contient "cache" et masque le fait que
-- c'est juste un cache transitoire d'appels externes). On renomme en
-- `external_api_cache` pour signaler explicitement le rôle "cache d'appels
-- externes en fin de vie".
--
-- Au passage : nettoyage des lignes orphelines (cache_types non plus utilisés
-- par le code).
--
-- FRs concernées : FR-INFRA-EXTERNAL-API-CACHE.
-- =====================================================

-- Étape 1 : nettoyer les lignes orphelines (cache_types migrés vers tables dédiées)
DELETE FROM api_cache WHERE cache_type IN (
  'paa',
  'paa_reverse_index',
  'serp',
  'discovery',
  'discussions',
  'suggest',
  'intent',
  'local-seo',
  'content-gap',
  'lexique'
);

-- Étape 2 : renommer la table
ALTER TABLE api_cache RENAME TO external_api_cache;

-- Étape 3 : renommer les index pour cohérence
ALTER INDEX IF EXISTS idx_api_cache_key_type RENAME TO idx_external_api_cache_key_type;
ALTER INDEX IF EXISTS idx_api_cache_expires RENAME TO idx_external_api_cache_expires;

-- Étape 4 : commentaire de table pour traçabilité
COMMENT ON TABLE external_api_cache IS
  'Cache transitoire des appels API externes (DataForSEO validate, Autocomplete, etc.). Anciennement `api_cache`. Renommé Sprint 16 (2026-05-06) pour clarifier le rôle. Les anciens cache_types (paa, serp, discovery, intent, local-seo, content-gap, lexique) ont été migrés vers des tables dédiées `*_explorations`.';
