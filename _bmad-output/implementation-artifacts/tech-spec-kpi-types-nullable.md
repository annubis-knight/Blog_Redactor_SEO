---
title: 'Migration des types KPI vers `number | null`'
slug: 'kpi-types-nullable'
created: '2026-05-05'
status: 'in-progress'
version: '0.2.0'
last_updated: '2026-05-05'
stepsCompleted: [1, 2, 3, 4, 6, 8, 9, 10-partial, 13-partial]
tech_stack:
  - TypeScript 5.9 (shared/types)
  - Express 5 (server adapters DataForSEO + DB)
  - Vue 3.5 (consommateurs front)
  - Vitest 4
synced_with:
  - docs/data-flows/keyword-metrics.md
  - docs/data-flows/score-capitaine.md
  - docs/data-flows/radar-explorations.md
  - docs/data-flows/local.md
  - docs/data-flows/lieutenants.md
  - _bmad-output/planning-artifacts/prd.md (FRs dédiées : FR-INFRA-KPI-NULLABLE, FR-INFRA-KPI-DISPLAY-DASH, FR-INFRA-KPI-CONSISTENCY, FR-INFRA-KPI-SCORING-NULLSAFE — FRs étendues : FR-INFRA-SCORE-MODULE, FR-INFRA-NO-SCORE-FALLBACK, FR-MOT-RAW-KPIS — FRs liées : FR-INFRA-KEYWORD-METRICS, FR-CAP-VALIDATE, FR-RAD-SCORING-BIMODAL, FR-CAP-SCORING-BIMODAL, FR-EXP-LOCAL-COMPARE, NFR-COST-CACHE-FIRST)
  - _bmad-output/implementation-artifacts/sprint-status.yaml
files_to_modify:
  # Types
  - shared/types/dataforseo.types.ts (KeywordOverview)
  - shared/types/intent.types.ts (LocationMetrics, RadarKeywordKpis, ValidatePainResult.dataforseo)
  - shared/types/keyword-audit.types.ts (KeywordAuditResult)
  # Helpers d'affichage (centralisation)
  - shared/score/format.ts (étendu avec formatVolume, formatCpc, formatPercent, formatKd)
  - shared/score/index.ts (exports)
  # Producteurs (adapters)
  - server/services/external/dataforseo/keywords.ts
  - server/services/external/dataforseo/brief.ts
  - server/services/external/dataforseo/scoring.ts (computeCompositeScore + generateAlerts null-safe)
  - server/services/intent/intent.service.ts (fetchKeywordOverviewForLocation + opportunityIndex)
  - server/services/keyword/keyword-radar.service.ts (RadarKeywordKpis + computeMarketScore null-safe)
  - server/services/infra/data.service.ts (DB→KPI captain-explorations)
  - server/routes/keywords.routes.ts (validate-pain dataforseo + computeServerVerdict)
  # Consommateurs front critiques
  - src/components/intent/RadarKeywordCard.vue
  - src/components/intent/RadarCardCheckable.vue
  - src/components/intent/RadarCardLockable.vue
  - src/components/intent/LocalComparisonStep.vue
  - src/components/intent/RowDetail.vue
  - src/components/intent/AutocompleteValidation.vue
  - src/components/moteur/CaptainSidePanel.vue
  - src/components/moteur/CaptainValidation.vue
  - src/components/moteur/CaptainRadarList.vue
  - src/components/moteur/discovery/DiscoverySourcesList.vue
  - src/components/moteur/KeywordDiscoveryTab.vue (utiliser shared/score/format au lieu du local)
  - src/components/keywords/KeywordAuditTable.vue
  - src/components/keywords/KeywordComparison.vue
  - src/components/keywords/DiscoveryPanel.vue
  - src/components/brief/DataForSeoPanel.vue
  - src/components/panels/SerpDataTab.vue
  - src/components/panels/NlpTerms.vue
  - src/composables/intent/usePainVerdict.ts
  - src/composables/intent/useMultiSourceVerdict.ts
  - src/composables/keyword/useKeywordScoring.ts
  - src/composables/keyword/useOpportunityScore.ts
  - src/composables/keyword/useKeywordDiscoveryTab.ts
  # Tests existants à adapter
  - tests/unit/services/dataforseo.service.test.ts
  - tests/unit/services/keyword-radar.service.test.ts
  - tests/unit/services/keyword-audit.test.ts
  - tests/unit/services/keyword-discovery.service.test.ts
  - tests/unit/coherence/local.test.ts
  - tests/unit/routes/validate-pain.routes.test.ts
  - tests/unit/routes/keyword-validate.routes.test.ts
  - tests/unit/shared/scoring-kpi.test.ts
  # Tests Red (nouveaux)
  - tests/unit/coherence/kpi-nullable.test.ts (NEW)
  - tests/unit/shared/score/format-kpi.test.ts (NEW)
code_patterns:
  - "Stratégie A — migration directe `T | null` partout, pas de wrapper opaque"
  - "Helpers d'affichage centralisés dans shared/score/format.ts (cohésion avec formatScore)"
  - "Calculs marché null-safe : `null` propagé, jamais remplacé par 0"
  - "Aucun fallback silencieux `?? 0` sur un KPI marché — `?? null` ou rien"
  - "monthlySearches reste `number[]` — adapter filtre les `null` plutôt que les remplacer par 0"
test_patterns:
  - "tests/unit/coherence/* : règle de cohérence affichage / calcul / agrégat"
  - "TDD strict sur computeCompositeScore, computeMarketScore, computeServerVerdict"
  - "Adapter assertions: `expect(...).toBe(0)` → `expect(...).toBeNull()` quand l'API a renvoyé null"
---

# Tech-Spec : Migration des types KPI vers `number | null`

**Created:** 2026-05-05
**Adversarial review:** à faire après itération 1.

## Overview

### Problem Statement

Les types internes `KeywordOverview`, `LocationMetrics`, `RadarKeywordKpis` (et par propagation `ValidatePainResult.dataforseo`, `KeywordAuditResult`) imposent aujourd'hui :

```ts
searchVolume: number
keywordDifficulty: number  // ou `difficulty` selon le type
cpc: number
competition: number
```

**Tous non nullable.** Conséquence : 8 sites dans le backend écrivent `?? 0` quand DataForSEO ne renvoie pas la donnée :

- [server/services/external/dataforseo/keywords.ts:135, 142-149, 206-213](server/services/external/dataforseo/keywords.ts#L135)
- [server/services/external/dataforseo/brief.ts:26-32, 62-63](server/services/external/dataforseo/brief.ts#L26)
- [server/services/intent/intent.service.ts:336, 343-348](server/services/intent/intent.service.ts#L336)
- [server/services/keyword/keyword-radar.service.ts:400-404](server/services/keyword/keyword-radar.service.ts#L400)
- [server/routes/keywords.routes.ts:508-514](server/routes/keywords.routes.ts#L508)
- [server/services/infra/data.service.ts:652-655](server/services/infra/data.service.ts#L652)

Ces `?? 0` sont marqués `TODO[data-flow-discipline]` + `eslint-disable no-restricted-syntax`. Symptôme côté utilisateur : un keyword sans données affiche **« Volume: 0, KD: 0, CPC: 0€ »** et est noté comme un mauvais keyword, alors qu'il est juste **inconnu**. Le scoring l'évince à tort, le tri le place avec les vrais 0.

La table source `keyword_metrics` (DB) autorise déjà `NULL` sur ces colonnes — c'est le bon design. Le problème est que les types intermédiaires côté code écrasent l'absence en zéro avant que la donnée n'arrive jusqu'au front.

### Solution

**Migration directe** (stratégie A) :

1. Passer les 5 types ciblés en `number | null` sur les 4 KPIs marché (`searchVolume`, `keywordDifficulty` / `difficulty`, `cpc`, `competition`).
2. Supprimer les 8 `?? 0` côté producteurs et les remplacer par `?? null` (ou rien).
3. Supprimer les `eslint-disable no-restricted-syntax` + `TODO[data-flow-discipline]` correspondants.
4. Étendre `shared/score/format.ts` avec `formatVolume`, `formatCpc`, `formatKd`, `formatPercent` qui retournent `'—'` pour `null` (cohérence avec `formatScore`).
5. Adapter les calculs sensibles (`computeCompositeScore`, `opportunityIndex`, `computeMarketScore`, `computeServerVerdict`) pour traiter `null` comme « pas de signal » → score / verdict neutre, **jamais 0**.
6. Adapter les ~17 fichiers consommateurs front pour afficher `'—'` au lieu de `'0'`, et utiliser `compareScores` / `averageScores` du module `shared/score/` quand ils trient ou agrègent.
7. Adapter les ~8 tests existants qui assertent `0` quand la donnée est absente.
8. Écrire les tests Red de cohérence (TDD strict).

### Périmètre — ce qui sort

- ❌ La table SQL `keyword_metrics` n'est **pas** modifiée (déjà nullable côté DB).
- ❌ Le contrat `{ data: T }` des routes n'est pas modifié, seule la forme de `T` change (compat front bumpée en même temps).
- ❌ `intentProbability`, `painAlignmentScore`, `avgSemanticScore` sont **déjà** `number | null` → pas de migration.
- ❌ Pas de refactor opportuniste de scoring, prompts, ou logique métier hors null-safety.

## Architecture impactée

```
┌─────────────────────────────────────────────────────────────────┐
│  AVANT (8 fallback silencieux ?? 0)                             │
│                                                                 │
│  DataForSEO API ──┐                                             │
│  (peut renvoyer    │   Adapter `?? 0`   KeywordOverview          │
│   null/undefined)  ├──────────────────► (number non nullable)   │
│  keyword_metrics ──┘                          │                 │
│  (NULL OK en DB)                              ▼                 │
│                                       Scoring (0 traité comme   │
│                                        une vraie valeur faible) │
│                                               │                 │
│                                               ▼                 │
│                                       UI : "Vol: 0, KD: 0"      │
│                                       (utilisateur trompé)      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  APRÈS (null propagé, affichage explicite)                      │
│                                                                 │
│  DataForSEO API ──┐                                             │
│                    │  Adapter `?? null`  KeywordOverview        │
│                    ├──────────────────►  (number | null)        │
│  keyword_metrics ──┘                          │                 │
│                                               ▼                 │
│                                  Scoring null-safe              │
│                                  (null = composante exclue,     │
│                                   total renormalisé ou null)    │
│                                               │                 │
│                                               ▼                 │
│                                       UI : "Vol: —, KD: —"      │
│                                       (formatVolume(null) etc.) │
│                                       Tri : null en bas         │
│                                       Agrégat : null exclu      │
└─────────────────────────────────────────────────────────────────┘
```

## Décisions techniques

### D1 — Helpers d'affichage centralisés dans `shared/score/format.ts`

**Question** : créer un nouveau fichier `shared/score/kpi-format.ts` ou étendre `shared/score/format.ts` ?

**Décision** : étendre `shared/score/format.ts`. Justification :
- Sémantique commune : un score (0-100) et un KPI marché (volume, cpc, kd, %) partagent **la même règle** d'absence (`null → '—'`, jamais `'0'`).
- `formatScore` y vit déjà, le module documente la règle d'or « la même expression produit l'affichage et le tri ».
- Évite la prolifération de modules à 1 fonction.
- Importable depuis le front (Vue), le back (Express), et les tests.

API ajoutée :

```ts
// shared/score/format.ts
export function formatVolume(v: number | null | undefined): string
  // null/undefined → '—'
  // >= 1000 → '1.2k', '12.3k'
  // sinon → '124'

export function formatCpc(v: number | null | undefined): string
  // null/undefined → '—'
  // sinon → '1.23 €' (toFixed(2) + suffixe)

export function formatKd(v: number | null | undefined): string
  // null/undefined → '—'
  // sinon → '42' (entier 0-100)

export function formatPercent(v: number | null | undefined, opts?: { fromRatio?: boolean }): string
  // null/undefined → '—'
  // fromRatio=true : 0.42 → '42%'
  // sinon : 42 → '42%'
```

### D2 — `monthlySearches: number[]` reste tel quel

**Décision** : conserver `monthlySearches: number[]`. Le tableau peut être vide (`[]`) si la donnée est absente. L'adapter **filtre** les éléments `null` au lieu de les remplacer par `0` :

```ts
// Avant
monthlySearches: (item.keyword_info?.monthly_searches ?? []).map(m => m.search_volume ?? 0)

// Après
monthlySearches: (item.keyword_info?.monthly_searches ?? [])
  .map(m => m.search_volume)
  .filter((v): v is number => v !== null && v !== undefined)
```

Raison : `monthlySearches` n'est pas affiché « à la cellule près » mais consommé par des graphes / agrégats — un point manquant doit être absent du graphique, pas affiché à 0.

### D3 — Calculs `null`-safe : règles uniformes

| Composante | Comportement quand l'entrée est `null` |
|---|---|
| Affichage cellule | `'—'` (placeholder) |
| Tri (`compareScores`) | item placé en bas |
| Agrégat (moyenne, somme) | item exclu, dénominateur ajusté |
| Scoring partiel | composante neutralisée (poids redistribué OU score total devient `null` si > 50% des composantes manquent) |
| Verdict (`GO`/`PROCEED`/`NO_GO`/`GRAY`) | `'GRAY'` (neutre) si toutes les composantes sont `null` |
| Calcul dérivé `opportunityIndex` | retourne `null` si une opérande est `null` |

### D4 — `computeCompositeScore` (server/services/external/dataforseo/scoring.ts)

Refactor : chaque composante détecte `null` et est exclue de la pondération ; le total est renormalisé sur les composantes effectives. Si **toutes** sont `null` → `total: null`. Le type `KeywordCompositeScore.total` passe en `Score = number | null`.

### D5 — Verdict / alertes

`generateAlerts` ne génère plus l'alerte `zero_volume` quand `searchVolume === null` — à la place, alerte `missing_metrics` (level: `info`). Compare uniquement quand la valeur est un nombre.

### D6 — Limites de la migration

- Le **endpoint API** reste compatible : il sérialise `null` en JSON `null`, le front lit `null`. Les contrats Zod (`shared/schemas/`) sont mis à jour pour autoriser `.nullable()`.
- Pas de migration du payload persisté `radar_explorations.cards` / `keyword_metrics.search_volume` — déjà compatible (NULL en DB, JSONB pour les payloads).

## Plan de migration (commits séquencés)

| # | Sous-tâche | Effort | Test gating | Commit |
|---|---|---|---|---|
| 1 | Tests Red — cohérence null KPI (`tests/unit/coherence/kpi-nullable.test.ts` + `tests/unit/shared/score/format-kpi.test.ts`) | 45 min | Red phase obligatoire | `test(coherence): KPI nullable safety - red phase` |
| 2 | Étendre `shared/score/format.ts` (formatVolume, formatCpc, formatKd, formatPercent) + tests | 30 min | tests sous-tâche 1 passent (Green sur format) | `feat(score): formatVolume/Cpc/Kd/Percent helpers nullable` |
| 3 | Modif des 5 types `shared/types/` (KeywordOverview, LocationMetrics, RadarKeywordKpis, ValidatePainResult.dataforseo, KeywordAuditResult) | 30 min | type-check rouge attendu sur consommateurs | `refactor(types): KPI types nullable (KeywordOverview/LocationMetrics/RadarKeywordKpis)` |
| 4 | Adapters DataForSEO (keywords.ts + brief.ts) + suppression eslint-disable | 1h | type-check vert sur ces fichiers | `refactor(dataforseo): adapters return null instead of 0 fallback` |
| 5 | `intent.service.ts` (fetchKeywordOverviewForLocation + opportunityIndex null-safe) | 45 min | tests `local.test.ts` adaptés et verts | `refactor(intent): null-safe LocationMetrics + opportunityIndex` |
| 6 | `keyword-radar.service.ts` (RadarKeywordKpis adapter + computeMarketScore consommé null-safe) | 45 min | tests `keyword-radar.service.test.ts` adaptés | `refactor(radar): null-safe RadarKeywordKpis adapter` |
| 7 | `data.service.ts` (DB→KPI captain-explorations) | 30 min | type-check vert | `refactor(data): null-safe DB→KPI adapter` |
| 8 | `keywords.routes.ts` validate-pain + `computeServerVerdict` null-safe | 45 min | tests `validate-pain.routes.test.ts` adaptés | `refactor(routes): null-safe validate-pain dataforseo` |
| 9 | `scoring.ts` (computeCompositeScore + generateAlerts null-safe) | 1h | tests `scoring-kpi.test.ts` + `keyword-audit.test.ts` adaptés | `refactor(scoring): null-safe composite score + alerts` |
| 10 | Composants front Radar (RadarKeywordCard, RadarCardCheckable, RadarCardLockable, RadarAiPanel) | 1h | smoke tests verts | `feat(ui-radar): display "—" for missing KPIs` |
| 11 | Composants front Capitaine (CaptainSidePanel, CaptainValidation, CaptainRadarList) | 45 min | tests Capitaine verts | `feat(ui-captain): display "—" for missing KPIs` |
| 12 | Composants front intent / keywords / brief / panels (LocalComparisonStep, RowDetail, KeywordAuditTable, etc.) | 1h30 | tests verts | `feat(ui-misc): display "—" for missing KPIs (panels/local/audit)` |
| 13 | Composables front (usePainVerdict, useMultiSourceVerdict, useKeywordScoring, useOpportunityScore) | 1h | tests verts | `refactor(composables): null-safe KPI consumers` |
| 14 | Audit data-flow + maj 5 cartographies + PRD + sprint-status | 45 min | audit < violations qu'avant | `docs: KPI nullable migration data-flow update` |
| 15 | Validation finale `npm run check:health` + archivage tech-spec | 30 min | `check:health` vert | (auto via 14) |

**Effort total estimé : ~10h30** (~2 jours pleins).

### Stratégie de gating type-check

L'étape 3 (modif des types) va casser ~30 sites consommateurs en type-check. **Stratégie** : on laisse rouge entre étapes 3 et 13. À l'étape 13 le type-check repasse vert. Les commits intermédiaires sont type-check rouge **par design** — c'est annoncé dans le commit message.

Alternative envisagée et rejetée : faire les types en dernier. Pb : on garderait les `?? 0` jusqu'à la fin et on n'aurait pas le filet du compilateur pour identifier les sites consommateurs. La stratégie « casser pour réparer » est plus sûre.

## Tests

### Phase Red — `tests/unit/coherence/kpi-nullable.test.ts` (NEW)

Tests qui prouvent les invariants à respecter. **Doivent échouer avant l'implémentation**.

```ts
describe('KPI nullable — règle de cohérence affichage / calcul / agrégat', () => {
  it('formatVolume(null) retourne "—" et non "0"', ...)
  it('formatCpc(null) retourne "—" et non "0.00 €"', ...)
  it('formatKd(null) retourne "—" et non "0"', ...)
  it('formatPercent(null) retourne "—" et non "0%"', ...)

  // Cohérence affichage / tri
  it('compareScores(null, 50) place null en bas (descending)', ...)
  it('un keyword avec searchVolume=null est placé après un keyword searchVolume=10 dans le tri par volume', ...)

  // Agrégat
  it('averageScores ignore les null (3 valeurs dont 1 null → moyenne sur 2)', ...)
  it('opportunityIndex retourne null si local.searchVolume est null', ...)
  it('opportunityIndex retourne null si national.keywordDifficulty est null', ...)

  // Scoring null-safe
  it('computeCompositeScore retourne total=null quand TOUS les KPIs sont null', ...)
  it('computeCompositeScore renormalise le total quand 1 composante est null', ...)
  it('computeServerVerdict retourne GRAY quand searchVolume est null (pas NO_GO)', ...)

  // Adapter
  it('fetchKeywordOverview retourne searchVolume:null quand DataForSEO renvoie null (pas 0)', ...)
  it('fetchKeywordOverviewForLocation retourne keywordDifficulty:null quand absent (pas 0)', ...)
})
```

### Phase Red — `tests/unit/shared/score/format-kpi.test.ts` (NEW)

Tests unitaires des helpers (rapides, déterministes).

### Tests existants à adapter

| Fichier | Changements attendus |
|---|---|
| `tests/unit/services/dataforseo.service.test.ts` | `expect(result.searchVolume).toBe(0)` → `toBeNull()` quand mock renvoie null |
| `tests/unit/services/keyword-radar.service.test.ts` | idem sur `kpis.searchVolume` etc. |
| `tests/unit/services/keyword-audit.test.ts` | idem ; verdict `zero_volume` → `missing_metrics` quand null |
| `tests/unit/services/keyword-discovery.service.test.ts` | propagation null |
| `tests/unit/coherence/local.test.ts` | `opportunityIndex` peut être `null` ; cas de divisions par 0 |
| `tests/unit/routes/validate-pain.routes.test.ts` | `dataforseo.searchVolume:null` propagé |
| `tests/unit/routes/keyword-validate.routes.test.ts` | idem |
| `tests/unit/shared/scoring-kpi.test.ts` | composite score nullable |

## Self-review — Grille additionnelle (CLAUDE.md §5.2)

À cocher en fin de chantier (avant Phase 5 validation) :

- [ ] Tous les producteurs identifiés en cartographie ont été visités (10 sites listés en P1-P10).
- [ ] La règle de cohérence affichage / calcul est respectée : la même expression / le même helper produit la cellule UI ET la valeur de tri (via `formatX` + `compareScores`).
- [ ] Pour chaque cas d'usage (premier load Radar, reload article Capitaine, switch d'onglet, restore from history captain-explorations, merge cache keyword_metrics), le chemin de la donnée a été tracé jusqu'à l'affichage.
- [ ] Les valeurs `null` sont gérées de manière cohérente partout (affichage `—` + tri en bas + exclusion agrégats — aucun fallback silencieux qui masque l'absence).
- [ ] Les 5 types partagés modifiés ont tous leurs consommateurs (front + back + tests) alignés.

## Critères d'acceptation

- ✅ `npm run type-check` passe sans erreur.
- ✅ `npm run test:unit` passe (anciens tests adaptés + nouveaux tests de cohérence verts).
- ✅ `npm run check:health` est vert.
- ✅ Audit data-flow : 0 occurrence de `TODO[data-flow-discipline]` dans le code, et moins de violations MEDIUM `Fallbacks` qu'avant la migration.
- ✅ Inspection visuelle : sur un keyword sans données, l'UI affiche `—` partout (Capitaine side-panel, Radar card, Audit table, Local comparison), pas `0`.
- ✅ Les 5 cartographies `docs/data-flows/` sont à jour (front-matter `last_updated`, sections « Cas d'usage à risque » mentionnent `null`).
- ✅ Tech-spec déplacée dans `_bmad-output/implementation-artifacts/_archive/` avec bandeau `ARCHIVED`.

## Risques & rollback

| Risque | Mitigation |
|---|---|
| Type-check rouge entre étapes 3-13 bloque le dev concurrent | Branche dédiée `refactor/kpi-nullable` ; rebase final |
| Un consommateur front oublié plante au runtime (`.toFixed` sur `null`) | Smoke test manuel après étape 12 + grep exhaustif `\.toFixed\|\.toLocaleString` sur les chemins KPI |
| Un test caduque masque une régression réelle | Re-vérifier que les assertions `toBeNull()` pointent bien sur la branche « DataForSEO renvoie null », pas une autre |
| Payload persisté `radar_explorations.cards` historique avec KPIs en `0` | Le type accepte 0 comme valeur valide (≠ null) ; pas de migration de données. Les vieux scans gardent leurs 0 (interprétés comme « scan ancien sur clavier sans data ») |

## Décisions de scope (V1)

- ✅ Inclus : KeywordOverview, LocationMetrics, RadarKeywordKpis, ValidatePainResult.dataforseo, KeywordAuditResult.
- ❌ Exclus V1 : refonte de l'UI alertes (`generateAlerts`) au-delà du strict null-safe — on ajoute juste `missing_metrics`.
- ❌ Exclus V1 : badge UI custom « donnée manquante, relance le scan ? ». L'utilisateur verra `—`, pas un CTA pour refetch — sera évalué dans une story future selon retour d'usage.
