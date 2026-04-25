> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

# Story 1.4: Phase ③ Assigner — Assignation avec gating souple

Status: done

## Story

As a consultant SEO,
I want l'onglet Assignation dans la Phase Assigner avec un message d'aide si je n'ai pas de capitaine validé,
so that je suis guidé vers l'Audit si nécessaire au lieu d'être bloqué.

## Acceptance Criteria

1. **Given** un article est sélectionné et au moins un mot-clé est validé comme capitaine dans l'Audit **When** l'utilisateur ouvre la Phase ③ Assigner **Then** l'onglet Assignation affiche l'interface habituelle (KeywordEditor) **And** l'utilisateur peut définir le capitaine, les lieutenants et le lexique (FR14).

2. **Given** un article est sélectionné mais aucun mot-clé n'est validé comme capitaine **When** l'utilisateur ouvre la Phase ③ Assigner **Then** un message explicatif (AssignmentGate) s'affiche : "Aucun mot-clé capitaine validé" **And** le message contient un lien cliquable vers l'onglet Audit (Phase ② Valider) **And** la navigation n'est PAS bloquée — l'utilisateur peut quand même accéder à l'Assignation.

3. **Given** l'utilisateur clique sur le lien vers l'Audit dans le message AssignmentGate **When** la navigation se fait **Then** l'utilisateur est redirigé vers l'onglet Audit dans la Phase ② Valider.

## Tasks / Subtasks

- [x] Task 1 : Intégrer `articleKeywordsStore` dans MoteurView (AC: #1, #2)
  - [x] 1.1 : Importer `useArticleKeywordsStore` dans MoteurView
  - [x] 1.2 : Appeler `articleKeywordsStore.fetchKeywords(slug)` quand un article est sélectionné
  - [x] 1.3 : Réinitialiser le store quand l'article change ou est désélectionné
- [x] Task 2 : Créer le message AssignmentGate dans l'onglet Assignation (AC: #2, #3)
  - [x] 2.1 : Afficher un message info quand `!articleKeywordsStore.hasKeywords` ET l'onglet actif est 'assignation'
  - [x] 2.2 : Le message contient un bouton "Aller à l'Audit →" qui navigue vers l'onglet audit
  - [x] 2.3 : Le message n'empêche PAS l'affichage du reste du contenu d'assignation (gating souple)
  - [x] 2.4 : Style CSS cohérent (info banner avec icône)
- [x] Task 3 : Tests unitaires Phase ③ Assigner (AC: #1-3)
  - [x] 3.1 : Test AssignmentGate s'affiche quand pas de capitaine
  - [x] 3.2 : Test AssignmentGate ne s'affiche PAS quand capitaine existe
  - [x] 3.3 : Test lien vers Audit navigue correctement
  - [x] 3.4 : Test contenu assignation reste visible même avec gate message

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**INCHANGÉ :**
- KeywordMigrationPreview.vue — composant de migration existant
- KeywordBadge.vue, ScoreGauge.vue — composants d'affichage
- article-keywords.store.ts — store existant avec `hasKeywords` computed
- keyword-assignment.service.ts — service backend existant

**MODIFIÉ :**
- `src/views/MoteurView.vue` — ajout articleKeywordsStore, fetchKeywords, AssignmentGate message

### Store article-keywords existant

```typescript
// src/stores/article-keywords.store.ts
const keywords = ref<ArticleKeywords | null>(null)
const hasKeywords = computed(() => !!keywords.value?.capitaine) // CHECK: capitaine non-vide
```

Interface ArticleKeywords :
```typescript
{
  articleSlug: string
  capitaine: string            // 1 mot-clé principal (Title, H1, URL)
  lieutenants: string[]        // 2-5 variantes secondaires (H2, H3)
  lexique: string[]            // 10-15 termes LSI (body text)
}
```

### Pattern d'intégration

```typescript
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
const articleKeywordsStore = useArticleKeywordsStore()

// Dans handleSelectArticle :
if (article) {
  articleKeywordsStore.fetchKeywords(article.slug)
} else {
  articleKeywordsStore.$reset()
}
```

### Enforcement Guidelines

- Utiliser composition API
- Pas de `console.log` — utiliser le logger
- Tests dans `tests/unit/components/`
- Gating SOUPLE — le message est informatif, pas bloquant

### Project Structure Notes

- Fichier modifié : `src/views/MoteurView.vue`
- Nouveau test : `tests/unit/components/moteur-phase-assigner.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4]
- [Source: src/stores/article-keywords.store.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Integrated `useArticleKeywordsStore` in MoteurView — fetches article keywords on article selection, resets on deselection and mount
- Added AssignmentGate soft message in Phase ③ Assignation: shows when `!articleKeywordsStore.hasKeywords` with "Aller à l'Audit →" button
- Gate is soft: assignation content remains visible below the message
- 11 new unit tests: navigation (3), AssignmentGate visibility (5), hasKeywords logic (3)
- TypeScript check passes, Vite build passes, no regressions

### File List

- src/views/MoteurView.vue (MODIFIED — added articleKeywordsStore, AssignmentGate, CSS)
- tests/unit/components/moteur-phase-assigner.test.ts (NEW — 11 tests)
