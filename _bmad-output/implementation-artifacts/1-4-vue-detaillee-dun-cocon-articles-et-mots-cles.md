# Story 1.4: Vue Détaillée d'un Cocon — Articles et Mots-clés

Status: done

## Story

As a Arnau (utilisateur),
I want voir la liste des articles d'un cocon avec leur statut et mots-clés associés, et pouvoir sélectionner un article,
so that je puisse choisir quel article rédiger et voir son contexte SEO.

## Acceptance Criteria

1. **AC1 — Route Cocon** : La route `/cocoon/:cocoonId` affiche le composant `CocoonView.vue` qui remplace le placeholder actuel par la vue détaillée du cocon.

2. **AC2 — Liste des articles** : Les articles du cocon s'affichent avec le composant `ArticleList`, montrant pour chacun : titre, type (Pilier / Intermédiaire / Spécialisé) via badge coloré, et statut (à rédiger / brouillon / publié) via `StatusBadge` — FR2.

3. **AC3 — Mots-clés associés** : Chaque article affiche ses mots-clés associés (Pilier, Moyenne traine, Longue traine) grâce au composant `KeywordBadge` — FR3.

4. **AC4 — Stores articles et keywords** : Un store `articles` charge les articles depuis `GET /api/cocoons/:id/articles` et un store `keywords` charge les mots-clés depuis `GET /api/keywords/:cocoon` (en utilisant le nom du cocon). Les deux gèrent les états `isLoading` et `error`.

5. **AC5 — Navigation vers article** : Chaque carte article est cliquable et navigue vers `/article/:slug` (route préparée mais pas encore implémentée — Epic 2) — FR5.

6. **AC6 — Navigation retour** : Un bouton/lien "Retour au dashboard" permet de revenir à la route `/` — navigation < 500ms — NFR5.

7. **AC7 — Nom du cocon** : Le nom du cocon est affiché en titre de la page, récupéré depuis le store `cocoons` (déjà chargé au dashboard).

8. **AC8 — Performance** : La navigation dashboard → vue cocon complète en moins de 500ms — NFR5.

## Tasks / Subtasks

- [x] **Task 1 : Créer le store Pinia `articles`** (AC: #4)
  - [x] Créer `src/stores/articles.store.ts` en mode setup (Composition API)
  - [x] State : `articles: ref<Article[]>([])`, `isLoading: ref(false)`, `error: ref<string | null>(null)`, `cocoonId: ref<number | null>(null)`
  - [x] Action `fetchArticlesByCocoon(cocoonId: number)` : appelle `apiGet<Article[]>(`/cocoons/${cocoonId}/articles`)`, gère loading/error states
  - [x] Le store importe le type `Article` depuis `@shared/types/index.js`

- [x] **Task 2 : Créer le store Pinia `keywords`** (AC: #4)
  - [x] Créer `src/stores/keywords.store.ts` en mode setup (Composition API)
  - [x] State : `keywords: ref<Keyword[]>([])`, `isLoading: ref(false)`, `error: ref<string | null>(null)`
  - [x] Action `fetchKeywordsByCocoon(cocoonName: string)` : appelle `apiGet<Keyword[]>(`/keywords/${encodeURIComponent(cocoonName)}`)`, gère loading/error states
  - [x] Getter `keywordsByArticle: computed(() => ...)` — retourne un `Map<string, Keyword[]>` regroupant les mots-clés par titre d'article (correspondance via le slug ou les cocons)
  - [x] Le store importe le type `Keyword` depuis `@shared/types/index.js`

- [x] **Task 3 : Créer le composant `KeywordBadge.vue`** (AC: #3)
  - [x] Créer `src/components/shared/KeywordBadge.vue` — badge pour afficher un mot-clé avec sa catégorie
  - [x] Props : `keyword: Keyword` (objet complet avec type)
  - [x] Affiche le texte du mot-clé avec un style coloré selon le type : Pilier → bleu primaire, Moyenne traine → secondaire, Longue traine → gris
  - [x] Style inline compact (pill badge) réutilisable

- [x] **Task 4 : Créer le composant `ArticleCard.vue`** (AC: #2, #3, #5)
  - [x] Créer `src/components/dashboard/ArticleCard.vue` — carte article affichant :
    - Titre de l'article
    - Type d'article via un badge coloré (pas StatusBadge — un simple span avec classes type-pilier / type-inter / type-spec)
    - Statut via `StatusBadge`
    - Mots-clés associés via `KeywordBadge` (passés en props)
  - [x] Props : `article: Article`, `keywords: Keyword[]`
  - [x] La carte entière est cliquable — `RouterLink` vers `/article/${article.slug}`
  - [x] Note : la route `/article/:slug` n'existe pas encore, elle sera ajoutée dans l'Epic 2. Préparer le lien mais ne pas créer la route.

- [x] **Task 5 : Créer le composant `ArticleList.vue`** (AC: #2)
  - [x] Créer `src/components/dashboard/ArticleList.vue` — liste des articles d'un cocon
  - [x] Props : `articles: Article[]`, `keywordsByArticle: Map<string, Keyword[]>`
  - [x] Affiche les `ArticleCard` dans une grille ou liste verticale
  - [x] Message "Aucun article dans ce cocon" si la liste est vide

- [x] **Task 6 : Implémenter `CocoonView.vue`** (AC: #1, #6, #7)
  - [x] Remplacer le placeholder `src/views/CocoonView.vue` par la vue complète :
    - `<script setup>` : utilise `useRoute()`, `useCocoonsStore()`, `useArticlesStore()`, `useKeywordsStore()`
    - Récupère `cocoonId` depuis `route.params.cocoonId` (convertir en number)
    - Récupère le nom du cocon depuis `cocoonsStore.cocoons` pour l'affichage en titre ET pour le fetch des keywords
    - Au `onMounted` : fetch articles + keywords en parallèle
    - Affiche `LoadingSpinner` si articles ou keywords en loading
    - Affiche `ErrorMessage` si erreur (avec retry)
    - Affiche le nom du cocon en titre, puis `ArticleList` avec les données
    - Lien "← Retour au dashboard" (`RouterLink` vers `/`)
  - [x] Si le cocon n'est pas trouvé dans le store (accès direct par URL), faire un `fetchCocoons()` d'abord

- [x] **Task 7 : Ajouter la route placeholder `/article/:slug`** (AC: #5)
  - [x] Mettre à jour `src/router/index.ts` :
    - Ajouter `{ path: '/article/:slug', name: 'article', component: () => import('../views/ArticleWorkflowView.vue') }` (lazy-loaded)
  - [x] Créer un placeholder `src/views/ArticleWorkflowView.vue` minimal ("Article Workflow — Coming in Epic 2")

- [x] **Task 8 : Tests unitaires** (AC: tous)
  - [x] Tester le store `articles` : `tests/unit/stores/articles.store.test.ts`
    - Test `fetchArticlesByCocoon` charge les données et met à jour le state
    - Test `isLoading` est true pendant le fetch
    - Test `error` est set en cas d'échec API
    - Test appelle `apiGet` avec le bon URL (`/cocoons/${id}/articles`)
  - [x] Tester le store `keywords` : `tests/unit/stores/keywords.store.test.ts`
    - Test `fetchKeywordsByCocoon` charge les données et met à jour le state
    - Test appelle `apiGet` avec le bon URL et encode le nom du cocon
    - Test `error` handling
  - [x] Tester les composants : `tests/unit/components/cocoon-detail.test.ts`
    - Test `ArticleCard` affiche le titre, le type, et le statut
    - Test `ArticleCard` affiche les mots-clés quand fournis
    - Test `KeywordBadge` affiche le mot-clé avec le bon style selon le type

- [x] **Task 9 : Vérification intégration** (AC: tous)
  - [x] Tous les tests passent (`npx vitest run`)
  - [x] Type-check clean (`npx vue-tsc --build`)
  - [x] La route `/cocoon/:cocoonId` affiche la vue détaillée
  - [x] Les articles s'affichent avec titre, type, statut, et mots-clés
  - [x] Cliquer sur un article navigue vers `/article/:slug`
  - [x] Le lien retour ramène au dashboard

## Dev Notes

### Architecture Frontend — Patterns établis par Story 1.3 [Source: story 1.3 implementation]

**Composants Vue — Pattern obligatoire :**
- `<script setup lang="ts">` obligatoire
- Ordre dans le SFC : `<script setup>` → `<template>` → `<style scoped>`
- Props typées avec `defineProps<{...}>()`
- Emits typés avec `defineEmits<{...}>()`

**Store Pinia — Pattern standard [Source: cocoons.store.ts] :**
```typescript
export const useArticlesStore = defineStore('articles', () => {
  const articles = ref<Article[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchArticlesByCocoon(cocoonId: number) {
    isLoading.value = true
    error.value = null
    try {
      articles.value = await apiGet<Article[]>(`/cocoons/${cocoonId}/articles`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    } finally {
      isLoading.value = false
    }
  }

  return { articles, isLoading, error, fetchArticlesByCocoon }
})
```

**Service API — Pattern existant [Source: api.service.ts] :**
```typescript
// Le service apiGet<T> est déjà implémenté dans src/services/api.service.ts
// Il préfixe /api, extrait .data de la réponse, et gère les erreurs
export async function apiGet<T>(path: string): Promise<T>
```

### Endpoints API — Déjà implémentés dans Story 1.2 [Source: server/routes/]

**GET /api/cocoons/:id/articles** — Retourne les articles d'un cocon par index :
```json
{
  "data": [
    {
      "title": "Pourquoi la refonte de site web est essentielle pour votre PME en 2025",
      "type": "Pilier",
      "slug": "pourquoi-la-refonte-...",
      "theme": null,
      "status": "à rédiger"
    }
  ]
}
```
Note : Le `:id` est l'index numérique du cocon (0-5), correspondant à `Cocoon.id`.

**GET /api/keywords/:cocoon** — Retourne les mots-clés par NOM du cocon (URL-encoded) :
```json
{
  "data": [
    {
      "keyword": "refonte site web pme",
      "cocoonName": "Refonte de site web pour PME",
      "type": "Pilier"
    }
  ]
}
```
**ATTENTION :** Le paramètre est le NOM du cocon (string), pas son index. Il faut utiliser `encodeURIComponent(cocoonName)` dans l'URL.

### Association Mots-clés ↔ Articles [Source: architecture.md + données]

Les mots-clés sont associés au cocon (pas directement à l'article). Le mapping mot-clé → article se fait par correspondance sémantique :
- Les mots-clés de type "Pilier" correspondent à l'article de type "Pilier" du cocon
- Les mots-clés "Moyenne traine" et "Longue traine" sont partagés entre les articles intermédiaires/spécialisés du cocon
- **Pour la V1, afficher tous les mots-clés du cocon sous chaque article du cocon.** Le mapping fin par article sera fait dans l'Epic 2 (brief SEO).

### Types partagés disponibles [Source: shared/types/]

```typescript
// Article (shared/types/article.types.ts)
interface Article { title: string; type: ArticleType; slug: string; theme: string | null; status: ArticleStatus }
type ArticleType = 'Pilier' | 'Intermédiaire' | 'Spécialisé'
type ArticleStatus = 'à rédiger' | 'brouillon' | 'publié'

// Keyword (shared/types/keyword.types.ts)
interface Keyword { keyword: string; cocoonName: string; type: KeywordType }
type KeywordType = 'Pilier' | 'Moyenne traine' | 'Longue traine'

// Cocoon (shared/types/cocoon.types.ts)
interface Cocoon { id: number; name: string; articles: Article[]; stats: CocoonStats }
```

Imports frontend : `import type { Article, Keyword, Cocoon } from '@shared/types/index.js'`

### Composants shared réutilisables déjà existants [Source: story 1.3]

- `LoadingSpinner.vue` — spinner de chargement centré
- `ErrorMessage.vue` — message d'erreur + bouton "Réessayer" (props: `message`, emit: `retry`)
- `ProgressBar.vue` — barre de progression (props: `percent`, `color?`)
- `StatusBadge.vue` — badge statut article (props: `status: ArticleStatus`)

### Routage actuel [Source: src/router/index.ts]

```typescript
routes: [
  { path: '/', name: 'dashboard', component: DashboardView },
  { path: '/cocoon/:cocoonId', name: 'cocoon', component: () => import('../views/CocoonView.vue') },
]
```
CocoonView est déjà lazy-loaded. Le `cocoonId` est récupéré depuis `route.params.cocoonId` (string → convertir en number avec `Number()`).

### CocoonCard lien — Pattern de navigation [Source: CocoonCard.vue]

Le `CocoonCard` lie vers `/cocoon/${cocoon.id}` via `RouterLink`. L'`id` est l'index numérique (0-5).

### CSS — Design System minimal [Source: variables.css]

Variables CSS disponibles :
```css
--color-primary: #2563eb;
--color-secondary: #64748b;
--color-success: #16a34a;
--color-warning: #d97706;
--color-error: #dc2626;
--color-background: #ffffff;
--color-surface: #f8fafc;
--color-text: #1e293b;
--color-text-muted: #64748b;
--color-border: #e2e8f0;
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
```

**Pas de framework CSS** — CSS natif avec les variables ci-dessus. Desktop-only (1280px min).

### Learnings Story 1.3

- Le store `cocoons` charge TOUS les cocons avec leurs articles intégrés (pas besoin de refetch les articles si déjà dans le store cocoons)
- **Cependant**, l'endpoint `/cocoons/:id/articles` est séparé et devrait être utilisé pour la vue détaillée du cocon — le store articles sera indépendant
- Les tests utilisent `vi.mock()` pour mocker `api.service`, pattern : `vi.mock('../../../src/services/api.service', () => ({ apiGet: vi.fn() }))` puis `const mockApiGet = vi.mocked(apiGet)`
- Les tests de composants utilisent `mount()` de `@vue/test-utils` avec `global: { stubs: { RouterLink: ... } }` pour les composants qui utilisent RouterLink
- 49 tests passent actuellement
- Type-check clean avec `vue-tsc --build`

### Cocoon store — Données déjà chargées [Source: cocoons.store.ts]

Le store `cocoons` a déjà chargé les cocoons au dashboard. Quand on navigue vers `/cocoon/:cocoonId`, les cocoons sont déjà en mémoire dans `cocoonsStore.cocoons`. On peut récupérer le nom du cocon via :
```typescript
const cocoon = cocoonsStore.cocoons.find(c => c.id === cocoonId)
const cocoonName = cocoon?.name
```

**Si les cocoons ne sont pas chargés** (accès direct par URL), il faut d'abord `await cocoonsStore.fetchCocoons()` pour obtenir les noms.

### Anti-patterns à éviter [Source: architecture.md]

- **PAS** de Options API
- **PAS** de `any` TypeScript
- **PAS** d'appels API directs depuis les composants — toujours via store actions
- **PAS** de mutation directe du state Pinia depuis les composants
- **PAS** de framework CSS externe

### Project Structure Notes

- Components dashboard (ArticleCard, ArticleList) dans `src/components/dashboard/` — même dossier que CocoonCard/CocoonList
- Component shared (KeywordBadge) dans `src/components/shared/`
- Stores dans `src/stores/articles.store.ts` et `src/stores/keywords.store.ts`
- Vue dans `src/views/CocoonView.vue` (remplace le placeholder existant)
- Router dans `src/router/index.ts` (ajout route `/article/:slug`)

### References

- [Source: architecture.md#Frontend Architecture] — Stores Pinia, composants par feature
- [Source: architecture.md#Component Architecture] — Organisation dashboard/
- [Source: architecture.md#Communication Patterns] — Pattern store setup
- [Source: architecture.md#API Endpoints] — GET /api/cocoons/:id/articles, GET /api/keywords/:cocoon
- [Source: architecture.md#Naming Patterns] — Conventions fichiers
- [Source: architecture.md#Enforcement Guidelines] — Anti-patterns
- [Source: epics.md#Story 1.4] — Acceptance criteria originaux
- [Source: prd.md#FR2, FR3, FR5] — Liste articles, mots-clés, sélection article
- [Source: prd.md#NFR5] — Navigation < 500ms
- [Source: story 1.3#Dev Notes] — Learnings et patterns établis

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- articles.store.ts: Pinia setup store with fetchArticlesByCocoon(id), isLoading, error, cocoonId state
- keywords.store.ts: Pinia setup store with fetchKeywordsByCocoon(name), isLoading, error, encodeURIComponent for cocoon name
- KeywordBadge.vue: pill badge with color coding by keyword type (Pilier/Moyenne/Longue)
- ArticleCard.vue: RouterLink to /article/:slug, displays title, type badge, StatusBadge, KeywordBadge list
- ArticleList.vue: vertical list of ArticleCard components, empty state message
- CocoonView.vue: full implementation replacing placeholder, parallel fetch of articles+keywords, cocoon name title, back link, loading/error states, direct URL access handling
- Router updated: added /article/:slug → ArticleWorkflowView (placeholder)
- ArticleWorkflowView.vue: placeholder for Epic 2
- 66/66 tests passing (17 new + 49 existing)
- Type-check clean with vue-tsc --build

### File List

- src/stores/articles.store.ts (new)
- src/stores/keywords.store.ts (new)
- src/components/shared/KeywordBadge.vue (new)
- src/components/dashboard/ArticleCard.vue (new)
- src/components/dashboard/ArticleList.vue (new)
- src/views/CocoonView.vue (modified — full implementation replacing placeholder)
- src/views/ArticleWorkflowView.vue (new — placeholder for Epic 2)
- src/router/index.ts (modified — added /article/:slug route)
- tests/unit/stores/articles.store.test.ts (new — 5 tests)
- tests/unit/stores/keywords.store.test.ts (new — 4 tests)
- tests/unit/components/cocoon-detail.test.ts (new — 8 tests)
