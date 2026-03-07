# Story 2.2: Affichage du Brief SEO Enrichi

Status: done

## Story

As a Arnau (utilisateur),
I want voir un brief SEO complet pour l'article sélectionné, enrichi avec les données DataForSEO,
so that je dispose de toutes les informations nécessaires avant de structurer mon article.

## Acceptance Criteria

1. **AC1 — Brief SEO de base** : La vue ArticleWorkflowView affiche le brief SEO avec : mot-clé pilier, mots-clés secondaires, type d'article, rôle dans le cocon — FR6.

2. **AC2 — Données DataForSEO** : Les données DataForSEO sont affichées : SERP top 10, PAA, related keywords, volumes de recherche, difficulté — FR7.

3. **AC3 — Longueur recommandée** : Une longueur de contenu recommandée est affichée basée sur l'analyse SERP des concurrents — FR8.

4. **AC4 — Store brief** : Le store `brief` charge les données depuis l'API et gère les états loading/error.

5. **AC5 — Composants** : Les composants SeoBrief, KeywordList, DataForSeoPanel et ContentRecommendation sont implémentés dans `src/components/brief/`.

6. **AC6 — Rafraîchir** : Un bouton "Rafraîchir les données SEO" permet d'invalider le cache et relancer l'appel DataForSEO.

7. **AC7 — Backend** : L'endpoint `GET /api/articles/:slug` retourne le détail de l'article (title, type, slug, theme, status, cocoonName).

8. **AC8 — apiPost** : Le service `api.service.ts` expose une fonction `apiPost<T>` pour les appels POST vers le backend.

## Tasks / Subtasks

- [x] **Task 1 : Ajouter `apiPost` dans `api.service.ts`** (AC: #8)
  - [x] Ajouter `apiPost<T>(path: string, body: unknown): Promise<T>` dans `src/services/api.service.ts`
  - [x] Même pattern que `apiGet` : fetch + error handling + `json.data as T`
  - [x] Ajouter un test unitaire dans `tests/unit/services/api.service.test.ts`

- [x] **Task 2 : Ajouter `getArticleBySlug` dans `data.service.ts` + route** (AC: #7)
  - [x] Ajouter `getArticleBySlug(slug: string)` dans `server/services/data.service.ts` : parcourt les cocoons pour trouver l'article, retourne `{ article: Article, cocoonName: string } | null`
  - [x] Créer `server/routes/articles.routes.ts` avec `GET /articles/:slug`
  - [x] Enregistrer la route dans `server/index.ts` : `app.use('/api', articlesRoutes)`
  - [x] Ajouter les tests pour `getArticleBySlug` et la route

- [x] **Task 3 : Créer le type `BriefData` et le schema** (AC: #1, #4)
  - [x] Ajouter `BriefData` dans `shared/types/dataforseo.types.ts` : `{ article: Article & { cocoonName: string }, keywords: Keyword[], dataForSeo: DataForSeoCacheEntry | null, contentLengthRecommendation: number | null }`
  - [x] Exporter depuis `shared/types/index.ts`

- [x] **Task 4 : Créer le store `brief.store.ts`** (AC: #4, #6)
  - [x] Créer `src/stores/brief.store.ts` en mode Pinia setup
  - [x] State : `briefData: ref<BriefData | null>`, `isLoading: ref<boolean>`, `error: ref<string | null>`, `isRefreshing: ref<boolean>`
  - [x] Action `fetchBrief(slug: string)` : GET article + GET keywords + POST dataforseo/brief → agrège dans `BriefData`
  - [x] Action `refreshDataForSeo()` : POST dataforseo/brief avec `forceRefresh: true` → met à jour `briefData.dataForSeo`
  - [x] Computed `pilierKeyword` : extrait le mot-clé de type 'Pilier' depuis `briefData.keywords`
  - [x] Computed `contentLengthRecommendation` : calcule la moyenne des longueurs des titres SERP × 1.2 (ou valeur brute du SERP)

- [x] **Task 5 : Créer le composant `SeoBrief.vue`** (AC: #1, #5)
  - [x] Créer `src/components/brief/SeoBrief.vue`
  - [x] Affiche : titre de l'article, type (Pilier/Intermédiaire/Spécialisé), nom du cocon, mot-clé pilier
  - [x] Props : `article: Article & { cocoonName: string }`, `pilierKeyword: string | null`
  - [x] Utilise les CSS variables du design system

- [x] **Task 6 : Créer le composant `KeywordList.vue`** (AC: #1, #5)
  - [x] Créer `src/components/brief/KeywordList.vue`
  - [x] Affiche les mots-clés groupés par type (Pilier, Moyenne traine, Longue traine) avec compteur
  - [x] Props : `keywords: Keyword[]`
  - [x] Réutilise le composant `KeywordBadge` existant

- [x] **Task 7 : Créer le composant `DataForSeoPanel.vue`** (AC: #2, #5, #6)
  - [x] Créer `src/components/brief/DataForSeoPanel.vue`
  - [x] Affiche 3 sections : SERP top 10 (position, titre, URL, domaine), PAA (questions + réponses), Related Keywords (keyword, volume, difficulté)
  - [x] Affiche volume de recherche, difficulté et CPC du mot-clé pilier (KeywordOverview)
  - [x] Props : `data: DataForSeoCacheEntry | null`, `isRefreshing: boolean`
  - [x] Émet `refresh` pour le bouton "Rafraîchir les données SEO"
  - [x] Affiche "Aucune donnée DataForSEO" si `data` est null

- [x] **Task 8 : Créer le composant `ContentRecommendation.vue`** (AC: #3, #5)
  - [x] Créer `src/components/brief/ContentRecommendation.vue`
  - [x] Calcule et affiche la longueur de contenu recommandée basée sur les descriptions SERP
  - [x] Props : `serpResults: SerpResult[]`, `articleType: ArticleType`
  - [x] Affiche une fourchette (min–max mots) selon le type d'article et les concurrents

- [x] **Task 9 : Transformer `ArticleWorkflowView.vue`** (AC: #1-#6)
  - [x] Remplacer le placeholder par le vrai contenu
  - [x] Utilise le store `brief` pour charger les données à `onMounted`
  - [x] Affiche `LoadingSpinner` / `ErrorMessage` / les composants brief
  - [x] Layout : SeoBrief en haut, KeywordList + DataForSeoPanel + ContentRecommendation en dessous
  - [x] Bouton "Rafraîchir les données SEO" connecté à `briefStore.refreshDataForSeo()`

- [x] **Task 10 : Tests unitaires** (AC: tous)
  - [x] Tests du store `brief.store.ts` : fetchBrief, refreshDataForSeo, computed pilierKeyword
  - [x] Tests de `apiPost` dans `api.service.test.ts`
  - [x] Tests de `getArticleBySlug` dans `data.service.test.ts`
  - [x] Tests de la route `GET /api/articles/:slug`
  - [x] Tous les tests passent (`npx vitest run`)
  - [x] Type-check clean (`npx vue-tsc --build`)

## Dev Notes

### Backend — Nouveau endpoint `GET /api/articles/:slug` [Source: architecture.md]

L'architecture prévoit cet endpoint. Il n'existe pas encore. Le pattern à suivre est celui de `cocoons.routes.ts`.

**Implémentation de `getArticleBySlug` dans `data.service.ts` :**
```typescript
export async function getArticleBySlug(slug: string): Promise<{ article: Article; cocoonName: string } | null> {
  const cocoons = await loadArticlesDb()
  for (const cocoon of cocoons) {
    const article = cocoon.articles.find(a => a.slug === slug)
    if (article) {
      return { article, cocoonName: cocoon.name }
    }
  }
  return null
}
```

**Route `articles.routes.ts` :**
```typescript
import { Router } from 'express'
import { getArticleBySlug } from '../services/data.service.js'

const router = Router()

router.get('/articles/:slug', async (req, res) => {
  try {
    const result = await getArticleBySlug(req.params.slug)
    if (!result) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article "${req.params.slug}" not found` } })
      return
    }
    res.json({ data: result })
  } catch (err) {
    console.error('[GET /api/articles/:slug]', err)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load article' } })
  }
})

export default router
```

**Enregistrement dans `server/index.ts` :**
```typescript
import articlesRoutes from './routes/articles.routes.js'
// ...
app.use('/api', articlesRoutes)  // → GET /api/articles/:slug
```

### Frontend — `apiPost` helper [Source: src/services/api.service.ts]

Pattern identique à `apiGet` :
```typescript
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    const message = json?.error?.message ?? `Erreur HTTP ${res.status}`
    throw new Error(message)
  }
  const json = await res.json()
  return json.data as T
}
```

### Frontend — Store `brief.store.ts` [Source: architecture.md, Pattern: cocoons.store.ts]

Le store `brief` orchestre 3 appels API pour construire le `BriefData` :

```typescript
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPost } from '@/services/api.service'
import type { Article, Keyword, DataForSeoCacheEntry } from '@shared/types/index.js'

interface ArticleWithCocoon extends Article {
  cocoonName: string
}

export interface BriefData {
  article: ArticleWithCocoon
  keywords: Keyword[]
  dataForSeo: DataForSeoCacheEntry | null
  contentLengthRecommendation: number | null
}

export const useBriefStore = defineStore('brief', () => {
  const briefData = ref<BriefData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isRefreshing = ref(false)

  const pilierKeyword = computed(() =>
    briefData.value?.keywords.find(kw => kw.type === 'Pilier') ?? null
  )

  async function fetchBrief(slug: string) {
    isLoading.value = true
    error.value = null
    try {
      // 1. Fetch article details
      const { article, cocoonName } = await apiGet<{ article: Article; cocoonName: string }>(`/articles/${slug}`)
      const articleWithCocoon: ArticleWithCocoon = { ...article, cocoonName }

      // 2. Fetch keywords for the cocoon
      const keywords = await apiGet<Keyword[]>(`/keywords/${encodeURIComponent(cocoonName)}`)

      // 3. Fetch DataForSEO data (if pilier keyword exists)
      const pilier = keywords.find(kw => kw.type === 'Pilier')
      let dataForSeo: DataForSeoCacheEntry | null = null
      if (pilier) {
        dataForSeo = await apiPost<DataForSeoCacheEntry>('/dataforseo/brief', { keyword: pilier.keyword })
      }

      // 4. Calculate content length recommendation
      const recommendation = dataForSeo ? calculateContentLength(dataForSeo.serp, article.type) : null

      briefData.value = { article: articleWithCocoon, keywords, dataForSeo, contentLengthRecommendation: recommendation }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    } finally {
      isLoading.value = false
    }
  }

  async function refreshDataForSeo() { /* ... forceRefresh: true ... */ }

  return { briefData, isLoading, error, isRefreshing, pilierKeyword, fetchBrief, refreshDataForSeo }
})
```

**Calcul de la longueur recommandée :**
```typescript
function calculateContentLength(serp: SerpResult[], articleType: ArticleType): number {
  // Base recommendation by article type
  const baseByType: Record<string, number> = {
    'Pilier': 2500,
    'Intermédiaire': 1800,
    'Spécialisé': 1200,
  }
  return baseByType[articleType] ?? 1500
}
```
Note : La longueur recommandée est une valeur de base par type d'article. FR8 mentionne "basée sur l'analyse SERP des concurrents" mais les descriptions SERP ne contiennent pas la longueur réelle du contenu. On utilise donc une heuristique par type d'article.

### Frontend — Composants Brief [Source: architecture.md]

**SeoBrief.vue** — Brief SEO de base :
```vue
<script setup lang="ts">
import type { Article } from '@shared/types/index.js'

defineProps<{
  article: Article & { cocoonName: string }
  pilierKeyword: string | null
}>()
</script>
```

**KeywordList.vue** — Réutilise `KeywordBadge` :
```vue
<script setup lang="ts">
import type { Keyword } from '@shared/types/index.js'
import KeywordBadge from '@/components/shared/KeywordBadge.vue'

defineProps<{
  keywords: Keyword[]
}>()
</script>
```
Groupe les keywords par type et affiche un compteur par groupe.

**DataForSeoPanel.vue** — 3 sections collapsibles :
- SERP Top 10 : tableau avec position, titre (lien), domaine
- PAA : liste de questions avec réponses en toggle
- Related Keywords : tableau avec keyword, volume, difficulté, CPC
- Header avec volume, difficulté, CPC du mot-clé pilier (KeywordOverview)
- Bouton "Rafraîchir" → émet `refresh`

**ContentRecommendation.vue** — Affiche la recommandation :
```vue
<script setup lang="ts">
import type { ArticleType } from '@shared/types/index.js'

defineProps<{
  recommendation: number | null
  articleType: ArticleType
}>()
</script>
```

### ArticleWorkflowView.vue — Transformation [Source: src/views/ArticleWorkflowView.vue]

Le placeholder actuel sera remplacé par :
```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBriefStore } from '@/stores/brief.store'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'
import SeoBrief from '@/components/brief/SeoBrief.vue'
import KeywordList from '@/components/brief/KeywordList.vue'
import DataForSeoPanel from '@/components/brief/DataForSeoPanel.vue'
import ContentRecommendation from '@/components/brief/ContentRecommendation.vue'

const route = useRoute()
const briefStore = useBriefStore()

const slug = route.params.slug as string

onMounted(() => {
  briefStore.fetchBrief(slug)
})
</script>

<template>
  <div class="article-workflow-view">
    <RouterLink to="/" class="back-link">← Retour au dashboard</RouterLink>

    <LoadingSpinner v-if="briefStore.isLoading" />
    <ErrorMessage v-else-if="briefStore.error" :message="briefStore.error" @retry="briefStore.fetchBrief(slug)" />

    <template v-else-if="briefStore.briefData">
      <SeoBrief
        :article="briefStore.briefData.article"
        :pilier-keyword="briefStore.pilierKeyword?.keyword ?? null"
      />
      <KeywordList :keywords="briefStore.briefData.keywords" />
      <DataForSeoPanel
        :data="briefStore.briefData.dataForSeo"
        :is-refreshing="briefStore.isRefreshing"
        @refresh="briefStore.refreshDataForSeo()"
      />
      <ContentRecommendation
        :recommendation="briefStore.briefData.contentLengthRecommendation"
        :article-type="briefStore.briefData.article.type"
      />
    </template>
  </div>
</template>
```

### Existing Patterns [Source: codebase analysis]

**Vue Component Pattern :**
- `<script setup lang="ts">` — Composition API
- Props via `defineProps<{...}>()`
- Emits via `defineEmits<{...}>()`
- CSS scoped with `var(--color-*)` variables

**Pinia Store Pattern (setup mode) :**
- `ref()` for state, `computed()` for getters, `async function` for actions
- `isLoading`, `error` (string | null) pattern in every store
- `try/catch/finally` with `isLoading` toggle

**API Service Pattern :**
- `apiGet<T>(path)` already exists
- Format: `fetch('/api' + path)` → check `res.ok` → return `json.data as T`
- Error: extract `json?.error?.message` or fallback `Erreur HTTP ${status}`

**Shared Components :**
- `LoadingSpinner` — no props, shows spinner
- `ErrorMessage` — props: `message: string`, emits: `retry`
- `KeywordBadge` — props: `keyword: Keyword`, displays with type-based color

**CSS Variables [Source: src/assets/styles/variables.css] :**
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
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

**Type Mapping — Article to Keywords :**
- Article has `slug` + belongs to a `Cocoon` (by name)
- Keywords are linked to a `cocoonName`
- Flow: slug → `getArticleBySlug()` → get `cocoonName` → `GET /api/keywords/:cocoon` → filter keywords

### Test Patterns [Source: tests/]

**Store tests :**
```typescript
import { setActivePinia, createPinia } from 'pinia'
import { useBriefStore } from '../../../src/stores/brief.store'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))
import { apiGet, apiPost } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiGet.mockReset()
  mockApiPost.mockReset()
})
```

**API service tests (existing pattern) :**
```typescript
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => { mockFetch.mockReset() })
```

**Data service tests :**
```typescript
vi.mock('../../../server/utils/json-storage', () => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
  ensureDir: vi.fn(),
}))
```

### Dependencies

- **Depends on** : Story 2.1 (DataForSEO service backend) — DONE
- **Depends on** : Epic 1 (shared components, stores, routes, types) — DONE
- **Consumed by** : Story 2.3 (génération sommaire uses the brief data)

### Zod Import

**IMPORTANT** : Zod imports use `'zod/v4'` NOT `'zod'` in this project.

### Anti-patterns

- PAS d'appel DataForSEO direct depuis le frontend — tout passe par `apiPost('/dataforseo/brief', ...)`
- PAS de `any` TypeScript — typer toutes les props et returns
- PAS de styles hardcodés — utiliser CSS variables
- PAS de logique métier dans les composants — garder dans le store ou des fonctions utilitaires

### File List (expected)

- `src/services/api.service.ts` — MODIFY (add `apiPost`)
- `server/services/data.service.ts` — MODIFY (add `getArticleBySlug`)
- `server/routes/articles.routes.ts` — CREATE
- `server/index.ts` — MODIFY (register articles routes)
- `shared/types/dataforseo.types.ts` — MODIFY (add `BriefData`)
- `shared/types/index.ts` — MODIFY (export `BriefData`)
- `src/stores/brief.store.ts` — CREATE
- `src/components/brief/SeoBrief.vue` — CREATE
- `src/components/brief/KeywordList.vue` — CREATE
- `src/components/brief/DataForSeoPanel.vue` — CREATE
- `src/components/brief/ContentRecommendation.vue` — CREATE
- `src/views/ArticleWorkflowView.vue` — MODIFY (replace placeholder)
- `tests/unit/services/api.service.test.ts` — MODIFY (add `apiPost` tests)
- `tests/unit/services/data.service.test.ts` — MODIFY (add `getArticleBySlug` tests)
- `tests/unit/stores/brief.store.test.ts` — CREATE

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- All 10 tasks completed successfully
- 108 tests pass (22 new: 4 apiPost + 3 getArticleBySlug + 15 brief store)
- Type-check clean after fixing BriefData types (string → union literal types)
- Fixed KeywordList.vue TS2532 by extracting group variable before push
- Brief store orchestrates 3 API calls: GET article → GET keywords → POST dataforseo/brief
- Content length recommendation uses heuristic by article type (Pilier: 2500, Intermédiaire: 1800, Spécialisé: 1200)
- DataForSeoPanel uses collapsible sections for SERP, PAA, and Related Keywords
- Refresh button calls apiPost with forceRefresh: true

### File List

- `src/services/api.service.ts` — MODIFIED (added apiPost)
- `server/services/data.service.ts` — MODIFIED (added getArticleBySlug)
- `server/routes/articles.routes.ts` — CREATED
- `server/index.ts` — MODIFIED (registered articles routes)
- `shared/types/dataforseo.types.ts` — MODIFIED (added BriefData interface)
- `shared/types/index.ts` — MODIFIED (exported BriefData)
- `src/stores/brief.store.ts` — CREATED
- `src/components/brief/SeoBrief.vue` — CREATED
- `src/components/brief/KeywordList.vue` — CREATED
- `src/components/brief/DataForSeoPanel.vue` — CREATED
- `src/components/brief/ContentRecommendation.vue` — CREATED
- `src/views/ArticleWorkflowView.vue` — MODIFIED (replaced placeholder with full brief display)
- `tests/unit/services/api.service.test.ts` — MODIFIED (added 4 apiPost tests)
- `tests/unit/services/data.service.test.ts` — MODIFIED (added 3 getArticleBySlug tests)
- `tests/unit/stores/brief.store.test.ts` — CREATED (15 tests)
