# Story 2.1: Dots de progression par article dans la liste

Status: done

## Story

As a consultant SEO,
I want voir des dots de progression (●/○) à côté de chaque article dans la liste du Moteur,
so that je sais immédiatement quels articles sont avancés et lesquels restent à traiter.

## Acceptance Criteria

1. **Given** l'utilisateur est sur le Moteur avec la liste des articles affichée **When** un article a des checks complétés dans article-progress (completedChecks[]) **Then** des dots ● (remplis) et ○ (vides) s'affichent à côté du nom de l'article **And** le nombre total de dots est 7 (un par check standardisé).

2. **Given** un article n'a aucun check complété **When** il s'affiche dans la liste **Then** 7 dots vides (○○○○○○○) apparaissent.

3. **Given** un article a 4 checks complétés sur 7 **When** il s'affiche dans la liste **Then** 4 dots remplis et 3 vides (●●●●○○○) apparaissent **And** les dots sont groupés visuellement par phase (2 Générer + 3 Valider + 2 Assigner).

## Tasks / Subtasks

- [x] Task 1 : Créer le composant ProgressDots.vue (AC: #1, #2, #3)
  - [x] 1.1 : Composant acceptant `completedChecks: string[]` en prop
  - [x] 1.2 : Définir les 7 checks standardisés dans l'ordre par phase
  - [x] 1.3 : Rendre 7 dots (● rempli / ○ vide) selon la présence dans completedChecks
  - [x] 1.4 : Grouper visuellement par phase avec un gap CSS (2 + 3 + 2)
  - [x] 1.5 : Tooltip sur chaque dot indiquant le nom du check en français
- [x] Task 2 : Intégrer ProgressDots dans MoteurContextRecap.vue (AC: #1, #2)
  - [x] 2.1 : Importer `useArticleProgressStore` dans MoteurContextRecap
  - [x] 2.2 : Charger la progression pour tous les articles affichés (batch ou lazy)
  - [x] 2.3 : Afficher `<ProgressDots>` dans chaque `tree-article-btn` entre le titre et le keyword badge
  - [x] 2.4 : Gérer le cas `null` (aucun progress) → 7 dots vides
- [x] Task 3 : Charger la progression dans MoteurView au montage (AC: #1)
  - [x] 3.1 : Chargement fait via watch dans MoteurContextRecap (Option A recommandée — lazy loading par slug avec cache store)
  - [x] 3.2 : Cache mémoire via progressMap évite les re-fetches
- [x] Task 4 : Tests unitaires (AC: #1-3)
  - [x] 4.1 : Test ProgressDots : 0 checks → 7 dots vides
  - [x] 4.2 : Test ProgressDots : 4 checks → 4 remplis + 3 vides
  - [x] 4.3 : Test ProgressDots : 7 checks → 7 remplis
  - [x] 4.4 : Test ProgressDots : groupement visuel par phase (3 groupes de dots)
  - [x] 4.5 : Test MoteurContextRecap : dots apparaissent dans chaque article
  - [x] 4.6 : Test MoteurContextRecap : passes correct completedChecks from store

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**INCHANGÉ :**
- `article-progress.service.ts` — service backend existant (getProgress, addCheck, saveProgress)
- `article-progress.routes.ts` — routes API existantes (GET/PUT/POST progress, semantic-field)
- `article-progress.store.ts` — store Pinia existant (progressMap, fetchProgress, getProgress, addCheck)
- `article-progress.schema.ts` — schémas Zod existants (articleProgressSchema, addCheckSchema)
- `article-progress.types.ts` — types existants (ArticleProgress, SemanticTerm, SelectedArticle)
- `SelectedArticlePanel.vue` — panel de détail (checks existants avec CHECK_LABELS)
- `MoteurPhaseNavigation.vue` — navigation 3 phases (Epic 1)

**MODIFIÉ :**
- `src/components/moteur/MoteurContextRecap.vue` — ajout ProgressDots dans chaque article
- `src/views/MoteurView.vue` — chargement progression au montage (optionnel, selon approche)

**CRÉÉ :**
- `src/components/moteur/ProgressDots.vue` — composant dots de progression
- `tests/unit/components/progress-dots.test.ts` — tests

### Les 7 checks standardisés (NFR10)

```typescript
// Ordre par phase — CRITIQUE pour le groupement visuel
const MOTEUR_CHECKS = [
  // Phase ① Générer (2 checks)
  'discovery_done',   // Discovery IA terminé
  'radar_done',       // Scan Douleur Intent terminé
  // Phase ② Valider (3 checks)
  'intent_done',      // Exploration intention terminée
  'audit_done',       // Audit DataForSEO terminé
  'local_done',       // Analyse Local terminée
  // Phase ③ Assigner (2 checks)
  'captain_chosen',   // Capitaine défini
  'assignment_done',  // Assignation complète
] as const

// Labels français pour tooltips
const CHECK_TOOLTIPS: Record<string, string> = {
  'discovery_done': 'Discovery',
  'radar_done': 'Radar',
  'intent_done': 'Intention',
  'audit_done': 'Audit',
  'local_done': 'Local',
  'captain_chosen': 'Capitaine',
  'assignment_done': 'Assignation',
}
```

### ATTENTION — Coexistence avec les checks existants

Le `SelectedArticlePanel` utilise DÉJÀ des checks avec une convention **différente** (kebab-case, orientés production) :
- `intent-analyzed`, `local-checked`, `competitors-analyzed`, `keywords-assigned`, `keywords-audited`, `strategy-done`, `brief-generated`, `outline-validated`, `article-generated`, `seo-ok`, `geo-ok`

Les 7 checks standardisés du Moteur utilisent **snake_case** et sont spécifiques aux phases Moteur. Les deux systèmes coexistent dans `completedChecks[]` — le composant ProgressDots filtre uniquement les 7 checks Moteur.

### Structure existante de MoteurContextRecap

L'article list est dans des `tree-article-btn` avec cette structure :
```html
<button class="tree-article-btn" ...>
  <span class="tree-branch"></span>
  <span class="tree-article-title">{{ art.title }}</span>
  <!-- ICI : insérer ProgressDots -->
  <span class="tree-article-keyword">{{ art.keyword }}</span>
</button>
```

### Approche recommandée pour le chargement

**Option A (recommandée) — Store access direct dans MoteurContextRecap :**
```typescript
import { useArticleProgressStore } from '@/stores/article-progress.store'
const progressStore = useArticleProgressStore()

// Charger la progression pour tous les articles visibles
watch([suggestedGroups, publishedGroups], () => {
  const allSlugs = [
    ...suggestedGroups.value.flatMap(g => g.articles.map(a => a.slug)),
    ...publishedGroups.value.flatMap(g => g.articles.map(a => a.slug)),
  ]
  for (const slug of allSlugs) {
    progressStore.fetchProgress(slug)
  }
}, { immediate: true })
```

**Option B — Prop drilling depuis MoteurView :** Plus verbeux, moins autonome. Non recommandé.

### API existante

Le backend est DÉJÀ en place :
- `GET /api/articles/:slug/progress` → `{ data: ArticleProgress | null }`
- `POST /api/articles/:slug/progress/check` → `{ data: ArticleProgress }`

Le store `useArticleProgressStore` expose :
- `fetchProgress(slug)` → charge dans `progressMap`
- `getProgress(slug)` → retourne `ArticleProgress | null` depuis `progressMap`
- `addCheck(slug, check)` → ajoute un check (empêche les doublons)

### Design CSS des dots

```css
/* Dots groupés par phase avec gap */
.progress-dots {
  display: inline-flex;
  gap: 1px;
  align-items: center;
}

.progress-dots-group {
  display: inline-flex;
  gap: 1px;
}

.progress-dots-group + .progress-dots-group {
  margin-left: 3px; /* Séparation visuelle entre phases */
}

.progress-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-border); /* ○ vide */
}

.progress-dot--filled {
  background: var(--color-primary); /* ● rempli */
}
```

### Enforcement Guidelines

- Utiliser composition API
- Pas de `console.log` — utiliser le logger
- Tests dans `tests/unit/components/`
- Le composant ProgressDots doit être réutilisable (pas couplé au Moteur)
- Ne PAS modifier les checks existants dans SelectedArticlePanel

### Risques identifiés

1. **Performance** : Si beaucoup d'articles, le chargement de la progression pour chacun pourrait être lent. Mitigation : le cache mémoire du store évite les re-fetches.
2. **Checks vides** : Si `data/article-progress.json` n'a pas d'entrée pour un article, `getProgress()` retourne `null` → afficher 7 dots vides.
3. **Ordre des dots** : L'ordre doit TOUJOURS correspondre à l'ordre des phases, pas à l'ordre d'insertion dans completedChecks[].

### Project Structure Notes

- Nouveau composant : `src/components/moteur/ProgressDots.vue`
- Fichier modifié : `src/components/moteur/MoteurContextRecap.vue`
- Nouveau test : `tests/unit/components/progress-dots.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Progression & guidage]
- [Source: shared/types/article-progress.types.ts]
- [Source: src/stores/article-progress.store.ts]
- [Source: src/components/moteur/MoteurContextRecap.vue]
- [Source: src/components/moteur/SelectedArticlePanel.vue#CHECK_LABELS]
- [Source: _bmad-output/implementation-artifacts/epic-1-retro-2026-03-30.md] — retro Epic 1

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Created `ProgressDots.vue` — 7 dots in 3 phase groups (2+3+2) with ARIA, tooltips, CSS transitions
- Integrated ProgressDots into `MoteurContextRecap.vue` — store access, lazy loading via watch, getChecks helper
- Task 3 (MoteurView loading) covered by watch in MoteurContextRecap (Option A — recommended approach), no MoteurView modification needed
- 10 unit tests: rendering (3), phase grouping (2), accessibility (2), edge case (1), MoteurContextRecap integration (2)
- TypeScript check passes, Vite build passes, no regressions

### File List

- src/components/moteur/ProgressDots.vue (NEW — 97 lines)
- src/components/moteur/MoteurContextRecap.vue (MODIFIED — added store, watch, ProgressDots)
- tests/unit/components/progress-dots.test.ts (NEW — 10 tests)
