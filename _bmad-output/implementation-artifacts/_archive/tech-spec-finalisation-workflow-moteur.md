> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

---
title: 'Finalisation workflow Moteur — intent, cache, cannibalisation, navigation'
slug: 'finalisation-workflow-moteur'
created: '2026-04-05'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Vue 3 + Composition API', 'Pinia', 'TypeScript', 'Express', 'Vitest', 'DataForSEO API']
files_to_modify:
  - 'server/routes/keyword-validate.routes.ts'
  - 'server/services/keyword-validate.service.ts'
  - 'shared/types/keyword-validate.types.ts'
  - 'server/routes/cocoons.routes.ts'
  - 'src/views/MoteurView.vue'
  - 'src/views/RedactionView.vue'
  - 'src/components/moteur/MoteurContextRecap.vue'
  - 'src/components/moteur/LieutenantsSelection.vue'
  - 'src/components/moteur/LexiqueExtraction.vue'
code_patterns:
  - 'RecapToggle + provideRecapRadioGroup pour les panneaux collapsables'
  - 'apiGet/apiPost/apiPut dans services/api.service.ts'
  - 'useStreaming pour les panels IA (SSE)'
  - 'readCached/writeCached/slugify dans server/utils/cache.ts'
  - 'articleProgressStore.addCheck/removeCheck pour le suivi de progression'
  - 'emits check-completed/check-removed pour la communication parent'
test_patterns:
  - 'Vitest + @vue/test-utils mount/shallowMount'
  - 'vi.mock pour les services API et stores'
  - 'describe/it/expect avec format Given/When/Then dans les noms'
---

# Tech-Spec: Finalisation workflow Moteur — intent, cache, cannibalisation, navigation

**Created:** 2026-04-05

## Overview

### Problem Statement

Le workflow Moteur est fonctionnel mais présente 7 lacunes qui empêchent un parcours utilisateur fiable de A à Z :

1. **Intent KPI fictif** — Le KPI "Intent" dans la validation Capitaine retourne toujours `0.5` (placeholder), faussant le verdict GO/ORANGE/NO-GO sur 1/6 des indicateurs.
2. **Pas de restauration Lieutenants/Lexique** — Après refresh, les résultats SERP et TF-IDF sont perdus côté client. L'utilisateur doit relancer les analyses (qui, elles, sont déjà cachées côté serveur).
3. **Pas de détection de cannibalisation** — Deux articles du même cocon peuvent avoir le même capitaine locké sans avertissement visible.
4. **Pas de RecapToggle dans Rédaction** — La vue Rédaction n'affiche pas le contexte stratégique, contrairement au Moteur.
5. **Navigation non intelligente** — À la sélection d'un article, on arrive toujours sur Capitaine au lieu du dernier onglet pertinent (ex: Lexique si Lieutenants est déjà locké).
6. **Word groups éphémères** — Les groupes de mots Discovery ne survivent pas au refresh; les Lieutenants perdent une de leurs 4 sources de candidats.
7. **Pas de try/catch sur addCheck/removeCheck** — Une erreur réseau silencieuse désynchronise le progrès visuel.

### Solution

Implémenter les 7 corrections ciblées pour compléter le workflow Moteur et garantir un parcours robuste et cohérent.

### Scope

**In Scope:**
- Brancher `fetchSearchIntentBatch` dans la route de validation Capitaine
- Auto-restauration des résultats SERP et TF-IDF depuis le cache serveur existant
- Indicateur de cache dans `tabCacheEntries` pour Lieutenants/Lexique
- Warning cannibalisation dans `MoteurContextRecap`
- `RecapToggle` contexte stratégique dans `RedactionView`
- Navigation intelligente vers le premier onglet non-complété à la sélection d'article
- Persistance des word groups dans le cache Discovery (déjà fait — vérifier)
- Try/catch sur les appels addCheck/removeCheck dans MoteurView

**Out of Scope:**
- Clustering sémantique, estimation de trafic, comparaison bulk, export CSV
- Preview concurrentiel dans Capitaine, brief automatique, onboarding/tooltips

## Context for Development

### Codebase Patterns

- **Cache serveur** : `readCached<T>(dir, key)` / `writeCached(dir, key, data)` dans `server/utils/cache.ts`. Le cache SERP existe déjà dans `SERP_CACHE_DIR` (utilisé par `serp-analysis.routes.ts` lignes 2-3, 43).
- **Cache client Discovery** : Le composable `useKeywordDiscoveryTab.ts` utilise `apiGet/apiPost` vers `/discovery-cache/load` et `/discovery-cache/save`. Les word groups sont DÉJÀ inclus dans le cache Discovery (ligne 645: `wordGroups: wordGroups.value`).
- **Progression articles** : `articleProgressStore` (`article-progress.store.ts`) stocke un `progressMap<slug, ArticleProgress>` avec `completedChecks: string[]`. Les 5 checks possibles : `discovery_done`, `radar_done`, `capitaine_locked`, `lieutenants_locked`, `lexique_validated`.
- **Gating** : Les onglets Phase 2 utilisent un gating souple via `isCaptaineLocked` et `isLieutenantsLocked` (computeds dans MoteurView lignes 325-341).
- **RecapToggle** : Composant `src/components/shared/RecapToggle.vue` + `provideRecapRadioGroup()` obligatoire au niveau parent pour le radio-group behavior.
- **Intent API** : `fetchSearchIntentBatch(keywords[])` dans `server/services/dataforseo.service.ts` ligne 446. Retourne `Map<string, { intent: string; intentProbability: number }>`. Déjà utilisée par `keyword-radar.service.ts` et `keyword-discovery.service.ts`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `server/routes/keyword-validate.routes.ts` | Route POST validation Capitaine — intent hardcodé ligne 88 |
| `server/services/dataforseo.service.ts:446` | `fetchSearchIntentBatch` — la fonction à brancher |
| `server/services/keyword-validate.service.ts` | `scoreKpi('intent', value, config)` — scoring intent existant |
| `src/views/MoteurView.vue` | Orchestrateur — gestion articles, tabs, cross-tab state |
| `src/views/RedactionView.vue` | Vue Rédaction actuelle (59 lignes, minimaliste) |
| `src/components/moteur/MoteurContextRecap.vue` | Liste d'articles avec ProgressDots |
| `src/components/moteur/MoteurStrategyContext.vue` | RecapToggle contexte stratégique (à réutiliser) |
| `src/components/moteur/LieutenantsSelection.vue` | Onglet Lieutenants — `serpResult` + auto-trigger |
| `src/components/moteur/LexiqueExtraction.vue` | Onglet Lexique — `tfidfResult` + auto-extract |
| `src/stores/article-keywords.store.ts` | Store per-article keywords (capitaine, lieutenants, lexique) |
| `src/stores/article-progress.store.ts` | Store progression (completedChecks) |
| `src/composables/useKeywordDiscoveryTab.ts:617` | Restauration word groups depuis cache Discovery |
| `server/routes/serp-analysis.routes.ts` | Cache SERP serveur — `readCached(SERP_CACHE_DIR, slugify(keyword))` |
| `shared/types/keyword-validate.types.ts` | Types ValidateResponse, KpiResult |

### Technical Decisions

1. **Intent : appel batch pour 1 seul keyword** — `fetchSearchIntentBatch` accepte un tableau. On l'appelle avec `[keyword]` et on extrait le résultat. L'overhead est négligeable car c'est déjà un appel API unitaire dans le batch size 1.

2. **Restauration Lieutenants/Lexique : re-trigger API plutôt que cache client** — Le cache SERP existe déjà côté serveur. Plutôt que d'ajouter un cache client dédié, on auto-trigger l'appel API au mount/article-change quand les conditions sont remplies (capitaine locké). L'API retournera les données depuis le cache serveur instantanément.

3. **Cannibalisation : check côté client uniquement** — On utilise `getArticleKeywordsByCocoon` existant (data.service.ts:371) exposé via une nouvelle route API, requêté depuis MoteurView. L'icône warning est affichée à côté des articles concernés dans MoteurContextRecap.

4. **Navigation intelligente : déduction depuis completedChecks** — On calcule le premier onglet non-complété parmi les obligatoires (`capitaine` → `lieutenants` → `lexique`) en se basant sur `articleProgressStore.getProgress(slug).completedChecks`.

## Implementation Plan

### Tasks

- [x] Task 1: Brancher le vrai intent dans la validation Capitaine
  - File: `server/routes/keyword-validate.routes.ts`
  - Action: Remplacer `const intentValue = 0.5` (ligne 88) par un appel à `fetchSearchIntentBatch([keyword])`. Extraire le résultat de la Map. Passer le résultat à un nouveau helper `computeIntentScore(intent, probability, articleLevel)`.
  - Notes: Importer `fetchSearchIntentBatch` depuis `dataforseo.service.js`. Ajouter l'appel en parallèle dans le `Promise.all` existant (ligne 60) pour ne pas ajouter de latence. Le `Promise.all` devient `[overview, autocomplete, serpResult, intentMap]`.

- [x] Task 2: Fonction helper `computeIntentScore` + refactor `scoreIntent` pour valeurs continues
  - Files: `server/services/keyword-validate.service.ts`, `shared/types/keyword-validate.types.ts`
  - Action — **4 modifications en cascade** :
    **2a) Type `ThresholdConfig.intent`** (`shared/types/keyword-validate.types.ts` ligne 51) :
    - Remplacer `intent: { match: string; mixed: string }` par `intent: { green: number; orange: number }` pour aligner avec tous les autres KPIs numériques.
    **2b) 3 objets `THRESHOLDS`** (`keyword-validate.service.ts` lignes 19, 27, 35) :
    - Remplacer `{ match: 'informational', mixed: 'mixed' }` par `{ green: 0.7, orange: 0.4 }` dans les 3 niveaux (pilier, intermediaire, specifique).
    **2c) Ajouter `computeIntentScore`** (`keyword-validate.service.ts`) :
    - `computeIntentScore(intent: string, probability: number, articleLevel: ArticleLevel): number`
    - Matrice intent × level (labels DataForSEO : `informational`, `commercial`, `transactional`, `navigational`) :
      - `informational` : pilier=0.7, intermediaire=0.5, specifique=1.0
      - `commercial` : pilier=1.0, intermediaire=1.0, specifique=0.5
      - `transactional` : pilier=0.3, intermediaire=0.7, specifique=0.3
      - `navigational` : 0.2 pour tous
    - Score final = `matrixValue × probability` → valeur continue 0..1
    - Fallback si intent non trouvé = 0.5
    **2d) Réécrire `scoreIntent`** (actuellement lignes 197-212, utilise `=== 1` / `=== 0.5` et `config.intent.match` / `config.intent.mixed`) :
    - Utiliser les seuils numériques : `rawValue >= config.intent.green` → green, `>= config.intent.orange` → orange, else → red
    - Label : afficher le score arrondi (ex: `"0.85"`) au lieu de l'ancien mapping string (`match`/`mixed`/`mismatch`)
    - Thresholds retournés : `{ green: config.intent.green, orange: config.intent.orange }`
  - Notes: **CRITIQUE** — Sans cette cascade complète, les valeurs continues (0.595, 0.92) ne matchent jamais les checks `=== 1` / `=== 0.5` et tout tombe en rouge. Les 4 modifications sont interdépendantes. Les labels DataForSEO sont `commercial` (PAS `commercial_investigation`).

- [x] Task 3: Auto-restauration SERP + fix reset dans LieutenantsSelection
  - File: `src/components/moteur/LieutenantsSelection.vue`
  - Action: Trois modifications :
    a) **Fix bug article-change watcher** (ligne 245) : Remplacer `isLocked.value = false` par `isLocked.value = props.initialLocked`. Actuellement, changer d'article force `isLocked = false` même si le nouvel article a ses lieutenants déjà lockés. Avec `props.initialLocked`, le composant reflète l'état réel du nouvel article.
    b) Ajouter `{ immediate: true }` au watcher `isCaptaineLocked` (ligne 251) pour trigger au premier mount si déjà locké.
    c) **Ajouter un watcher sur `[() => props.isCaptaineLocked, () => props.captainKeyword]`** qui trigger `analyzeSERP()` quand le keyword change (couvre le cas switching entre deux articles captain-locked sans que `isCaptaineLocked` change de valeur). Guard: `locked && captainKeyword && !serpResult.value && !isLoading.value`.
  - Notes: Le watcher `isCaptaineLocked` seul ne suffit pas quand on switch entre deux articles déjà lockés (la valeur reste `true`, le callback ne re-fire pas). Le watcher combiné avec `captainKeyword` détecte le changement d'article. **Attention au `visitedTabs`** : ce composant ne se monte que quand l'utilisateur visite l'onglet Lieutenants OU quand Task 6 (smart nav) y redirige. L'auto-trigger fonctionne au mount grâce à `immediate: true`.

- [x] Task 4: Auto-restauration TF-IDF dans LexiqueExtraction
  - File: `src/components/moteur/LexiqueExtraction.vue`
  - Action: Deux modifications :
    a) **Créer une fonction dédiée `restoreTfidf()`** qui appelle l'API `/api/serp/tfidf` directement SANS passer par `extractLexique()`. Raison : `extractLexique()` (ligne 46-47) utilise un guard `canExtract.value` qui inclut `!isLocked.value` (ligne 43). Pour un article déjà validé (`initialLocked=true`), `isLocked=true` → `canExtract=false` → `extractLexique()` fait un return early et ne charge rien. La fonction `restoreTfidf()` appelle directement `apiPost<TfidfResult>('/serp/tfidf', { keyword })`, assigne `tfidfResult.value`, et pré-sélectionne les termes obligatoires (même logique que `extractLexique` lignes 59+).
    b) **Ajouter un watcher** sur `[() => props.isLieutenantsLocked, () => props.captainKeyword]` avec `{ immediate: true }` qui appelle `restoreTfidf()`. Guard: `isLieutenantsLocked && captainKeyword && !tfidfResult.value && !isLoading.value` (PAS de `!isLocked.value`).
  - Notes: L'API `/api/serp/tfidf` lit depuis le cache SERP existant. Même pattern que Task 3 pour le watcher combiné (switch entre articles). Les termes restent non-modifiables pour les articles lockés car `isLocked=true` contrôle l'UI indépendamment.

- [x] Task 5: Indicateurs cache Lieutenants/Lexique dans tabCacheEntries
  - File: `src/views/MoteurView.vue`
  - Action: Modifier le computed `tabCacheEntries` (lignes 422-435) pour Lieutenants et Lexique :
    - Lieutenants : `hasCachedData: isLieutenantsLocked.value`, `summary: isLieutenantsLocked.value ? `${articleKeywordsStore.keywords?.lieutenants?.length ?? 0} lieutenants` : undefined`
    - Lexique : `hasCachedData: isLexiqueValidated.value`, `summary: isLexiqueValidated.value ? `${articleKeywordsStore.keywords?.lexique?.length ?? 0} termes` : undefined`

- [x] Task 6: Navigation intelligente à la sélection d'article
  - File: `src/views/MoteurView.vue`
  - Action: Ajouter une fonction `computeSmartTab(slug: string): Tab` :
    1. Récupère `completedChecks` depuis `articleProgressStore.getProgress(slug)`
    2. Si tous les checks Phase 2 sont complétés → `capitaine`
    3. Si `lieutenants_locked` ∈ checks → `lexique`
    4. Si `capitaine_locked` ∈ checks → `lieutenants`
    5. Sinon → `capitaine`
  - **Séquencement dans `handleSelectArticle()`** : Utiliser le cache local du progressStore plutôt qu'un await réseau. `MoteurContextRecap` fetch déjà le progress de tous les articles au mount (watcher ligne 84-98). Donc `articleProgressStore.getProgress(slug)` est déjà disponible localement. Si pas en cache (fréquent au premier chargement avant que MoteurContextRecap ne monte), fallback sur `capitaine`. Pour robustesse : si `getProgress(slug)` retourne `undefined` ou `completedChecks` vide, toujours fallback `capitaine`.
  - Assigner `activeTab.value = computeSmartTab(slug)` **APRÈS** `selectedArticle.value = article` et le reset `visitedTabs`. Ajouter le smart tab au `visitedTabs` pour que le composant se monte : `visitedTabs.value[smartTab] = true`.
  - Notes: **Pas d'await** dans handleSelectArticle — on utilise les données déjà en cache côté client. Cela évite la race condition identifiée en review (F4).

- [x] Task 7: Route API capitaines par cocon
  - File: `server/routes/cocoons.routes.ts`
  - Action: Ajouter `GET /api/cocoons/:cocoonName/capitaines` qui appelle `getArticleKeywordsByCocoon(decodeURIComponent(req.params.cocoonName))` et retourne `Record<string, string>` = `{ [slug]: capitaine }` pour les articles ayant un capitaine non-vide.
  - Notes: `getArticleKeywordsByCocoon` existe déjà dans `data.service.ts:371` et prend un **nom de cocon** (string), pas un ID numérique. La convention existante des routes cocoons utilise `:id` (numérique), mais la fonction service attend un nom. On utilise `:cocoonName` pour cette route car convertir ID→nom ajouterait une complexité inutile. Utiliser `decodeURIComponent` car les noms contiennent des accents/espaces.

- [x] Task 8: Fetch + affichage warning cannibalisation
  - File: `src/views/MoteurView.vue` + `src/components/moteur/MoteurContextRecap.vue`
  - Action MoteurView: Ajouter un `ref<Record<string, string>>` `capitainesMap` et une **fonction dédiée `refreshCapitainesMap()`** qui fetch via `apiGet(`/cocoons/${encodeURIComponent(cocoonName)}/capitaines`)`. Appeler `refreshCapitainesMap()` dans `loadData()` après le fetch cocoons/strategy. Passer en prop à `MoteurContextRecap`. Pour le re-fetch au lock/unlock, appeler `refreshCapitainesMap()` dans `emitCheckCompleted(check)` et `handleCheckRemoved(check)` uniquement si `check === 'capitaine_locked'`. La séparation en fonction dédiée évite de polluer les handlers génériques avec de la logique métier cannibalisation.
  - Action MoteurContextRecap: Ajouter prop `capitainesMap: Record<string, string>`, default `{}`. Pour chaque article affiché, vérifier si un autre article a le même capitaine (case-insensitive). Si oui, afficher une icône SVG warning orange avec un `title` tooltip.

- [x] Task 9: RecapToggle contexte stratégique dans RedactionView
  - File: `src/views/RedactionView.vue`
  - Action: Transformer la vue (59 lignes → ~120 lignes) :
    a) Imports à ajouter : `useCocoonStrategyStore`, `useKeywordsStore`, `MoteurStrategyContext`, `MoteurContextRecap`, `provideRecapRadioGroup`.
    b) Setup : `provideRecapRadioGroup()`, `const strategyStore = useCocoonStrategyStore()`, `const keywordsStore = useKeywordsStore()`.
    c) Computed `cocoonSlug` : même pattern que MoteurView (lignes 85-92) — slugify `cocoon.value?.name`.
    d) Computed `proposedArticles` : `strategyStore.strategy?.proposedArticles ?? []`.
    e) Computed `publishedArticles` : `cocoon.value?.articles ?? []`.
    f) Dans `loadData()` : **séquencement** — d'abord fetch cocoons (pour obtenir `cocoonName` et `cocoonId`), puis en parallèle : `keywordsStore.fetchKeywordsByCocoon(cocoonName)`, `strategyStore.fetchStrategy(cocoonSlug)`, `strategyStore.fetchContext(cocoonId)`. Utiliser `Promise.all` pour les 3 appels parallèles qui dépendent du résultat cocoons.
    g) Template : Ajouter `MoteurStrategyContext` + `MoteurContextRecap` (readonly, sans `@select`) avant `ArticleList`.
  - Notes: Cette task est plus conséquente qu'un simple import — il faut reproduire le même plumbing que MoteurView pour les données stratégiques. Nécessite Task 10 (prop readonly).

- [x] Task 10: Prop `readonly` sur MoteurContextRecap
  - File: `src/components/moteur/MoteurContextRecap.vue`
  - Action: Ajouter prop optionnelle `readonly: boolean = false`. Quand `readonly=true` : pas d'emit `select`, `cursor: default` sur les boutons articles, pas de classe `selected`. Les ProgressDots restent visibles.

- [x] Task 11: Error handling sur addCheck et removeCheck dans MoteurView
  - File: `src/views/MoteurView.vue`
  - Action: Utiliser `.catch()` sur les promises (PAS try/catch car les fonctions ne sont pas async) :
    ```
    articleProgressStore.addCheck(slug, check).catch(err => log.warn('[MoteurView] addCheck failed', { slug, check, error: err }))
    ```
    Même pattern pour `removeCheck`. Ne pas bloquer le flow utilisateur.
  - Notes: Les fonctions `emitCheckCompleted` et `handleCheckRemoved` sont synchrones fire-and-forget. Un `.catch()` sur la promise retournée est le pattern correct.

- [x] Task 12: Vérifier que les word groups sont bien restaurés depuis le cache Discovery
  - File: `src/composables/useKeywordDiscoveryTab.ts`
  - Action: Vérification uniquement — `loadFromCache()` restaure `wordGroups.value` (ligne 617) et `saveToCache()` sauvegarde `wordGroups` (ligne 645). Le composable expose `wordGroups` (ligne 796). MoteurView passe `discoveryWordGroups` aux Lieutenants (ligne 614). **Si tout est OK → aucun changement de code, marquer vérifié.**

### Acceptance Criteria

- [x] AC 1: Given un keyword "creation site web" validé pour un article Pilier, when la validation Capitaine s'exécute, then le KPI Intent affiche un score basé sur l'intent réel (informational/commercial/transactional) et NON 0.5.

- [x] AC 2: Given un keyword sans données intent dans DataForSEO, when la validation Capitaine s'exécute, then le KPI Intent utilise le fallback 0.5 et le verdict est calculé normalement.

- [x] AC 3: Given un article avec Capitaine locké et SERP déjà analysé (cache serveur), when l'utilisateur revient sur le Moteur et sélectionne cet article, then l'onglet Lieutenants charge automatiquement les résultats SERP sans action manuelle.

- [x] AC 4: Given un article avec Lieutenants lockés (TF-IDF en cache serveur), when l'utilisateur sélectionne cet article et va sur Lexique, then les résultats TF-IDF s'affichent automatiquement.

- [x] AC 5: Given les tabCacheEntries, when un article a ses lieutenants lockés, then l'entrée Lieutenants affiche `hasCachedData: true` avec le nombre de lieutenants.

- [x] AC 6: Given deux articles A et B dans le même cocon, when l'utilisateur lock le même capitaine sur A puis sur B, then une icône warning apparaît à côté de A ET de B dans MoteurContextRecap.

- [x] AC 7: Given un article avec `completedChecks = ['capitaine_locked']`, when l'utilisateur le sélectionne, then l'onglet actif est automatiquement `lieutenants`.

- [x] AC 8: Given un article avec `completedChecks = ['capitaine_locked', 'lieutenants_locked']`, when l'utilisateur le sélectionne, then l'onglet actif est automatiquement `lexique`.

- [x] AC 9: Given un article vierge (pas de checks), when l'utilisateur le sélectionne, then l'onglet actif est `capitaine`.

- [x] AC 10: Given un article avec tous les checks Phase 2 complétés, when l'utilisateur le sélectionne, then l'onglet actif est `capitaine` (l'utilisateur peut revoir son travail depuis le début du workflow).

- [x] AC 11: Given la vue Rédaction, when elle se charge, then le contexte stratégique s'affiche dans un RecapToggle et la liste d'articles avec ProgressDots est visible en readonly.

- [x] AC 12: Given `addCheck` qui échoue (erreur réseau), when le Capitaine est locké, then le lock visuel fonctionne et l'erreur est loggée sans crash.

- [x] AC 13: Given un cache Discovery sauvegardé avec word groups, when l'utilisateur revient et restaure le cache, then les Lieutenants reçoivent les word groups comme source de candidats.

## Additional Context

### Dependencies

- **DataForSEO API** : L'appel `fetchSearchIntentBatch` consomme des crédits API. Pour 1 keyword, le coût est minimal. L'appel est ajouté en parallèle donc pas d'impact latence.
- **Cache SERP serveur** : Les Tasks 3 et 4 dépendent du fait que `analyzeSerpCompetitors` cache ses résultats — c'est déjà le cas.
- **Route existante** `getArticleKeywordsByCocoon` : data.service.ts:371 — déjà implémentée, juste besoin d'une route Express pour l'exposer.

### Testing Strategy

**Tests unitaires (Vitest) :**

- `keyword-validate.service.test.ts` : Ajouter describe `computeIntentScore` — tests pour chaque combinaison intent × level + fallback.
- `keyword-validate.routes.test.ts` : Mocker `fetchSearchIntentBatch` → vérifier que KPI intent ≠ 0.5.
- `moteur-smart-navigation.test.ts` (nouveau) : Tester `computeSmartTab` avec différentes combinaisons de checks.
- `moteur-context-recap.test.ts` (nouveau ou existant) : Tester warning cannibalisation quand deux articles partagent le même capitaine.
- `keyword-validate.service.test.ts` : Mettre à jour les tests `scoreIntent` existants pour les nouvelles thresholds continues (>= 0.7 green, >= 0.4 orange, < 0.4 red). Vérifier que `config.intent.green` / `config.intent.orange` sont utilisés (plus de `.match` / `.mixed`).

**Test AC 13 (word groups) :**
- Test manuel : sauvegarder cache Discovery avec word groups → recharger → vérifier que `discoveryWordGroups` est non-vide dans MoteurView et passé aux Lieutenants.

**Tests manuels :**

1. Valider un keyword dans Capitaine → vérifier KPI Intent réel
2. Fermer/rouvrir → sélectionner article avec Lieutenants déjà faits → restauration auto
3. Locker même capitaine sur 2 articles → icône warning visible
4. Sélectionner article avec `capitaine_locked` → arrivée sur Lieutenants
5. Vue Rédaction → RecapToggle stratégique en haut

### Notes

- **Ordre d'implémentation** : Tasks 1-2 (intent + scoreIntent refactor) → 11 (error handling, quick win) → **6 (navigation intelligente — AVANT restauration)** → 3-5 (restauration — dépend de Task 6 pour le mount des composants via smart tab) → 7-8 (cannibalisation) → 9-10 (rédaction) → 12 (vérification)
- **Risque principal** : Task 6 modifie `handleSelectArticle` — la fonction la plus critique du MoteurView. Tester minutieusement.
- **Dépendance critique** : Tasks 3-4 (auto-restore) dépendent de Task 6 (smart nav) car les composants Lieutenants/Lexique ne se montent que si `visitedTabs[tab]` est true. Task 6 set le smart tab dans `visitedTabs`, ce qui monte le composant et déclenche les watchers `immediate`.
- **Cache SERP TTL** : Le cache serveur a un TTL (7 jours). Si expiré, l'API re-fetch. L'utilisateur voit un spinner — acceptable.

## Review Notes

- Adversarial review completed
- Findings: 14 total, 5 fixed, 9 skipped (4 hors-scope/pré-existants, 2 noise/undecided, 2 low-priority, 1 test coverage deferred)
- Resolution approach: auto-fix
- Fixed: F1 (race condition watchers), F4 (clamp intent 0..1), F5 (DRY fetchTfidf), F6 (stale cocoonSlug), F8 (preserve capitainesMap on error)
