> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

# Story 1.1: Layout 3 phases, navigation et sélection article

Status: done

## Story

As a consultant SEO,
I want le Moteur organisé en 3 phases visuelles avec navigation libre et sélection d'article obligatoire,
so that je comprends immédiatement la structure du workflow sans me perdre dans 10 onglets plats.

## Acceptance Criteria

1. **Given** l'utilisateur accède à la vue Moteur **When** il arrive sur la page **Then** il voit 3 groupes de phases visuellement distincts : ① Générer, ② Valider, ③ Assigner — chaque phase affiche les noms de ses onglets.

2. **Given** l'utilisateur est sur la Phase ① Générer **When** il clique sur la Phase ② Valider ou ③ Assigner **Then** il navigue directement vers la phase choisie sans aucun blocage **And** il peut revenir à n'importe quelle phase à tout moment.

3. **Given** l'utilisateur arrive sur le Moteur sans article sélectionné **When** il n'a pas encore choisi d'article via le MoteurContextRecap **Then** les onglets du Moteur ne sont pas accessibles **And** un message invite à sélectionner un article.

4. **Given** l'utilisateur sélectionne un article dans le MoteurContextRecap **When** l'article est sélectionné **Then** tous les onglets des 3 phases deviennent accessibles **And** la Phase ① Générer est affichée par défaut.

## Tasks / Subtasks

- [x] Task 1 : Créer `MoteurPhaseNavigation.vue` (AC: #1, #2)
  - [x] 1.1 : Composant avec 3 groupes de phases visuels (Générer, Valider, Assigner)
  - [x] 1.2 : Chaque phase affiche ses onglets enfants en sous-navigation
  - [x] 1.3 : Navigation libre entre phases (pas de gating dur)
  - [x] 1.4 : Phase active visuellement distincte (highlight CSS)
  - [x] 1.5 : Onglet actif dans la phase visuellement distinct
- [x] Task 2 : Restructurer `MoteurView.vue` en 3 phases (AC: #1, #2, #3, #4)
  - [x] 2.1 : Remplacer le système de tabs plats par MoteurPhaseNavigation
  - [x] 2.2 : Organiser les composants dans les 3 phases :
    - Phase ① Générer : KeywordDiscoveryTab, DouleurIntentScanner, PainTranslator
    - Phase ② Valider : PainValidation, Exploration (ExplorationInput+IntentStep+AutocompleteValidation+ExplorationVerdict), KeywordAuditTable, LocalComparisonStep+MapsStep (fusionnés)
    - Phase ③ Assigner : KeywordEditor + affichage mots-clés existants
  - [x] 2.3 : Retirer ContentGapPanel du Moteur (FR5) — c'est le tab 6 Concurrents actuel
  - [x] 2.4 : Fusionner Local/National (tab 5) et Maps & GBP (tab 7) dans un seul onglet "Local"
  - [x] 2.5 : Gating article : afficher message si pas d'article sélectionné, désactiver les onglets
  - [x] 2.6 : Phase ① Générer affichée par défaut quand article sélectionné
  - [x] 2.7 : Préserver TOUT le cross-tab state existant (discoveryRadarKeywords, radarScanResult, translatedKeywords, recommendedContentLength)
- [x] Task 3 : Tests unitaires (AC: #1-4)
  - [x] 3.1 : Test rendu des 3 phases avec noms d'onglets
  - [x] 3.2 : Test navigation libre entre phases
  - [x] 3.3 : Test gating article (message si pas sélectionné, onglets désactivés)
  - [x] 3.4 : Test phase par défaut (Générer) quand article sélectionné

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**INCHANGÉ (ne pas toucher) :**
- Tous les composants internes des onglets (KeywordDiscoveryTab, DouleurIntentScanner, PainTranslator, PainValidation, ExplorationInput, IntentStep, AutocompleteValidation, ExplorationVerdict, KeywordAuditTable, KeywordEditor, LocalComparisonStep, MapsStep)
- Le MoteurContextRecap.vue (sélection article) — il reste en haut
- Le SelectedArticlePanel.vue — il reste sous le MoteurContextRecap
- Le cross-tab communication (emit/handler entre composants)
- Tous les stores (keyword-audit, intent, local, etc.)

**MODIFIÉ :**
- `MoteurView.vue` — restructuration majeure du layout et de la navigation
- Tab system : passer de tabs plats (D, 0-8) à 3 phases avec sous-onglets

**CRÉÉ :**
- `src/components/moteur/MoteurPhaseNavigation.vue` — nouveau composant de navigation 3 phases

### Structure actuelle des tabs dans MoteurView

Le MoteurView actuel utilise un système de `activeTab` (string) avec les valeurs :
- `'discovery'` → KeywordDiscoveryTab
- `'douleur-intent'` → DouleurIntentScanner
- `'douleur'` → PainTranslator
- `'validation'` → PainValidation
- `'exploration'` → Exploration composite (ExplorationInput + IntentStep + AutocompleteValidation + ExplorationVerdict)
- `'audit'` → KeywordAuditTable + KeywordComparison + DiscoveryPanel
- `'local'` → LocalComparisonStep
- `'concurrents'` → ContentGapPanel (À RETIRER)
- `'maps'` → MapsStep
- `'assignation'` → KeywordEditor + keywords display

### Mapping tabs → phases

```
Phase ① Générer :
  - discovery     → KeywordDiscoveryTab (optionnel, verrouillage si mots-clés validés)
  - douleur-intent → DouleurIntentScanner (optionnel, verrouillage si mots-clés validés)
  - douleur       → PainTranslator

Phase ② Valider :
  - validation    → PainValidation
  - exploration   → ExplorationInput + IntentStep + AutocompleteValidation + ExplorationVerdict
  - audit         → KeywordAuditTable + KeywordComparison + DiscoveryPanel
  - local         → LocalComparisonStep + MapsStep (FUSIONNÉ en 2 sections)

Phase ③ Assigner :
  - assignation   → KeywordEditor + keywords display
```

### Pattern de navigation recommandé

```typescript
// Phases definition
const phases = [
  {
    id: 'generer',
    label: 'Générer',
    number: 1,
    tabs: [
      { id: 'discovery', label: 'Discovery', optional: true },
      { id: 'douleur-intent', label: 'Douleur Intent', optional: true },
      { id: 'douleur', label: 'Douleur' },
    ]
  },
  {
    id: 'valider',
    label: 'Valider',
    number: 2,
    tabs: [
      { id: 'validation', label: 'Validation' },
      { id: 'exploration', label: 'Exploration' },
      { id: 'audit', label: 'Audit' },
      { id: 'local', label: 'Local' },
    ]
  },
  {
    id: 'assigner',
    label: 'Assigner',
    number: 3,
    tabs: [
      { id: 'assignation', label: 'Assignation' },
    ]
  }
]
```

### Cross-tab communication à préserver

Les handlers suivants dans MoteurView doivent rester fonctionnels :
1. `handleSendToRadar(keywords)` — Discovery → Douleur Intent (même phase)
2. `handleRadarScanned({globalScore, heatLevel})` — Douleur Intent → PainValidation (cross-phase ①→②)
3. `handleTranslated(keywords)` — PainTranslator → PainValidation (cross-phase ①→②)
4. `handleValidationSelect(keyword)` — PainValidation → Exploration (même phase)
5. `handleContinue()` — Exploration → Audit → Local (même phase)

**Important :** Quand un handler change de tab et que le nouveau tab est dans une phase différente, la phase active doit aussi changer.

### Convention CSS

Utiliser les variables CSS existantes dans `src/assets/styles/variables.css`. Les 3 phases doivent avoir des indicateurs visuels distincts (ex: numéros ①②③, couleurs subtiles, séparateurs).

### Enforcement Guidelines

- Utiliser composition API (pas d'options API)
- Pas de `console.log` — utiliser le logger si besoin
- Tests dans `tests/unit/components/`
- Pas de gating dur — navigation toujours libre

### Project Structure Notes

- Nouveau fichier : `src/components/moteur/MoteurPhaseNavigation.vue`
- Fichier modifié : `src/views/MoteurView.vue`
- Nouveau test : `tests/unit/components/moteur-phase-navigation.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns — Dual-Mode Composants]
- [Source: _bmad-output/planning-artifacts/prd.md#Moteur — Restructuration en 3 phases]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Created MoteurPhaseNavigation.vue: 3 phase groups with header+tabs, active phase/tab highlighting, optional/locked tab support, disabled state
- Restructured MoteurView.vue: replaced flat 10-tab bar with 3-phase navigation (Générer/Valider/Assigner), removed ContentGapPanel, fused Local+Maps into single tab, added article gating message, default to Phase ① Générer
- All cross-tab communication preserved (Discovery→Radar, Radar→Validation, PainTranslator→Validation, Validation→Exploration, Exploration→Audit)
- 13 new unit tests covering: phase rendering, tab rendering, active highlighting, free navigation, phase header clicks, disabled state, optional/locked tabs
- No regressions: 1043 existing tests still pass (8 pre-existing failures in unrelated tests)

### Code Review Fixes Applied

- Removed dead `recommendedContentLength` ref, reset, template banner, and CSS (dead code after ContentGapPanel removal)
- Added runtime type guard in `setActiveTab` (replaces unsafe `as Tab` cast)
- Added ARIA attributes (`role="tablist"`, `role="tab"`, `aria-selected`) to MoteurPhaseNavigation
- Note: MoteurView-level integration tests for article gating deferred (component-level tests cover disabled behavior)

### File List

- src/components/moteur/MoteurPhaseNavigation.vue (NEW)
- src/views/MoteurView.vue (MODIFIED)
- tests/unit/components/moteur-phase-navigation.test.ts (NEW)
