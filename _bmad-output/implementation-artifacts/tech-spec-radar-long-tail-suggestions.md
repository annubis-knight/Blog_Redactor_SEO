---
title: 'Radar — Suggestions longue traîne (génération mixte locale + IA)'
slug: 'radar-long-tail-suggestions'
created: '2026-05-03'
last_updated: '2026-05-03'
version: '1.0.0'
status: 'delivered'
delivered: '2026-05-03'
sprints: 6
tech_stack:
  - Vue 3.5 + Pinia 3
  - Vitest 4 + @vue/test-utils + Playwright 1.59
  - Express 5 + Zod 4
  - PostgreSQL (pg 8.20) — extension JSONB radar_explorations + colonne captain_explorations.source
  - ai-provider.service (mock obligatoire en dev)
synced_with:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - docs/moteur-data-flow.md
  - docs/scoring-kpi-vs-relevance.md
  - docs/prompts-reference.md
  - docs/ai-usage-map.md
files_to_modify:
  # ----- S1 — Schémas & types & générateur déterministe -----
  - shared/schemas/long-tail-suggestions.schema.ts                              # NEW
  - shared/types/intent.types.ts                                                # MODIFIED — RadarCard.kpis nullable + source
  - shared/types/long-tail.types.ts                                             # NEW (réexport pratique)
  - server/services/keyword/long-tail-combinator.service.ts                     # NEW (pur, déterministe)
  - tests/unit/services/long-tail-combinator.service.test.ts                   # NEW
  # ----- S2 — IA + persistance + route -----
  - server/prompts/radar-long-tail-suggest.md                                   # NEW
  - server/services/keyword/long-tail-suggest.service.ts                        # NEW
  - server/services/external/mock-fixtures/long-tail-suggest.ts                 # NEW
  - server/services/external/mock-fixtures/index.ts                             # MODIFIED (re-export)
  - server/services/infra/radar-exploration.service.ts                          # MODIFIED (helper persistLongTail + selected)
  - server/routes/keywords/long-tail-suggest.routes.ts                          # NEW
  - server/db/migrations/015_captain_exploration_source.sql                     # NEW
  - tests/unit/services/long-tail-suggest.service.test.ts                       # NEW
  - tests/contract-api/long-tail-suggest.routes.test.ts                         # NEW
  # ----- S3 — Composable + composant Vue -----
  - src/composables/intent/useLongTailSuggestions.ts                            # NEW
  - src/components/intent/RadarLongTailSuggestions.vue                          # NEW
  - tests/unit/composables/useLongTailSuggestions.test.ts                       # NEW
  - tests/unit/components/RadarLongTailSuggestions.test.ts                      # NEW
  # ----- S4 — Intégration UI + dédup -----
  - src/components/intent/DouleurIntentScanner.vue                              # MODIFIED (slot longtail + agrégation CTA)
  - src/views/MoteurView.vue                                                    # MODIFIED (handleCardsSelected — dédup défensive)
  - tests/unit/components/DouleurIntentScanner-longtail.test.ts                 # NEW
  # ----- S5 — E2E -----
  - tests/browser/moteur-radar-long-tail.spec.ts                                # NEW
  # ----- S6 — Doc -----
  - docs/moteur-data-flow.md                                                    # MODIFIED (section longue-traîne + endpoint)
  - docs/prompts-reference.md                                                   # MODIFIED (nouveau prompt)
  - docs/ai-usage-map.md                                                        # MODIFIED (nouvelle entrée IA)
  - _bmad-output/implementation-artifacts/sprint-status.yaml                    # MODIFIED
---

# Radar — Suggestions longue traîne (génération mixte locale + IA)

> **TL;DR pour un débutant :**
> Aujourd'hui, l'onglet Radar du Moteur montre des cards de mots-clés racines (ex: « copywriting email »). On veut, **sous** ce conteneur principal, une section optionnelle déclenchée par un bouton qui produit jusqu'à 10 **combinaisons longue traîne** (ex: « copywriting email PME industriel »). Chaque suggestion vient avec une **explication** (« pourquoi ça fait sens ») et un **score de préférence sur 10**. L'utilisateur peut cocher / décocher chaque suggestion, puis le clic sur le bouton existant « Envoyer au Capitaine » pousse les cards racines cochées **et** les longues-traînes cochées vers l'onglet Capitaine, sans doublon.

---

## 0. Contexte & lien avec l'existant

### 0.1 Pipeline actuel
- **Onglet Radar** (`src/components/intent/DouleurIntentScanner.vue`) : génère des `RadarKeyword[]`, scanne PAA + Autocomplete + KPIs, produit `RadarCard[]`.
- **CTA `Envoyer au Capitaine`** (DouleurIntentScanner.vue:472-476) : émet `cards-selected: RadarCard[]` → `MoteurView.handleCardsSelected` (MoteurView.vue:424-428) → prop `radar-cards` de `CaptainValidation`.
- **CaptainValidation** : `extractRoots()` (`src/composables/keyword/useCapitaineValidation.ts:23-32`) décompose une longue-traîne ≥3 mots en racines progressives. `computeRelevanceScore` (`shared/scoring.ts:165-167`) pèse les racines à `0.20` quand la card a déjà été validée.
- **Persistance Radar** : `radar_explorations` (article_id PK, JSONB `scan_result.cards[]`).
- **Persistance Capitaine candidats** : `captain_explorations` (UNIQUE article_id+keyword), persisté à la validation par le carousel.

### 0.2 Point de douleur utilisateur (Capitaine = utilisateur du produit)
> *« Je ne veux pas perdre mes longues-traînes au reload. Je veux pouvoir cocher / décocher comme une RadarCard normale. Je veux que tout parte vers Capitaine en un seul clic, sans doublons. »*

---

## 1. Phase 1.bis — Cartographie de la donnée partagée (CLAUDE.md §2.0)

> *Définition rapide : « donnée partagée » = donnée qui transite entre Cerveau / Moteur / Rédaction et entre front / back. Une « long-tail suggestion » coche les 3 triggers obligatoires de §2.0 : modifie un type partagé, modifie la persistance, change l'affichage **et** la logique d'envoi.*

### 1.1 Producteurs

| Producteur | Lieu | Mécanisme |
|---|---|---|
| **IA (génération initiale)** | `long-tail-suggest.service.ts` | Combinateur local → prompt IA → JSON Zod-validé → persistance JSONB |
| **Combinateur local (déterministe)** | `long-tail-combinator.service.ts` | Paires/triples par fréquence + dédup variante normalisée. Toujours appelé avant l'IA |
| **Mock fixture (dev/test)** | `mock-fixtures/long-tail-suggest.ts` | Renvoie 3-10 suggestions stables pour Playwright + tests unit |
| **Restauration au reload** | `mergeFromRadarSource()` (étendu) | Lit `radar_explorations.scan_result.longTailSuggestions[]` + `selectedKeywords[]` |
| **Régénération** | Bouton « ✨ Régénérer » (uniquement après une première génération) | Re-call route, écrase ou append selon décision UX (cf. §1.6) |

### 1.2 Consommateurs

| Consommateur | Lieu | Usage |
|---|---|---|
| **Affichage** | `RadarLongTailSuggestions.vue` (NEW) | Liste triée par `preferenceScore desc`, checkbox, badge score, rationale, badges sources racines |
| **Tri** | composable | Tri par `preferenceScore desc` (déterministe). Ties cassés par `keyword` alpha pour stabilité |
| **Pré-cochage** | composable | Top 5 par `preferenceScore desc` au moment de la première génération uniquement |
| **Agrégation CTA** | `DouleurIntentScanner.sendToCaptain()` | Concaténation dédupliquée cards racines cochées + longues-traînes cochées |
| **Réception** | `MoteurView.handleCardsSelected` | Garde-fou dédup avant `radarCardsForCaptain.value =` |
| **Affichage Capitaine** | `CaptainValidation` (prop `radarCards`) | Rendu inchangé : la longue-traîne arrive avec `kpis: null`, le carousel l'affiche comme une card classique |
| **Décomposition** | `extractRoots()` | Gère déjà ≥3 mots → racines. **Aucun changement nécessaire**. |
| **Validation** | `saveCaptainExplorationEntry` | Écrit dans `captain_explorations` avec `source = 'longtail'` (col. nouvelle, nullable) |

### 1.3 Persistance

| Étape | Table | Colonne / structure | Note |
|---|---|---|---|
| Suggestions générées par l'IA | `radar_explorations` | `scan_result` JSONB → ajout champ `longTailSuggestions: LongTailSuggestion[]` | 0 nouvelle table, JSONB élargi |
| Sélection cochée par l'utilisateur | `radar_explorations` | `scan_result` JSONB → ajout champ `longTailSelectedKeywords: string[]` | Sérialisé à chaque toggle (debounce 500ms front pour éviter spam) |
| Cache réponse IA (idempotence régénération) | `api_cache` | `key = sha256(article_title + pain_point + sorted_radar_keywords + locale)`, TTL 7j | Évite de re-payer l'IA si rien n'a changé |
| Candidats Capitaine après envoi | `captain_explorations` | UPSERT existant + nouvelle col. `source TEXT NULL` (`'radar' \| 'longtail' \| 'manual'`) | UNIQUE(article_id, keyword) → idempotence DB |

### 1.4 Cas d'usage à tracer (golden paths à tester)

1. **Premier load article** → aucune longue-traîne en DB → bouton « Suggérer » visible si `radarCards.length >= 2` → clic → loading → 10 suggestions affichées, top 5 pré-cochées.
2. **Reload page** → DB contient `longTailSuggestions` + `selectedKeywords` → composant affiche directement la liste, état coché restauré, bouton remplacé par « Régénérer ».
3. **Régénération** → re-call route → cache `api_cache` HIT (rien n'a changé) → réponse identique en <100ms → écrase la liste mais **conserve** `selectedKeywords` qui matchent (si `keyword` toujours présent dans la nouvelle liste).
4. **Toggle case** → maj `selectedKeywords` côté front → debounce 500ms → PATCH route persistance.
5. **Envoi unifié au Capitaine** → cards racines cochées (`Set<string>`) ∪ longues-traînes cochées (`Set<string>`) → dédup par `keyword.toLowerCase().trim()` → emit `cards-selected` → `MoteurView` re-dédup défensif → `CaptainValidation` reçoit le payload mergé sans doublon.
6. **Validation côté Capitaine** → carousel valide une longue-traîne → `saveCaptainExplorationEntry` UPSERT avec `source: 'longtail'` (frontend connaît la source via `card.source`).
7. **Cas tordu — keyword identique entre les 2 listes** : si une longue-traîne IA produit accidentellement le même keyword qu'une card racine cochée → la dédup garde **la card racine** (KPIs présents). Test explicite §S5.
8. **Article sans Radar scan** → `radarCards.length < 2` → la section longue-traîne reste **cachée** (pas de bouton). Pas d'erreur, pas de placeholder.

### 1.5 Régressions historiques (recherche `git log` rapide)

| Recherche | Résultat |
|---|---|
| Timer 5s d'envoi automatique | **Retiré** depuis (cf. `DouleurIntentScanner.vue` actuel — plus de `setTimeout/debounce`). On ne le réintroduit pas dans cette story. |
| `combinedScore` vs `marketScore` | Bug historique connu (cf. `docs/scoring-kpi-vs-relevance.md`) — le fallback `combinedScore` est interdit côté Radar. **On n'introduit aucun fallback de score** sur la longue-traîne : `kpis: null` partout, point. |
| `slug` vs `articleId` | OK : on utilise `articleId` partout, route `/articles/:id/radar-exploration/long-tail`. |

### 1.6 Règle de cohérence affichage / calcul (CLAUDE.md §2.0)

| Valeur | Affichage | Tri | Agrégat | Verdict |
|---|---|---|---|---|
| `preferenceScore` | Badge sur 10 | Tri principal `desc` | Pas d'agrégat | ✅ une seule expression |
| `keyword` (longue-traîne) | Bold dans la card | Dédup par `keyword.toLowerCase().trim()` | Pas d'agrégat | ✅ |
| `kpis: null` | Affichage neutre `—` côté Capitaine | Exclu du tri par score KPI (déjà géré par `useSortableList` qui pousse les `null` en bas) | Exclu des agrégats KPI | ✅ pas de fallback fantôme |
| `derivedFromRoots` | Badges sous keyword | Pas trié | Pas d'agrégat | ✅ |

**Décision UX régénération** : la régénération **écrase** les `longTailSuggestions[]` mais **conserve** `selectedKeywords[]` filtrés (intersect avec les nouveaux keywords). Si une suggestion auparavant cochée n'est plus produite, elle disparaît de la sélection. Document via tooltip sur le bouton « Régénérer ».

---

## 2. Architecture data-flow (Mermaid)

```mermaid
flowchart TD
    A[Radar scan terminé<br/>radarCards: RadarCard[]] -->|>= 2 cards| B[Section longue-traîne visible]
    B -->|Clic Suggérer| C[POST /articles/:id/radar-exploration/long-tail]
    C --> D{api_cache HIT?}
    D -->|Yes| E[Cache hit → réponse rapide]
    D -->|No| F[long-tail-combinator<br/>déterministe]
    F --> G[loadPrompt + ai-provider<br/>mock en dev]
    G --> H[Validation Zod<br/>LongTailSuggestionsResponseSchema]
    H --> I[persistLongTail dans<br/>radar_explorations.scan_result]
    E --> I
    I --> J[Réponse front: suggestions[]]
    J --> K[Top 5 pré-cochées<br/>useLongTailSuggestions]
    K --> L[Affichage liste<br/>RadarLongTailSuggestions.vue]
    L -->|Toggle| M[PATCH selectedKeywords<br/>debounce 500ms]
    L -->|Bouton Envoyer Capitaine| N[Agrégation dédupliquée<br/>cards racines ∪ longues-traînes]
    N -->|emit cards-selected| O[MoteurView dédup défensive]
    O --> P[CaptainValidation<br/>prop radarCards]
    P -->|Validation carousel| Q[POST /articles/:id/captain-explorations<br/>source: 'longtail']
    Q --> R[(captain_explorations<br/>UNIQUE article_id+keyword)]
```

---

## 3. Anti-patterns à vérifier en self-review S6 (CLAUDE.md §3.5)

- [ ] ❌ `fetch` direct dans `RadarLongTailSuggestions.vue` → **vérifié** : on passe par `apiPost` dans le composable `useLongTailSuggestions`.
- [ ] ❌ Hardcode de check workflow → **N/A** : cette story n'émet **aucun nouveau check**. Le déclenchement est libre (pas de `moteur:longtail_suggested`).
- [ ] ❌ Modifier le prompt `.md` pour injecter du contexte → **vérifié** : variables `{{...}}` injectées par `loadPrompt()`.
- [ ] ❌ Bypasser `ai-provider.service.ts` → **vérifié** : `long-tail-suggest.service.ts` passe par `ai-provider`.
- [ ] ❌ Importer `server/` dans `src/` → **vérifié** : seuls `shared/types`, `shared/schemas` traversent.
- [ ] ❌ Ajouter un onglet, une phase, un check workflow → **N/A**.
- [ ] ❌ Toucher au scoring `marketScore` / `relevanceScore` → **N/A** : `preferenceScore` est un score IA isolé sur 10, pas un score de pertinence Capitaine.
- [ ] ❌ Fallback silencieux `?? card.legacyScore` ou `?? marketScore` → **vérifié** : `kpis: null` strict, affichage `—`, exclusion du tri par score KPI.
- [ ] ❌ Doublons à l'envoi vers Capitaine → **vérifié** : 3 niveaux de dédup (cf. §S4).
- [ ] ❌ Nouvelle table sans justification → **vérifié** : 0 nouvelle table, 1 colonne nullable + JSONB extension.

---

## 4. Découpage en 6 sprints

> **Convention** : chaque sprint suit le cycle TDD strict Red → Green → Refactor pour les zones critiques. Chaque sprint termine par un mini self-review (grille §5.1 + §5.2) avant de passer au suivant. Validation full (lint/type-check/test:unit/test:browser/check:dead/check:cycles) à chaque sprint terminal **et** en S6.

### Sprint S1 — Schémas + types + générateur déterministe

**Objectif** : poser les fondations testables sans toucher à l'IA.

#### Red (tests d'abord)

- `tests/unit/services/long-tail-combinator.service.test.ts` :
  - Cas vide : `combine([])` → `[]`.
  - Cas trivial : `combine([k1])` → `[]` (besoin de ≥2 mots-clés pour combiner).
  - Cas paire simple : `combine([k1, k2])` → ≤ N paires triées par fréquence des mots significatifs.
  - **Dédup variante normalisée** : `"copywriting email"` et `"COPYWRITING EMAIL "` produisent une seule entrée.
  - Stopwords FR (`de`, `le`, `à`...) ignorés dans le scoring de fréquence (réutilise `FRENCH_STOPWORDS`).
  - Triples optionnels seulement si ≥4 mots-clés en input.
  - Limite dure : ne renvoie jamais > 30 candidats (l'IA filtrera ensuite).
  - Déterminisme : appel idempotent → même tableau, même ordre.

#### Green (code minimal)

- `shared/schemas/long-tail-suggestions.schema.ts` :
  ```ts
  export const LongTailSuggestionSchema = z.object({
    keyword: z.string().min(2).max(120),
    rationale: z.string().min(10).max(500),
    preferenceScore: z.number().int().min(1).max(10),
    derivedFromRoots: z.array(z.string()).min(1).max(5),
  })
  export const LongTailSuggestionsResponseSchema = z.object({
    suggestions: z.array(LongTailSuggestionSchema).max(10),
  })
  export const LongTailSuggestRequestSchema = z.object({
    articleId: z.number().int().positive(),
    radarKeywords: z.array(z.object({
      keyword: z.string(),
      kpis: z.unknown().nullable().optional(),
    })).min(2),
  })
  ```
- `shared/types/long-tail.types.ts` : ré-export des inférences `z.infer<...>` + type `RadarLongTailCard = RadarCard & { source: 'longtail'; kpis: null; preferenceScore: number; rationale: string; derivedFromRoots: string[] }`.
- **Modification `shared/types/intent.types.ts`** : `RadarCard.kpis: RadarKeywordKpis | null` + `source?: 'radar' | 'longtail'`.
  - **Risque** : casse les consommateurs existants qui font `card.kpis.searchVolume` direct.
  - **Mitigation** : adapter au coup-par-coup les sites d'appel via narrowing `if (card.kpis) {…}`. Un test type-check (vue-tsc) échouera tant que tous les sites ne sont pas alignés.
- `server/services/keyword/long-tail-combinator.service.ts` : pure function `combineRoots(radarKeywords: string[]): CandidateCombination[]`.

#### Refactor

- Extraire `tokenizeAndScore` si la lisibilité l'exige.
- S'assurer qu'aucune dépendance à `pg`, `apiPost`, `loadPrompt` n'est importée → fichier 100 % isolé, testable sans I/O.

#### Critères d'acceptance

- [ ] `npm run test:unit -- long-tail-combinator` → vert.
- [ ] `npm run type-check` → vert (toute la codebase aligne `kpis | null`).
- [ ] `npm run check:cycles` → 0 cycle introduit.
- [ ] Aucun import `server/*` dans `shared/*`.

---

### Sprint S2 — IA + persistance + route + cache + migration DB

**Objectif** : pipeline backend complet, mockable, testable, persistant.

#### Red (tests d'abord)

- `tests/unit/services/long-tail-suggest.service.test.ts` :
  - **AI_PROVIDER=mock** → renvoie le contenu de `mock-fixtures/long-tail-suggest.ts`.
  - **Cache HIT** : 2e appel avec mêmes inputs → 0 appel à `ai-provider`.
  - **Cache MISS** : 1er appel → consulte `api_cache`, miss, appelle ai-provider, écrit le résultat dans le cache.
  - **Validation Zod fail** : si le mock retourne un payload invalide → service throw `LongTailSuggestionsValidationError`, **n'écrit rien** ni en cache ni en DB.
  - **Persistance** : `persistLongTail(articleId, suggestions)` UPSERT le champ JSONB `longTailSuggestions` sans casser `cards[]`.
  - **Idempotence DB** : appel 2 fois avec mêmes inputs → 1 seule row `radar_explorations` modifiée.
- `tests/contract-api/long-tail-suggest.routes.test.ts` :
  - `POST /articles/:id/radar-exploration/long-tail` body invalide → 400 + erreur Zod claire.
  - body valide en mock → 200 + `{ data: { suggestions: [...] } }` (contrat `{ data: T }`).
  - articleId inexistant → 404.
  - Erreur IA (provider down simulé) → 502 + suggestions reset à `[]` côté DB (pas de fantôme).
  - `PATCH /articles/:id/radar-exploration/long-tail/selection` body `{ selectedKeywords: string[] }` → 200, met à jour le JSONB.
- Migration `015_captain_exploration_source.sql` : test pgmem ou test contract avec rollback :
  - Avant migration : col absente.
  - Après migration : col `source TEXT NULL` présente, valeur `null` pour rows pré-existantes.
  - INSERT avec `source: 'longtail'` → OK.
  - INSERT sans `source` → OK, reste à `null`.

#### Green

- `server/db/migrations/015_captain_exploration_source.sql` :
  ```sql
  ALTER TABLE captain_explorations ADD COLUMN IF NOT EXISTS source TEXT NULL;
  ```
- `server/prompts/radar-long-tail-suggest.md` : prompt agnostique avec variables :
  - `{{article_title}}`, `{{article_pain_point}}`, `{{strategy_context}}` (fallback `''`)
  - `{{radar_keywords_with_kpis}}` (sérialisation JSON)
  - `{{candidate_combinations}}` (output du combinator)
  - Instructions : filtrer / reformuler / scorer 1-10, retourner JSON strict matching `LongTailSuggestionsResponseSchema`.
- `server/services/external/mock-fixtures/long-tail-suggest.ts` : 5-10 suggestions stables, déterministes, basées sur les `radarKeywords` reçus (concaténation simple de paires + score factice 7-10).
- `server/services/keyword/long-tail-suggest.service.ts` :
  ```
  1. validate request (Zod)
  2. compute candidate combinations (combinator)
  3. compute cache key = sha256(title + pain + sorted(keywords) + locale)
  4. try api_cache → if hit, validate Zod, return
  5. loadPrompt('radar-long-tail-suggest', vars)
  6. call ai-provider.generateJson({ prompt, schema: LongTailSuggestionsResponseSchema })
  7. persist via radar-exploration.service.ts:persistLongTail
  8. write api_cache (TTL 7d)
  9. return { suggestions }
  ```
- `server/services/infra/radar-exploration.service.ts` :
  - Helper exporté `persistLongTail(articleId, suggestions, selectedKeywords?): Promise<void>` qui fait un UPDATE atomique du JSONB sans toucher `cards[]`.
- `server/routes/keywords/long-tail-suggest.routes.ts` :
  - `POST /articles/:id/radar-exploration/long-tail` → délègue au service.
  - `PATCH /articles/:id/radar-exploration/long-tail/selection` → délègue au service.

#### Refactor

- Vérifier que `loadPrompt` reçoit bien `strategy_context` (fallback `''` si absent).
- Vérifier que les prompts ne contiennent **aucune string métier hardcodée** (tout passe par `{{...}}`).
- Logger : `log.info('[long-tail-suggest] generated', { articleId, count, fromCache })`.

#### Critères d'acceptance

- [ ] `npm run test:unit -- long-tail-suggest` → vert.
- [ ] `tests/contract-api/long-tail-suggest.routes.test.ts` → vert.
- [ ] `AI_PROVIDER=mock` → 0 appel réseau IA réel (à grepper avec un test).
- [ ] Migration 015 appliquée et idempotente (`IF NOT EXISTS`).
- [ ] Aucun nouveau cycle d'import (`npm run check:cycles`).
- [ ] Aucun fichier mort introduit (`npm run check:dead`).

---

### Sprint S3 — Composable + composant Vue + tests unit

**Objectif** : UI testable en isolation, sans dépendance à l'API réelle.

#### Red

- `tests/unit/composables/useLongTailSuggestions.test.ts` :
  - État initial : `{ status: 'idle', suggestions: [], selectedKeywords: Set() }`.
  - `generate()` mock `apiPost` → `loading` → `success`, top 5 pré-cochées par `preferenceScore desc`.
  - `regenerate()` → conserve les `selectedKeywords` qui matchent les nouveaux `keywords`.
  - `toggle(keyword)` → ajoute/retire du `Set`.
  - `getSelectedSuggestions()` → ordre stable (preferenceScore desc, alpha tie-break).
  - `hydrate(persisted)` → restaure suggestions + selection depuis la DB sans appel réseau.
  - Erreur API → `{ status: 'error', error: msg }`, suggestions précédentes conservées (graceful).
- `tests/unit/components/RadarLongTailSuggestions.test.ts` :
  - `radarCards.length < 2` → composant rend rien (`v-if`).
  - `radarCards.length >= 2`, état idle → bouton « Suggérer » visible (`data-testid="btn-suggest-longtail"`).
  - État loading → bouton désactivé + spinner.
  - État success → liste rendue, top 5 cochées, badge score visible, rationale en tooltip ou ligne secondaire.
  - Toggle checkbox → emit `update:selected-keywords` (ou expose la sélection au parent via composable shared).
  - Bouton « Régénérer » visible uniquement si `status === 'success'`.

#### Green

- `src/composables/intent/useLongTailSuggestions.ts` :
  - `apiPost('/articles/:id/radar-exploration/long-tail', { radarKeywords })`.
  - `apiPatch('/articles/:id/radar-exploration/long-tail/selection', { selectedKeywords })` debounce 500ms via `useDebounceFn` (dépendance `@vueuse/core` à vérifier — sinon `setTimeout` maison).
  - État via `ref<{ status, suggestions, selectedKeywords, error }>`.
- `src/components/intent/RadarLongTailSuggestions.vue` :
  - Props : `radarCards: RadarCard[]`, `articleId: number`, `articleTitle: string`, `articlePainPoint: string`.
  - Header : titre + bouton « ✨ Suggérer » (`data-testid="btn-suggest-longtail"`).
  - Body : liste des suggestions avec checkbox + badge score 1-10 + keyword bold + rationale en tooltip + badges sources.
  - Footer : bouton « Régénérer » discret quand `success`.
  - Émet `update:selected-keywords: string[]` au parent.
  - **A11Y** : checkbox étiquetée par `aria-label` keyword + score, bouton avec `aria-busy` en loading.

#### Refactor

- Si le fichier dépasse ~250 lignes, extraire un sous-composant `LongTailRow.vue`.
- Pas d'appel `fetch` (vérification grep auto en self-review).

#### Critères d'acceptance

- [ ] `npm run test:unit -- useLongTailSuggestions` → vert.
- [ ] `npm run test:unit -- RadarLongTailSuggestions` → vert.
- [ ] `npm run lint` → 0 warning sur les nouveaux fichiers.
- [ ] `npm run type-check` → vert.

---

### Sprint S4 — Intégration UI + dédup CTA unifié

**Objectif** : brancher la nouvelle section dans `DouleurIntentScanner.vue`, agréger les sélections, dédupliquer.

#### Red

- `tests/unit/components/DouleurIntentScanner-longtail.test.ts` :
  - Section longue-traîne rendue **sous** le conteneur `.radar-cards` et **avant** `RadarAiPanel`.
  - Section cachée si `radarCards.length < 2`.
  - Après suggestions générées + 2 longues-traînes cochées + 3 cards racines cochées :
    - Clic CTA « Envoyer au Capitaine » → emit `cards-selected` avec **5** entrées sans doublon.
    - Si une longue-traîne a le **même keyword** qu'une card racine cochée → 1 seule entrée (la card racine prime, KPIs préservés).
  - Compteur du bouton « Envoyer au Capitaine ({n}) » = total dédupliqué.
- `tests/unit/views/MoteurView-longtail.test.ts` (ou ajout au test existant) :
  - `handleCardsSelected` reçoit un payload artificiellement dupliqué → `radarCardsForCaptain.value` n'a aucune doublure.

#### Green

- `src/components/intent/DouleurIntentScanner.vue` :
  - Import `RadarLongTailSuggestions` + composable.
  - Slot rendu après `.radar-cards`, avant `RadarAiPanel`.
  - Nouveau ref local `longTailSelectedKeywords: Set<string>` synchronisé via `@update:selected-keywords`.
  - `sendToCaptain()` re-implémenté :
    ```
    const racines = scanResult.cards.filter(c => checkedKeywords.has(c.keyword))
    const longues = longTailSuggestions.filter(s => longTailSelectedKeywords.has(s.keyword))
                                       .map(toRadarCard) // kpis: null, source: 'longtail'
    const merged = mergeDedup(racines, longues, (c) => normalize(c.keyword))
    emit('cards-selected', merged)
    ```
  - Compteur bouton : `racines.length + longues.length - duplicatesCount`.
- `src/views/MoteurView.vue` : `handleCardsSelected` ajoute un `dedup` défensif (filtre par `keyword.toLowerCase().trim()` unique).

#### Refactor

- Extraire `mergeDedup` dans un util si utilisé ailleurs (sinon, fonction locale OK).
- Vérifier que la prop `mode='workflow' | 'libre'` reste respectée (la nouvelle section apparaît dans les **deux** modes par défaut, à confirmer avec utilisateur si différent).

#### Critères d'acceptance

- [ ] Tests unit du DouleurIntentScanner (cas dédup) → verts.
- [ ] `MoteurView` re-dédup → vert.
- [ ] Manuel : `npm run dev`, suggérer, cocher, envoyer → arrive dans Capitaine sans doublon.

---

### Sprint S5 — E2E Playwright golden-path

**Objectif** : un test E2E qui couvre tout le parcours en mock.

#### Red → Green (test = la preuve)

`tests/browser/moteur-radar-long-tail.spec.ts` :
- Setup : `AI_PROVIDER=mock` (déjà défaut Playwright).
- Création article test → seed Radar avec 3+ cards via fixture DB.
- Navigation `/cocoon/:id/moteur` → onglet Radar.
- Vérifier section longue-traîne **invisible** tant qu'il n'y a pas de scan ou `radarCards < 2`.
- Lancer scan radar (déjà couvert par fixtures existantes) → section longue-traîne visible.
- Clic « Suggérer » → attendre suggestions affichées (≤10).
- Vérifier : top 5 pré-cochées (badge `aria-checked="true"`).
- Décocher 2 → cocher 1 autre → cocher 1 card racine → clic « Envoyer au Capitaine ({n}) ».
- Vérifier : navigue vers Capitaine → carousel reçoit le payload correct.
- Vérifier : aucune entrée dupliquée même si on simule un keyword commun via fixture.
- Vérifier : reload de page → suggestions toujours visibles (persistance JSONB), sélection restaurée.

#### Critères d'acceptance

- [ ] `npm run test:browser -- moteur-radar-long-tail` → vert.
- [ ] Aucun crédit IA réel consommé (assertion sur `process.env.AI_PROVIDER === 'mock'` en setup).
- [ ] Test stable (3 runs consécutifs sans flake).

---

### Sprint S6 — Self-review + validation full + maj doc

**Objectif** : zéro debt résiduelle, doc à jour, story livrée et archivable.

#### Self-review (CLAUDE.md §5.1 + §5.2)

Passer **toute** la grille §5.1 :
- [ ] Chaque besoin de la spec a un test qui le couvre.
- [ ] Aucun check workflow émis (cf. §3 anti-patterns) → confirmé : aucun `MOTEUR_*` ajouté.
- [ ] Aucun TODO / `console.log` / `any` non justifié.
- [ ] Structure par domaine respectée (`composables/intent/`, `components/intent/`, `services/keyword/`, `routes/keywords/`).
- [ ] `apiPost` partout, aucun `fetch` direct.
- [ ] Cache consulté avant l'IA.
- [ ] `loadPrompt` injecte toutes les variables, le `.md` reste agnostique.
- [ ] Doc à jour (`moteur-data-flow.md`, `prompts-reference.md`, `ai-usage-map.md`).

Passer **toute** la grille §5.2 :
- [ ] Tous les **producteurs** identifiés ont un test (combinator, IA, hydrate, regenerate).
- [ ] Affichage / calcul / tri cohérents : un même `preferenceScore` partout, `kpis: null` traité uniformément.
- [ ] Cas d'usage 1 à 8 (§1.4) tous tracés et testés.
- [ ] `null` / absences gérés sans fallback silencieux.
- [ ] Type partagé (`RadarCard.kpis | null` + `source`) propagé à tous les consommateurs (vue-tsc l'impose).

#### Validation full

```bash
npm run lint
npm run type-check
npm run test:unit
npm run test:browser
npm run check:dead
npm run check:cycles
npm run check:arch
npm run build
```
**Tout doit être vert.**

#### Maj documentation

- `docs/moteur-data-flow.md` : ajouter section « Radar — Suggestions longue-traîne (P0 mai 2026) » avec :
  - Mermaid du §2.
  - Table endpoints : `POST /articles/:id/radar-exploration/long-tail`, `PATCH .../selection`.
  - Note sur `RadarCard.kpis: RadarKeywordKpis | null`.
- `docs/prompts-reference.md` : ajouter ligne `radar-long-tail-suggest.md` avec la liste des variables.
- `docs/ai-usage-map.md` : nouvelle entrée IA `long-tail-suggest`, provider mock par défaut, cache key, TTL.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` : ajouter ligne `radar-long-tail-suggestions: done` avec `last_updated: 2026-05-03` (et bumper le `last_updated` du fichier).
- Bumper le front-matter de cette tech-spec : `version: 1.0.0`, `status: delivered`, `delivered: 2026-05-03`.
- Si stable → déplacer dans `_bmad-output/implementation-artifacts/_archive/` avec bandeau **ARCHIVED** (sera décidé à la fin du sprint).

#### Critères d'acceptance finaux (P0 done = ?)

- [ ] La 6 phases sont passées.
- [ ] La validation §6.1 + §6.2 + §6.3 + §6.4 est verte.
- [ ] Un test E2E Playwright vérifie le golden-path en mock.
- [ ] Tous les anti-patterns §3 sont vérifiables par grep.
- [ ] La doc reflète l'état livré.
- [ ] Démo manuelle : `npm run dev` → cocon test → article → onglet Radar → scan → suggérer longue-traîne → cocher 2 → envoyer → Capitaine reçoit, `extractRoots` opère sur les longues-traînes.

---

## 5. Risques identifiés & mitigations

| Risque | Probabilité | Mitigation |
|---|---|---|
| `RadarCard.kpis: null` casse plus de consommateurs que prévu | Moyenne | TypeScript / vue-tsc force la révélation. On adapte au coup-par-coup. Build cassé = on apprend. |
| Le mock ne reflète pas un vrai prompt → faux confort en CI | Basse | La fixture mock est validée par le **même schema Zod** que la sortie réelle. Si le schema change, le mock casse. |
| L'utilisateur attend la persistance instantanée du toggle, pas un debounce 500ms | Faible | UX testable en S5 ; si gênant, on baisse à 200ms ou on supprime le debounce. |
| Le combinateur produit des combinaisons absurdes que l'IA n'arrive pas à filtrer | Moyenne | Le prompt explicite : « rejette toute combinaison qui ne forme pas une requête naturelle ». Test S2 : si le mock simule des combinaisons absurdes, l'IA mock doit les filtrer dans la sortie. |
| Le bouton « Régénérer » écrase une sélection précieuse de l'utilisateur | Moyenne | UX : tooltip d'avertissement + on conserve les `selectedKeywords` qui matchent. |
| Migration 015 oubliée en prod | Basse | `IF NOT EXISTS` partout + check au démarrage du serveur (déjà en place). |

---

## 5.bis Ajustements pendant l'exécution

| Élément | Plan initial | Livré | Justification |
|---|---|---|---|
| Emplacement route Express | `server/routes/keywords/long-tail-suggest.routes.ts` | `server/routes/long-tail-suggest.routes.ts` | Pas de sous-dossier `routes/keywords/` dans la codebase. Route placée au même niveau que `radar-exploration.routes.ts` (cohérent avec le pattern existant). |
| Test E2E Playwright | Golden-path complet (scan → suggérer → cocher → envoyer → Capitaine + extractRoots) | Test structurel (chargement sans pageerror, section cachée hors conditions, isolation onglet Discovery) | Limitation documentée : `tests/browser-e2e/helpers/test-fixtures.ts` ne permet pas la sélection d'article via `MoteurContextRecap` (cf. `moteur-capitaine-radar-list.browser.test.ts:51-55`). Couverture du flux assurée par les 65 tests unit/contract/integration verts. |

## 6. Hors scope (à proposer en P1+)

- **Persistance source dans Capitaine** : la colonne `source` est ajoutée mais l'UI Capitaine ne l'affiche pas encore. Future story : badge « issu d'une longue-traîne IA » dans le carousel.
- **Re-déclenchement automatique** au reload de page : pour P0, l'utilisateur clique « Suggérer » à chaque session si aucune persistance. Une fois persisté en DB, il voit la liste directement (cas d'usage 2 §1.4).
- **Édition manuelle** d'une suggestion (modifier le keyword avant envoi) : non demandé, pas dans P0.
- **Export CSV / partage** : non demandé.
- **Multi-langue** : prompt FR uniquement pour P0, conformément au reste du projet (§3 règle 11).
