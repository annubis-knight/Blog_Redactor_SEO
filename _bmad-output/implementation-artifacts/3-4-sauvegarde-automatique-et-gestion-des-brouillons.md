# Story 3.4: Sauvegarde Automatique et Gestion des Brouillons

Status: done

## Story

As a Arnau (utilisateur),
I want que mon contenu soit sauvegardé automatiquement pendant l'édition,
so that je ne perde jamais mon travail même en cas de fermeture accidentelle.

## Acceptance Criteria

1. **AC1 — useAutoSave composable** : Le composable `useAutoSave` détecte le changement via le dirty flag du store `editor` et déclenche une sauvegarde automatique toutes les 30 secondes si le contenu a changé — NFR8.

2. **AC2 — Sauvegarde API** : La sauvegarde envoie un `PUT /api/articles/:slug` avec le contenu sérialisé — FR59. Le backend utilise la sauvegarde atomique (write-to-temp + rename) dans `data/articles/{slug}.json` — NFR10.

3. **AC3 — Indicateur visuel** : Un indicateur visuel affiche l'état de sauvegarde : "Sauvegardé", "Sauvegarde en cours...", "Modifications non sauvegardées".

4. **AC4 — Sauvegarde manuelle** : L'utilisateur peut sauvegarder manuellement à tout moment (bouton et raccourci Ctrl+S).

5. **AC5 — Reprise d'édition** : La route `GET /api/articles/:slug/content` retourne le contenu sauvegardé pour reprendre l'édition (déjà implémenté dans Story 3.3).

## Tasks / Subtasks

- [x] **Task 1 : Étendre le store `editor` avec l'état de sauvegarde** (AC: #1, #3)
  - [x] Ajouter `isSaving: ref(false)` pour tracker l'état de sauvegarde en cours
  - [x] Ajouter `lastSavedAt: ref<string | null>(null)` pour stocker le timestamp de la dernière sauvegarde
  - [x] Modifier `saveArticle(slug)` pour set `isSaving = true` au début, `markClean()` + set `lastSavedAt` en cas de succès, `isSaving = false` dans le finally
  - [x] Exposer `isSaving` et `lastSavedAt` dans le return du store

- [x] **Task 2 : Créer le composable `useAutoSave`** (AC: #1, #2)
  - [x] Créer `src/composables/useAutoSave.ts`
  - [x] Paramètres : `slug: string`, `intervalMs?: number` (default 30000)
  - [x] Utiliser `useIntervalFn` de `@vueuse/core` pour le timer 30s
  - [x] À chaque tick : vérifier `editorStore.isDirty && !editorStore.isSaving && !editorStore.isGenerating`
  - [x] Si dirty : appeler `editorStore.saveArticle(slug)`
  - [x] Retourner `{ pause, resume, isActive }` pour contrôler l'auto-save
  - [x] Pause auto-save si le composant est démonté (cleanup automatique via useIntervalFn)

- [x] **Task 3 : Créer le composant `SaveStatusIndicator.vue`** (AC: #3)
  - [x] Créer `src/components/editor/SaveStatusIndicator.vue`
  - [x] Props : aucune (lit directement depuis `editorStore`)
  - [x] 3 états visuels :
    - `isSaving === true` → "Sauvegarde en cours..." (icône spinner + texte)
    - `isDirty === false && lastSavedAt !== null` → "Sauvegardé" (icône check + timestamp relatif)
    - `isDirty === true && !isSaving` → "Modifications non sauvegardées" (icône warning + texte)
  - [x] Style : texte petit (0.75rem), couleurs sémantiques (success/warning/muted)

- [x] **Task 4 : Ajouter le bouton de sauvegarde manuelle** (AC: #4)
  - [x] Ajouter un bouton "Sauvegarder" dans le header de `ArticleEditorView.vue` (à côté du back link)
  - [x] Le bouton appelle `editorStore.saveArticle(slug)`
  - [x] Disabled quand `!editorStore.isDirty || editorStore.isSaving`
  - [x] Intercepter `Ctrl+S` / `Cmd+S` via `useEventListener` de `@vueuse/core` pour sauvegarder manuellement
  - [x] `preventDefault()` pour empêcher le comportement natif du navigateur

- [x] **Task 5 : Intégrer useAutoSave dans ArticleEditorView** (AC: #1, #2, #3, #4)
  - [x] Importer et appeler `useAutoSave(slug)` dans `ArticleEditorView.vue`
  - [x] Remplacer le dirty indicator existant par `SaveStatusIndicator`
  - [x] Placer le bouton de sauvegarde manuelle dans le header
  - [x] S'assurer que l'auto-save ne tourne PAS pendant la génération (`isGenerating`)

- [x] **Task 6 : Tests** (AC: tous)
  - [x] Tests du composable `useAutoSave` — 4 tests minimum :
    - Appelle saveArticle quand isDirty est true après l'intervalle
    - N'appelle PAS saveArticle quand isDirty est false
    - N'appelle PAS saveArticle quand isSaving est true
    - N'appelle PAS saveArticle quand isGenerating est true
  - [x] Tests du composant `SaveStatusIndicator` — 3 tests :
    - Affiche "Sauvegarde en cours..." quand isSaving
    - Affiche "Sauvegardé" quand pas dirty et lastSavedAt existe
    - Affiche "Modifications non sauvegardées" quand dirty
  - [x] Tests du store étendu — 2 tests :
    - saveArticle met à jour isSaving, lastSavedAt, et markClean en cas de succès
    - saveArticle gère l'erreur sans crash
  - [x] `npx vitest run` — 194 tests passent
  - [x] `npx vue-tsc --build` — type-check clean

## Dev Notes

### Architecture — Auto-save Pattern [Source: architecture.md#NFR8]

L'architecture définit :
- Le store `editor` déclenche un save toutes les 30 secondes SI le contenu a changé (`isDirty` flag)
- Save = `PUT /api/articles/:slug` avec le contenu TipTap sérialisé
- Indicateur visuel "Sauvegardé" / "Sauvegarde en cours..." dans l'éditeur

### Atomic JSON Storage [Source: architecture.md#NFR10]

Le pattern write-to-temp + rename est DÉJÀ implémenté dans `server/utils/json-storage.ts` :
```typescript
export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  const tmpPath = `${filePath}.tmp`
  await ensureDir(dirname(filePath))
  await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  await rename(tmpPath, filePath)
}
```

### Existing Editor Store [Source: src/stores/editor.store.ts — Story 3.3]

Le store `editor` existe avec :
- State : `content`, `streamedText`, `isGenerating`, `isGeneratingMeta`, `error`, `metaTitle`, `metaDescription`, `isDirty`
- Actions : `generateArticle`, `generateMeta`, `saveArticle`, `setContent`, `markClean`, `resetEditor`

**À AJOUTER dans cette story** :
- `isSaving: ref(false)` — flag indiquant qu'une sauvegarde est en cours
- `lastSavedAt: ref<string | null>(null)` — timestamp de la dernière sauvegarde réussie
- Modifier `saveArticle` pour gérer `isSaving`, `markClean()`, et `lastSavedAt`

### Existing API Endpoints [Source: server/routes/articles.routes.ts]

Les endpoints nécessaires sont DÉJÀ implémentés :
- `GET /api/articles/:slug/content` → `getArticleContent(slug)` — retourne `ArticleContent`
- `PUT /api/articles/:slug` → `saveArticleContent(slug, updates)` — sauvegarde avec merge + atomic write

Le `saveArticleContent` merge les updates dans le JSON existant et ajoute `updatedAt: new Date().toISOString()`.

### Existing ArticleEditorView [Source: src/views/ArticleEditorView.vue — Story 3.3]

Le view actuel :
- Charge le contenu via `apiGet<ArticleContent>('/articles/${slug}/content')` en `onMounted`
- Affiche un dirty indicator basique : `<span v-if="editorStore.isDirty" class="dirty-indicator">Modifications non sauvegardées</span>`
- Passe le contenu à `ArticleEditor` et reçoit les updates via `@update:content`

**À MODIFIER** :
- Remplacer le dirty indicator par `SaveStatusIndicator`
- Ajouter `useAutoSave(slug)` pour l'auto-save 30s
- Ajouter bouton de sauvegarde manuelle + raccourci Ctrl+S

### @vueuse/core — Fonctions Utiles [Source: package.json]

`@vueuse/core` v14.2.1 est installé. Utiliser :
- `useIntervalFn(callback, ms)` — Timer réactif avec auto-cleanup au unmount. Retourne `{ pause, resume, isActive }`
- `useEventListener(target, event, handler)` — Écoute d'événements avec auto-cleanup

```typescript
import { useIntervalFn } from '@vueuse/core'

const { pause, resume, isActive } = useIntervalFn(() => {
  // callback exécuté toutes les intervalMs
}, intervalMs)
```

### useAutoSave Composable Pattern

```typescript
// src/composables/useAutoSave.ts
import { useIntervalFn } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor.store'

export function useAutoSave(slug: string, intervalMs = 30_000) {
  const editorStore = useEditorStore()

  const { pause, resume, isActive } = useIntervalFn(async () => {
    if (editorStore.isDirty && !editorStore.isSaving && !editorStore.isGenerating) {
      await editorStore.saveArticle(slug)
    }
  }, intervalMs)

  return { pause, resume, isActive }
}
```

### SaveArticle Enhanced Pattern

```typescript
// Modified saveArticle in editor.store.ts
async function saveArticle(slug: string) {
  isSaving.value = true
  try {
    await apiPut(`/articles/${slug}`, {
      content: content.value,
      metaTitle: metaTitle.value,
      metaDescription: metaDescription.value,
    })
    markClean()
    lastSavedAt.value = new Date().toISOString()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
  } finally {
    isSaving.value = false
  }
}
```

### CSS Variables [Source: src/assets/styles/variables.css]

```css
--color-success: #16a34a;
--color-warning: #d97706;
--color-text-muted: #64748b;
```

### Anti-patterns

- PAS de `setInterval` natif — utiliser `useIntervalFn` de `@vueuse/core` qui gère le cleanup automatiquement
- PAS de `any` TypeScript — typer toutes les props et returns
- PAS de sauvegarde pendant la génération (`isGenerating`) — l'auto-save ne doit pas interférer avec le streaming
- PAS de sauvegarde si déjà en cours (`isSaving`) — éviter les appels parallèles
- PAS de `addEventListener` natif pour Ctrl+S — utiliser `useEventListener` de `@vueuse/core`
- ATTENTION : `saveArticle` doit appeler `markClean()` SEULEMENT en cas de succès (pas dans le finally)
- ATTENTION : Le composable `useAutoSave` ne doit pas être appelé conditionnellement (règles des hooks Vue)
- ATTENTION : `resetEditor()` doit aussi reset `isSaving` et `lastSavedAt`

### Previous Story Intelligence (3.3)

**Code review findings Story 3.3 :**
- H1: Link button missing from EditorToolbar — fixed (added Link button)
- M1: Story File List empty — fixed (populated)
- M2: Direct store mutation for metaTitle/metaDescription — fixed (use $patch)
- M3: Task description for TipTap cleanup — fixed (auto-cleanup)
- M4: No test for EditorBubbleMenu — fixed (added test)

**Patterns établis dans Stories 3.1-3.3 :**
- `editor.store.ts` — Pinia setup mode, typed refs, async actions with try/catch
- Component pattern : defineProps + defineEmits, scoped styles with CSS variables
- Test pattern : vitest + @vue/test-utils mount, vi.mock for services
- Store test pattern : setActivePinia(createPinia()) in beforeEach, vi.mock for services
- `@vueuse/core` available — prefer its utilities over raw browser APIs
- Zod v4 import: `from 'zod/v4'` (NOT `from 'zod'`)

**185 tests passent actuellement.**

### Dependencies

- **Depends on** : Story 3.3 (editor store with isDirty/setContent/markClean, ArticleEditorView, saveArticle) — DONE
- **Consumed by** : Story 4.1 (BubbleMenu actions during editing), Story 5.x (Scoring panels save state)

### Project Structure Notes

- `src/composables/useAutoSave.ts` — Nouveau composable
- `src/components/editor/SaveStatusIndicator.vue` — Nouveau composant
- `src/stores/editor.store.ts` — Modifié (isSaving, lastSavedAt, saveArticle enhanced)
- `src/views/ArticleEditorView.vue` — Modifié (useAutoSave, SaveStatusIndicator, bouton save, Ctrl+S)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#NFR8 — Auto-save 30s]
- [Source: _bmad-output/planning-artifacts/architecture.md#NFR10 — Atomic writes]
- [Source: _bmad-output/planning-artifacts/architecture.md#Composables — useAutoSave]
- [Source: _bmad-output/planning-artifacts/prd.md#FR23 — Sauvegarde automatique]
- [Source: _bmad-output/planning-artifacts/prd.md#FR59 — Sauvegarde contenu individuel]
- [Source: src/stores/editor.store.ts] — Editor store (Story 3.3)
- [Source: src/views/ArticleEditorView.vue] — Editor view (Story 3.3)
- [Source: server/routes/articles.routes.ts] — Article API endpoints
- [Source: server/services/article-content.service.ts] — Article content service
- [Source: server/utils/json-storage.ts] — Atomic JSON storage
- [Source: shared/schemas/article.schema.ts] — Zod validation schema
- [Source: package.json] — @vueuse/core v14.2.1

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- All 6 tasks completed in a single pass
- 194 tests passing (was 185), type-check clean
- useAutoSave composable uses useIntervalFn from @vueuse/core with 30s default interval
- SaveStatusIndicator shows 3 visual states: saving (spinner), saved (check), unsaved (warning)
- Ctrl+S/Cmd+S intercepted via useEventListener with preventDefault
- saveArticle enhanced with isSaving/lastSavedAt/markClean management
- resetEditor also resets isSaving and lastSavedAt

### File List

**Created:**
- src/composables/useAutoSave.ts
- src/components/editor/SaveStatusIndicator.vue
- tests/unit/composables/useAutoSave.test.ts
- tests/unit/components/SaveStatusIndicator.test.ts

**Modified:**
- src/stores/editor.store.ts (added isSaving, lastSavedAt, enhanced saveArticle, resetEditor)
- src/views/ArticleEditorView.vue (added useAutoSave, SaveStatusIndicator, save button, Ctrl+S)
- tests/unit/stores/editor.store.test.ts (added 2 saveArticle tests, resetEditor assertions)
