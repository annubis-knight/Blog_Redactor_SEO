# Story 1.3: Dashboard des Cocons Sémantiques

Status: done

## Story

As a Arnau (utilisateur),
I want voir les 6 cocons sémantiques avec leur progression et statistiques de santé,
so that je puisse évaluer d'un coup d'oeil l'état global de mon plan éditorial.

## Acceptance Criteria

1. **AC1 — Route Dashboard** : La route `/` affiche le composant `DashboardView.vue` qui contient le composant `CocoonList`.

2. **AC2 — Liste des cocons** : Les 6 cocons sémantiques sont listés avec pour chacun : nom, nombre d'articles, et barre de progression (% articles rédigés/publiés) — FR1.

3. **AC3 — Statistiques de santé** : Chaque cocon affiche des stats de santé : % complétion, répartition par type (Pilier / Intermédiaire / Spécialisé) — FR4.

4. **AC4 — Store Pinia** : Le store `cocoons` charge les données depuis `GET /api/cocoons` au montage du composant, avec gestion des états `isLoading` et `error`.

5. **AC5 — Loading state** : Un composant `LoadingSpinner` s'affiche pendant le chargement des données depuis l'API.

6. **AC6 — Error state** : Un composant `ErrorMessage` s'affiche en cas d'erreur API, avec un bouton "Réessayer" qui relance le chargement.

7. **AC7 — Navigation vers cocon** : Chaque carte cocon est cliquable et navigue vers `/cocoon/:cocoonId` (route préparée mais pas encore implémentée — story 1.4).

8. **AC8 — Performance** : Le chargement initial complète en moins de 3 secondes — NFR4.

## Tasks / Subtasks

- [x] **Task 1 : Nettoyer le scaffolding create-vue** (AC: prérequis)
  - [x]Supprimer les fichiers scaffolding inutiles : `src/views/HomeView.vue`, `src/views/AboutView.vue`, `src/components/HelloWorld.vue`, `src/components/TheWelcome.vue`, `src/components/WelcomeItem.vue`, `src/components/icons/` (tout le dossier), `src/stores/counter.ts`
  - [x]Supprimer le test `src/components/__tests__/HelloWorld.spec.ts`
  - [x]Nettoyer `src/App.vue` : supprimer le contenu scaffolding, garder `<RouterView />` uniquement avec un layout minimal (header avec titre "Blog Redactor SEO")
  - [x]Nettoyer `src/assets/main.css` : ajouter un reset CSS minimal et les styles de base de l'application (body, font-family, box-sizing)

- [x] **Task 2 : Créer le service API frontend** (AC: #4)
  - [x]Créer `src/services/api.service.ts` — un wrapper autour de `fetch()` qui :
    - Préfixe automatiquement les URLs avec `/api`
    - Parse les réponses JSON
    - Gère les erreurs HTTP (throw avec code + message)
    - Extrait le champ `data` des réponses `ApiSuccess<T>`
  - [x]Exporter une fonction `apiGet<T>(path: string): Promise<T>` qui fait un GET et retourne `data`

- [x] **Task 3 : Créer le store Pinia `cocoons`** (AC: #4)
  - [x]Créer `src/stores/cocoons.store.ts` en mode setup (Composition API)
  - [x]State : `cocoons: ref<Cocoon[]>([])`, `isLoading: ref(false)`, `error: ref<string | null>(null)`
  - [x]Action `fetchCocoons()` : appelle `apiGet<Cocoon[]>('/cocoons')`, gère loading/error states
  - [x]Getter `totalArticles: computed(() => ...)` — somme de tous les articles de tous les cocons
  - [x]Le store importe le type `Cocoon` depuis `@shared/types/index.js`

- [x] **Task 4 : Créer les composants shared réutilisables** (AC: #5, #6)
  - [x]Créer `src/components/shared/LoadingSpinner.vue` — spinner de chargement centré (CSS pur, pas de lib)
  - [x]Créer `src/components/shared/ErrorMessage.vue` — affiche le message d'erreur + bouton "Réessayer" (props: `message: string`, emit: `retry`)
  - [x]Créer `src/components/shared/ProgressBar.vue` — barre de progression horizontale (props: `percent: number`, `color?: string`)
  - [x]Créer `src/components/shared/StatusBadge.vue` — badge coloré pour les statuts (props: `status: ArticleStatus`, affiche un dot coloré + texte)

- [x] **Task 5 : Créer les composants dashboard** (AC: #2, #3, #7)
  - [x]Créer `src/components/dashboard/CocoonCard.vue` — carte d'un cocon affichant :
    - Nom du cocon
    - Nombre total d'articles et répartition par type (Pilier / Intermédiaire / Spécialisé)
    - Barre de progression `ProgressBar` avec % complétion
    - La carte entière est cliquable (RouterLink vers `/cocoon/:id`)
  - [x]Créer `src/components/dashboard/CocoonList.vue` — grille de `CocoonCard` (CSS Grid, responsive 1-2-3 colonnes)
  - [x]Créer `src/components/dashboard/CocoonStats.vue` — bloc de stats agrégées global (total cocons, total articles, progression globale)

- [x] **Task 6 : Créer DashboardView et configurer le Router** (AC: #1, #7)
  - [x]Créer `src/views/DashboardView.vue` :
    - `<script setup>` : utilise `useCocoonsStore()`, appelle `fetchCocoons()` dans `onMounted`
    - Affiche `LoadingSpinner` si `isLoading`
    - Affiche `ErrorMessage` si `error` (avec retry qui rappelle `fetchCocoons`)
    - Affiche `CocoonStats` puis `CocoonList` avec les données du store
  - [x]Mettre à jour `src/router/index.ts` :
    - Remplacer les routes scaffold par : `{ path: '/', name: 'dashboard', component: DashboardView }`
    - Ajouter une route placeholder : `{ path: '/cocoon/:cocoonId', name: 'cocoon', component: () => import('../views/CocoonView.vue') }` (lazy-loaded, composant placeholder)
    - Créer un placeholder `src/views/CocoonView.vue` minimal (juste "Cocoon Detail — Coming in Story 1.4")

- [x] **Task 7 : Tests unitaires** (AC: tous)
  - [x]Tester le store `cocoons` : `tests/unit/stores/cocoons.store.test.ts`
    - Test `fetchCocoons` charge les données et met à jour le state
    - Test `isLoading` est true pendant le fetch
    - Test `error` est set en cas d'échec API
    - Test `totalArticles` getter retourne la bonne somme
  - [x]Tester le service API : `tests/unit/services/api.service.test.ts`
    - Test `apiGet` appelle fetch avec le bon URL
    - Test `apiGet` parse la réponse et retourne `data`
    - Test `apiGet` throw en cas d'erreur HTTP
  - [x]Tester les composants si possible avec `@vue/test-utils` :
    - Test `CocoonCard` affiche le nom et les stats
    - Test `ErrorMessage` émet `retry` au clic du bouton
    - Test `ProgressBar` affiche la bonne largeur

- [x] **Task 8 : Vérification intégration** (AC: tous)
  - [x]`npm run dev` démarre sans erreur
  - [x]La route `/` affiche le dashboard avec les 6 cocons
  - [x]Chaque cocon affiche nom, nombre d'articles, progression
  - [x]Le spinner s'affiche pendant le chargement
  - [x]Cliquer sur un cocon navigue vers `/cocoon/:id`
  - [x]Tous les tests passent (`npx vitest run`)
  - [x]Type-check clean (`npx vue-tsc --build`)

## Dev Notes

### Architecture Frontend — Patterns à suivre [Source: architecture.md#Frontend Architecture]

**Composants Vue :**
- `<script setup lang="ts">` obligatoire
- Ordre dans le SFC : `<script setup>` → `<template>` → `<style scoped>`
- Props typées avec `defineProps<{...}>()`
- Emits typés avec `defineEmits<{...}>()`

**Store Pinia — Pattern standard [Source: architecture.md#Communication Patterns] :**
```typescript
export const useCocoonsStore = defineStore('cocoons', () => {
  // State
  const cocoons = ref<Cocoon[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const totalArticles = computed(() =>
    cocoons.value.reduce((sum, c) => sum + c.stats.totalArticles, 0)
  )

  // Actions
  async function fetchCocoons() {
    isLoading.value = true
    error.value = null
    try {
      cocoons.value = await apiGet<Cocoon[]>('/cocoons')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    } finally {
      isLoading.value = false
    }
  }

  return { cocoons, isLoading, error, totalArticles, fetchCocoons }
})
```

**Service API — Pattern [Source: architecture.md#Architectural Boundaries] :**
```typescript
// Components → Store (action) → Service API → Backend
// Les composants n'appellent JAMAIS les services API directement
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.data as T
}
```

### Import des types shared depuis le frontend [Source: architecture.md#Project Structure]

Le `tsconfig.app.json` configure le path alias `@shared/*` → `./shared/*`. Les imports frontend utilisent :
```typescript
import type { Cocoon, CocoonStats } from '@shared/types/index.js'
```

**ATTENTION :** L'import doit utiliser `.js` extension (ESM resolution). Le `@shared` alias est configuré dans `tsconfig.app.json` ET dans `vite.config.ts` (resolve.alias).

### Fichiers scaffolding à nettoyer [Source: code existant]

Le projet `create-vue` a généré des fichiers scaffolding qui doivent être nettoyés :
- `src/views/HomeView.vue` et `src/views/AboutView.vue` — remplacés par DashboardView
- `src/components/HelloWorld.vue`, `TheWelcome.vue`, `WelcomeItem.vue` — non utilisés
- `src/components/icons/` — non utilisés (le projet n'utilise pas ces icônes)
- `src/stores/counter.ts` — remplacé par cocoons.store.ts
- `src/components/__tests__/HelloWorld.spec.ts` — test du composant supprimé

**NE PAS supprimer :** `src/assets/logo.svg` (peut être réutilisé), `src/assets/base.css` (styles de base de create-vue).

### Données API attendues [Source: story 1.2 implementation]

L'endpoint `GET /api/cocoons` retourne :
```json
{
  "data": [
    {
      "id": 0,
      "name": "Refonte de site web pour PME",
      "articles": [
        { "title": "Pourquoi la refonte...", "type": "Pilier", "slug": "pourquoi-la-refonte-...", "theme": null, "status": "à rédiger" }
      ],
      "stats": {
        "totalArticles": 10,
        "byType": { "pilier": 1, "intermediaire": 4, "specialise": 5 },
        "byStatus": { "aRediger": 10, "brouillon": 0, "publie": 0 },
        "completionPercent": 0
      }
    }
  ]
}
```

6 cocons, 54 articles au total. Actuellement tous les articles sont `"à rédiger"` donc `completionPercent` = 0 pour tous.

### CSS — Design System minimal [Source: src/assets/styles/variables.css]

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

**Pas de framework CSS** — CSS natif avec les variables ci-dessus. L'app est desktop-only (1280px min).

### Routing — Configuration actuelle [Source: src/router/index.ts]

Le router actuel a des routes scaffolding (`/` → HomeView, `/about` → AboutView). Il faut :
1. Remplacer par `/ → DashboardView`
2. Ajouter `/cocoon/:cocoonId → CocoonView` (placeholder lazy-loaded)
3. Supprimer la route `/about`

Routes finales de l'app (pour référence future) :
```
/                           → DashboardView
/cocoon/:cocoonId           → CocoonView (story 1.4)
/article/:slug              → ArticleWorkflowView (epic 2)
/article/:slug/editor       → ArticleEditorView (epic 3)
/linking                    → LinkingMatrixView (epic 6)
```

### Tests — Stratégie [Source: architecture.md#Tests]

- **Store tests** : Tester les actions (fetch), getters, et état loading/error
- **Component tests** : Utiliser `@vue/test-utils` avec `mount` ou `shallowMount`
- **API service tests** : Mocker `fetch` avec `vi.fn()` pour tester les appels HTTP
- Les tests sont dans `tests/unit/stores/`, `tests/unit/services/`, `tests/unit/components/`
- Vitest est déjà configuré avec `@vue/test-utils` (installé par create-vue)

### Fichier main.css — Contenu attendu [Source: architecture.md]

Le fichier `src/assets/main.css` importe déjà `variables.css`. Il doit aussi inclure la CSS de base de l'app qui provient du scaffolding create-vue (`src/assets/base.css`). NE PAS casser la CSS de base existante.

### Learnings Story 1.2

- Les types sont dans `shared/types/` avec barrel export via `index.ts`
- Les imports backend utilisent `.js` extension (ESM)
- Le `@shared/*` alias fonctionne dans le frontend via `tsconfig.app.json` et `vite.config.ts`
- Zod v4 utilise `zod/v4` import path (version 4.3.6)
- Le backend data.service.ts gère le cache en mémoire et la conversion snake_case→camelCase
- 31 tests passent actuellement
- L'API retourne les données au format `{ data: T }` — le service API frontend doit extraire `data`

### Anti-patterns à éviter [Source: architecture.md#Enforcement Guidelines]

- **PAS** de Options API (`data()`, `methods:`, `computed:`)
- **PAS** de `any` TypeScript
- **PAS** d'appels API directs depuis les composants — toujours via store actions
- **PAS** de mutation directe du state Pinia depuis les composants
- **PAS** de framework CSS externe (Tailwind, Bootstrap, etc.) — CSS natif avec variables

### Project Structure Notes

- Components dashboard dans `src/components/dashboard/`
- Components shared (réutilisables) dans `src/components/shared/`
- Store dans `src/stores/cocoons.store.ts`
- Service API dans `src/services/api.service.ts`
- Vue dans `src/views/DashboardView.vue`
- Router dans `src/router/index.ts`

### References

- [Source: architecture.md#Frontend Architecture] — Stores Pinia, composants par feature
- [Source: architecture.md#Component Architecture] — Organisation dashboard/
- [Source: architecture.md#Communication Patterns] — Pattern store setup
- [Source: architecture.md#Naming Patterns] — Conventions fichiers
- [Source: architecture.md#Enforcement Guidelines] — Anti-patterns
- [Source: epics.md#Story 1.3] — Acceptance criteria originaux
- [Source: prd.md#FR1, FR4] — Visualisation cocons et statistiques de santé
- [Source: prd.md#NFR4] — Chargement initial < 3 secondes

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Scaffold files cleaned (HomeView, AboutView, HelloWorld, TheWelcome, WelcomeItem, icons/, counter.ts, HelloWorld.spec.ts deleted)
- App.vue replaced with clean layout (header + RouterView)
- main.css enhanced with base.css import and app-level styles
- api.service.ts: fetch wrapper with /api prefix, error extraction, data unwrapping
- cocoons.store.ts: Pinia setup store with fetchCocoons, isLoading, error, totalArticles getter
- 4 shared components: LoadingSpinner, ErrorMessage, ProgressBar, StatusBadge
- 3 dashboard components: CocoonCard (with RouterLink to /cocoon/:id), CocoonList (CSS Grid), CocoonStats (global aggregates)
- DashboardView.vue with loading/error/content states
- Router updated: / → DashboardView, /cocoon/:cocoonId → CocoonView (placeholder)
- 49/49 tests passing (18 new + 31 existing)
- Type-check clean with vue-tsc --build

### File List

- src/App.vue (modified — clean layout replacing scaffold)
- src/main.ts (unchanged)
- src/assets/styles/main.css (modified — added base.css import and app styles)
- src/router/index.ts (modified — Dashboard and Cocoon routes replacing scaffold)
- src/services/api.service.ts (new)
- src/stores/cocoons.store.ts (new)
- src/views/DashboardView.vue (new)
- src/views/CocoonView.vue (new — placeholder for story 1.4)
- src/components/shared/LoadingSpinner.vue (new)
- src/components/shared/ErrorMessage.vue (new)
- src/components/shared/ProgressBar.vue (new)
- src/components/shared/StatusBadge.vue (new)
- src/components/dashboard/CocoonCard.vue (new)
- src/components/dashboard/CocoonList.vue (new)
- src/components/dashboard/CocoonStats.vue (new)
- tests/unit/services/api.service.test.ts (new — 4 tests)
- tests/unit/stores/cocoons.store.test.ts (new — 7 tests)
- tests/unit/components/dashboard.test.ts (new — 8 tests)
- src/views/HomeView.vue (deleted)
- src/views/AboutView.vue (deleted)
- src/components/HelloWorld.vue (deleted)
- src/components/TheWelcome.vue (deleted)
- src/components/WelcomeItem.vue (deleted)
- src/components/icons/ (deleted — entire directory)
- src/stores/counter.ts (deleted)
- src/components/__tests__/HelloWorld.spec.ts (deleted)
