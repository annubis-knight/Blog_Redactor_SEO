# Story 3.3: Éditeur TipTap avec Template Propulsite et Extensions Custom

Status: done

## Story

As a Arnau (utilisateur),
I want éditer le contenu généré dans un éditeur riche qui respecte la mise en forme Propulsite,
so that je puisse modifier le contenu avec une expérience d'édition fluide et fidèle au rendu final.

## Acceptance Criteria

1. **AC1 — Route ArticleEditorView** : La route `/article/:slug/editor` affiche `ArticleEditorView` avec l'éditeur TipTap chargé du contenu existant — FR21.

2. **AC2 — Éditeur TipTap principal** : Le composant `ArticleEditor.vue` affiche le contenu HTML dans un éditeur TipTap éditable, avec la mise en forme du template Propulsite — FR21, FR22.

3. **AC3 — Extensions custom** : Les 4 extensions custom TipTap sont fonctionnelles : `content-valeur`, `content-reminder`, `answer-capsule`, `internal-link`. Chaque extension rend son nœud avec le style Propulsite approprié — FR22.

4. **AC4 — EditorToolbar** : La toolbar de formatage de base est disponible : gras, italique, titres (H2, H3), listes (ordered, unordered), blockquote, lien — FR21.

5. **AC5 — BubbleMenu** : La sélection de texte déclenche l'affichage d'un Bubble Menu TipTap avec les actions de formatage de base (bold, italic, link) — FR24.

6. **AC6 — Styles editor.css** : Les styles de l'éditeur sont définis dans `src/assets/styles/editor.css` et appliqués au contenu TipTap — FR22.

7. **AC7 — Store integration** : Le store `editor` est étendu avec `isDirty` flag, `setContent(html)`, et le contenu TipTap se synchronise avec `editorStore.content` — FR21.

## Tasks / Subtasks

- [x] **Task 1 : Installer les dépendances TipTap supplémentaires** (AC: #2, #4, #5)
  - [x] Installer `@tiptap/extension-bubble-menu` pour le bubble menu
  - [x] Installer `@tiptap/extension-link` pour les liens
  - [x] Installer `@tiptap/extension-placeholder` pour le placeholder
  - [x] Vérifier que `@tiptap/starter-kit` et `@tiptap/vue-3` sont déjà installés

- [x] **Task 2 : Créer les 4 extensions custom TipTap** (AC: #3)
  - [x] Créer `src/components/editor/tiptap/extensions/content-valeur.ts` — Extension Node qui rend un `<div class="content-valeur">` avec titre icône et contenu
  - [x] Créer `src/components/editor/tiptap/extensions/content-reminder.ts` — Extension Node qui rend un `<div class="content-reminder">` avec icône rappel et contenu
  - [x] Créer `src/components/editor/tiptap/extensions/answer-capsule.ts` — Extension Node inline qui rend un `<span class="answer-capsule">` (20-25 mots, style encadré)
  - [x] Créer `src/components/editor/tiptap/extensions/internal-link.ts` — Extension Mark qui rend un `<a class="internal-link" data-slug="...">` avec attribut slug traçable

- [x] **Task 3 : Créer le composant `ArticleEditor.vue`** (AC: #2, #3)
  - [x] Créer `src/components/editor/ArticleEditor.vue`
  - [x] Props : `content` (string HTML), `editable` (boolean, default true)
  - [x] Emits : `update:content` (string HTML)
  - [x] Initialiser TipTap `useEditor` avec StarterKit + 4 extensions custom + Link + Placeholder
  - [x] Watcher sur `content` prop pour mettre à jour l'éditeur si contenu externe change
  - [x] Émettre `update:content` sur chaque `onUpdate` du éditeur
  - [x] Cleanup : TipTap v3 `useEditor` auto-détruit l'éditeur sur `onBeforeUnmount` (pas besoin d'appel explicite)

- [x] **Task 4 : Créer le composant `EditorToolbar.vue`** (AC: #4)
  - [x] Créer `src/components/editor/EditorToolbar.vue`
  - [x] Props : `editor` (Editor instance)
  - [x] Boutons : Bold, Italic, H2, H3, Bullet List, Ordered List, Blockquote, Link, Undo, Redo
  - [x] Chaque bouton utilise `editor.chain().focus().toggle*().run()` pattern
  - [x] État actif visuellement marqué via `editor.isActive('bold')` etc.
  - [x] Style sticky en haut de l'éditeur

- [x] **Task 5 : Créer le composant `BubbleMenu.vue`** (AC: #5)
  - [x] Créer `src/components/editor/EditorBubbleMenu.vue`
  - [x] Utiliser `BubbleMenu` de `@tiptap/vue-3/menus`
  - [x] Props : `editor` (Editor instance)
  - [x] Actions : Bold, Italic, Link (ajouter/modifier/supprimer)
  - [x] Style : barre flottante sombre avec boutons icônes

- [x] **Task 6 : Écrire les styles dans `editor.css`** (AC: #6)
  - [x] Styles `.ProseMirror` : font Georgia/serif, line-height 1.8, couleurs variables.css
  - [x] Styles des headings H2, H3 dans l'éditeur
  - [x] Styles des blocs custom : `.content-valeur`, `.content-reminder`, `.answer-capsule`, `.internal-link`
  - [x] Style `.ProseMirror p.is-editor-empty:first-child::before` pour le placeholder
  - [x] Styles du focus outline de l'éditeur
  - [x] Importer `editor.css` dans `main.css`

- [x] **Task 7 : Étendre le store `editor` avec `isDirty` et `setContent`** (AC: #7)
  - [x] Ajouter `isDirty: ref(false)` dans `editor.store.ts`
  - [x] Ajouter action `setContent(html: string)` qui met à jour `content` et `isDirty = true`
  - [x] Ajouter action `markClean()` qui reset `isDirty = false`
  - [x] Exposer `isDirty`, `setContent`, `markClean` dans le return

- [x] **Task 8 : Créer `ArticleEditorView.vue` et route** (AC: #1)
  - [x] Créer `src/views/ArticleEditorView.vue`
  - [x] Extraire `slug` de `route.params`
  - [x] `onMounted` : charger le contenu via `GET /api/articles/:slug/content` → `editorStore.setContent(article.content)`
  - [x] Inclure `EditorToolbar`, `ArticleEditor`, `EditorBubbleMenu`
  - [x] Bouton "← Retour au workflow" (RouterLink vers `/article/:slug`)
  - [x] Ajouter route `/article/:slug/editor` dans `src/router/index.ts` (lazy import)

- [x] **Task 9 : Ajouter bouton "Éditer l'article" dans ArticleWorkflowView** (AC: #1)
  - [x] Dans `ArticleWorkflowView.vue`, quand `editorStore.content` existe et n'est pas en génération
  - [x] Ajouter un `RouterLink` vers `/article/${slug}/editor` avec texte "Éditer l'article"
  - [x] Style : bouton primary, placé après ArticleMetaDisplay

- [x] **Task 10 : Tests et validation** (AC: tous)
  - [x] Tests du composant `ArticleEditor.vue` — 3 tests (render avec contenu, émission update, éditeur expose)
  - [x] Tests du composant `EditorToolbar.vue` — 2 tests (boutons rendus, toggle active state)
  - [x] Tests des extensions custom — 6 tests (parseHTML, renderHTML, attributes for all 4 extensions)
  - [x] Tests du store étendu — 3 tests (setContent, isDirty/markClean, resetEditor isDirty)
  - [x] `npx vitest run` — 183 tests passent (was 169)
  - [x] `npx vue-tsc --build` — type-check clean

## Dev Notes

### Architecture — Editor Route [Source: architecture.md#Routes]

L'architecture définit deux routes distinctes :
- `/article/:slug` → `ArticleWorkflowView` — Brief → Sommaire → Génération (read-only content display)
- `/article/:slug/editor` → `ArticleEditorView` — Éditeur TipTap riche (édition)

Le flow est : l'utilisateur génère l'article dans le workflow, puis clique "Éditer l'article" pour accéder à l'éditeur TipTap.

### TipTap Integration [Source: architecture.md#TipTap Integration]

```
TipTap Editor
  → event: update (content changed)
    → debounce 300ms
      → useSeoScoring(content, keywords) → met à jour store seo
      → useGeoScoring(content) → met à jour store geo
        → SeoPanel / GeoPanel réagissent via Pinia reactivity
```

Note : le scoring SEO/GEO est dans les Stories 5.x. Cette story se concentre uniquement sur l'éditeur lui-même.

### Existing TipTap Dependencies [Source: package.json]

Déjà installés :
- `@tiptap/starter-kit: ^3.20.1` — Extensions de base (Bold, Italic, Heading, BulletList, OrderedList, Blockquote, Code, History, etc.)
- `@tiptap/vue-3: ^3.20.1` — Intégration Vue 3 (useEditor, EditorContent)

**À INSTALLER** :
- `@tiptap/extension-bubble-menu` — Bubble menu sur sélection de texte
- `@tiptap/extension-link` — Extension Link pour les hyperliens
- `@tiptap/extension-placeholder` — Placeholder text quand l'éditeur est vide

### Existing Editor Store [Source: src/stores/editor.store.ts — Story 3.2]

Le store `editor` existe déjà avec :
- State : `content`, `streamedText`, `isGenerating`, `isGeneratingMeta`, `error`, `metaTitle`, `metaDescription`
- Actions : `generateArticle`, `generateMeta`, `saveArticle`, `resetEditor`

**À AJOUTER dans cette story** :
- `isDirty: ref(false)` — flag indiquant si le contenu a été modifié depuis la dernière sauvegarde
- `setContent(html: string)` — met à jour content et isDirty
- `markClean()` — reset isDirty à false (appelé après save)

### Existing ArticleWorkflowView [Source: src/views/ArticleWorkflowView.vue — Story 3.2]

Le view affiche actuellement le contenu généré via `ArticleStreamDisplay` (v-html read-only). Après cette story, il faudra ajouter un bouton/lien "Éditer l'article" qui navigue vers `/article/:slug/editor`.

### 4 Custom Extensions TipTap [Source: architecture.md#Components, prd.md#FR13, FR16]

Les 4 extensions correspondent aux blocs pédagogiques du template Propulsite :

1. **content-valeur** — Bloc "Le saviez-vous ?" / "Point clé" avec fond coloré, icône, et contenu informatif. Rendu : `<div class="content-valeur"><div class="cv-header">💡 Point clé</div><div class="cv-body">...</div></div>`

2. **content-reminder** — Bloc rappel "À retenir" avec fond différent et icône. Rendu : `<div class="content-reminder"><div class="cr-header">📌 À retenir</div><div class="cr-body">...</div></div>`

3. **answer-capsule** — Réponse courte (20-25 mots) après chaque H2, encadrée. Rendu : `<p class="answer-capsule">Réponse directe ici</p>` (GEO optimization — FR16, FR40)

4. **internal-link** — Lien interne traçable avec attribut slug. C'est un Mark (pas un Node). Rendu : `<a class="internal-link" href="/article/{slug}" data-slug="{slug}">texte ancre</a>` (FR45-FR52 maillage)

### TipTap Extension Pattern

```typescript
// Node extension pattern (content-valeur, content-reminder, answer-capsule)
import { Node } from '@tiptap/core'

export const ContentValeur = Node.create({
  name: 'contentValeur',
  group: 'block',
  content: 'block+',

  parseHTML() {
    return [{ tag: 'div.content-valeur' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'content-valeur', ...HTMLAttributes }, 0]
  },
})

// Mark extension pattern (internal-link)
import { Mark } from '@tiptap/core'

export const InternalLink = Mark.create({
  name: 'internalLink',

  addAttributes() {
    return {
      slug: { default: null },
      href: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'a.internal-link' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', { class: 'internal-link', ...HTMLAttributes }, 0]
  },
})
```

### TipTap useEditor Pattern [Source: @tiptap/vue-3]

```typescript
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const editor = useEditor({
  content: props.content,
  extensions: [
    StarterKit,
    Link.configure({ openOnClick: false }),
    Placeholder.configure({ placeholder: 'Commencez à écrire...' }),
    ContentValeur,
    ContentReminder,
    AnswerCapsule,
    InternalLink,
  ],
  onUpdate: ({ editor }) => {
    emit('update:content', editor.getHTML())
  },
})
```

### CSS Variables [Source: src/assets/styles/variables.css]

```css
--color-primary: #2563eb;
--color-success: #16a34a;
--color-error: #dc2626;
--color-warning: #d97706;
--color-text: #1e293b;
--color-text-muted: #64748b;
--color-border: #e2e8f0;
--color-surface: #f8fafc;
--color-background: #ffffff;
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Editor CSS Patterns [Source: src/assets/styles/editor.css — currently empty]

Le fichier `editor.css` existe mais est vide. Il faut y écrire les styles TipTap :

```css
/* ProseMirror base styles */
.ProseMirror { ... }
.ProseMirror:focus { outline: none; }

/* Headings */
.ProseMirror h2 { ... }
.ProseMirror h3 { ... }

/* Custom blocks — Propulsite template */
.content-valeur { background: #eff6ff; border-left: 4px solid var(--color-primary); ... }
.content-reminder { background: #fef3c7; border-left: 4px solid var(--color-warning); ... }
.answer-capsule { background: var(--color-surface); border: 1px solid var(--color-border); font-weight: 500; ... }
.internal-link { color: var(--color-primary); text-decoration: underline; ... }
```

### Existing Article API [Source: server/routes/articles.routes.ts]

- `GET /api/articles/:slug` — retourne l'article complet (content, metaTitle, metaDescription, etc.)
- `PUT /api/articles/:slug` — met à jour l'article (partial body)

Pour `ArticleEditorView.onMounted`, utiliser `apiGet('/articles/{slug}')` pour charger le contenu existant.

### API Service [Source: src/services/api.service.ts]

```typescript
import { apiGet, apiPut } from '@/services/api.service'
```

### Anti-patterns

- PAS de `any` TypeScript — typer toutes les props et returns
- PAS de modification du composable `useStreaming` — l'utiliser tel quel
- PAS de scoring dans cette story — le scoring SEO/GEO est Story 5.x
- PAS de auto-save dans cette story — auto-save est Story 3.4
- PAS de contextual actions dans cette story — les actions sont Epic 4
- PAS d'import de `@tiptap/extension-bubble-menu` dans `ArticleEditor.vue` — le BubbleMenu est un composant séparé qui reçoit l'instance editor
- ATTENTION : `editor.destroy()` dans `onBeforeUnmount` est obligatoire pour éviter les memory leaks
- ATTENTION : Le watcher sur `content` prop ne doit pas émettre `update:content` (boucle infinie). Vérifier `editor.getHTML() !== content` avant de `setContent`

### Previous Story Intelligence (3.2)

**Code review findings Story 3.2 :**
- M1: saveArticle runs even if generateMeta fails — fixed (added error check)
- M2: Old meta tags visible during regeneration — fixed (reset metas in generateArticle)

**Patterns établis dans Stories 3.1-3.2 :**
- `editor.store.ts` — Pinia setup mode, typed refs, async actions with try/catch
- Component pattern : defineProps + defineEmits, scoped styles with CSS variables
- Test pattern : vitest + @vue/test-utils mount, vi.mock for services

**169 tests passent actuellement.**

### Dependencies

- **Depends on** : Story 3.2 (editor store, article content, meta generation) — DONE
- **Consumed by** : Story 3.4 (Auto-save with isDirty flag), Story 4.1 (BubbleMenu actions), Story 5.x (Scoring panels)

### Project Structure Notes

- `src/components/editor/ArticleEditor.vue` — Nouveau composant (wrapper TipTap)
- `src/components/editor/EditorToolbar.vue` — Nouveau composant
- `src/components/editor/BubbleMenu.vue` — Nouveau composant
- `src/components/editor/tiptap/extensions/content-valeur.ts` — Nouvelle extension
- `src/components/editor/tiptap/extensions/content-reminder.ts` — Nouvelle extension
- `src/components/editor/tiptap/extensions/answer-capsule.ts` — Nouvelle extension
- `src/components/editor/tiptap/extensions/internal-link.ts` — Nouvelle extension
- `src/views/ArticleEditorView.vue` — Nouveau view
- `src/assets/styles/editor.css` — Modifié (styles TipTap)
- `src/stores/editor.store.ts` — Modifié (isDirty, setContent, markClean)
- `src/router/index.ts` — Modifié (ajout route /article/:slug/editor)
- `src/views/ArticleWorkflowView.vue` — Modifié (bouton "Éditer l'article")

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#TipTap Integration]
- [Source: _bmad-output/planning-artifacts/architecture.md#Routes]
- [Source: _bmad-output/planning-artifacts/architecture.md#Component Architecture]
- [Source: _bmad-output/planning-artifacts/prd.md#FR21-FR24]
- [Source: _bmad-output/planning-artifacts/prd.md#FR13 — blocs pédagogiques]
- [Source: _bmad-output/planning-artifacts/prd.md#FR16 — answer capsules]
- [Source: src/stores/editor.store.ts] — Editor store (Story 3.2)
- [Source: src/views/ArticleWorkflowView.vue] — Workflow view (Story 3.2)
- [Source: src/router/index.ts] — Router config
- [Source: src/assets/styles/editor.css] — Empty, ready for styles
- [Source: src/assets/styles/variables.css] — CSS variables
- [Source: src/components/outline/OutlineEditor.vue] — Component pattern reference
- [Source: package.json] — TipTap packages already installed

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 185 tests passing (was 169, +16 new)
- Type-check clean via `npx vue-tsc --build`
- All ACs implemented including Link button in toolbar (fixed in code review)
- Code review: H1 (Link button), M1 (File List), M2 ($patch), M3 (task desc), M4 (BubbleMenu test) — all fixed

### File List

**Created:**
- `src/components/editor/ArticleEditor.vue` — Main TipTap editor wrapper
- `src/components/editor/EditorToolbar.vue` — Formatting toolbar (10 buttons)
- `src/components/editor/EditorBubbleMenu.vue` — Floating bubble menu (Bold, Italic, Link)
- `src/components/editor/tiptap/extensions/content-valeur.ts` — Node extension
- `src/components/editor/tiptap/extensions/content-reminder.ts` — Node extension
- `src/components/editor/tiptap/extensions/answer-capsule.ts` — Node extension
- `src/components/editor/tiptap/extensions/internal-link.ts` — Mark extension
- `src/views/ArticleEditorView.vue` — Editor view with content loading
- `tests/unit/components/ArticleEditor.test.ts` — 3 tests
- `tests/unit/components/EditorToolbar.test.ts` — 2 tests
- `tests/unit/components/EditorBubbleMenu.test.ts` — 2 tests
- `tests/unit/components/tiptap-extensions.test.ts` — 6 tests

**Modified:**
- `src/stores/editor.store.ts` — Added isDirty, setContent, markClean
- `src/router/index.ts` — Added /article/:slug/editor route
- `src/views/ArticleWorkflowView.vue` — Added "Éditer l'article" button
- `src/assets/styles/editor.css` — Full TipTap + Propulsite styles
- `src/assets/styles/main.css` — Import editor.css
- `tests/unit/stores/editor.store.test.ts` — Added 3 tests (setContent, isDirty, markClean)
- `package.json` — Added @tiptap/extension-bubble-menu, extension-link, extension-placeholder
