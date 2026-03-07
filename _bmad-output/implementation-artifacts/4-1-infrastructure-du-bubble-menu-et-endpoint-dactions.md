# Story 4.1: Infrastructure du Bubble Menu et Endpoint d'Actions

Status: done

## Story

As a développeur,
I want une infrastructure de Bubble Menu TipTap connectée à un endpoint d'actions IA backend,
so that les 9 actions contextuelles puissent être déclenchées sur sélection de texte.

## Acceptance Criteria

1. **AC1 — ActionMenu dans le BubbleMenu** : Quand l'utilisateur sélectionne du texte, le Bubble Menu (EditorBubbleMenu.vue) affiche un bouton "Actions IA" qui ouvre une liste des 9 actions contextuelles (ActionMenu.vue).

2. **AC2 — Endpoint POST /api/generate/action** : L'endpoint accepte `{ actionType, selectedText, articleSlug, keyword, keywords }`, valide avec un schéma Zod, et streame la réponse via SSE (même pattern que /api/generate/article).

3. **AC3 — useContextualActions composable** : Le composable orchestre l'appel API, gère le streaming du résultat, et expose les méthodes `executeAction`, `acceptResult` (remplace la sélection dans l'éditeur) et `rejectResult` (annule).

4. **AC4 — ActionResult.vue** : Le composant affiche le résultat streamé progressivement avec deux boutons : "Accepter" (remplace la sélection) et "Rejeter" (annule).

5. **AC5 — Prompts externalisés** : Chaque prompt d'action est externalisé dans `server/prompts/actions/{actionType}.md` — NFR14. Un prompt placeholder "reformulate" est créé pour valider le pipeline complet.

## Tasks / Subtasks

- [ ] **Task 1 : Définir les types et schéma Zod pour les actions** (AC: #2, #5)
  - [ ] Créer `shared/types/action.types.ts` avec `ActionType` (union des 9 types d'actions) et `ActionContext`
  - [ ] Exporter depuis `shared/types/index.ts`
  - [ ] Ajouter `generateActionRequestSchema` dans `shared/schemas/generate.schema.ts`
  - [ ] Exporter le type `GenerateActionRequest`

- [ ] **Task 2 : Créer l'endpoint POST /api/generate/action** (AC: #2, #5)
  - [ ] Ajouter la route dans `server/routes/generate.routes.ts`
  - [ ] Valider avec `generateActionRequestSchema`
  - [ ] Charger le prompt depuis `server/prompts/actions/{actionType}.md` via `loadPrompt`
  - [ ] Streamer la réponse SSE (même pattern que generate/article)
  - [ ] Créer `server/prompts/actions/reformulate.md` — prompt placeholder pour valider le pipeline

- [ ] **Task 3 : Créer le composable `useContextualActions`** (AC: #3)
  - [ ] Créer `src/composables/useContextualActions.ts`
  - [ ] State : `isExecuting`, `streamedResult`, `actionError`, `currentAction`
  - [ ] `executeAction(actionType, selectedText, context)` — appelle l'API via `useStreaming`
  - [ ] `acceptResult(editor)` — remplace la sélection dans l'éditeur TipTap via `editor.chain().focus().insertContent(result).run()`
  - [ ] `rejectResult()` — reset le state sans modifier l'éditeur
  - [ ] Cleanup : `abort()` si le composant est démonté pendant le streaming

- [ ] **Task 4 : Créer le composant `ActionMenu.vue`** (AC: #1)
  - [ ] Créer `src/components/actions/ActionMenu.vue`
  - [ ] Afficher les 9 actions groupées : Réécriture (3), Enrichissement (4), Structure (2)
  - [ ] Chaque action : icône + label
  - [ ] Emit `'select-action'` avec `ActionType` au clic
  - [ ] Prop `disabled: boolean` pour désactiver pendant l'exécution

- [ ] **Task 5 : Créer le composant `ActionResult.vue`** (AC: #4)
  - [ ] Créer `src/components/actions/ActionResult.vue`
  - [ ] Props : `result: string`, `isStreaming: boolean`
  - [ ] Affichage du texte streamé progressivement
  - [ ] Bouton "Accepter" (emit `'accept'`) — enabled quand le streaming est terminé
  - [ ] Bouton "Rejeter" (emit `'reject'`) — toujours enabled
  - [ ] Spinner pendant le streaming

- [ ] **Task 6 : Intégrer dans EditorBubbleMenu et ArticleEditorView** (AC: #1, #3, #4)
  - [ ] Ajouter un bouton "Actions IA" dans `EditorBubbleMenu.vue` (après le bouton Link)
  - [ ] Emit `'open-actions'` au clic
  - [ ] Dans `ArticleEditorView.vue` : gérer le state du menu d'actions (showActionMenu, showActionResult)
  - [ ] Quand `open-actions` → afficher `ActionMenu` (positionné via popover/dropdown)
  - [ ] Quand `select-action` → exécuter via `useContextualActions`, afficher `ActionResult`
  - [ ] Quand `accept` → `acceptResult(editor)`, fermer
  - [ ] Quand `reject` → `rejectResult()`, fermer

- [ ] **Task 7 : Tests** (AC: tous)
  - [ ] Tests du composable `useContextualActions` — 4 tests :
    - executeAction appelle useStreaming avec les bons paramètres
    - acceptResult insère le contenu dans l'éditeur
    - rejectResult reset le state
    - Gestion d'erreur pendant le streaming
  - [ ] Tests du composant `ActionMenu` — 2 tests :
    - Affiche les 9 actions
    - Emit 'select-action' au clic
  - [ ] Tests du composant `ActionResult` — 2 tests :
    - Affiche le résultat et les boutons Accept/Reject
    - Bouton Accepter disabled pendant le streaming
  - [ ] Tests backend endpoint — 2 tests :
    - Valide le schéma de requête (rejet si invalide)
    - Streame la réponse SSE correctement
  - [ ] `npx vitest run` — tous les tests passent
  - [ ] `npx vue-tsc --build` — type-check clean

## Dev Notes

### Architecture — Actions Contextuelles [Source: architecture.md#FR25-FR33]

L'architecture définit 9 actions IA distinctes organisées en 3 groupes :
- **Réécriture** : Reformuler (FR25), Simplifier (FR26), Convertir en liste (FR27)
- **Enrichissement** : Exemple PME (FR28), Optimiser mot-clé (FR29), Statistique sourcée (FR30), Answer Capsule (FR31)
- **Structure** : Formuler en question (FR32), Injecter lien interne (FR33)

Story 4.1 crée l'INFRASTRUCTURE. Les prompts spécifiques et la logique métier de chaque action arrivent dans Stories 4.2, 4.3, 4.4.

### Existing SSE Streaming Pattern [Source: server/routes/generate.routes.ts]

Le pattern SSE est déjà établi dans `generate.routes.ts` :
```typescript
// 1. Validate with Zod
const parsed = schema.safeParse(req.body)
// 2. Load prompt
const systemPrompt = await loadPrompt('system-propulsite')
const userPrompt = await loadPrompt('action-name', variables)
// 3. SSE headers
res.writeHead(200, { 'Content-Type': 'text/event-stream', ... })
// 4. Stream chunks
for await (const chunk of streamChatCompletion(systemPrompt, userPrompt)) {
  res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`)
}
// 5. Done event
res.write(`event: done\ndata: ${JSON.stringify({ content: fullContent })}\n\n`)
```

### Existing useStreaming Composable [Source: src/composables/useStreaming.ts]

Le composable `useStreaming` gère le fetch POST + ReadableStream + parsing SSE. Il expose :
- `startStream(url, body, callbacks)` — lance le stream
- `chunks`, `isStreaming`, `error`, `result` — state réactif
- `abort()` — annule le stream

`useContextualActions` doit utiliser `useStreaming` en interne, pas refaire le parsing SSE.

### Prompt Loader [Source: server/utils/prompt-loader.ts]

`loadPrompt(name, variables)` charge `server/prompts/${name}.md` et remplace les `{{variable}}`. Pour les actions, appeler :
```typescript
loadPrompt('actions/reformulate', { selectedText, keyword, ... })
```
Cela résout vers `server/prompts/actions/reformulate.md`.

### Existing EditorBubbleMenu [Source: src/components/editor/EditorBubbleMenu.vue]

Le BubbleMenu existant a 3 boutons (Bold, Italic, Link). Il utilise `BubbleMenu` de `@tiptap/vue-3/menus` avec `tippyOptions`. Le bouton "Actions IA" doit être ajouté APRÈS le bouton Link, avec un emit pour déclencher l'ouverture du menu d'actions.

### TipTap Selection Replacement Pattern

Pour remplacer la sélection dans l'éditeur TipTap :
```typescript
// Remplacer la sélection actuelle par le nouveau contenu
editor.chain().focus().insertContent(newContent).run()
```
La méthode `insertContent` remplace le contenu sélectionné si une sélection est active. Il faut s'assurer que la sélection est préservée pendant le streaming de l'action.

**ATTENTION** : La sélection TipTap peut être perdue si l'utilisateur clique ailleurs. Le composable doit sauvegarder la position de sélection (from/to) au moment de l'exécution et la restaurer avant l'insertion.

```typescript
// Sauvegarder la sélection
const { from, to } = editor.state.selection
// Restaurer et remplacer
editor.chain().focus().setTextSelection({ from, to }).insertContent(result).run()
```

### ActionType Definition

```typescript
// shared/types/action.types.ts
export type ActionType =
  | 'reformulate'
  | 'simplify'
  | 'convert-list'
  | 'pme-example'
  | 'keyword-optimize'
  | 'add-statistic'
  | 'answer-capsule'
  | 'question-heading'
  | 'internal-link'

export interface ActionContext {
  articleSlug: string
  keyword?: string
  keywords?: string[]
}
```

### Generate Action Request Schema

```typescript
// In shared/schemas/generate.schema.ts
export const generateActionRequestSchema = z.object({
  actionType: z.enum([
    'reformulate', 'simplify', 'convert-list',
    'pme-example', 'keyword-optimize', 'add-statistic',
    'answer-capsule', 'question-heading', 'internal-link',
  ]),
  selectedText: z.string().min(1),
  articleSlug: z.string().min(1),
  keyword: z.string().optional(),
  keywords: z.array(z.string()).optional(),
})
```

### Component Organization [Source: architecture.md#Components]

Les composants actions vont dans `src/components/actions/` :
```
src/components/actions/
  ├── ActionMenu.vue        # Menu des 9 actions
  └── ActionResult.vue      # Résultat avec Accept/Reject
```

### CSS Variables [Source: src/assets/styles/variables.css]

```css
--color-primary: #2563eb;
--color-success: #16a34a;
--color-warning: #d97706;
--color-text-muted: #64748b;
--color-bg-elevated: #ffffff;
--color-border: #e2e8f0;
```

### Anti-patterns

- PAS de parsing SSE custom dans useContextualActions — utiliser `useStreaming` existant
- PAS de `any` TypeScript — typer ActionType comme union stricte
- PAS de modification directe du DOM — utiliser les commandes TipTap (chain/focus/insertContent)
- PAS de prompt en dur dans le code — externaliser dans `server/prompts/actions/` (NFR14)
- ATTENTION : Sauvegarder la position de sélection (from/to) AVANT le streaming car la sélection peut être perdue
- ATTENTION : Le bouton "Accepter" doit être disabled pendant le streaming (résultat incomplet)
- ATTENTION : `loadPrompt` résout les chemins avec `/` — appeler `loadPrompt('actions/reformulate', ...)` pas `loadPrompt('reformulate', ...)`

### Previous Story Intelligence (3.4)

**Code review findings Story 3.4 :**
- M1: SaveStatusIndicator missing relative timestamp — fixed (added relativeTime computed)
- L1-L3: Minor test/UX improvements noted

**Patterns établis dans Stories 3.1-3.4 :**
- `useStreaming` — SSE consumption composable with startStream/abort/chunks/isStreaming
- `editor.store.ts` — Pinia setup mode with isSaving, lastSavedAt, isDirty
- Component pattern : defineProps + defineEmits, scoped styles with CSS variables
- Test pattern : vitest + @vue/test-utils mount, vi.mock for services
- Zod v4 import: `from 'zod/v4'` (NOT `from 'zod'`)
- Backend SSE pattern: writeHead + for-await-of streamChatCompletion + event: chunk/done/error

**194 tests passent actuellement.**

### Dependencies

- **Depends on** : Story 3.3 (EditorBubbleMenu, TipTap editor, useStreaming, Claude service) — DONE
- **Consumed by** : Story 4.2 (réécriture actions prompts), Story 4.3 (enrichissement prompts), Story 4.4 (structural actions)

### Project Structure Notes

- `shared/types/action.types.ts` — Nouveau fichier types
- `shared/schemas/generate.schema.ts` — Modifié (ajout generateActionRequestSchema)
- `shared/types/index.ts` — Modifié (export action types)
- `server/routes/generate.routes.ts` — Modifié (ajout route /api/generate/action)
- `server/prompts/actions/reformulate.md` — Nouveau (prompt placeholder)
- `src/composables/useContextualActions.ts` — Nouveau composable
- `src/components/actions/ActionMenu.vue` — Nouveau composant
- `src/components/actions/ActionResult.vue` — Nouveau composant
- `src/components/editor/EditorBubbleMenu.vue` — Modifié (ajout bouton Actions IA)
- `src/views/ArticleEditorView.vue` — Modifié (intégration action flow)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#FR25-FR33 — Actions Contextuelles]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Endpoints — POST /api/generate/action]
- [Source: _bmad-output/planning-artifacts/architecture.md#Components — actions/]
- [Source: _bmad-output/planning-artifacts/architecture.md#NFR14 — Prompts externalisés]
- [Source: server/routes/generate.routes.ts] — Existing SSE pattern
- [Source: src/composables/useStreaming.ts] — SSE consumption composable
- [Source: src/components/editor/EditorBubbleMenu.vue] — Existing BubbleMenu
- [Source: server/utils/prompt-loader.ts] — Prompt loader
- [Source: shared/schemas/generate.schema.ts] — Existing Zod schemas

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
