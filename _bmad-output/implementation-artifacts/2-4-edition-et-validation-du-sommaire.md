# Story 2.4: Édition et Validation du Sommaire

Status: done

## Story

As a Arnau (utilisateur),
I want modifier et valider le sommaire généré avant toute génération de contenu,
so that la structure de mon article corresponde exactement à ma vision avant d'investir dans la rédaction.

## Acceptance Criteria

1. **AC1 — Ajout de sections** : L'utilisateur peut ajouter de nouvelles sections H2/H3 — FR11.

2. **AC2 — Suppression de sections** : L'utilisateur peut supprimer des sections — FR11.

3. **AC3 — Réordonnement drag-and-drop** : L'utilisateur peut réordonner les sections par drag-and-drop — FR11.

4. **AC4 — Renommage de titres** : L'utilisateur peut renommer les titres des sections — FR11.

5. **AC5 — Validation du sommaire** : Un bouton "Valider le sommaire" confirme la structure et permet de passer à la génération de contenu — FR12.

6. **AC6 — Régénération** : Un bouton "Régénérer" permet de relancer la génération complète du sommaire.

7. **AC7 — Persistance** : Le sommaire validé est sauvegardé dans `data/articles/{slug}.json` — NFR10.

## Tasks / Subtasks

- [x] **Task 1 : Créer le composant `OutlineEditor.vue`** (AC: #1, #2, #3, #4)
  - [x] Créer `src/components/outline/OutlineEditor.vue`
  - [x] Props : `outline: Outline`, emit `update:outline`
  - [x] Affiche les sections hiérarchiquement (H1/H2/H3) avec les annotations Propulsite
  - [x] Chaque section est un `OutlineNode` draggable et éditable inline
  - [x] Bouton "+" pour ajouter une section H2 ou H3
  - [x] Gère le drag-and-drop natif HTML5 (pas de lib externe) pour réordonner les sections

- [x] **Task 2 : Créer le composant `OutlineNode.vue`** (AC: #1, #2, #3, #4)
  - [x] Créer `src/components/outline/OutlineNode.vue`
  - [x] Props : `section: OutlineSection`, emit `update:section`, `delete`, `drag-start`, `drag-over`, `drop`
  - [x] Titre éditable inline (double-clic ou icône crayon → input text)
  - [x] Icône suppression (corbeille) avec confirmation
  - [x] Attributs `draggable="true"` avec handlers drag natif
  - [x] Annotation badge (réutilise le pattern de OutlineDisplay)

- [x] **Task 3 : Ajouter les actions "Valider" et "Ajouter section" au store** (AC: #1, #5, #7)
  - [x] Modifier `src/stores/outline.store.ts`
  - [x] Action `addSection(afterId: string | null, level: 2 | 3)` : ajoute une section avec id auto-généré
  - [x] Action `removeSection(id: string)` : supprime une section
  - [x] Action `updateSection(id: string, updates: Partial<OutlineSection>)` : met à jour titre/level/annotation
  - [x] Action `reorderSections(fromIndex: number, toIndex: number)` : réordonne via splice
  - [x] Action `validateOutline(slug: string)` : appelle `PUT /api/articles/:slug` pour sauvegarder
  - [x] State : `isValidated: ref(false)` — passe à true quand le sommaire est validé

- [x] **Task 4 : Créer la route `PUT /api/articles/:slug` pour la sauvegarde** (AC: #7)
  - [x] Modifier `server/routes/articles.routes.ts`
  - [x] Endpoint `PUT /api/articles/:slug` : body `{ outline: Outline }` (pour l'instant uniquement outline, le contenu viendra Story 3.x)
  - [x] Valide le body avec un Zod schema `updateArticleContentSchema`
  - [x] Sauvegarde dans `data/articles/{slug}.json` via `writeJson()` (atomic write)
  - [x] Merge avec les données existantes si le fichier existe déjà
  - [x] Ajouter le schema dans `shared/schemas/article.schema.ts`

- [x] **Task 5 : Créer le service `article-content.service.ts`** (AC: #7)
  - [x] Créer `server/services/article-content.service.ts`
  - [x] `saveArticleContent(slug: string, content: Partial<ArticleContent>)` : lit le fichier existant, merge, écrit atomiquement
  - [x] `getArticleContent(slug: string)` : lit `data/articles/{slug}.json`
  - [x] Utilise `readJson` / `writeJson` de `server/utils/json-storage.ts`

- [x] **Task 6 : Intégrer OutlineEditor dans ArticleWorkflowView** (AC: #1-#7)
  - [x] Modifier `src/views/ArticleWorkflowView.vue`
  - [x] Quand `outlineStore.outline` existe et `!outlineStore.isGenerating` : afficher `OutlineEditor` au lieu de `OutlineDisplay`
  - [x] Bouton "Valider le sommaire" sous l'éditeur (déclenche `outlineStore.validateOutline(slug)`)
  - [x] Après validation, afficher un message de confirmation + désactiver l'édition
  - [x] Le bouton "Régénérer" reste disponible (dans OutlineActions) même après validation

- [x] **Task 7 : Tests et validation** (AC: tous)
  - [x] Tests du `outline.store.ts` (addSection, removeSection, reorderSections, updateSection, validateOutline) — 9 tests
  - [x] Tests du `article-content.service.ts` (save/get avec mock json-storage) — 5 tests
  - [x] Tests de la route `PUT /api/articles/:slug` et `GET /articles/:slug/content` — 4 tests
  - [x] `npx vitest run` — 146 tests passent (18 nouveaux)
  - [x] `npx vue-tsc --build` — type-check clean

## Dev Notes

### Architecture — Outline Editor [Source: architecture.md]

L'architecture spécifie trois composants dans `src/components/outline/` :
- `OutlineEditor.vue` — Éditeur de sommaire interactif
- `OutlineNode.vue` — Nœud H2/H3 draggable
- `OutlineActions.vue` — Actions sur le sommaire (déjà créé Story 2.3)

**IMPORTANT — Drag-and-drop natif** : L'architecture NE spécifie PAS de librairie externe pour le drag-and-drop. Utiliser le HTML5 Drag and Drop API natif :

```typescript
// Pattern drag-and-drop natif
<div
  draggable="true"
  @dragstart="onDragStart($event, index)"
  @dragover.prevent="onDragOver($event, index)"
  @drop="onDrop($event, index)"
>
```

**NE PAS installer** de package supplémentaire (pas de vuedraggable, sortablejs, etc.).

### Persistance — Article Content [Source: architecture.md]

Le fichier `data/articles/{slug}.json` stocke le contenu d'un article :

```typescript
// ArticleContent in shared/types/article.types.ts
export interface ArticleContent {
  outline: string | null    // Outline JSON sérialisé
  content: string | null    // Contenu HTML TipTap
  metaTitle: string | null
  metaDescription: string | null
  seoScore: number | null
  geoScore: number | null
  updatedAt: string | null
}
```

**IMPORTANT** : Le champ `outline` dans `ArticleContent` est de type `string | null`. L'objet `Outline` sera sérialisé en `JSON.stringify(outline)` avant sauvegarde et parsé en `JSON.parse(content.outline)` à la lecture.

### Atomic JSON Write [Source: server/utils/json-storage.ts]

Utiliser les fonctions existantes pour la persistance :

```typescript
import { readJson, writeJson } from '../utils/json-storage.js'

// writeJson fait write-to-temp + rename automatiquement
await writeJson(`data/articles/${slug}.json`, articleContent)
```

### Existing Articles Route [Source: server/routes/articles.routes.ts]

La route `GET /api/articles/:slug` existe déjà. Il faut AJOUTER `PUT /api/articles/:slug` dans le même fichier.

La route GET actuelle retourne l'article depuis `data.service.ts`. Pour le PUT, on va écrire directement dans `data/articles/{slug}.json`.

### Outline Store — Extension [Source: src/stores/outline.store.ts]

Le store outline actuel gère : `outline`, `streamedText`, `isGenerating`, `error`, `generateOutline`, `resetOutline`.

Il faut AJOUTER dans le même store :
- `isValidated: ref(false)`
- `addSection(afterId, level)` — génère un id unique (`h${level}-${Date.now()}`)
- `removeSection(id)` — filtre le tableau sections
- `updateSection(id, updates)` — Object.assign sur la section trouvée
- `reorderSections(fromIndex, toIndex)` — splice pour déplacer
- `validateOutline(slug)` — appelle PUT /api/articles/:slug

**Pattern d'ID** : Les sections utilisent un id format `h{level}-{slug}` (ex: `h2-introduction`). Pour les nouvelles sections ajoutées manuellement, utiliser `h{level}-${Date.now()}`.

### Zod Import [Source: Story 2.3]

**IMPORTANT** : Zod imports use `'zod/v4'` NOT `'zod'` in this project.

### Frontend — Component Patterns [Source: codebase analysis]

- `<script setup lang="ts">` — Composition API
- Props via `defineProps<{...}>()`
- Emits via `defineEmits<{...}>()`
- CSS scoped with `var(--color-*)` variables
- SFC order : `<script setup>` → `<template>` → `<style scoped>`

### CSS Variables [Source: src/assets/styles/variables.css]

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
```

### Pinia Store Pattern (setup mode) [Source: codebase analysis]

```typescript
export const useOutlineStore = defineStore('outline', () => {
  // ref() for state
  // computed() for getters
  // async function for actions
  // return { state, getters, actions }
})
```

### API Service [Source: src/services/api.service.ts]

Pour l'appel PUT depuis le store, utiliser les helpers existants :

```typescript
import { apiPut } from '@/services/api.service'

// apiPut existe déjà si apiPost existe, sinon créer
async function validateOutline(slug: string) {
  await apiPut(`/articles/${slug}`, { outline: JSON.stringify(outline.value) })
  isValidated.value = true
}
```

**Vérifier** si `apiPut` existe dans `api.service.ts`. S'il n'existe pas, l'ajouter sur le même pattern que `apiPost`.

### Anti-patterns

- PAS de librairie externe drag-and-drop — HTML5 Drag and Drop API natif
- PAS de `any` TypeScript — typer toutes les props et returns
- PAS de styles hardcodés — utiliser CSS variables
- PAS de mutation directe de l'outline dans les composants — toujours via le store
- PAS de sauvegarde directe depuis le composant — passer par le store qui appelle l'API
- PAS de sérialisation JSON dans le composant — le store gère `JSON.stringify(outline)` pour la persistance

### Previous Story Intelligence (2.3)

**Code review findings corrigés dans Story 2.3 :**
- `useStreaming` utilise maintenant des **callbacks** (`onChunk`, `onDone`, `onError`) au lieu de polling setInterval
- `generate.routes.ts` : `loadPrompt()` est appelé AVANT `res.writeHead(200)` — si le prompt fail, erreur JSON 500 au lieu de SSE error
- `generate.schema.ts` : `articleType` utilise `z.enum(['Pilier', 'Intermédiaire', 'Spécialisé'])` au lieu de `z.string()`
- `useStreaming.ts` : guard `if (!res.body)` ajouté avant `res.body.getReader()`

**Patterns établis dans Story 2.3 :**
- Service Claude dans `server/services/claude.service.ts` (async generator pattern)
- Prompts externalisés dans `server/prompts/*.md` avec `{{variable}}` remplacées par `loadPrompt()`
- SSE streaming format: `event: chunk/done/error\ndata: JSON\n\n`
- Tests Vitest : `vi.hoisted()` pour variables mock dans `vi.mock` factories
- Tests server : `// @vitest-environment node` pour tests de code backend

**Files créés dans Story 2.3 :**
- `shared/types/outline.types.ts` — Types OutlineSection, Outline
- `server/services/claude.service.ts` — Service Claude API
- `server/utils/prompt-loader.ts` — Chargeur de prompts
- `server/prompts/generate-outline.md` — Prompt de génération outline
- `server/routes/generate.routes.ts` — Route SSE génération
- `src/composables/useStreaming.ts` — Composable SSE client
- `src/stores/outline.store.ts` — Store outline Pinia
- `src/components/outline/OutlineDisplay.vue` — Affichage outline read-only
- `src/components/outline/OutlineActions.vue` — Boutons generate/regenerate
- 4 fichiers tests correspondants

**128 tests passent actuellement.**

### Dependencies

- **Depends on** : Story 2.3 (Génération du sommaire, store outline, composants outline) — DONE
- **Consumed by** : Story 3.2 (Génération article basée sur sommaire validé)

### Project Structure Notes

- Alignment avec la structure `src/components/outline/` prévue par l'architecture
- Le store `outline.store.ts` est étendu (pas de nouveau store créé)
- Le service `article-content.service.ts` sera réutilisé par les Stories 3.x pour la sauvegarde contenu
- La route `PUT /api/articles/:slug` sera étendue par les Stories 3.x

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Components/outline]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Persistence]
- [Source: server/utils/json-storage.ts] — Atomic JSON operations
- [Source: shared/types/article.types.ts] — ArticleContent type
- [Source: server/routes/articles.routes.ts] — Existing GET route
- [Source: src/stores/outline.store.ts] — Existing store to extend
- [Source: src/components/outline/OutlineDisplay.vue] — Read-only display (reference for styling)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed TS2345 errors: `splice()` returns `T | undefined`, added null guard
- No external drag-and-drop library used — native HTML5 Drag and Drop API

### Completion Notes List

- OutlineEditor.vue: Interactive outline editor with HTML5 drag-and-drop, add/delete/reorder/rename sections
- OutlineNode.vue: Individual draggable node with inline editing (double-click or edit button), delete, add-after actions
- outline.store.ts extended: addSection, removeSection, updateSection, reorderSections, setOutline, validateOutline, isValidated, isSaving
- article-content.service.ts: CRUD for article content with atomic JSON write (merge with existing)
- articles.routes.ts: Added PUT /api/articles/:slug (Zod validation) and GET /api/articles/:slug/content
- api.service.ts: Added apiPut helper
- ArticleWorkflowView.vue: Shows OutlineEditor when outline exists and not validated, OutlineDisplay (read-only) after validation, "Valider le sommaire" button
- updateArticleContentSchema added to shared/schemas/article.schema.ts
- 146 total tests pass (18 new), type-check clean

### File List

- `src/components/outline/OutlineEditor.vue` — CREATE
- `src/components/outline/OutlineNode.vue` — CREATE
- `src/stores/outline.store.ts` — MODIFY (add edit/validate actions)
- `src/services/api.service.ts` — MODIFY (add apiPut)
- `src/views/ArticleWorkflowView.vue` — MODIFY (integrate OutlineEditor + validation)
- `server/services/article-content.service.ts` — CREATE
- `server/routes/articles.routes.ts` — MODIFY (add PUT and GET content routes)
- `shared/schemas/article.schema.ts` — MODIFY (add updateArticleContentSchema)
- `tests/unit/stores/outline.store.edit.test.ts` — CREATE (9 tests)
- `tests/unit/services/article-content.service.test.ts` — CREATE (5 tests)
- `tests/unit/routes/articles.routes.test.ts` — CREATE (4 tests)
