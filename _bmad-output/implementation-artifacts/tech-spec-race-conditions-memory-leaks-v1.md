---
title: 'Race Conditions & Fuites Mémoire — Flags séparés, AbortController, Cleanup lifecycle'
slug: 'race-conditions-memory-leaks-v1'
created: '2026-04-09'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Vue 3.4', 'TypeScript 5', 'Pinia 2', 'Vitest']
files_to_modify:
  - 'src/stores/strategy.store.ts'
  - 'src/stores/keyword-discovery.store.ts'
  - 'src/stores/gsc.store.ts'
  - 'src/stores/brief.store.ts'
  - 'src/stores/article-progress.store.ts'
  - 'src/composables/useKeywordDiscoveryTab.ts'
  - 'src/composables/useResonanceScore.ts'
  - 'src/composables/useNlpAnalysis.ts'
files_to_create:
  - 'tests/unit/stores/race-conditions.test.ts'
  - 'tests/unit/composables/memory-leaks.test.ts'
code_patterns:
  - 'Stores Pinia en composition API (defineStore + setup function)'
  - 'Composables module-level singleton (refs hors du return)'
  - 'Async operations sans AbortController'
  - 'setInterval sans onUnmounted cleanup'
test_patterns:
  - 'Vitest (describe/it/expect/beforeEach)'
  - 'setActivePinia(createPinia()) dans beforeEach'
  - 'vi.useFakeTimers() pour tester les intervals'
  - 'vi.fn() pour mocker les API calls'
---

# Tech-Spec: Race Conditions & Fuites Mémoire

**Created:** 2026-04-09

## Overview

### Problem Statement

L'application présente **4 race conditions** et **4 fuites mémoire** identifiées lors de l'audit :

**Race conditions :**
1. `strategy.store` — `isSuggesting` partagé entre 3 opérations async (suggest, consolidate, enrich). Si l'une termine, le flag se reset pour toutes.
2. `keyword-discovery.store` — `loading`, `error`, `results` partagés entre `discoverFromSeed()` et `discoverFromDomain()`. Les résultats peuvent s'écraser mutuellement.
3. `gsc.store` — `isLoading` partagé entre `fetchPerformance()` et `fetchKeywordGap()`.
4. `brief.store` — Navigation rapide entre articles : les réponses API de l'ancien article écrasent les données du nouveau.

**Fuites mémoire :**
5. `article-progress.store` — `progressMap` et `semanticMap` grandissent indéfiniment sans nettoyage.
6. `useKeywordDiscoveryTab` — `relevanceScores` Map module-level qui s'accumule sans bornes.
7. `useResonanceScore` — `_progressTimer` (setInterval 500ms) jamais nettoyé sur unmount.
8. `useNlpAnalysis` — `results` Map et `classifier` module-level sans lifecycle cleanup.

### Solution

- **Race conditions** : séparer les flags de loading par opération + ajouter des `AbortController` pour annuler les requêtes obsolètes
- **Fuites mémoire** : ajouter `onBeforeUnmount()` pour cleanup des timers et state, borner les Maps avec TTL ou taille max

### Scope

**In Scope:**
- Séparer les flags `isSuggesting` et `isLoading` en flags par opération
- Ajouter `AbortController` dans `brief.store.fetchBrief()` et `keyword-discovery.store`
- Ajouter `cleanup()` / `$reset()` dans `article-progress.store`
- Ajouter `onBeforeUnmount()` dans les composables pour cleanup timers et Maps
- Tests unitaires pour les race conditions et les cleanups

**Out of Scope:**
- Refactoring des god components (spec 3)
- Sanitization HTML (spec 1)
- Optimistic updates (spec 4)

## Context for Development

### Codebase Patterns

- Tous les stores utilisent `defineStore('name', () => { ... })` (composition API)
- Les composables utilisent souvent des refs module-level (singleton pattern) pour persister l'état entre les navigations
- Aucun store n'utilise `AbortController` actuellement
- Les timers (`setInterval`, `setTimeout`) sont gérés manuellement sans hooks lifecycle automatiques

### Files to Reference

| File | Lignes clés | Issue | Sévérité |
| ---- | ----------- | ----- | -------- |
| `src/stores/strategy.store.ts` | L10 (`isSuggesting`), L52/82/96 (set true), L63/91/105 (set false) | 3 ops partagent 1 flag | High |
| `src/stores/keyword-discovery.store.ts` | L7-14 (state partagé), L54-84 (seed), L86-116 (domain) | 2 discoveries s'écrasent | Critical |
| `src/stores/gsc.store.ts` | L9 (`isLoading`), L27-40 (perf), L42-55 (gap) | 2 ops partagent 1 flag | High |
| `src/stores/brief.store.ts` | L18 (`briefData`), L28-69 (`fetchBrief`) | Navigation rapide = state pollué | Critical |
| `src/stores/article-progress.store.ts` | L8-9 (`progressMap`, `semanticMap`) | Maps non bornées | Medium |
| `src/composables/useKeywordDiscoveryTab.ts` | L59 (`relevanceScores`), L374-378 (merge) | Map singleton non bornée | High |
| `src/composables/useResonanceScore.ts` | L150 (`_progressTimer`), L241 (setInterval) | Timer orphelin | Medium-High |
| `src/composables/useNlpAnalysis.ts` | L21-28 (module-level state), L25 (`results`) | Map + model non nettoyés | Medium |

### Technical Decisions

1. **AbortController plutôt que request ID** : AbortController est natif et annule vraiment la requête réseau (économise de la bande passante). Un request ID ne fait que filtrer la réponse côté client.
2. **Flags séparés par opération** : `isSuggesting` → `isSuggesting`, `isConsolidating`, `isEnriching`. Plus verbeux mais zéro ambiguïté.
3. **LRU simple pour les Maps** : on garde les 50 dernières entrées max dans `progressMap`/`semanticMap`. Pas de bibliothèque LRU, juste un `if (map.size > MAX) deleteOldest()`.
4. **onBeforeUnmount auto-cleanup** : les composables qui créent des timers ou des Maps doivent systématiquement appeler cleanup dans `onBeforeUnmount`.

## Implementation Plan

### Tasks

#### Bloc A — Race Conditions dans les Stores (Priorité 1)

- [x] **Task 1 : Séparer les flags dans strategy.store.ts**
  - File : `src/stores/strategy.store.ts`
  - Action :
    - Remplacer `const isSuggesting = ref(false)` par 3 flags :
      - `const isSuggesting = ref(false)` (pour `requestSuggestion` uniquement)
      - `const isConsolidating = ref(false)` (pour `requestConsolidate`)
      - `const isEnriching = ref(false)` (pour `requestEnrich`)
    - Ajouter aussi `const isDeepening = ref(false)` si `requestDeepen` partage le même flag
    - Mettre à jour chaque fonction pour utiliser son propre flag
    - Ajouter un computed `isProcessing = computed(() => isSuggesting.value || isConsolidating.value || isEnriching.value || isDeepening.value)` pour l'UI qui a besoin d'un flag global
    - Exporter tous les flags + `isProcessing`
  - Notes : L'UI devra peut-être mettre à jour ses bindings. Vérifier les composants qui utilisent `isSuggesting` (StrategyStep.vue, BrainPhase.vue)

- [x] **Task 2 : Séparer les flags dans gsc.store.ts**
  - File : `src/stores/gsc.store.ts`
  - Action :
    - Remplacer `const isLoading = ref(false)` par :
      - `const isLoadingPerformance = ref(false)`
      - `const isLoadingKeywordGap = ref(false)`
    - Ajouter un computed `isLoading = computed(() => isLoadingPerformance.value || isLoadingKeywordGap.value)` pour rétro-compatibilité
    - Chaque fonction utilise son propre flag

- [x] **Task 3 : Ajouter AbortController dans keyword-discovery.store.ts**
  - File : `src/stores/keyword-discovery.store.ts`
  - Action :
    - Ajouter un `let currentController: AbortController | null = null` au niveau du store
    - Dans `discoverFromSeed()` et `discoverFromDomain()` :
      1. Au début : `currentController?.abort()` (annuler la requête précédente)
      2. `currentController = new AbortController()`
      3. Passer `{ signal: currentController.signal }` au `fetch()`
      4. Dans le catch : ignorer `AbortError` (`if (err.name === 'AbortError') return`)
    - Ajouter des flags séparés : `isLoadingSeed` et `isLoadingDomain`
    - Computed `loading = computed(() => isLoadingSeed.value || isLoadingDomain.value)` pour rétro-compatibilité

- [x] **Task 4 : Ajouter AbortController dans brief.store.ts**
  - File : `src/stores/brief.store.ts`
  - Action :
    - Ajouter un `let fetchController: AbortController | null = null` au niveau du store
    - Dans `fetchBrief(slug)` :
      1. Au début : `fetchController?.abort()` (annuler le fetch précédent si changement d'article)
      2. `fetchController = new AbortController()`
      3. Passer `{ signal: fetchController.signal }` à chaque requête
      4. Ajouter un check `if (slug !== currentSlug.value) return` avant de mettre à jour `briefData` pour éviter les mises à jour stale
    - Ajouter un `currentSlug = ref<string | null>(null)` pour tracker l'article actif

- [x] **Task 5 : Propager le signal AbortController dans api.service.ts**
  - File : `src/services/api.service.ts`
  - Action :
    - Modifier la signature de `apiGet`, `apiPost`, etc. pour accepter un `options?: { signal?: AbortSignal }` en dernier paramètre
    - Passer le `signal` au `fetch()` interne
    - Dans le error handler : ne pas logger les `AbortError`
  - Notes : Changement rétro-compatible (paramètre optionnel)

#### Bloc B — Fuites Mémoire dans les Stores (Priorité 2)

- [x] **Task 6 : Ajouter cleanup et LRU à article-progress.store.ts**
  - File : `src/stores/article-progress.store.ts`
  - Action :
    - Ajouter une constante `const MAX_CACHED_SLUGS = 50`
    - Créer une fonction `_evictOldest(map: Record<string, unknown>)` qui :
      1. Si `Object.keys(map).length > MAX_CACHED_SLUGS`
      2. Supprime les entrées les plus anciennes (premières clés insérées)
    - Appeler `_evictOldest()` après chaque `progressMap.value[slug] = ...` et `semanticMap.value[slug] = ...`
    - Ajouter une action `clearAll()` qui reset les deux maps à `{}`
    - Exporter `clearAll()`

#### Bloc C — Fuites Mémoire dans les Composables (Priorité 3)

- [x] **Task 7 : Ajouter onBeforeUnmount dans useResonanceScore.ts**
  - File : `src/composables/useResonanceScore.ts`
  - Action :
    - Importer `onBeforeUnmount` de Vue
    - Ajouter dans le corps du composable (après la déclaration des fonctions) :
      ```typescript
      onBeforeUnmount(() => {
        _stopProgress()  // clearInterval(_progressTimer)
      })
      ```
    - Vérifier que `_stopProgress()` est bien appelé (ligne ~259)

- [x] **Task 8 : Ajouter cleanup dans useKeywordDiscoveryTab.ts**
  - File : `src/composables/useKeywordDiscoveryTab.ts`
  - Action :
    - Les refs module-level doivent rester (c'est voulu pour persister entre navigations)
    - MAIS : ajouter une borne sur `relevanceScores` :
      1. Après chaque `mergeScores()` (lignes 374-378), vérifier `if (relevanceScores.value.size > 500) relevanceScores.value.clear()`
      2. Ou mieux : garder seulement les 500 derniers scores en supprimant les plus anciens
    - Ajouter une action `resetDiscoveryState()` exportée qui remet tout à zéro (pour usage quand on change de cocoon)
    - Nettoyer les éventuels `setTimeout` restants dans `onBeforeUnmount`

- [x] **Task 9 : Ajouter cleanup dans useNlpAnalysis.ts**
  - File : `src/composables/useNlpAnalysis.ts`
  - Action :
    - Ajouter `onBeforeUnmount(() => { deactivate() })` dans le composable
    - La fonction `deactivate()` (ligne ~103) fait déjà `results.value = new Map()` — vérifier qu'elle libère aussi le `classifier` si possible
    - Borner `results` Map à 200 entrées max

#### Bloc D — Tests

- [x] **Task 10 : Tests race conditions**
  - File : `tests/unit/stores/race-conditions.test.ts`
  - Action :
    - **strategy.store** :
      - `it('isSuggesting reste true pendant requestConsolidate si requestSuggestion est en cours')` — lancer les 2 en parallèle, vérifier que `isProcessing` reste true jusqu'à ce que les 2 terminent
      - `it('chaque flag est indépendant')` — `requestSuggestion` met `isSuggesting=true` mais pas `isConsolidating`
    - **keyword-discovery.store** :
      - `it('annule la requête précédente si nouvelle discovery lancée')` — lancer seed puis domain, vérifier que la seed est AbortError
      - `it('les résultats ne se contaminent pas entre seed et domain')` — vérifier que `seed` et `domain` sont cohérents avec `results`
    - **brief.store** :
      - `it('annule le fetchBrief précédent si slug change')` — fetch slug A, puis slug B, vérifier que briefData contient B
      - `it('ne met pas à jour briefData si le slug a changé pendant le fetch')` — simuler un fetch lent pour A qui termine après le fetch rapide de B
    - **gsc.store** :
      - `it('isLoadingPerformance et isLoadingKeywordGap sont indépendants')`

- [x] **Task 11 : Tests memory cleanup**
  - File : `tests/unit/composables/memory-leaks.test.ts`
  - Action :
    - **article-progress.store** :
      - `it('évince les anciennes entrées quand MAX_CACHED_SLUGS est dépassé')` — ajouter 60 slugs, vérifier qu'il en reste 50
      - `it('clearAll() vide les deux maps')`
    - **useResonanceScore** :
      - `it('clearInterval est appelé sur onBeforeUnmount')` — monter un composant, démarrer un timer, unmount, vérifier clearInterval appelé
    - **useKeywordDiscoveryTab** :
      - `it('relevanceScores est borné à 500 entrées max')` — ajouter 600 scores, vérifier taille ≤ 500
    - **useNlpAnalysis** :
      - `it('deactivate() est appelé sur unmount')` — vérifier que results est vidé

## Additional Context

### Dependencies

Aucune nouvelle dépendance. `AbortController` est natif dans tous les navigateurs modernes.

### Testing Strategy

**Tests unitaires (Vitest) :**
- 2 fichiers de test à créer (~20 cas de test)
- Utiliser `vi.useFakeTimers()` pour les tests de timer (useResonanceScore)
- Utiliser `vi.fn()` pour mocker `fetch` et simuler des requêtes lentes
- Pour les tests AbortController : mocker `fetch` pour vérifier que `signal.aborted` est true sur la requête annulée

**Tests manuels :**
1. Naviguer rapidement entre 3 articles dans ArticleWorkflowView → vérifier que le brief affiché correspond au dernier article sélectionné
2. Lancer une Discovery par seed puis immédiatement par domain → vérifier que les résultats affichés sont ceux du domain
3. Dans la stratégie, cliquer "Suggestion" puis "Approfondir" rapidement → vérifier que les 2 opérations s'affichent correctement

### Notes

**Risques identifiés :**
1. **Rétro-compatibilité des flags** — Les composants qui bindent directement `isSuggesting` devront être mis à jour pour utiliser `isProcessing` s'ils veulent le comportement global, ou le flag spécifique. Rechercher `isSuggesting` dans les templates Vue.
2. **AbortController et useStreaming** — Le composable `useStreaming` a son propre `abort()`. S'assurer que l'AbortController du store et celui du streaming ne se marchent pas dessus. Le signal du store devrait être passé AU streaming.
3. **Module-level refs intentionnels** — Certains composables utilisent des refs module-level pour persister l'état entre navigations (ex: `useKeywordDiscoveryTab`). On ne doit PAS les reset sur unmount, seulement borner leur taille. Le reset ne doit se faire que quand on change de cocoon/contexte.

**Impact sur les composants consommateurs :**
- `BrainPhase.vue` et `EnginePhase.vue` : utilisent `(store.strategy as any)` et `store.isSuggesting` → mettre à jour pour utiliser `store.isProcessing`
- `PostPublicationView.vue` : utilise `gscStore.isLoading` → compatible grâce au computed rétro-compatible
- `MoteurView.vue` : utilise `keywordDiscoveryStore.loading` → compatible grâce au computed rétro-compatible

## Review Notes
- Adversarial review completed
- Findings: 13 total, 8 fixed, 5 acknowledged (low severity / acceptable trade-offs)
- Resolution approach: auto-fix
- **Fixes applied during review:**
  - F1 (Critical): `cocoon-strategy.store.ts` — added `isConsolidating`, `isEnriching`, `isProcessing` (same pattern as `strategy.store.ts`); fixed `BrainPhase.vue` reference
  - F2 (High): `gsc.store.ts` — `reset()` now clears `isLoadingPerformance` and `isLoadingKeywordGap`
  - F3 (High): `brief.store.ts` — `finally` block now only resets `isLoading` if `slug === currentSlug.value` (prevents abort/finally race)
  - F4 (Medium): `keyword-discovery.store.ts` — captured controller reference; `finally` block checks `currentController === myController`
  - F6 (Medium): `useNlpAnalysis.ts` — `onBeforeUnmount` now only cancels in-progress download instead of calling `deactivate()` (preserves singleton)
  - F8 (Medium): `api.service.ts` — `handleApiError` re-throws `AbortError` from `res.json()` instead of swallowing it
  - F5 (Medium): Renamed "LRU" to "FIFO" in tests — acknowledged that FIFO eviction is acceptable for this use case
  - Tests updated to match new behavior (2409 tests passing)
