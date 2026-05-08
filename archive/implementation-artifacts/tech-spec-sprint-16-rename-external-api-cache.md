---
name: Sprint 16 — Renommage api_cache → external_api_cache + nettoyage orphelins
version: 1.0.0
last_updated: 2026-05-06
status: done
branch: chore/sprint-10.5-cleanup-painpoint-legacy
---

# Tech-Spec — Sprint 16 : Renommage `api_cache` → `external_api_cache`

## 1. Contexte

Décision produit (2026-05-06, Sprint 10.5 brainstorm) :

> *« Je n'utilise plus de "cache" si possible. Si la table `api_cache` pouvait
> être renommée en quelque chose qui clarifie son rôle "cache d'appels externes
> en fin de vie", ce serait top. »*

Le nom `api_cache` est trompeur :
- Il évoque un cache **général** alors que la table ne sert plus qu'aux **appels
  externes en fin de vie** (DataForSEO `validate`, autocomplete).
- Les autres types historiques (`paa`, `serp`, `radar`, `discovery`, `intent`,
  `local-seo`, `content-gap`, `lexique`) ont été migrés vers des tables dédiées
  `*_explorations` au fil des migrations 006-010.

`external_api_cache` est plus juste — il signale "cache d'appels externes,
transitoire, en fin de vie".

## 2. Périmètre

### Migration DB
- **`server/db/migrations/018_rename_api_cache_to_external_api_cache.sql`** :
  - DELETE des cache_types orphelins (`paa`, `paa_reverse_index`, `serp`,
    `discovery`, `discussions`, `suggest`, `intent`, `local-seo`, `content-gap`,
    `lexique`)
  - `ALTER TABLE api_cache RENAME TO external_api_cache`
  - Renommage des index pour cohérence
  - Commentaire de table pour traçabilité

### Code refactoring
- `server/db/cache-helpers.ts` : 3 références SQL renommées
- `server/index.ts` : job de purge horaire renommé
- `server/routes/article-explorations.routes.ts` : DELETE clear cache renommé
- `tests/helpers/db-fixtures.ts` : cleanup des fixtures de test renommé
- `_bmad-output/planning-artifacts/prd.md` : 26 références renommées (sauf
  `updateReason` historique en ligne 14 qui décrit l'historique du PRD)

### Hors scope
- Les **commentaires historiques** dans le code (`// Sprint 15.X — Storage
  moved from api_cache[X] to ...`) sont **conservés** — ils documentent
  la migration qui a eu lieu et leur valeur archéologique vaut mieux que
  leur cohérence cosmétique.

## 3. FRs

### FR-INFRA-EXTERNAL-API-CACHE (nouvelle)
La table `external_api_cache` (anciennement `api_cache`) cache les appels API
externes en fin de vie (DataForSEO `validate`, autocomplete). Les autres
cache_types historiques ont été migrés vers des tables dédiées `*_explorations`.

**Schéma** : `(id SERIAL PK, cache_key TEXT, cache_type TEXT, data JSONB, cached_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, UNIQUE(cache_key, cache_type))`.

**Cache_types actifs** (2026-05-06) : `validate`, `autocomplete`, `radar`,
`dataforseo`, `gsc`. Les autres ne sont plus écrits par le code actuel.

**Critères d'acceptation testables** :
- `SELECT * FROM external_api_cache` fonctionne ; `api_cache` n'existe plus.
- Le job de purge horaire (`server/index.ts`) cible `external_api_cache`.
- Aucune référence à `FROM api_cache` / `INTO api_cache` ne subsiste dans
  `server/`, `src/`, `tests/`.

**Plan de mort à long terme** : migrer les 2 derniers types `validate` et
`autocomplete` vers des tables dédiées (`keyword_metrics` et `autocomplete_cache`),
puis `DROP TABLE external_api_cache`. Sprint dédié futur.

**Statut :** active. **Depuis :** 2026-05-06. **Source :** tech-spec-sprint-16-rename-external-api-cache.

## 4. Validation

- `npm run type-check` ✅
- `npm run test:unit` : 3983 tests verts (2 sanity E2E pré-existants requièrent serveur dev)
- `npm run build` : 9.97s ✅
- Migration appliquée localement via psql, table `external_api_cache` confirmée présente avec index renommés.
