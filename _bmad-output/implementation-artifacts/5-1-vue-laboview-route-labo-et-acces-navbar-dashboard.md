# Story 5.1: Vue LaboView, route /labo et accès Navbar/Dashboard

Status: done

## Story

As a consultant SEO,
I want accéder au Labo depuis la Navbar et le Dashboard pour faire de la recherche libre,
so that je vérifie une intuition sur un mot-clé en quelques clics sans casser mon workflow.

## Acceptance Criteria

1. **Given** l'utilisateur est n'importe où dans l'application **When** il clique sur "Labo" dans la Navbar **Then** il est redirigé vers la route `/labo` **And** la vue LaboView s'affiche avec un champ de saisie de mot-clé libre.

2. **Given** l'utilisateur est sur le Dashboard **When** il clique sur le lien/bouton d'accès au Labo **Then** il est redirigé vers `/labo`.

3. **Given** l'utilisateur est sur le Labo **When** il saisit un mot-clé dans le champ libre (ex: "erp cloud pme") **Then** le mot-clé est prêt à être utilisé comme entrée pour les composants d'analyse **And** aucune sélection d'article ou de cocon n'est requise.

4. **Given** la route `/labo` est configurée dans Vue Router **When** l'utilisateur accède directement à `/labo` **Then** LaboView se charge en lazy loading (< 500ms — NFR3).

## Tasks / Subtasks

- [x] Task 1 : Ajouter la route /labo dans Vue Router (AC: #4)
  - [x] 1.1 : Ajouter la route `{ path: '/labo', name: 'labo', component: () => import('../views/LaboView.vue') }` dans `src/router/index.ts`
  - [x] 1.2 : Placer la route au même niveau que les routes `/cocoon/:cocoonId/*` (route top-level)
- [x] Task 2 : Créer LaboView.vue (AC: #1, #3)
  - [x] 2.1 : Créer `src/views/LaboView.vue` avec un champ de recherche libre et un state `activeKeyword`
  - [x] 2.2 : Implémenter la saisie avec validation (min 2 caractères, Enter ou bouton pour valider)
  - [x] 2.3 : Ajouter un système d'onglets plat (pas de phases) — 4 onglets : Discovery, Douleur, Exploration, Local (Audit exclu : cocoon-scoped)
  - [x] 2.4 : Ajouter le gate message "Saisissez un mot-clé pour commencer" quand `activeKeyword` est vide
  - [x] 2.5 : Importer les stores nécessaires (intent, local, discovery) et le composable useKeywordDiscoveryTab — PAS article-progress ni article-keywords
- [x] Task 3 : Ajouter le lien Labo dans AppNavbar (AC: #1)
  - [x] 3.1 : Ajouter un `<RouterLink to="/labo">` dans `src/components/shared/AppNavbar.vue` après les liens existants (Dashboard, Maillage, GSC)
  - [x] 3.2 : Appliquer le même style CSS que les liens existants
- [x] Task 4 : Ajouter le bouton d'accès au Labo dans DashboardView (AC: #2)
  - [x] 4.1 : Ajouter un bouton/lien "Labo" dans la zone d'actions du header de `src/views/DashboardView.vue`, à côté de Maillage/GSC/Config
- [x] Task 5 : Tests unitaires (AC: #1-4)
  - [x] 5.1 : Test de la route /labo — vérifie que le composant LaboView est importé en lazy loading
  - [x] 5.2 : Test de LaboView — vérifie le rendu initial avec le champ de recherche, le gate message quand pas de keyword, les onglets hidden quand pas de keyword
  - [x] 5.3 : Test de LaboView — vérifie que saisir un keyword et valider met à jour `activeKeyword` et active les onglets

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**INCHANGÉ :**
- Tous les composants internes (KeywordDiscoveryTab, DouleurIntentScanner, IntentStep, MapsStep, etc.) — NE PAS modifier dans cette story
- Stores Pinia — aucune modification
- Composables existants — aucune modification
- Backend/routes — aucune modification
- Le dual-mode `mode: 'workflow' | 'libre'` n'est PAS implémenté dans cette story (c'est Story 5.2)

**CRÉÉ :**
- `src/views/LaboView.vue` — orchestrateur mode libre

**MODIFIÉ :**
- `src/router/index.ts` — ajout route /labo
- `src/components/shared/AppNavbar.vue` — ajout lien Labo
- `src/views/DashboardView.vue` — ajout bouton d'accès Labo

### Scope précis de Story 5.1 vs Story 5.2

**Story 5.1 (CETTE story) :**
- Route, navigation, LaboView skeleton
- Champ de recherche libre avec `activeKeyword` state
- Onglets plats (tabs simples, pas de phases)
- Les onglets affichent les composants existants TELS QUELS — on passe juste `activeKeyword` comme keyword
- PAS de prop `mode` sur les composants enfants (c'est Story 5.2)
- PAS de `check-completed` (déjà absent car pas de `selectedArticle`)

**Story 5.2 (prochaine story) :**
- Ajout de `mode: 'workflow' | 'libre'` sur chaque composant réutilisable
- Adaptation des comportements conditionnels (émission d'events, save cache, etc.)
- Tests de non-régression mode workflow

### Pattern de LaboView — Architecture cible

```
LaboView.vue
├── Breadcrumb (Dashboard / Labo)
├── <div class="labo-search">
│   ├── <input v-model="keywordInput" @keydown.enter="setKeyword" />
│   └── <button @click="setKeyword">Rechercher</button>
│   └── Badge keyword actif (si défini)
│
├── Gate message (si pas de keyword actif)
│
├── Tab navigation (plat, pas de phases)
│   ├── Discovery
│   ├── Douleur
│   ├── Exploration
│   ├── Audit
│   └── Local
│
└── Tab content (composants existants avec keyword prop)
    ├── KeywordDiscoveryTab :pilier-keyword="activeKeyword" :cocoon-name="''" ...
    ├── PainTranslator :suggested-keyword="activeKeyword" ...
    ├── ExplorationInput :default-keyword="activeKeyword" + IntentStep + AutocompleteValidation
    ├── KeywordAuditTable (via auditStore — besoin d'un cocoonName fictif ou d'adapter)
    └── LocalComparisonStep + MapsStep :keyword="activeKeyword"
```

**IMPORTANT sur l'Audit :** Le `KeywordAuditTable` et `auditStore.fetchAudit(cocoonName)` sont scoped par cocoon. En mode libre, il n'y a pas de cocoon. **Pour Story 5.1**, on peut :
- Soit masquer l'onglet Audit en mode libre (le plus simple)
- Soit afficher un message "Audit non disponible en mode libre — sélectionnez un cocon"

**Recommandation :** Masquer Audit et Assignation en mode Labo. Les onglets disponibles sont : Discovery, Douleur, Exploration, Local (4 onglets au lieu de 8).

### Infrastructure existante utilisée

#### Router (src/router/index.ts)
```typescript
// Pattern existant — lazy loading
{
  path: '/cocoon/:cocoonId/moteur',
  name: 'moteur',
  component: () => import('../views/MoteurView.vue'),
}
// Ajouter au même niveau :
{
  path: '/labo',
  name: 'labo',
  component: () => import('../views/LaboView.vue'),
}
```

#### AppNavbar (src/components/shared/AppNavbar.vue)
```html
<!-- Links existants -->
<RouterLink to="/" class="nav-link" ...>Dashboard</RouterLink>
<RouterLink :to="`/linking`" class="nav-link" ...>Maillage</RouterLink>
<RouterLink :to="`/gsc`" class="nav-link" ...>GSC</RouterLink>
<!-- Ajouter : -->
<RouterLink to="/labo" class="nav-link" ...>Labo</RouterLink>
```

#### DashboardView (src/views/DashboardView.vue)
```html
<!-- Actions header existantes -->
<RouterLink to="/linking" class="header-action">Maillage</RouterLink>
<RouterLink to="/gsc" class="header-action">GSC</RouterLink>
<RouterLink to="/config" class="header-action-icon">Config</RouterLink>
<!-- Ajouter : -->
<RouterLink to="/labo" class="header-action">Labo</RouterLink>
```

#### Composants réutilisés — Props actuelles (PAS de mode prop)
```typescript
// KeywordDiscoveryTab — prend un pilierKeyword + article optionnels
props: { pilierKeyword: string, articleTitle?: string, articleKeyword?: string, ... }

// PainTranslator — prend un suggestedKeyword optionnel
props: { initialPainText?: string, suggestedKeyword?: string }

// IntentStep / MapsStep — juste un keyword
props: { keyword: string }

// LocalComparisonStep — juste un keyword
props: { keyword: string }
```

Ces composants sont déjà utilisables dans le Labo car les props article-specific sont optionnelles. Le keyword suffit.

### Composants NON disponibles en mode Labo

- **KeywordAuditTable** : Requiert `cocoonName` pour `auditStore.fetchAudit(cocoonName)` — pas de cocoon en mode libre
- **KeywordEditor** / **DiscoveryPanel** : Liés au cocoon
- **KeywordMigrationPreview** : Assignation article-specific
- **MoteurPhaseNavigation** : Structure 3 phases — le Labo a des onglets plats
- **PhaseTransitionBanner** : Progression par phases
- **SelectedArticlePanel** : Sélection article
- **MoteurContextRecap** : Articles proposés/publiés du cocoon
- **MoteurStrategyContext** : Stratégie du cocoon

### Onglets disponibles dans le Labo

| Onglet | Composant principal | Keyword-only? |
|--------|-------------------|---------------|
| Discovery | KeywordDiscoveryTab | Oui (pilierKeyword + optionnels vides) |
| Douleur | PainTranslator | Oui (suggestedKeyword) |
| Exploration | ExplorationInput + IntentStep + AutocompleteValidation + ExplorationVerdict | Oui |
| Local | LocalComparisonStep + MapsStep | Oui |

### Enforcement Guidelines

- Utiliser le lazy loading `() => import(...)` pour la route /labo (NFR3 : < 500ms)
- Logger via `log.debug/info` — jamais `console.log`
- Utiliser `apiGet`/`apiPost` de `@/services/api.service` — jamais `fetch` directement
- Composition API Pinia — pas d'Options API
- Tests dans `tests/unit/` structure miroir
- Breadcrumb existant (`@/components/shared/Breadcrumb.vue`) pour la navigation
- NE PAS créer de nouveau store pour le Labo — utiliser les stores existants directement
- NE PAS modifier les composants enfants (Discovery, Intent, etc.) — c'est Story 5.2
- NE PAS implémenter le dual-mode `mode: 'workflow' | 'libre'` — c'est Story 5.2

### Risques identifiés

1. **KeywordDiscoveryTab et cocoonName** : Ce composant accepte `cocoonName` en prop optionnelle. En mode Labo, passer une string vide `''`. Vérifier que le composant ne crash pas si cocoonName est vide.
2. **auditStore.fetchAudit(cocoonName)** : L'Audit est scoped par cocoon. Ne pas inclure l'onglet Audit dans le Labo (Story 5.1).
3. **Réinitialisation des stores au changement de keyword** : Quand l'utilisateur change de keyword dans le Labo, les stores doivent être reset. Réutiliser le pattern de `useArticleResults.clearResults()` ou appeler `intentStore.reset()` / `localStore.reset()` directement.
4. **Taille de LaboView** : Garder le composant petit (~100-150 lignes max). Pas de logique métier complexe — c'est un orchestrateur léger.

### Project Structure Notes

- Nouveau fichier : `src/views/LaboView.vue`
- Modifié : `src/router/index.ts`, `src/components/shared/AppNavbar.vue`, `src/views/DashboardView.vue`
- Tests dans `tests/unit/views/` ou `tests/unit/components/` selon le pattern existant

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#DualModeProps]
- [Source: _bmad-output/planning-artifacts/architecture.md#Navigation et routage]
- [Source: src/router/index.ts — lazy loading pattern]
- [Source: src/components/shared/AppNavbar.vue — nav links]
- [Source: src/views/DashboardView.vue — header actions]
- [Source: src/views/MoteurView.vue — orchestrator pattern, tab navigation, store imports]
- [Source: _bmad-output/implementation-artifacts/4-2-rechargement-automatique-des-resultats-par-article.md — previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation.

### Completion Notes List

- Route `/labo` added with lazy loading — same pattern as all other views
- LaboView.vue created as lightweight orchestrator (277 lines) — 4 flat tabs: Discovery, Douleur, Exploration, Local
- Audit tab intentionally excluded (cocoon-scoped — no cocoon in libre mode)
- AppNavbar: "Labo" link added after GSC
- DashboardView: "Labo" button added in header actions before Config icon
- 13 unit tests: 1 router, 1 AppNavbar, 11 LaboView (render, gate, tabs, input validation, keyword activation, tab switching)
- Build validation: vue-tsc clean, vite build success, 89 test files pass (3 pre-existing failures unchanged)

### File List

- `src/views/LaboView.vue` — CREATED (orchestrator for libre mode)
- `src/router/index.ts` — MODIFIED (added /labo route)
- `src/components/shared/AppNavbar.vue` — MODIFIED (added Labo link)
- `src/views/DashboardView.vue` — MODIFIED (added Labo button)
- `tests/unit/components/labo-view.test.ts` — CREATED (13 tests)
