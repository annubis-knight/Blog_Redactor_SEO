---
name: Sprint 19 — external_api_cache reste cache générique (décision produit A)
version: 2.0.0
last_updated: 2026-05-06
status: done
branch: chore/sprint-19-cache-generic-decision
supersedes: tech-spec-sprint-19-mort-external-api-cache.md (status deferred → done avec décision A)
---

# Tech-Spec — Sprint 19 : Décision produit `external_api_cache`

## 1. Contexte

Sprint 16 avait renommé `api_cache` → `external_api_cache` et envisagé un futur
"plan de mort" (migrer chaque cache_type vers une table dédiée puis `DROP TABLE`).
Le pré-Sprint 19 (audit 2026-05-06) a révélé que la table contient **10+
cache_types actifs** (vs 5 estimés Sprint 16) :

| cache_type | Service | TTL |
|-----------|---------|-----|
| `dataforseo` | external/dataforseo/cache.ts | 7 jours |
| `gsc` | external/gsc.service.ts | 24h |
| `radar` | infra/radar-cache.service.ts | 30 jours |
| `long-tail-suggest` | keyword/long-tail-suggest.service.ts | 7 jours |
| `suggest` | keyword/suggest.service.ts | 7 jours (4 sub-keys) |
| `keyword-discovery` | keyword/keyword-discovery.service.ts | DISCOVERY_TTL |
| `intent` | intent/intent.service.ts | YEAR_MS |
| `community-discussions` | intent/community-discussions.service.ts | variable |
| `validate` | keyword/keyword-metrics.service.ts | 7 jours |
| `autocomplete` | routes/article-explorations.routes.ts | variable |

## 2. Décision produit (2026-05-06)

> *« Option A : je ne veux pas créer 6 tables en plus. »*

**Décision tranchée** : `external_api_cache` est **conservée comme cache générique
réutilisable**. Pas de migration vers tables dédiées. Pas de `DROP TABLE`.

### Justifications produit
- **Évite la prolifération** : créer 6+ tables avec presque le même schéma
  (`cache_key TEXT, data JSONB, expires_at TIMESTAMPTZ`) est de la dette de
  maintenance pour un gain cosmétique.
- **Le nom est juste** : `external_api_cache` (Sprint 16) signale clairement le
  rôle ("cache des appels API externes").
- **Le pattern est mature** : `cache-helpers.ts` (`getCached` / `setCached` /
  `deleteCached`) est utilisé par 8+ services depuis longtemps, sans bug
  récurrent.
- **Extensibilité** : ajouter un nouveau cache_type = ajouter une string dans
  `setCached('nouveau-type', ...)`, zéro migration DB.
- **Pas d'impact utilisateur** : ce chantier serait du tech debt pur sans
  bénéfice fonctionnel.

### Ce qui reste valide (pas changé)
- Le nom `external_api_cache` (Sprint 16).
- L'unique partition par `cache_type` + `cache_key` (UNIQUE constraint).
- Le job de purge horaire des entrées expirées (`server/index.ts`).
- `cache-helpers.ts` comme API unifiée.

### Ce qui devient officiel
- La table est **statut "stable, à conserver"** — plus de mention "fin de vie"
  ou "à dropper" dans le PRD ou la doc.
- Tout futur cache d'appel externe doit utiliser cette table (pas de table
  dédiée à créer pour ça).

## 3. FRs

### FR-INFRA-EXTERNAL-API-CACHE (mise à jour majeure)
La table `external_api_cache` est le **cache générique réutilisable** pour tous
les appels API externes. Elle est conservée long terme — il n'y a pas de plan
de mort. Tout nouveau cache d'appel externe doit utiliser cette table via
`cache-helpers.ts` (pas de table dédiée à créer).

**Schéma** : `(id SERIAL PK, cache_key TEXT, cache_type TEXT, data JSONB, cached_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, UNIQUE(cache_key, cache_type))`.

**Cache_types actifs (2026-05-06)** : `dataforseo`, `gsc`, `radar`,
`long-tail-suggest`, `suggest` (4 sub-keys), `keyword-discovery`, `intent`,
`community-discussions`, `validate`, `autocomplete`. Cette liste évolue avec
le temps — la table est extensible par convention (string `cache_type`).

**Critères d'acceptation** :
- La table reste vivante (pas de `DROP TABLE`).
- Tout nouveau cache d'appel externe **doit** utiliser `cache-helpers.ts` plutôt
  que créer une table dédiée.
- L'ancien plan "migrer vers 6+ tables dédiées" est officiellement abandonné.

**Statut :** active. **Depuis :** 2026-05-06. **Décision produit :** Sprint 19 option A. **Source :** tech-spec-sprint-19-cache-generic-decision.

## 4. Hors-scope (pour clarté)

- ❌ Aucune migration DB.
- ❌ Aucune création de table dédiée.
- ❌ Aucun `DROP TABLE`.
- ❌ Aucun changement de code.
- ✅ Mise à jour PRD pour refléter la décision.
- ✅ Mise à jour sprint-status.yaml.
- ✅ Suppression du tech-spec deferred précédent (remplacé par celui-ci).

## 5. Validation

Aucun changement de code → aucune validation technique nécessaire.
- `npm run type-check` : non requis (rien changé)
- `npm run test:unit` : non requis
- `npm run build` : non requis

Validation : revue de la documentation cohérente avec la décision produit.
