> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

# Story 9.1: Vue ExplorateurView, route /explorateur, retrait du Moteur

Status: done

## Story

As a consultant SEO,
I want que les onglets Intention, Audit et Local soient accessibles dans une vue Dashboard independante et retires du Moteur,
So that le Moteur ne contient que le workflow GO/NO-GO et je consulte les analyses complementaires dans un espace dedie.

## Acceptance Criteria

1. **Given** l'utilisateur accede a `/explorateur` via la Navbar ou le Dashboard **When** la vue ExplorateurView s'affiche **Then** il voit 3 onglets : Intention (SERP intent), Audit (cocon complet), Local (local vs national + Maps) (FR38) **And** la vue se charge en lazy loading (< 500ms — NFR3)

2. **Given** l'utilisateur est sur la vue Moteur **When** il regarde les onglets disponibles **Then** les onglets Intention, Audit et Local ne sont PAS presents dans le Moteur (FR37) **And** seuls les onglets Phase 1 Generer et Phase 2 Valider (Capitaine/Lieutenants/Lexique) sont disponibles

3. **Given** l'utilisateur ouvre l'onglet Local dans l'Explorateur **When** l'onglet s'affiche **Then** il voit deux sections : Comparaison Local/National et Maps & GBP (FR4) **And** les composants existants (LocalComparisonStep, MapsStep) fonctionnent comme avant

4. **Given** l'utilisateur ouvre l'onglet Intention **When** l'onglet s'affiche **Then** les composants existants d'analyse d'intention fonctionnent comme avant

5. **Given** l'utilisateur ouvre l'onglet Audit **When** l'onglet s'affiche **Then** les composants existants d'audit DataForSEO fonctionnent comme avant

## Tasks / Subtasks

- [x] Task 1 : Ajouter le lien Explorateur dans AppNavbar.vue (AC: #1)
  - [x] 1.1 Ajouter `<RouterLink to="/explorateur" class="navbar-link">Explorateur</RouterLink>` dans la section `navbar-links` de `src/components/shared/AppNavbar.vue`
  - [x] 1.2 Positionner apres le lien "Labo" (ordre : Dashboard, Maillage, GSC, Labo, Explorateur)

- [x] Task 2 : Verifier ExplorateurView.vue existant (AC: #1, #3, #4, #5)
  - [x] 2.1 L'ExplorateurView.vue existe deja dans `src/views/ExplorateurView.vue` (fichier non commite) — verifier qu'il est complet et fonctionnel
  - [x] 2.2 Verifier les 3 onglets : Intention (ExplorationInput, IntentStep, AutocompleteValidation, ExplorationVerdict), Audit (KeywordAuditTable, KeywordComparison, KeywordEditor, DiscoveryPanel), Local (LocalComparisonStep, MapsStep)
  - [x] 2.3 Verifier que tous les composants utilisent `mode="libre"` (sans contexte article/cocon)
  - [x] 2.4 Verifier le pattern v-if + v-show pour la preservation d'etat des onglets
  - [x] 2.5 Verifier la barre de recherche avec validation min 2 caracteres

- [x] Task 3 : Verifier la route /explorateur (AC: #1)
  - [x] 3.1 La route `/explorateur` existe deja dans `src/router/index.ts` — verifier qu'elle charge ExplorateurView en lazy loading
  - [x] 3.2 Verifier le lien dans DashboardView.vue (existe deja : `<RouterLink to="/explorateur">`)

- [x] Task 4 : Verifier que le Moteur ne contient PAS Intention/Audit/Local (AC: #2)
  - [x] 4.1 Confirmer que MoteurView.vue n'importe PAS IntentStep, AutocompleteValidation, ExplorationVerdict, KeywordAuditTable, LocalComparisonStep, MapsStep
  - [x] 4.2 Confirmer que TAB_IDS dans MoteurView est `['discovery', 'radar', 'capitaine', 'lieutenants', 'lexique']` — pas de 'intention', 'audit', 'local'

- [x] Task 5 : Ecrire les tests ExplorateurView (AC: #1-#5)
  - [x] 5.1 Creer `tests/unit/views/explorateur-view.test.ts`
  - [x] 5.2 Tests de rendu : affiche la barre de recherche, les 3 onglets apres saisie, gate message sans mot-cle
  - [x] 5.3 Tests de navigation onglets : clic sur Intention/Audit/Local change l'onglet actif, v-show preserve l'etat
  - [x] 5.4 Tests de la barre de recherche : validation min 2 caracteres, enter lance la recherche, reset des stores
  - [x] 5.5 Tests onglet Intention : composants ExplorationInput, IntentStep, AutocompleteValidation, ExplorationVerdict rendus avec mode='libre'
  - [x] 5.6 Tests onglet Audit : input cocoon name, KeywordAuditTable rendu, actions (comparison, editor)
  - [x] 5.7 Tests onglet Local : 2 sections (LocalComparisonStep, MapsStep) rendues avec mode='libre'
  - [x] 5.8 Test route : la route /explorateur est configuree dans le routeur
  - [x] 5.9 Test Navbar : le lien Explorateur est present dans AppNavbar

## Dev Notes

### IMPORTANT : Etat actuel du code — la majorite est deja implementee

L'ExplorateurView.vue **existe deja** en tant que fichier non commite (`git status: ?? src/views/ExplorateurView.vue`). L'implementation est quasi-complete :

| Element | Statut | Action |
|---------|--------|--------|
| `src/views/ExplorateurView.vue` | **EXISTE** (563 lignes, complet) | Verifier, pas de re-creation |
| `src/router/index.ts` route `/explorateur` | **EXISTE** (ligne 59-62) | Verifier le lazy loading |
| `src/views/DashboardView.vue` lien Explorateur | **EXISTE** (ligne 26) | Aucune action |
| `src/components/shared/AppNavbar.vue` lien | **MANQUANT** | **AJOUTER** le RouterLink |
| `tests/unit/views/explorateur-view.test.ts` | **MANQUANT** | **CREER** la suite de tests |
| MoteurView sans Intention/Audit/Local | **DEJA FAIT** | Verifier seulement |

**Le dev agent ne doit PAS re-creer ExplorateurView.vue** — il doit le verifier et ajouter les pieces manquantes (Navbar link + tests).

### Architecture — ExplorateurView.vue (existant)

Le fichier existant a la structure suivante :

```typescript
// Script setup
import { ref, watch } from 'vue'
import { useIntentStore } from '@/stores/intent.store'
import { useLocalStore } from '@/stores/local.store'
import { useKeywordAuditStore } from '@/stores/keyword-audit.store'

// Intention tab
import ExplorationInput from '@/components/intent/ExplorationInput.vue'
import IntentStep from '@/components/intent/IntentStep.vue'
import AutocompleteValidation from '@/components/intent/AutocompleteValidation.vue'
import ExplorationVerdict from '@/components/intent/ExplorationVerdict.vue'

// Audit tab
import KeywordAuditTable from '@/components/keywords/KeywordAuditTable.vue'
import KeywordComparison from '@/components/keywords/KeywordComparison.vue'
import KeywordEditor from '@/components/keywords/KeywordEditor.vue'
import DiscoveryPanel from '@/components/keywords/DiscoveryPanel.vue'

// Local tab
import LocalComparisonStep from '@/components/intent/LocalComparisonStep.vue'
import MapsStep from '@/components/local/MapsStep.vue'

const TAB_IDS = ['intention', 'audit', 'local'] as const
const activeTab = ref<Tab>('intention')
const visitedTabs = ref<Record<string, boolean>>({ intention: true })
```

**Template key elements :**
- Barre de recherche avec `keywordInput` + bouton "Explorer" (min 2 chars)
- Gate message quand aucun mot-cle actif
- 3 onglets avec pattern v-if/v-show (lazy creation + state preservation)
- Onglet Intention : ExplorationInput + IntentStep + AutocompleteValidation + ExplorationVerdict (mode="libre")
- Onglet Audit : input cocoon name + KeywordAuditTable + KeywordComparison + KeywordEditor + DiscoveryPanel
- Onglet Local : 2 sections (LocalComparisonStep + MapsStep en mode="libre")
- Breadcrumb : Dashboard > Explorateur

### Architecture — AppNavbar.vue (a modifier)

Le Navbar actuel (lignes 20-25) :
```html
<nav class="navbar-links">
  <RouterLink to="/" class="navbar-link">Dashboard</RouterLink>
  <RouterLink to="/linking" class="navbar-link">Maillage</RouterLink>
  <RouterLink to="/post-publication" class="navbar-link">GSC</RouterLink>
  <RouterLink to="/labo" class="navbar-link">Labo</RouterLink>
</nav>
```

Ajouter apres Labo :
```html
<RouterLink to="/explorateur" class="navbar-link">Explorateur</RouterLink>
```

### Architecture — MoteurView.vue (deja nettoye)

Le MoteurView actuel n'a que 5 onglets, groupes en 2 phases :
```typescript
const TAB_IDS = ['discovery', 'radar', 'capitaine', 'lieutenants', 'lexique'] as const

const phases = computed<Phase[]>(() => [
  { id: 'generer', label: 'Generer', number: 1, tabs: [
    { id: 'discovery', label: 'Discovery' },
    { id: 'radar', label: 'Radar' },
  ]},
  { id: 'valider', label: 'Valider', number: 2, tabs: [
    { id: 'capitaine', label: 'Capitaine' },
    { id: 'lieutenants', label: 'Lieutenants' },
    { id: 'lexique', label: 'Lexique' },
  ]},
])
```

Il n'importe AUCUN composant d'Intention, Audit ou Local. **Aucune modification necessaire.**

### Testing Standards

- **Framework** : Vitest + Vue Test Utils
- **Emplacement** : `tests/unit/views/explorateur-view.test.ts`
- **Pattern** : Mocker les stores (intent.store, local.store, keyword-audit.store) avec `vi.mock`
- **Pattern stubs** : Stub tous les composants enfants (ExplorationInput, IntentStep, etc.) pour tester la vue isolee
- **Pattern LaboView** : Le fichier `tests/unit/views/` contient deja des tests de vues — suivre le meme pattern. S'il n'existe pas, creer le dossier.
- **NODE_OPTIONS** : `--max-old-space-size=4096` requis pour la suite complete

### Pattern de test recommande pour ExplorateurView

```typescript
// Mocks
vi.mock('@/stores/intent.store', () => ({
  useIntentStore: () => ({
    reset: vi.fn(),
    exploreKeyword: vi.fn(),
    explorationKeyword: '',
    // ... minimal mock
  }),
}))

vi.mock('@/stores/local.store', () => ({
  useLocalStore: () => ({
    reset: vi.fn(),
  }),
}))

vi.mock('@/stores/keyword-audit.store', () => ({
  useKeywordAuditStore: () => ({
    $reset: vi.fn(),
    fetchAudit: vi.fn(),
    results: [],
    typeScores: [],
    redundancies: [],
    loading: false,
    error: null,
  }),
}))

// Stubs pour tous les composants enfants
const stubAll = {
  Breadcrumb: { template: '<div />' },
  ExplorationInput: { template: '<div class="stub-exploration-input" />' },
  IntentStep: { template: '<div class="stub-intent-step" />' },
  AutocompleteValidation: { template: '<div class="stub-autocomplete" />' },
  ExplorationVerdict: { template: '<div class="stub-verdict" />' },
  KeywordAuditTable: { template: '<div class="stub-audit-table" />' },
  KeywordComparison: { template: '<div class="stub-comparison" />' },
  KeywordEditor: { template: '<div class="stub-editor" />' },
  DiscoveryPanel: { template: '<div class="stub-discovery" />' },
  LocalComparisonStep: { template: '<div class="stub-local-comparison" />' },
  MapsStep: { template: '<div class="stub-maps" />' },
  LoadingSpinner: { template: '<div />' },
  ErrorMessage: { template: '<div />' },
  ScoreGauge: { template: '<div />' },
}
```

### Anti-patterns a eviter

- **NE PAS** re-creer ExplorateurView.vue — il existe deja
- **NE PAS** modifier MoteurView.vue — il est deja nettoye (pas d'Intention/Audit/Local)
- **NE PAS** ajouter de mode='workflow' dans ExplorateurView — c'est toujours mode='libre'
- **NE PAS** ajouter de persistence article-progress dans l'Explorateur — il fonctionne sans article/cocon
- **NE PAS** oublier de stubber tous les composants enfants dans les tests — sinon ils importeront des dependances lourdes

### Previous Story Intelligence (Story 8.2)

**Learnings from Story 8.2 dev-story :**
- Le pattern `vi.mock` pour les stores et composables fonctionne bien en tests
- Les composants existants (Intent, Audit, Local) sont autonomes et fonctionnent avec `mode="libre"` depuis Epic 5
- Le pattern v-if/v-show pour les onglets est standard dans le projet (MoteurView, LaboView, ExplorateurView)
- Les tests doivent mocker les stores au niveau module (`vi.mock`) pas au niveau instance
- `mountWithResults()` helper pattern utile pour les tests qui necessitent un etat pre-rempli
- Total tests avant cette story : 1616 tests / 109 fichiers

### Fichiers impactes

| Fichier | Action | Raison |
|---|---|---|
| `src/components/shared/AppNavbar.vue` | **MODIFIER** | Ajouter lien Explorateur dans la navigation |
| `src/views/ExplorateurView.vue` | **VERIFIER** | Fichier existant — verifier completude |
| `src/router/index.ts` | **VERIFIER** | Route existante — verifier lazy loading |
| `src/views/DashboardView.vue` | **VERIFIER** | Lien existant — verifier presence |
| `src/views/MoteurView.vue` | **VERIFIER** | Confirmer absence d'Intention/Audit/Local |
| `tests/unit/views/explorateur-view.test.ts` | **CREER** | Tests complets de la vue |

### Project Structure Notes

- `src/views/ExplorateurView.vue` — Nouvelle vue Dashboard indépendante (563 lignes, non commitée)
- `src/components/shared/AppNavbar.vue` — Navbar globale, actuellement 4 liens (Dashboard, Maillage, GSC, Labo)
- `src/router/index.ts` — Router Vue avec lazy loading pour les vues secondaires
- `src/stores/intent.store.ts` — Store Pinia pour les données d'intention
- `src/stores/local.store.ts` — Store Pinia pour les données local SEO
- `src/stores/keyword-audit.store.ts` — Store Pinia pour l'audit de mots-clés

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 9, Story 9.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR4, FR37, FR38]
- [Source: _bmad-output/planning-artifacts/architecture.md — Boundary Dashboard/Explorateur]
- [Source: src/views/ExplorateurView.vue — Implementation existante non commitee]
- [Source: src/components/shared/AppNavbar.vue — Navbar a modifier]
- [Source: src/router/index.ts — Route /explorateur existante]
- [Source: src/views/MoteurView.vue — TAB_IDS sans intention/audit/local]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- ExplorateurView.vue already existed (563 lines) — verified completeness, no changes needed
- Route /explorateur already existed in router with lazy loading — verified
- Dashboard link already existed — verified
- Added Explorateur link to AppNavbar.vue (after Labo)
- MoteurView confirmed: TAB_IDS = ['discovery','radar','capitaine','lieutenants','lexique'] — no Intention/Audit/Local
- Created 23 tests in new tests/unit/views/ directory
- Total: 1639 tests / 110 files — zero regressions

### File List

- `src/components/shared/AppNavbar.vue` — MODIFIED: added Explorateur RouterLink in navbar-links
- `tests/unit/views/explorateur-view.test.ts` — CREATED: 23 tests (rendering, search, tabs, Intention/Audit/Local, route, Navbar)
