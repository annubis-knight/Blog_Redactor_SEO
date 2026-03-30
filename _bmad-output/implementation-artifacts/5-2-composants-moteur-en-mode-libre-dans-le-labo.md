# Story 5.2: Composants Moteur en mode libre dans le Labo

Status: done

## Story

As a consultant SEO,
I want utiliser les mêmes outils que le Moteur (Discovery, Douleur Intent, Exploration, Local) en mode libre dans le Labo,
so that j'ai les mêmes capacités d'analyse sans le contexte d'un article.

## Acceptance Criteria

1. **Given** l'utilisateur est dans le Labo avec un mot-clé saisi **When** il lance Discovery, Douleur Intent, Exploration ou Local **Then** chaque composant fonctionne avec `mode='libre'` et le keyword comme entrée **And** aucun `articleSlug` ni `cocoonId` n'est passé aux composants.

2. **Given** un composant est en `mode='libre'` **When** il produit un résultat **Then** il n'émet PAS `check-completed` (pas de progression en mode libre) **And** les résultats ne sont PAS persistés en cache lié à un article.

3. **Given** un composant est en `mode='libre'` **When** il a besoin d'appeler une API **Then** il utilise le même service backend que le mode workflow **And** il n'y a PAS de composant dupliqué entre Moteur et Labo (NFR11).

4. **Given** les composants du Moteur existants **When** ils sont adaptés pour le dual-mode **Then** ils acceptent une prop `mode: 'workflow' | 'libre'` (NFR8) **And** en mode `workflow`, le comportement existant est 100% inchangé **And** en mode `libre`, les résultats s'affichent sans progression ni cache article.

## Tasks / Subtasks

- [x] Task 1 : Ajouter la prop `mode` aux composants partagés Moteur/Labo (AC: #4)
  - [x]1.1 : Ajouter `mode?: 'workflow' | 'libre'` (default `'workflow'`) à KeywordDiscoveryTab
  - [x]1.2 : Ajouter `mode?: 'workflow' | 'libre'` (default `'workflow'`) à DouleurIntentScanner
  - [x]1.3 : Ajouter `mode?: 'workflow' | 'libre'` (default `'workflow'`) à PainTranslator
  - [x]1.4 : Ajouter `mode?: 'workflow' | 'libre'` (default `'workflow'`) à ExplorationInput
  - [x]1.5 : Ajouter `mode?: 'workflow' | 'libre'` (default `'workflow'`) à IntentStep
  - [x]1.6 : Ajouter `mode?: 'workflow' | 'libre'` (default `'workflow'`) à AutocompleteValidation
  - [x]1.7 : Ajouter `mode?: 'workflow' | 'libre'` (default `'workflow'`) à ExplorationVerdict
  - [x]1.8 : Ajouter `mode?: 'workflow' | 'libre'` (default `'workflow'`) à LocalComparisonStep
  - [x]1.9 : Ajouter `mode?: 'workflow' | 'libre'` (default `'workflow'`) à MapsStep
  - [x]1.10 : Ajouter `mode?: 'workflow' | 'libre'` (default `'workflow'`) à PainValidation

- [x]Task 2 : Conditionner les comportements article-dépendants (AC: #1, #2)
  - [x]2.1 : KeywordDiscoveryTab — en mode `libre`, skip le cache context lié à l'article (DiscoveryContext sans article fields), ne pas construire de cache key basée sur article
  - [x]2.2 : DouleurIntentScanner — en mode `libre`, ne pas watcher les changements d'article (pas de reset auto), accepter le keyword directement sans articleTopic/articleKeyword
  - [x]2.3 : PainTranslator — en mode `libre`, pas de `initialPainText` pré-rempli (pas d'article.painPoint), comportement inchangé fonctionnellement
  - [x]2.4 : PainValidation — aucun changement comportemental nécessaire (déjà data-driven via props)

- [x]Task 3 : Mettre à jour LaboView pour passer `mode="libre"` (AC: #1, #3)
  - [x]3.1 : Ajouter `:mode="'libre'"` à tous les composants dans LaboView.vue

- [x]Task 4 : Passer `mode="workflow"` explicitement dans MoteurView (AC: #4)
  - [x]4.1 : Ajouter `:mode="'workflow'"` à tous les composants dans MoteurView.vue pour rendre le contrat explicite
  - [x]4.2 : Vérifier que le comportement existant est 100% identique (non-régression)

- [x]Task 5 : Tests unitaires (AC: #1-4)
  - [x]5.1 : Test de non-régression — les composants avec `mode='workflow'` (ou sans mode — default) fonctionnent exactement comme avant
  - [x]5.2 : Test mode libre — KeywordDiscoveryTab en mode `libre` ne construit pas de DiscoveryContext article-dependent
  - [x]5.3 : Test mode libre — DouleurIntentScanner en mode `libre` ne watche pas les changements d'article
  - [x]5.4 : Test mode libre — vérifier que les composants en mode `libre` ne crash pas sans articleSlug/cocoonId

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**INCHANGÉ :**
- Tous les services backend — aucune modification
- Toutes les routes API — aucune modification
- Les stores Pinia — aucune modification
- LaboView.vue — structure et tabs inchangés (créés en Story 5.1)
- Le template/HTML interne des composants — inchangé
- Le fonctionnement API de chaque composant — inchangé

**MODIFIÉ :**
- 10 composants reçoivent une nouvelle prop `mode?: 'workflow' | 'libre'` (default `'workflow'`)
- 2 composants ont un comportement conditionnel sur `mode` :
  - `KeywordDiscoveryTab` : skip article-context dans DiscoveryContext
  - `DouleurIntentScanner` : skip article-watcher
- `LaboView.vue` : ajouter `:mode="'libre'"` aux composants
- `MoteurView.vue` : ajouter `:mode="'workflow'"` aux composants (explicite, pas strictement nécessaire car c'est le default)

### Analyse composant par composant — Impact du mode `libre`

| Composant | Props article-dépendantes | Changement `mode='libre'` |
|-----------|--------------------------|--------------------------|
| **KeywordDiscoveryTab** | `articleTitle`, `articleKeyword`, `articlePainPoint`, `cocoonName`, `cocoonTheme` | Skip DiscoveryContext article fields en mode libre. Les props restent optionnelles (déjà `?:`), LaboView passe `''` |
| **DouleurIntentScanner** | `pilierKeyword`, `articleTopic`, `articleKeyword`, `articlePainPoint` | En mode libre, ne pas watcher les changements article (pas de reset auto). LaboView passe `activeKeyword` comme `pilierKeyword` et `''` pour le reste |
| **PainTranslator** | `initialPainText`, `suggestedKeyword` | Aucun changement fonctionnel. LaboView passe `activeKeyword` comme `suggestedKeyword` et `''` comme `initialPainText` |
| **ExplorationInput** | `defaultKeyword` | Aucun changement. Keyword-only |
| **IntentStep** | `keyword` | Aucun changement. Keyword-only |
| **AutocompleteValidation** | `keyword` | Aucun changement. Keyword-only |
| **ExplorationVerdict** | Aucune | Aucun changement. Store-driven |
| **LocalComparisonStep** | `keyword` | Aucun changement. Keyword-only |
| **MapsStep** | `keyword` | Aucun changement. Keyword-only |
| **PainValidation** | `translatedKeywords`, `radarHeat` | Aucun changement. Data-driven via props |

### Composants NON impactés (pas dans le Labo)

Ces composants ne sont PAS réutilisés dans le Labo et ne reçoivent PAS de prop `mode` :
- `KeywordAuditTable` — cocoon-scoped (`auditStore.fetchAudit(cocoonName)`)
- `KeywordEditor` / `DiscoveryPanel` — cocoon-scoped
- `KeywordMigrationPreview` — assignation article-specific
- `MoteurPhaseNavigation` — structure 3 phases
- `PhaseTransitionBanner` — progression par phases
- `SelectedArticlePanel` — sélection article
- `MoteurContextRecap` / `MoteurStrategyContext` — stratégie cocon
- `AssignmentGate` — assignation

### Pattern d'implémentation de la prop `mode`

```typescript
// Pattern minimal — ajouter à chaque composant
const props = withDefaults(defineProps<{
  // ... existing props ...
  mode?: 'workflow' | 'libre'
}>(), {
  mode: 'workflow',
})

// Usage conditionnel (seulement quand nécessaire)
// Exemple dans KeywordDiscoveryTab :
const buildDiscoveryContext = computed(() => {
  if (props.mode === 'libre') {
    return { seedKeyword: props.pilierKeyword } // Minimal, sans article context
  }
  return {
    seedKeyword: props.pilierKeyword,
    articleTitle: props.articleTitle,
    articleKeyword: props.articleKeyword,
    // ... full context
  }
})
```

**IMPORTANT :** La plupart des composants n'ont AUCUNE logique conditionnelle sur `mode` — la prop est ajoutée pour le contrat d'interface (NFR8) mais le comportement ne change pas car ces composants sont déjà keyword-only.

### Composants avec logique conditionnelle réelle

Seuls **2 composants** ont besoin de `if (props.mode === 'libre')` :

1. **KeywordDiscoveryTab** (cache context) :
   - En mode `workflow` : construit `DiscoveryContext` avec `articleTitle`, `articleKeyword`, etc.
   - En mode `libre` : construit `DiscoveryContext` avec seulement `seedKeyword`
   - Impact : la clé de cache en mode libre ne contient pas de contexte article

2. **DouleurIntentScanner** (watcher reset) :
   - En mode `workflow` : watche `articleTopic` + `articleKeyword` pour reset le radar quand l'article change
   - En mode `libre` : pas de watcher article (le reset se fait dans `LaboView.setKeyword()`)

### MoteurView — Props check-completed (non-régression)

MoteurView gère les `check-completed` dans ses handlers (`handleRadarScanned`, `handleExplorationContinue`, `handleLocalContinue`). Ces handlers appellent `emitCheckCompleted()` qui vérifie `selectedArticle.value`. En mode Labo, il n'y a pas de `selectedArticle` donc même sans guard sur `mode`, les checks ne sont pas émis.

Cependant, pour la clarté du contrat, on ajoute `:mode="'workflow'"` dans MoteurView.

### LaboView — État actuel (Story 5.1)

LaboView passe déjà les composants avec les bonnes props keyword-only :

```vue
<KeywordDiscoveryTab
  :pilier-keyword="activeKeyword"
  :article-title="''"
  :article-keyword="activeKeyword"
  :article-pain-point="''"
  :cocoon-name="''"
/>
<!-- → Ajouter :mode="'libre'" -->

<PainTranslator
  :suggested-keyword="activeKeyword"
  @explore="handleExplore"
/>
<!-- → Ajouter :mode="'libre'" -->

<ExplorationInput :default-keyword="activeKeyword" @explore="handleExplore" />
<!-- → Ajouter :mode="'libre'" -->
```

### Enforcement Guidelines

- Chaque composant modifié garde son comportement par défaut (`mode: 'workflow'`) — aucune régression possible
- NE PAS ajouter de logique conditionnelle quand elle n'est pas nécessaire — la prop `mode` est un contrat, pas une obligation d'avoir du code conditionnel
- NE PAS dupliquer de composant — un seul composant avec prop `mode`
- NE PAS modifier les services backend
- NE PAS modifier les stores Pinia
- Logger via `log.debug/info` — jamais `console.log`
- Tests de non-régression obligatoires pour le mode `workflow`

### Risques identifiés

1. **KeywordDiscoveryTab cache en mode libre** : En mode libre, la clé de cache est différente (pas d'article context). Vérifier que `useKeywordDiscoveryTab` composable gère correctement un context minimal.
2. **DouleurIntentScanner watcher** : Le watcher sur `articleTopic`/`articleKeyword` doit être conditionné par `mode !== 'libre'`. Si mal implémenté, le radar pourrait se reset inutilement.
3. **Default `'workflow'` critique** : Si le default n'est pas `'workflow'`, le MoteurView casse sans passer explicitement la prop. Le default DOIT être `'workflow'`.

### Project Structure Notes

- 10 composants modifiés (ajout prop `mode`)
- 2 composants avec logique conditionnelle (`KeywordDiscoveryTab`, `DouleurIntentScanner`)
- 1 vue modifiée pour ajouter `:mode="'libre'"` (`LaboView.vue`)
- 1 vue modifiée pour ajouter `:mode="'workflow'"` (`MoteurView.vue`)
- Tests dans `tests/unit/components/`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#DualModeProps]
- [Source: _bmad-output/planning-artifacts/architecture.md#NFR8, NFR11]
- [Source: _bmad-output/implementation-artifacts/5-1-vue-laboview-route-labo-et-acces-navbar-dashboard.md — previous story]
- [Source: src/views/MoteurView.vue — orchestrator, event handlers, check-completed]
- [Source: src/views/LaboView.vue — libre orchestrator]
- [Source: src/components/moteur/KeywordDiscoveryTab.vue — DiscoveryContext, cache]
- [Source: src/components/intent/DouleurIntentScanner.vue — article watcher]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A

### Completion Notes List

- Added `mode?: 'workflow' | 'libre'` prop (default `'workflow'`) to all 10 components via `withDefaults(defineProps<{...}>(), { mode: 'workflow' })`
- Conditional logic in 2 components only: KeywordDiscoveryTab (skip article context in `handleDiscover()`) and DouleurIntentScanner (skip article watcher)
- Other 8 components: prop added as contract marker (NFR8), no behavioral change
- LaboView passes `mode="libre"` to all 8 component instances
- MoteurView passes `mode="workflow"` explicitly to all 10 component instances
- 12 unit tests in `dual-mode-props.test.ts` — all pass
- vue-tsc: clean, vite build: success
- 3 pre-existing test failures unchanged (navigation-restructuring, production-phases, translate-pain)

### File List

- `src/components/moteur/KeywordDiscoveryTab.vue` — added mode prop + conditional handleDiscover
- `src/components/intent/DouleurIntentScanner.vue` — added mode prop + conditional article watcher
- `src/components/intent/PainTranslator.vue` — added mode prop
- `src/components/intent/ExplorationInput.vue` — added mode prop
- `src/components/intent/IntentStep.vue` — added mode prop
- `src/components/intent/AutocompleteValidation.vue` — added mode prop
- `src/components/intent/ExplorationVerdict.vue` — added mode prop (new defineProps)
- `src/components/intent/LocalComparisonStep.vue` — added mode prop
- `src/components/local/MapsStep.vue` — added mode prop
- `src/components/intent/PainValidation.vue` — added mode prop
- `src/views/LaboView.vue` — added mode="libre" to 8 components
- `src/views/MoteurView.vue` — added mode="workflow" to 10 components
- `tests/unit/components/dual-mode-props.test.ts` — 12 tests (new)
