# Story 4.2: Rechargement automatique des résultats par article

Status: done

## Story

As a consultant SEO,
I want que tous les résultats se rechargent automatiquement quand je reviens sur un article,
so that je reprends exactement là où je m'étais arrêté sans manipulation.

## Acceptance Criteria

1. **Given** un article a des résultats sauvegardés (Discovery, Audit, Validation, Local, Intent) **When** l'utilisateur sélectionne cet article dans le Moteur **Then** tous les stores frontend se peuplent automatiquement avec les données cachées **And** les composants affichent les résultats sans re-appels API.

2. **Given** un article n'a aucun résultat sauvegardé **When** l'utilisateur le sélectionne **Then** les stores sont dans leur état initial (vides) **And** l'utilisateur peut lancer les analyses normalement.

3. **Given** l'utilisateur change d'article dans le Moteur **When** un nouvel article est sélectionné **Then** les résultats de l'ancien article sont remplacés par ceux du nouvel article (ou vidés si aucun cache) **And** les dots de progression reflètent l'état du nouvel article.

## Tasks / Subtasks

- [x] Task 1 : Créer un endpoint backend GET /api/articles/:slug/cached-results (AC: #1, #2)
  - [x]1.1 : Créer `server/routes/article-results.routes.ts` avec GET `/articles/:slug/cached-results`
  - [x]1.2 : Implémenter le service qui, à partir du keyword principal de l'article, collecte tous les résultats cachés : intent (readCached intent-*), local (readCached maps-*), content-gap (readCached content-gap-*), autocomplete (readCached autocomplete/*)
  - [x]1.3 : Retourner un objet `{ intent, local, contentGap, autocomplete, comparison }` — chaque champ null si pas de cache
  - [x]1.4 : Enregistrer la route dans `server/index.ts`
- [x]Task 2 : Ajouter un composable `useArticleResults` côté frontend (AC: #1, #2)
  - [x]2.1 : Créer `src/composables/useArticleResults.ts` avec `loadCachedResults(slug: string)` et `clearResults()`
  - [x]2.2 : `loadCachedResults()` appelle `GET /api/articles/:slug/cached-results` et peuple les stores (intent, local, contentGap)
  - [x]2.3 : `clearResults()` appelle `intentStore.reset()`, `localStore.reset()`, et vide les résultats transients
  - [x]2.4 : Gérer le cas "aucun cache" — les stores restent vides (état initial)
- [x]Task 3 : Intégrer dans handleSelectArticle de MoteurView (AC: #1, #2, #3)
  - [x]3.1 : Importer `useArticleResults` dans `MoteurView.vue`
  - [x]3.2 : Dans `handleSelectArticle(article)` — appeler `clearResults()` d'abord, puis `loadCachedResults(article.slug)` si article non null
  - [x]3.3 : Vérifier que les dots de progression se mettent à jour via `article-progress.store` (déjà slug-keyed — devrait marcher sans changement)
  - [x]3.4 : Vérifier que le changement d'article vide correctement les anciens résultats avant de charger les nouveaux
- [x]Task 4 : Tests unitaires (AC: #1-3)
  - [x]4.1 : Test du composable `useArticleResults` — cache hit peuple les stores, cache miss laisse les stores vides
  - [x]4.2 : Test de la route `GET /api/articles/:slug/cached-results` — retourne les résultats cachés, retourne null pour les champs sans cache
  - [x]4.3 : Test d'intégration MoteurView — handleSelectArticle déclenche loadCachedResults

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**INCHANGÉ :**
- `server/utils/cache.ts` — le pattern getOrFetch/readCached/writeCached reste tel quel (Story 4.1)
- `server/services/intent.service.ts` — pas de modification (cache déjà en place)
- `server/services/local-seo.service.ts` — pas de modification (cache déjà en place)
- `server/services/content-gap.service.ts` — pas de modification (cache déjà en place)
- `server/services/autocomplete.service.ts` — pas de modification (cache déjà en place)
- `src/stores/article-progress.store.ts` — déjà slug-keyed, pas de changement nécessaire
- `src/stores/keyword-audit.store.ts` — déjà cocoon-scoped, pas de changement nécessaire
- Frontend — aucun changement de layout/design

**CRÉÉ :**
- `server/routes/article-results.routes.ts` — endpoint de collecte des résultats cachés
- `src/composables/useArticleResults.ts` — orchestrateur de chargement/reset des stores

**MODIFIÉ :**
- `server/index.ts` — enregistrement de la nouvelle route
- `src/views/MoteurView.vue` — intégration de `useArticleResults` dans `handleSelectArticle()`

### Mécanisme de fonctionnement

Le backend cache déjà tous les résultats par keyword via `getOrFetch` (Story 4.1). Cette story ajoute un **endpoint de collecte** qui lit les caches existants sans re-appel API :

```
Flux article sélectionné :
1. User clique article dans MoteurContextRecap
2. handleSelectArticle(article) appelé
3. clearResults() — reset intentStore, localStore, résultats transients
4. loadCachedResults(article.slug)
   → GET /api/articles/:slug/cached-results
   → Backend: data.service.getArticleBySlug(slug) → récupère le keyword principal
   → readCached('intent-${keyword}') → intent data ou null
   → readCached('maps-${keyword}') → local data ou null
   → readCached('content-gap-${keyword}') → content-gap data ou null
   → readCached('autocomplete/${keyword}') → autocomplete data ou null
   → readCached('local-national-${keyword}') → comparison data ou null
5. Composable peuple les stores avec les données reçues
6. Composants s'actualisent réactivement via Pinia
```

### Infrastructure existante utilisée

#### Cache (Story 4.1 — déjà implémenté)

```typescript
// server/utils/cache.ts — readCached pour lecture cache sans fetch
import { readCached } from '../utils/cache.js'

// Lire le cache intent sans appel API
const intentCache = await readCached<IntentAnalysis>(CACHE_DIR, `intent-${slugify(keyword)}`)
// intentCache?.data contient les résultats, null si pas de cache
```

Fichiers cache existants par keyword :
- `data/cache/intent-{slug}.json` — IntentAnalysis
- `data/cache/maps-{slug}.json` — MapsAnalysis
- `data/cache/content-gap-{slug}.json` — ContentGapResult
- `data/cache/autocomplete/{slug}.json` — AutocompleteSignal
- `data/cache/local-national-{slug}.json` — LocalNationalComparison

#### Stores frontend — Méthodes de reset et peuplement

```typescript
// intentStore (src/stores/intent.store.ts)
intentStore.reset()                    // vide tout
intentStore.intentData = cachedResult  // peuple directement

// localStore (src/stores/local.store.ts)
localStore.reset()                     // vide tout
localStore.mapsData = cachedResult     // peuple directement

// keyword-discovery — pas de cache backend, reset seulement
discoveryStore.clearResults()
```

#### data.service.ts — Résolution slug → keyword

```typescript
// server/services/data.service.ts
import { getArticles } from './data.service.js'
// Trouver l'article par slug et récupérer son keyword principal
const articles = await getArticles()
const article = articles.find(a => a.slug === slug)
const keyword = article?.motCle // ou article?.keyword selon le schema
```

#### MoteurView.vue — handleSelectArticle actuel

```typescript
// src/views/MoteurView.vue (lines 219-246)
function handleSelectArticle(article: SelectedArticle | null) {
  selectedArticle.value = article
  if (article) {
    articleKeywordsStore.fetchKeywords(article.slug)
  } else {
    articleKeywordsStore.$reset()
  }
  // ... validation state redirect logic
}
```

À modifier pour ajouter `clearResults()` + `loadCachedResults()`.

### Enforcement Guidelines

- Utiliser `readCached` de `server/utils/cache.ts` pour lire les caches — JAMAIS `readJson` directement
- Utiliser la fonction `slugify` de `server/utils/cache.ts` pour normaliser les clés cache
- Les stores frontend doivent être peuplés DIRECTEMENT (pas via un re-fetch API qui pourrait appeler des endpoints externes)
- Le endpoint `GET /articles/:slug/cached-results` ne doit JAMAIS appeler d'API externe — lecture cache uniquement
- Logger via `log.debug/info` (module logger) — jamais `console.log`
- Format API uniforme : `res.json({ data: ... })` pour les succès
- Si un cache n'existe pas, retourner `null` pour ce champ (pas d'erreur)
- Le keyword-audit store (cocoon-scoped) n'a PAS besoin de reset au changement d'article — il est déjà partagé par cocoon

### Risques identifiés

1. **Résolution slug → keyword** : L'article doit avoir un champ "keyword principal" accessible depuis data.service. Vérifier le schema article (shared/schemas/article.schema.ts) pour le nom exact du champ.
2. **Stores avec état interne non-réactif** : Certains stores (intent) ont des Maps internes (`localComparisons`). Le peuplement direct doit les prendre en compte ou les ignorer (elles se rempliront naturellement).
3. **Race condition sur changement rapide d'article** : Si l'utilisateur change d'article rapidement, le loadCachedResults du premier article peut arriver après le clear du second. Solution : vérifier que le slug correspond toujours à l'article sélectionné au moment de la réponse.
4. **Discovery store** : Les résultats de keyword-discovery ne sont PAS cachés par keyword côté backend (pas de pattern 1:1 keyword→cache). Le discovery store sera simplement vidé au changement d'article, pas reloadé.

### Project Structure Notes

- Nouveau fichier route : `server/routes/article-results.routes.ts`
- Nouveau composable : `src/composables/useArticleResults.ts`
- Pas de nouveau store Pinia
- Pas de nouveau type dans shared/types/ (les types existants suffisent)
- Tests dans `tests/unit/composables/useArticleResults.test.ts` et `tests/unit/routes/article-results.routes.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Dual-mode composants]
- [Source: _bmad-output/planning-artifacts/architecture.md#State management Pinia]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cache systématique FR26-FR28]
- [Source: server/utils/cache.ts — readCached, slugify]
- [Source: src/views/MoteurView.vue — handleSelectArticle, onMounted reset pattern]
- [Source: src/stores/intent.store.ts — reset(), intentData, comparisonData]
- [Source: src/stores/local.store.ts — reset(), mapsData]
- [Source: src/stores/keyword-discovery.store.ts — clearResults()]
- [Source: src/stores/article-progress.store.ts — per-slug progressMap]
- [Source: _bmad-output/implementation-artifacts/4-1-pattern-cache-getorfetch-uniforme-pour-tous-les-services.md — Story 4.1 done]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- N/A — no unexpected issues during implementation

### Completion Notes List

- Backend endpoint reads 5 cache files in parallel via `readCached()` — never calls external APIs
- Keyword resolution via `getArticleKeywords(slug).capitaine` from data.service
- Race condition guard in composable: checks `currentSlug` hasn't changed during async fetch
- Discovery store only cleared (not reloaded) — no per-keyword backend cache for discovery
- All 12 new tests pass; 88/91 total (3 pre-existing failures unrelated to this story)
- vue-tsc clean, vite build successful

### File List

- `server/routes/article-results.routes.ts` — CREATED — backend endpoint GET /articles/:slug/cached-results
- `server/index.ts` — MODIFIED — registered article-results route
- `src/composables/useArticleResults.ts` — CREATED — clearResults() + loadCachedResults() composable
- `src/views/MoteurView.vue` — MODIFIED — integrated useArticleResults into handleSelectArticle
- `tests/unit/routes/article-results.routes.test.ts` — CREATED — 6 route tests
- `tests/unit/composables/useArticleResults.test.ts` — CREATED — 6 composable tests
