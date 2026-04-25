> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

# Story 10.1: Migration 7→5 checks + dots de progression mis a jour

Status: done

## Story

As a consultant SEO,
I want que les dots de progression refletent les 5 etapes du nouveau workflow (discovery, radar, capitaine, lieutenants, lexique) au lieu des 7 anciens,
So that ma progression correspond au parcours reel du Moteur restructure.

## Acceptance Criteria

1. **Given** le store `article-progress` contient `completedChecks[]` **When** les checks sont mis a jour **Then** les 5 checks standardises sont : `discovery_done`, `radar_done`, `capitaine_locked`, `lieutenants_locked`, `lexique_validated` (FR39) **And** les anciens checks (`intent_done`, `audit_done`, `local_done`, `captain_chosen`, `assignment_done`) sont supprimes

2. **Given** un article est affiche dans la liste du Moteur **When** il a des checks completes **Then** des dots remplis et vides s'affichent (FR40) **And** le nombre total de dots est 5 (un par check) **And** les dots sont groupes par phase : 2 Generer (discovery, radar) + 3 Valider (capitaine, lieutenants, lexique)

3. **Given** l'evenement `check-completed` est emis par un composant (ex: `capitaine_locked`) **When** le check est traite **Then** il est ajoute a `completedChecks[]` via `POST /api/articles/:slug/progress/check` (FR41) **And** les dots se mettent a jour en temps reel

## Tasks / Subtasks

- [x] Task 1 : Modifier ProgressDots.vue — migration 7→5 checks (AC: #1, #2)
  - [x] 1.1 Remplacer `MOTEUR_CHECKS` : supprimer `intent_done`, `audit_done`, `local_done`, `captain_chosen`, `assignment_done`
  - [x] 1.2 Ajouter `capitaine_locked`, `lieutenants_locked`, `lexique_validated` dans `MOTEUR_CHECKS`
  - [x] 1.3 Mettre a jour `PHASE_GROUPS` : `{ checks: ['discovery_done', 'radar_done'], label: 'Generer' }` et `{ checks: ['capitaine_locked', 'lieutenants_locked', 'lexique_validated'], label: 'Valider' }` — 2 groupes au lieu de 3
  - [x] 1.4 Mettre a jour `CHECK_TOOLTIPS` : 5 entrees (`Discovery`, `Radar`, `Capitaine`, `Lieutenants`, `Lexique`)
  - [x] 1.5 Supprimer tout reference a Phase ③ Assigner (n'existe plus)

- [x] Task 2 : Mettre a jour les tests progress-dots.test.ts (AC: #1, #2)
  - [x] 2.1 Modifier `ALL_CHECKS` : 5 checks au lieu de 7
  - [x] 2.2 Test "renders 5 empty dots" au lieu de 7
  - [x] 2.3 Test "renders 2 phase groups with 2+3 dots" au lieu de 3 groupes (2+3+2)
  - [x] 2.4 Test "fills dots in correct phase positions" — utiliser `capitaine_locked`, `lieutenants_locked`, `lexique_validated` au lieu de `intent_done`, `audit_done`, `local_done`
  - [x] 2.5 Test accessibility : `Progression : X sur 5` au lieu de 7
  - [x] 2.6 Test tooltips : 5 tooltips (`Discovery`, `Radar`, `Capitaine`, `Lieutenants`, `Lexique`)
  - [x] 2.7 Mettre a jour MoteurContextRecap integration tests si necessaire (checks passes au ProgressDots)

- [x] Task 3 : Verifier coherence MoteurView.vue (AC: #3)
  - [x] 3.1 Confirmer que `PHASE_CHECKS` dans MoteurView utilise deja les 5 nouveaux checks (`discovery_done`, `radar_done`, `capitaine_locked`, `lieutenants_locked`, `lexique_validated`)
  - [x] 3.2 Confirmer que `emitCheckCompleted` et `handleCheckRemoved` fonctionnent avec les nouveaux noms
  - [x] 3.3 Confirmer que CaptainValidation, LieutenantsSelection, LexiqueExtraction emettent correctement `check-completed` avec les bons noms

- [x] Task 4 : Mettre a jour les tests existants impactes (AC: #1, #2)
  - [x] 4.1 Mettre a jour `phase-transition-banner.test.ts` si references aux anciens checks
  - [x] 4.2 Mettre a jour `moteur-check-completed.test.ts` si references aux anciens checks
  - [x] 4.3 Verifier que les tests des composants (captain-validation, lieutenants-selection, lexique-extraction) referent aux bons noms de checks

- [x] Task 5 : Run full test suite — zero regressions (AC: #1, #2, #3)
  - [x] 5.1 Executer `vitest run` — tous les tests passent
  - [x] 5.2 Confirmer le total de tests (devrait rester ~1639 ou plus, pas de perte)

## Dev Notes

### IMPORTANT : Etat actuel du code — la majorite est deja a jour

Le MoteurView.vue a DEJA ete migre vers les 5 nouveaux checks dans les Epics 6-8. Le composant `ProgressDots.vue` est le SEUL fichier qui utilise encore les 7 anciens checks. C'est la seule migration reelle.

| Element | Statut actuel | Action requise |
|---------|--------------|----------------|
| `src/views/MoteurView.vue` PHASE_CHECKS | **DEJA A JOUR** — `discovery_done`, `radar_done`, `capitaine_locked`, `lieutenants_locked`, `lexique_validated` | Verifier seulement |
| `src/views/MoteurView.vue` emitCheckCompleted | **DEJA A JOUR** — emet les 5 nouveaux checks | Verifier seulement |
| `src/components/moteur/CaptainValidation.vue` | **DEJA A JOUR** — emet `capitaine_locked` | Verifier seulement |
| `src/components/moteur/LieutenantsSelection.vue` | **DEJA A JOUR** — emet `lieutenants_locked` | Verifier seulement |
| `src/components/moteur/LexiqueExtraction.vue` | **DEJA A JOUR** — emet `lexique_validated` | Verifier seulement |
| `src/components/moteur/ProgressDots.vue` | **ANCIEN** — 7 checks, 3 groupes (Generer/Valider/Assigner) | **MODIFIER** → 5 checks, 2 groupes |
| `tests/unit/components/progress-dots.test.ts` | **ANCIEN** — teste 7 dots, 3 groupes, anciens noms | **MODIFIER** → 5 dots, 2 groupes |

### Architecture actuelle du ProgressDots.vue (AVANT migration)

```typescript
const MOTEUR_CHECKS = [
  'discovery_done', 'radar_done',      // Phase ① Generer ← OK
  'intent_done', 'audit_done', 'local_done',  // Phase ② Valider ← SUPPRIMER
  'captain_chosen', 'assignment_done',  // Phase ③ Assigner ← SUPPRIMER
] as const

const PHASE_GROUPS = [
  { checks: ['discovery_done', 'radar_done'], label: 'Generer' },        // OK
  { checks: ['intent_done', 'audit_done', 'local_done'], label: 'Valider' },  // REMPLACER
  { checks: ['captain_chosen', 'assignment_done'], label: 'Assigner' },    // SUPPRIMER
] as const

const CHECK_TOOLTIPS = {
  'discovery_done': 'Discovery',    // OK
  'radar_done': 'Radar',            // OK
  'intent_done': 'Intention',       // SUPPRIMER
  'audit_done': 'Audit',            // SUPPRIMER
  'local_done': 'Local',            // SUPPRIMER
  'captain_chosen': 'Capitaine',    // REMPLACER par capitaine_locked
  'assignment_done': 'Assignation', // SUPPRIMER
}
```

### Architecture cible du ProgressDots.vue (APRES migration)

```typescript
const MOTEUR_CHECKS = [
  // Phase ① Generer (2 checks)
  'discovery_done',
  'radar_done',
  // Phase ② Valider (3 checks)
  'capitaine_locked',
  'lieutenants_locked',
  'lexique_validated',
] as const

const PHASE_GROUPS = [
  { checks: ['discovery_done', 'radar_done'], label: 'Generer' },
  { checks: ['capitaine_locked', 'lieutenants_locked', 'lexique_validated'], label: 'Valider' },
] as const

const CHECK_TOOLTIPS: Record<string, string> = {
  'discovery_done': 'Discovery',
  'radar_done': 'Radar',
  'capitaine_locked': 'Capitaine',
  'lieutenants_locked': 'Lieutenants',
  'lexique_validated': 'Lexique',
}
```

### Tests existants a modifier (progress-dots.test.ts)

Le fichier `tests/unit/components/progress-dots.test.ts` contient :
- **Ligne 8-12** : `ALL_CHECKS` avec 7 checks → remplacer par 5
- **Test "renders 7 empty dots"** → "renders 5 empty dots"
- **Test "renders 4 filled + 3 empty dots"** → adapter (ex: 2 filled + 3 empty, ou 3 filled + 2 empty)
- **Test "renders 7 filled dots"** → "renders 5 filled dots"
- **Test "renders 3 phase groups with 2+3+2"** → "renders 2 phase groups with 2+3"
- **Test "fills dots in correct phase positions"** → utiliser Phase ② avec `capitaine_locked`, `lieutenants_locked`, `lexique_validated`
- **Test accessibility** : `Progression : 2 sur 5` au lieu de `sur 7`
- **Test tooltips** : 5 tooltips au lieu de 7
- **Test MoteurContextRecap integration** : les checks passes peuvent inclure les nouveaux noms

### Tests a verifier (deja a jour normalement)

- `phase-transition-banner.test.ts` — Lignes 79-86 : utilise deja `capitaine_locked`, `lieutenants_locked`, `lexique_validated` ✅
- `moteur-check-completed.test.ts` — Lignes 50-53 : utilise deja les 5 standardized checks ✅

### Anti-patterns a eviter

- **NE PAS** toucher a MoteurView.vue — il est deja a jour avec les 5 checks
- **NE PAS** toucher aux composants CaptainValidation, LieutenantsSelection, LexiqueExtraction — ils emettent deja les bons checks
- **NE PAS** ajouter de migration de donnees — les anciens checks dans `article-progress.json` seront simplement ignores (les dots apparaitront vides pour ces articles, ce qui est correct)
- **NE PAS** modifier le backend (article-progress.routes.ts, article-progress.service.ts) — le backend est generique (`addCheck(slug, check)`) et accepte n'importe quel nom de check
- **NE PAS** modifier PhaseTransitionBanner.vue — il est deja a jour
- **NE PAS** modifier le type `ArticleProgress` — `completedChecks: string[]` est generique

### Previous Story Intelligence (Story 9.1)

**Learnings from Story 9.1:**
- Le pattern `vi.mock` pour les stores fonctionne bien — mocker au niveau module
- Les composants existants du Moteur (CaptainValidation, LieutenantsSelection, LexiqueExtraction) emettent deja les nouveaux checks depuis les Epics 6-8
- MoteurView PHASE_CHECKS utilise deja les 5 nouveaux noms
- Total tests avant cette story : 1639 tests / 110 fichiers

### Fichiers impactes

| Fichier | Action | Raison |
|---|---|---|
| `src/components/moteur/ProgressDots.vue` | **MODIFIER** | Migration MOTEUR_CHECKS, PHASE_GROUPS, CHECK_TOOLTIPS de 7→5 |
| `tests/unit/components/progress-dots.test.ts` | **MODIFIER** | Mise a jour de tous les tests (5 dots, 2 groupes, nouveaux noms) |
| `src/views/MoteurView.vue` | **VERIFIER** | Confirmer PHASE_CHECKS deja a jour |
| `src/components/moteur/CaptainValidation.vue` | **VERIFIER** | Confirmer emit capitaine_locked |
| `src/components/moteur/LieutenantsSelection.vue` | **VERIFIER** | Confirmer emit lieutenants_locked |
| `src/components/moteur/LexiqueExtraction.vue` | **VERIFIER** | Confirmer emit lexique_validated |
| `tests/unit/components/phase-transition-banner.test.ts` | **VERIFIER** | Confirmer utilise deja les 5 checks |
| `tests/unit/components/moteur-check-completed.test.ts` | **VERIFIER** | Confirmer utilise deja les 5 checks |

### Project Structure Notes

- `src/components/moteur/ProgressDots.vue` — Composant de dots de progression par article (7→5 checks)
- `shared/types/article-progress.types.ts` — Type `ArticleProgress { completedChecks: string[] }` — generique, pas de modification
- `server/services/article-progress.service.ts` — Backend generique `addCheck(slug, check)` — pas de modification
- `data/article-progress.json` — Fichier de donnees persistees — les anciens checks seront ignores

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 10, Story 10.1, lignes 964-991]
- [Source: _bmad-output/planning-artifacts/prd.md — FR39, FR40, FR41]
- [Source: _bmad-output/planning-artifacts/architecture.md — NFR10: store article-progress source unique de verite]
- [Source: src/components/moteur/ProgressDots.vue — Composant a modifier]
- [Source: tests/unit/components/progress-dots.test.ts — Tests a modifier]
- [Source: src/views/MoteurView.vue:160-162 — PHASE_CHECKS deja a jour]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- Migrated ProgressDots.vue MOTEUR_CHECKS from 7 checks (3 phases) to 5 checks (2 phases)
- Removed old checks: intent_done, audit_done, local_done, captain_chosen, assignment_done
- Added new Valider checks: capitaine_locked, lieutenants_locked, lexique_validated
- PHASE_GROUPS reduced from 3 groups (Generer/Valider/Assigner) to 2 groups (Generer/Valider)
- CHECK_TOOLTIPS updated: 5 entries (Discovery, Radar, Capitaine, Lieutenants, Lexique)
- Updated all tests in progress-dots.test.ts (11 tests, was 10 — added "ignores old checks" test)
- MoteurContextRecap integration test updated to use new check names
- Verified MoteurView PHASE_CHECKS already uses 5 new checks (done in Epics 6-8)
- Verified CaptainValidation/LieutenantsSelection/LexiqueExtraction emit correct check names
- Verified phase-transition-banner.test.ts and moteur-check-completed.test.ts already use new names
- Total: 1640 tests / 110 files — zero regressions

### File List

- `src/components/moteur/ProgressDots.vue` — MODIFIED: migrated MOTEUR_CHECKS, PHASE_GROUPS, CHECK_TOOLTIPS from 7→5 checks
- `tests/unit/components/progress-dots.test.ts` — MODIFIED: updated all tests for 5 dots, 2 groups, new check names + added old-check-ignored test
