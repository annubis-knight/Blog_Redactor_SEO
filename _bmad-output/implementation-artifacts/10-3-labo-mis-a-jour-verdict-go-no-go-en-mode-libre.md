# Story 10.3: Labo mis a jour — verdict GO/NO-GO en mode libre

Status: done

## Story

As a consultant SEO,
I want utiliser le verdict GO/NO-GO Capitaine en mode libre dans le Labo,
So that je verifie la viabilite d'un mot-cle en quelques clics sans contexte article.

## Acceptance Criteria

1. **Given** l'utilisateur est sur le Labo **When** il saisit un mot-cle libre et lance l'analyse **Then** le composant Capitaine s'affiche en `mode='libre'` avec les memes KPIs et feu tricolore (FR47) **And** les seuils utilises sont ceux du niveau "Intermediaire" par defaut (NFR8) **And** aucun `articleSlug` ni `cocoonId` n'est requis

2. **Given** le composant Capitaine est en `mode='libre'` **When** il produit un verdict **Then** il n'emet PAS `check-completed` (pas de progression en mode libre) **And** les resultats ne sont PAS persistes en cache lie a un article

3. **Given** l'utilisateur utilise le Labo **When** il accede aussi a Discovery et Douleur Intent en mode libre **Then** ces composants existants fonctionnent comme avant en `mode='libre'` (FR47) **And** le verdict GO/NO-GO est le nouveau composant principal du Labo (remplace les anciens onglets Exploration/Local)

## Tasks / Subtasks

- [x] Task 1 : Modifier LaboView.vue — remplacer onglets Exploration/Local par Capitaine (AC: #1, #3)
  - [x] 1.1 Mettre a jour TAB_IDS : `['discovery', 'douleur', 'capitaine']` (3 onglets au lieu de 4)
  - [x] 1.2 Supprimer imports : ExplorationInput, IntentStep, AutocompleteValidation, ExplorationVerdict, LocalComparisonStep, MapsStep
  - [x] 1.3 Supprimer `useIntentStore()` et `useLocalStore()` (plus utilises) et la fonction `handleExplore`
  - [x] 1.4 Ajouter import : CaptainValidation
  - [x] 1.5 Ajouter le contenu de l'onglet Capitaine : `<CaptainValidation mode="libre" :selected-article="libreArticle" />` avec un computed `libreArticle` qui construit un `SelectedArticle` minimal a partir de `activeKeyword`
  - [x] 1.6 Supprimer le contenu des onglets Exploration et Local du template
  - [x] 1.7 Mettre a jour le label d'onglet : `tab === 'capitaine' ? 'Verdict' : ...`
  - [x] 1.8 Nettoyer les styles CSS orphelins (`.local-section`, `.local-section-title`)

- [x] Task 2 : Guard check-completed dans CaptainValidation en mode libre (AC: #2)
  - [x] 2.1 Dans `lockCaptaine()` : conditionner `emit('check-completed', 'capitaine_locked')` a `props.mode !== 'libre'`
  - [x] 2.2 Dans `unlockCaptaine()` : conditionner `emit('check-removed', 'capitaine_locked')` a `props.mode !== 'libre'`
  - [x] 2.3 Pas de changement pour les resultats — `useCapitaineValidation` stocke en memoire, pas de cache article

- [x] Task 3 : Ajouter/modifier les tests (AC: #1, #2, #3)
  - [x] 3.1 Ajouter test CaptainValidation "does NOT emit check-completed in mode libre"
  - [x] 3.2 Ajouter test CaptainValidation "does NOT emit check-removed in mode libre"
  - [x] 3.3 Verifier que les tests dual-mode-props.test.ts passent toujours — OK (aucun changement necessaire)
  - [x] 3.4 Verifier que les tests existants de CaptainValidation passent — OK (mode workflow inchange)
  - [x] 3.5 Mise a jour labo-view.test.ts : 4 tabs → 3 tabs (Discovery, Douleur, Verdict), stubs et mocks mis a jour

- [x] Task 4 : Run full test suite — zero regressions (AC: #1, #2, #3)
  - [x] 4.1 Executer `vitest run` — tous les tests passent
  - [x] 4.2 Confirmer le total de tests : 1647 tests / 110 fichiers (+3 tests)

## Dev Notes

### IMPORTANT : Etat actuel du code

| Element | Statut actuel | Action requise |
|---------|--------------|----------------|
| `src/views/LaboView.vue` | 4 onglets : Discovery, Douleur, Exploration, Local | **MODIFIER** — remplacer Exploration/Local par Capitaine |
| `src/components/moteur/CaptainValidation.vue` | Supporte deja `mode='libre'` (articleLevel → intermediaire) | **MODIFIER** — guard check-completed emit |
| `tests/unit/components/captain-validation.test.ts` | Aucun test mode libre | **AJOUTER** — tests no-emit en libre |
| `tests/unit/components/dual-mode-props.test.ts` | Teste LaboView avec anciens onglets | **VERIFIER** — peut necessiter mise a jour |

### Architecture actuelle de LaboView.vue (AVANT modification)

```typescript
const TAB_IDS = ['discovery', 'douleur', 'exploration', 'local'] as const
type Tab = typeof TAB_IDS[number]

// Imports : KeywordDiscoveryTab, PainTranslator, ExplorationInput, IntentStep,
//           AutocompleteValidation, ExplorationVerdict, LocalComparisonStep, MapsStep
// Stores : useIntentStore(), useLocalStore()
// Function : handleExplore(keyword)
```

### Architecture cible de LaboView.vue (APRES modification)

```typescript
const TAB_IDS = ['discovery', 'douleur', 'capitaine'] as const
type Tab = typeof TAB_IDS[number]

// Imports : KeywordDiscoveryTab, PainTranslator, CaptainValidation
// Stores : aucun store externe (plus besoin d'intentStore/localStore)
// Computed : libreArticle pour construire un SelectedArticle minimal

import CaptainValidation from '@/components/moteur/CaptainValidation.vue'
import type { SelectedArticle } from '@shared/types/index.js'

const libreArticle = computed<SelectedArticle | null>(() => {
  if (!activeKeyword.value) return null
  return {
    slug: '',
    title: '',
    keyword: activeKeyword.value,
    type: 'Intermédiaire',
    locked: false,
    source: 'proposed',
  }
})
```

Template :
```html
<div v-if="activeTab === 'capitaine'" class="tab-content">
  <CaptainValidation mode="libre" :selected-article="libreArticle" />
</div>
```

### CaptainValidation.vue — guard des emits en mode libre

```typescript
// AVANT
function lockCaptaine() {
  isLocked.value = true
  emit('check-completed', 'capitaine_locked')  // ← toujours emis
  ...
}

// APRES
function lockCaptaine() {
  isLocked.value = true
  if (props.mode !== 'libre') {
    emit('check-completed', 'capitaine_locked')
  }
  ...
}

// Idem pour unlockCaptaine
function unlockCaptaine() {
  isLocked.value = false
  if (props.mode !== 'libre') {
    emit('check-removed', 'capitaine_locked')
  }
}
```

### Composant CaptainValidation — ce qui fonctionne DEJA en mode libre

- `articleLevel` computed retourne `'intermediaire'` quand `mode === 'libre'` (ligne 28-31) — seuils NFR8 ✓
- KPIs, feu tricolore, verdict banner — tout est base sur `articleLevel`, pas de dependance article ✓
- `activeKeyword` computed depend de `selectedArticle?.keyword` — on passera un `SelectedArticle` construit ✓
- AI panel streaming — fonctionne avec n'importe quel keyword ✓
- History slider, alt-keyword input — fonctionnent en memoire ✓

### Anti-patterns a eviter

- **NE PAS** creer un nouveau composant Capitaine pour le Labo — reutiliser CaptainValidation existant
- **NE PAS** passer `keyword` comme prop separee — utiliser le pattern `selectedArticle` existant avec un objet construit
- **NE PAS** modifier le backend — pas de changement serveur
- **NE PAS** ajouter de store pour le Labo — les resultats sont en memoire via `useCapitaineValidation`
- **NE PAS** modifier les onglets Discovery et Douleur — ils restent inchanges
- **NE PAS** toucher aux composants supprimes (ExplorationInput, IntentStep, etc.) — ils restent dans le code pour l'ExplorateurView

### Previous Story Intelligence (Story 10.2)

**Learnings from Story 10.2:**
- Les modifications de MoteurView et tests phase-transition-banner etaient propres — aucun fix en code review
- Pattern : quand on modifie un computed dans MoteurView, verifier que le harness test correspond
- Total tests apres 10.2 : 1644 tests / 110 fichiers

### Fichiers impactes

| Fichier | Action | Raison |
|---|---|---|
| `src/views/LaboView.vue` | **MODIFIER** | Remplacer 4 onglets par 3, ajouter CaptainValidation |
| `src/components/moteur/CaptainValidation.vue` | **MODIFIER** | Guard check-completed/check-removed en mode libre |
| `tests/unit/components/captain-validation.test.ts` | **MODIFIER** | Ajouter tests mode libre no-emit |
| `tests/unit/components/dual-mode-props.test.ts` | **VERIFIER** | Peut referencer les anciens onglets du Labo |

### Project Structure Notes

- `src/views/LaboView.vue` — Vue Labo avec recherche libre (4→3 onglets)
- `src/components/moteur/CaptainValidation.vue` — Verdict GO/NO-GO avec KPIs, seuils, AI panel
- `shared/types/article-progress.types.ts` — `SelectedArticle` interface (slug, title, keyword, type, locked, source)
- `src/composables/useCapitaineValidation.ts` — Composable validation avec history, forceGo, rootResult
- Les composants supprimes du Labo (ExplorationInput, IntentStep, etc.) restent disponibles dans l'ExplorateurView

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 10, Story 10.3, lignes 1013-1035]
- [Source: _bmad-output/planning-artifacts/prd.md — FR47: composants Moteur en mode libre, FR48: mot-cle libre dans Labo]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR8: seuils Intermediaire par defaut en mode libre]
- [Source: src/views/LaboView.vue — Vue a modifier]
- [Source: src/components/moteur/CaptainValidation.vue — Composant a modifier (guard emits)]
- [Source: tests/unit/components/captain-validation.test.ts — Tests a enrichir]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- LaboView tabs migrated from 4 (Discovery, Douleur, Exploration, Local) to 3 (Discovery, Douleur, Capitaine/Verdict)
- CaptainValidation emits guarded in mode libre — no check-completed, no check-removed
- libreArticle computed constructs minimal SelectedArticle from activeKeyword with type 'Intermédiaire'
- Removed imports: ExplorationInput, IntentStep, AutocompleteValidation, ExplorationVerdict, LocalComparisonStep, MapsStep, useIntentStore, useLocalStore
- labo-view.test.ts updated: mocks (useCapitaineValidation, useStreaming), stubs (CaptainValidation), tab assertions (3 tabs)
- captain-validation.test.ts: 3 new tests for libre mode (no check-completed, no check-removed, intermediaire level)
- Total: 1647 tests / 110 files — zero regressions

### File List

- src/views/LaboView.vue (modified)
- src/components/moteur/CaptainValidation.vue (modified)
- tests/unit/components/captain-validation.test.ts (modified)
- tests/unit/components/labo-view.test.ts (modified)
