> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

---
title: 'UX & Features — Undo/Redo, Skeletons, Optimistic Updates, Raccourcis clavier'
slug: 'ux-features-v1'
created: '2026-04-09'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Vue 3.4', 'TypeScript 5', 'Pinia 2', 'TipTap 2', 'Vitest']
files_to_modify:
  - 'src/components/editor/ArticleEditor.vue'
  - 'src/components/editor/EditorToolbar.vue'
  - 'src/stores/editor.store.ts'
  - 'src/stores/outline.store.ts'
  - 'src/views/ArticleWorkflowView.vue'
  - 'src/views/ArticleEditorView.vue'
  - 'src/views/DashboardView.vue'
  - 'src/views/CocoonLandingView.vue'
  - 'src/views/RedactionView.vue'
files_to_create:
  - 'src/components/shared/SkeletonLoader.vue'
  - 'src/components/shared/SkeletonCard.vue'
  - 'src/components/shared/SkeletonText.vue'
  - 'src/composables/useKeyboardShortcuts.ts'
  - 'tests/unit/components/skeleton-loader.test.ts'
  - 'tests/unit/composables/useKeyboardShortcuts.test.ts'
code_patterns:
  - 'TipTap editor.commands.undo() / redo() natifs'
  - 'CSS @keyframes shimmer pour skeleton animation'
  - 'Vue Transition pour les changements d état'
test_patterns:
  - 'Vitest + @vue/test-utils'
---

# Tech-Spec: UX & Features — Undo/Redo, Skeletons, Optimistic Updates, Raccourcis clavier

**Created:** 2026-04-09

## Overview

### Problem Statement

L'application fonctionne mais l'expérience utilisateur manque de polish :

1. **Pas de Undo/Redo exposé** — TipTap supporte nativement Ctrl+Z/Ctrl+Y mais les boutons ne sont pas dans la toolbar, et l'outline editor n'a aucun undo.
2. **Transitions spinner → contenu abruptes** — Les données apparaissent d'un coup après un LoadingSpinner, sans transition visuelle. Pas de skeleton screens.
3. **Pas d'optimistic updates** — Chaque sauvegarde (article, keywords, outline) attend la réponse serveur avant de mettre à jour l'UI. L'utilisateur attend sans feedback.
4. **Pas de raccourcis clavier globaux** — Ctrl+S ne sauvegarde pas, pas de raccourci pour naviguer entre les étapes.

### Solution

- Exposer les boutons Undo/Redo dans la toolbar TipTap + ajouter un undo basique pour l'outline
- Créer des composants Skeleton réutilisables (SkeletonLoader, SkeletonCard, SkeletonText)
- Ajouter des optimistic updates dans les stores critiques (editor, outline, article-keywords)
- Créer un composable `useKeyboardShortcuts` pour les raccourcis globaux

### Scope

**In Scope :**
- Boutons Undo/Redo dans EditorToolbar + raccourcis clavier Ctrl+Z/Y
- Undo basique pour l'outline (pile d'historique simple)
- Composants Skeleton pour Dashboard, articles, brief
- Optimistic update dans `editorStore.saveArticle()` (markClean immédiat, rollback si erreur)
- Raccourcis clavier : Ctrl+S (save), Escape (fermer panel)
- Tests unitaires

**Out of Scope :**
- Undo/Redo avancé (command pattern complet)
- Mode offline / service workers
- Bulk actions
- i18n
- Dark mode toggle

## Implementation Plan

### Tasks

#### Bloc A — Undo/Redo (Priorité 1)

- [x] **Task 1 : Ajouter boutons Undo/Redo dans EditorToolbar.vue**
  - File : `src/components/editor/EditorToolbar.vue`
  - Action :
    - Ajouter 2 boutons dans la toolbar : Undo (⟲) et Redo (⟳)
    - Bindings :
      - `@click="editor.commands.undo()"` / `:disabled="!editor.can().undo()"`
      - `@click="editor.commands.redo()"` / `:disabled="!editor.can().redo()"`
    - Style : mêmes classes que les boutons existants
  - Notes : TipTap StarterKit inclut déjà les extensions History (undo/redo). Les raccourcis Ctrl+Z/Y fonctionnent déjà dans l'éditeur, on ajoute juste les boutons visuels.

- [x] **Task 2 : Ajouter undo basique pour l'outline**
  - File : `src/stores/outline.store.ts`
  - Action :
    - Ajouter un `undoStack: ref<Outline[]>([])` et `redoStack: ref<Outline[]>([])`
    - Avant chaque opération modifiante (addSection, removeSection, updateSection, reorderSections) : `undoStack.value.push(deepClone(outline.value))`
    - Actions `undo()` : pop du undoStack, push current dans redoStack, restore
    - Actions `redo()` : pop du redoStack, push current dans undoStack, restore
    - Computed : `canUndo`, `canRedo`
    - Limiter le stack à 20 entrées (shift oldest)
  - Notes : Deep clone simple via `JSON.parse(JSON.stringify())` — les Outline sont des objets sérialisables

- [x] **Task 3 : Boutons Undo/Redo dans le OutlineEditor**
  - File : `src/views/ArticleWorkflowView.vue` (section outline)
  - Action : Ajouter des boutons Undo/Redo liés à `outlineStore.undo()` / `outlineStore.redo()`

#### Bloc B — Skeleton Screens (Priorité 2)

- [x] **Task 4 : Créer `SkeletonLoader.vue`**
  - File : `src/components/shared/SkeletonLoader.vue`
  - Action : Composant wrapper qui :
    - Props : `loading: boolean`, `lines?: number` (default: 3)
    - Si `loading=true` : affiche des barres grises animées (shimmer)
    - Si `loading=false` : affiche le `<slot>`
    - Animation CSS `@keyframes shimmer` avec gradient linéaire
    - Style cohérent : `border-radius: 4px`, couleurs via `--color-bg-soft`, `--color-border`

- [x] **Task 5 : Créer `SkeletonCard.vue`**
  - File : `src/components/shared/SkeletonCard.vue`
  - Action : Skeleton en forme de carte (rectangle avec header + 3 lignes de texte)
  - Props : `width?: string`, `height?: string`
  - Usage : remplacer les `<LoadingSpinner />` dans les listes de cartes (Dashboard, CocoonLanding)

- [x] **Task 6 : Créer `SkeletonText.vue`**
  - File : `src/components/shared/SkeletonText.vue`
  - Action : Lignes de texte animées de longueurs variables
  - Props : `lines?: number` (default: 3), `lastLineWidth?: string` (default: '60%')

- [x] **Task 7 : Remplacer les LoadingSpinner par des Skeletons**
  - Files : `src/views/DashboardView.vue`, `src/views/CocoonLandingView.vue`, `src/views/RedactionView.vue`
  - Action :
    - Dashboard : remplacer le spinner de chargement des silos par 3 `<SkeletonCard />`
    - CocoonLanding : remplacer le spinner articles par des `<SkeletonCard />` en grille
    - RedactionView : même chose pour la liste d'articles
  - Notes : Garder le `<LoadingSpinner />` pour les actions courtes (generate, save). Les skeletons sont pour le chargement initial de page.

- [x] **Task 8 : Skeleton pour le brief dans ArticleWorkflowView**
  - File : `src/views/ArticleWorkflowView.vue`
  - Action : Quand `briefStore.isLoading`, afficher un `<SkeletonText :lines="5" />` au lieu du spinner dans le panneau brief

#### Bloc C — Optimistic Updates (Priorité 3)

- [x] **Task 9 : Optimistic save dans editorStore**
  - File : `src/stores/editor.store.ts`
  - Action : Dans `saveArticle(slug)` :
    1. **Avant** l'appel API : `markClean()` immédiatement (l'UI montre "Sauvegardé" tout de suite)
    2. Sauvegarder l'état précédent : `const previousDirty = isDirty.value`
    3. En cas d'erreur : rollback `isDirty.value = true` + notification via `useNotify().error('Erreur de sauvegarde')` (dépend de Spec 1)
    4. En cas de succès : `lastSavedAt.value = new Date().toISOString()`
  - Notes : Si Spec 1 (toasts) n'est pas encore implémentée, utiliser `log.error()` en attendant. Le rollback fonctionne indépendamment.

- [x] **Task 10 : Optimistic validate dans outlineStore**
  - File : `src/stores/outline.store.ts`
  - Action : Dans `validateOutline(slug)` :
    1. `isValidated.value = true` immédiatement
    2. Appel API en background
    3. Si erreur : `isValidated.value = false` + notification d'erreur

#### Bloc D — Raccourcis clavier (Priorité 4)

- [x] **Task 11 : Créer `useKeyboardShortcuts.ts`**
  - File : `src/composables/useKeyboardShortcuts.ts`
  - Action : Composable qui :
    - Enregistre des raccourcis clavier globaux via `addEventListener('keydown', ...)`
    - Cleanup via `onBeforeUnmount` (removeEventListener)
    - API : `useKeyboardShortcuts(shortcuts: { keys: string, action: () => void }[])`
    - Gère les combos : `Ctrl+S`, `Ctrl+Z`, `Escape`
    - Ne s'active PAS quand un input/textarea est focus (sauf Ctrl+S qui marche partout)

- [x] **Task 12 : Intégrer les raccourcis dans les vues article**
  - Files : `src/views/ArticleWorkflowView.vue`, `src/views/ArticleEditorView.vue`
  - Action :
    - `Ctrl+S` : appelle `editorStore.saveArticle(slug)` + `event.preventDefault()` (empêche le save navigateur)
    - `Escape` : ferme le panel latéral actif (SEO, Geo, Links)

#### Bloc E — Tests

- [x] **Task 13 : Tests skeletons**
  - File : `tests/unit/components/skeleton-loader.test.ts`
  - Action :
    - `it('affiche le skeleton quand loading=true')`
    - `it('affiche le slot quand loading=false')`
    - `it('affiche le bon nombre de lignes')`
    - `it('applique l animation shimmer')` — vérifier la classe CSS

- [x] **Task 14 : Tests raccourcis clavier**
  - File : `tests/unit/composables/useKeyboardShortcuts.test.ts`
  - Action :
    - `it('exécute l action quand le raccourci est pressé')` — simuler Ctrl+S, vérifier que l'action est appelée
    - `it('ne s active pas dans un input')` — focus un input, simuler Ctrl+Z, vérifier que l'action n'est PAS appelée
    - `it('cleanup les listeners sur unmount')` — unmount le composant, vérifier removeEventListener
    - `it('empêche le comportement par défaut du navigateur')` — Ctrl+S, vérifier `event.defaultPrevented`

- [x] **Task 15 : Tests outline undo/redo**
  - File : existant `tests/unit/stores/outline.store.test.ts` (ajouter des cas)
  - Action :
    - `it('undo restaure l état précédent après addSection')`
    - `it('redo refait l opération annulée')`
    - `it('canUndo est false quand le stack est vide')`
    - `it('le stack est limité à 20 entrées')`

## Additional Context

### Dependencies

Aucune nouvelle dépendance. TipTap History est déjà inclus dans StarterKit.

### Testing Strategy

- ~15 cas de test répartis sur 3 fichiers (Tasks 13-15)
- Simuler les événements clavier via `new KeyboardEvent('keydown', { key: 's', ctrlKey: true })`
- Pour les optimistic updates : mocker `apiPut` pour simuler un succès et un échec, vérifier l'état intermédiaire

### Notes

**Risques :**
1. **Ctrl+S dans l'éditeur TipTap** — TipTap capte déjà certains raccourcis. S'assurer que notre `useKeyboardShortcuts` ne crée pas de conflit. Prioriser le handler de l'éditeur si le focus est dans TipTap.
2. **Outline undo avec deepClone** — Pour les gros outlines (20+ sections), le JSON.parse/stringify est acceptable (<1ms). Pas besoin d'un système plus sophistiqué.
3. **Optimistic updates et Spec 1** — L'optimistic save fonctionne même sans le système de toast. Le toast est un bonus pour informer l'utilisateur en cas d'erreur rollback.

**Ordre d'implémentation recommandé :**
1. Task 1 (boutons undo/redo TipTap) — 15 min, gain immédiat
2. Tasks 4-6 (skeleton components) — 1h, amélioration visuelle
3. Task 11 (raccourcis clavier) — 30 min
4. Tasks 2-3 (outline undo) — 1h
5. Tasks 9-10 (optimistic updates) — 30 min
6. Tasks 7-8 (remplacement spinners) — 30 min
7. Tasks 12-15 (intégration + tests) — 1h

## Review Notes
- Adversarial review completed (24 findings)
- Findings: 10 relevant, 10 fixed, 0 skipped
- Resolution approach: auto-fix
- Fixes applied: redo stack bounded, Escape global for contentEditable, shimmer keyframes factored, matchesCombo strict modifier check, updateSection undo removed (keystroke granularity), outline error feedback, aria-label on undo/redo buttons, SkeletonCard aria-hidden, preventDefault opt-in
