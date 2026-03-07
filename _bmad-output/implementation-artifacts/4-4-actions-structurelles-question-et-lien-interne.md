# Story 4.4: Actions Structurelles — Question et Lien Interne

Status: done

## Story

As a rédacteur utilisant l'éditeur d'articles,
I want reformuler un titre en question et injecter manuellement un lien interne via les actions contextuelles du Bubble Menu,
so that je puisse optimiser la structure GEO (70%+ titres en questions) et le maillage interne de manière ciblée.

## Acceptance Criteria

1. **AC1 — Formuler en question (FR32)** : Given que l'utilisateur a sélectionné un titre H2 ou H3, When il choisit "Formuler en question" dans le Bubble Menu, Then le titre est reformulé en question pertinente via le pipeline SSE existant, And le ton Propulsite est maintenu.

2. **AC2 — Injecter lien interne (FR33)** : Given que l'utilisateur a sélectionné du texte, When il choisit "Lien interne", Then une liste des articles du même cocon s'affiche pour choisir la cible, And un lien interne est créé sur la sélection vers l'article choisi, And le lien utilise l'extension TipTap `internalLink` avec les attributs `slug` et `href`.

3. **AC3 — Prompts externalisés (NFR14)** : Le prompt `question-heading.md` est externalisé dans `server/prompts/actions/` et utilise les variables `{{selectedText}}` et `{{keywordInstruction}}` du pipeline existant.

4. **AC4 — Lien interne sans IA** : L'action `internal-link` ne passe PAS par le pipeline SSE/IA — c'est une interaction UI pure (article picker → TipTap mark).

5. **AC5 — Tests** : Chaque action est couverte par des tests vérifiant le chargement du prompt (question-heading) et le comportement du composable (internal-link).

## Tasks / Subtasks

- [x] **Task 1 : Créer le prompt `question-heading.md`** (AC: #1, #3)
  - [x] Créer `server/prompts/actions/question-heading.md`
  - [x] Le prompt doit reformuler un titre H2/H3 en question pertinente
  - [x] Utiliser `{{selectedText}}` comme titre à transformer et `{{keywordInstruction}}` pour le mot-clé
  - [x] La question doit être naturelle et optimisée GEO
  - [x] Output en texte brut, sans balises HTML (pas de `<h2>` — juste le texte du titre)

- [x] **Task 2 : Implémenter le flux `internal-link` dans `useContextualActions`** (AC: #2, #4)
  - [x] Ajouter un état `showArticlePicker` (ref boolean) au composable
  - [x] Ajouter un état `pendingLinkAction` pour stocker le contexte (editor, from, to) en attente
  - [x] Quand `actionType === 'internal-link'`, ne PAS appeler le pipeline SSE — déclencher l'article picker
  - [x] Ajouter `applyInternalLink(article: Article)` qui applique le mark TipTap `internalLink` avec `slug` et `href`
  - [x] Ajouter `cancelLink()` pour fermer le picker sans appliquer

- [x] **Task 3 : Créer le composant `ArticlePicker.vue`** (AC: #2)
  - [x] Composant modal/dropdown qui liste les articles disponibles dans le cocon courant
  - [x] Utiliser `useArticlesStore` pour accéder aux articles (déjà chargés par `CocoonView`)
  - [x] Chaque article affiche son titre et son slug
  - [x] Émettre `select-article` avec l'article choisi
  - [x] Émettre `cancel` pour fermer sans sélection
  - [x] Style cohérent avec `ActionMenu.vue` (même design system)

- [x] **Task 4 : Intégrer `ArticlePicker` dans `EditorBubbleMenu`** (AC: #2)
  - [x] Afficher `ArticlePicker` quand `showArticlePicker` est true (via le composable)
  - [x] Passer les articles du store au picker
  - [x] Connecter `select-article` → `applyInternalLink(article)`
  - [x] Connecter `cancel` → `cancelLink()`

- [x] **Task 5 : Tests** (AC: #5)
  - [x] Test unitaire : `loadPrompt('actions/question-heading', variables)` charge correctement
  - [x] Test d'intégration : POST /api/generate/action pour actionType `question-heading` → SSE valide
  - [x] Test composable : `executeAction('internal-link', ...)` déclenche `showArticlePicker` au lieu du pipeline SSE
  - [x] Test composable : `applyInternalLink(article)` applique le mark TipTap correctement
  - [x] `npx vitest run` — tous les tests passent
  - [x] `npx vue-tsc --build` — type-check clean

## Dev Notes

### Architecture — Actions Structurelles [Source: architecture.md#FR32-FR33]

Les 2 actions structurelles sont le troisième et dernier groupe d'actions contextuelles :
- **Formuler en question (FR32)** : `actionType: 'question-heading'` → `server/prompts/actions/question-heading.md`
- **Lien interne (FR33)** : `actionType: 'internal-link'` → PAS de prompt, interaction UI pure

### DIFFÉRENCE CRITIQUE : question-heading vs internal-link

**question-heading (FR32)** — Action IA standard :
- Suit le même pattern que toutes les actions précédentes (Stories 4.2-4.3)
- Pipeline SSE : `loadPrompt('actions/question-heading', variables)` → `streamChatCompletion` → SSE
- L'utilisateur accepte/rejette le résultat via `ActionResult.vue`
- Le prompt transforme un titre en question

**internal-link (FR33)** — Action UI pure, PAS d'IA :
- NE passe PAS par `/api/generate/action`
- NE charge PAS de prompt
- Flow : sélection texte → clic "Lien interne" → article picker → choix article → application mark TipTap
- Utilise l'extension `InternalLink` déjà créée en Story 3.3 (`src/components/editor/tiptap/extensions/internal-link.ts`)
- Le mark TipTap `internalLink` a deux attributs : `slug` (data-slug) et `href`

### Extension TipTap InternalLink — DÉJÀ EXISTANTE [Source: src/components/editor/tiptap/extensions/internal-link.ts]

```typescript
// Mark-type extension avec attributs slug et href
// Parse: <a class="internal-link" data-slug="..." href="...">
// Pour appliquer: editor.chain().focus().setTextSelection({from, to}).setMark('internalLink', { slug, href }).run()
// Pour retirer: editor.chain().focus().unsetMark('internalLink').run()
```

### Modification du composable useContextualActions — APPROCHE

Le composable doit être modifié pour gérer le cas spécial `internal-link` :

```typescript
// AVANT (toutes les actions passent par SSE)
async function executeAction(actionType, selectedText, context, editor) {
  await startStream('/api/generate/action', { actionType, selectedText, ... })
}

// APRÈS (internal-link bypass le SSE)
async function executeAction(actionType, selectedText, context, editor) {
  if (actionType === 'internal-link') {
    // Sauvegarder le contexte et afficher le picker
    showArticlePicker.value = true
    pendingLinkAction.value = { editor, from, to }
    return
  }
  // Toutes les autres actions passent par SSE normalement
  await startStream('/api/generate/action', { actionType, selectedText, ... })
}
```

### Articles Store — DÉJÀ EXISTANT [Source: src/stores/articles.store.ts]

```typescript
// useArticlesStore fournit articles par cocon
// articles.value contient Article[] avec slug, title, etc.
// Les articles sont déjà chargés par CocoonView/ArticleWorkflowView
```

### Prompt Pattern établi en Stories 4.2-4.3 (après code reviews)

Les prompts d'action NE doivent PAS inclure "Tu es un rédacteur..." (system-propulsite suffit). Pattern :

```markdown
[VERBE D'ACTION] le texte suivant en :
- Critère 1
- ...

Texte :
"""
{{selectedText}}
"""

{{keywordInstruction}}

Réponds UNIQUEMENT avec [le résultat] en texte brut, sans balises HTML, sans explication ni commentaire.
```

### GEO Context pour question-heading [Source: server/prompts/system-propulsite.md#L28]

Le system prompt dit : "Formule les H2 et H3 sous forme de questions quand c'est pertinent (cible : 70%+ des titres en questions)". Le prompt `question-heading.md` doit renforcer cette directive.

### Anti-patterns

- PAS de "Tu es un rédacteur..." dans les prompts d'action
- PAS de balises HTML dans l'output de question-heading (c'est juste le texte du titre)
- PAS de pipeline SSE pour internal-link — c'est une interaction UI pure
- PAS de `{{#if}}` dans les prompts — `loadPrompt` ne supporte que `replaceAll`
- L'extension `InternalLink` est un **Mark** (pas un Node) — elle s'applique sur du texte sélectionné

### Previous Story Intelligence (4.3)

**Code review findings Story 4.3 :**
- M1: Grammar error "de exactement" → "d'exactement" corrigé
- L1-L2: Tests mock pattern acceptable, keyword-optimize edge case noté
- Pattern stable : 4 prompts créés + 8 tests en 1 session

**Patterns établis dans Stories 4.1-4.3 :**
- Prompt utilise `{{selectedText}}` et `{{keywordInstruction}}` comme seules variables
- `loadPrompt` résout `actions/{actionType}` → `server/prompts/actions/{actionType}.md`
- Tests mock `loadPrompt` et `streamChatCompletion` pour les tests unitaires/intégration
- Le route handler construit `keywordInstruction` en JavaScript avant d'appeler `loadPrompt`
- Zod v4 import: `from 'zod/v4'` (NOT `from 'zod'`)
- Fichiers prompts : NE PAS dupliquer le rôle du system prompt

**217 tests passent actuellement.**

### Dependencies

- **Depends on** : Story 4.1 (infrastructure) — DONE, Story 3.3 (TipTap extensions) — DONE
- **Consumed by** : Epic 5 (SEO/GEO scoring) utilisera les titres en questions et liens internes pour le scoring

### Project Structure Notes

- `server/prompts/actions/question-heading.md` — Nouveau fichier
- `src/composables/useContextualActions.ts` — MODIFIÉ (ajout flow internal-link)
- `src/components/actions/ArticlePicker.vue` — Nouveau fichier
- `src/components/editor/EditorBubbleMenu.vue` — MODIFIÉ (intégration ArticlePicker)
- Aucune modification au route handler — l'infrastructure est générique

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4 — Actions Structurelles]
- [Source: _bmad-output/planning-artifacts/architecture.md#FR32-FR33 — Actions Structurelles]
- [Source: server/prompts/system-propulsite.md#L28] — GEO directive "70%+ titres en questions"
- [Source: src/components/editor/tiptap/extensions/internal-link.ts] — TipTap InternalLink extension
- [Source: src/composables/useContextualActions.ts] — Composable actions contextuelles
- [Source: src/stores/articles.store.ts] — Articles store
- [Source: src/components/actions/ActionMenu.vue] — ActionMenu avec groupe Structure
- [Source: _bmad-output/implementation-artifacts/4-3-actions-denrichissement-seo-geo-exemple-pme-mot-cle-statistique-answer-capsule.md] — Previous story

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A — clean implementation.

### Completion Notes List

- Created question-heading.md prompt following established pattern (action verb, no role definition, plain text output)
- Modified useContextualActions to handle internal-link as UI-only flow (no SSE pipeline)
- Added showArticlePicker ref, applyInternalLink(article), cancelLink() to composable
- Created ArticlePicker.vue component with article list, select/cancel events, consistent design
- Integrated ArticlePicker in ArticleEditorView.vue with overlay pattern matching ActionMenu/ActionResult
- 4 new tests: 1 prompt-loader + 1 SSE integration + 2 composable (internal-link flow + applyInternalLink)
- Total: 221 tests pass, type-check clean

### File List

- `server/prompts/actions/question-heading.md` — NEW
- `src/composables/useContextualActions.ts` — MODIFIED (internal-link flow)
- `src/components/actions/ArticlePicker.vue` — NEW
- `src/views/ArticleEditorView.vue` — MODIFIED (ArticlePicker integration)
- `tests/unit/utils/prompt-loader.test.ts` — MODIFIED (1 new test)
- `tests/unit/routes/generate.routes.test.ts` — MODIFIED (1 new test)
- `tests/unit/composables/useContextualActions.test.ts` — MODIFIED (2 new tests)
