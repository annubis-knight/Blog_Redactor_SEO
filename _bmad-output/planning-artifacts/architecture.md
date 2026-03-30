---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-28.md'
workflowType: 'architecture'
project_name: 'Blog Redactor SEO'
user_name: 'Utilisateur'
date: '2026-03-30'
lastStep: 8
status: 'complete'
completedAt: '2026-03-30'
---

# Architecture Decision Document — Blog Redactor SEO

**Auteur :** Utilisateur + Claude (Architect)
**Date :** 2026-03-30

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements (28 FRs en 7 domaines) :**

| Domaine | FRs | Implication architecturale |
|---------|-----|--------------------------|
| Moteur — Structure 3 phases | FR1-FR5 | Refactoring du MoteurView en layout à phases visuelles, suppression Content Gap, fusion Local+Maps |
| Phase ① Générer | FR6-FR9 | Onglets optionnels avec verrouillage conditionnel (si mots-clés validés) |
| Phase ② Valider | FR10-FR13 | 4 onglets tous actifs, onglet Local fusionné (2 sections dans 1 composant) |
| Phase ③ Assigner | FR14-FR15 | Gating souple — message inline conditionnel (pas de blocage navigation) |
| Progression & guidage | FR16-FR19 | Store article-progress comme hub central, checks automatiques, bandeaux de transition |
| Pont Cerveau→Moteur | FR20-FR22 | Section collapsable, pré-processing prompts IA, indicateur d'alignement textuel |
| Labo & Cache | FR23-FR28 | Composants dual-mode (contextualisé/libre), cache par article, persistance JSON |

**Non-Functional Requirements (12 NFRs sur 4 axes) :**

| Axe | NFRs | Contrainte architecturale |
|-----|------|--------------------------|
| Performance | NFR1-NFR4 | API locales < 200ms, SSE premier token < 2s, changement de vue < 500ms, cache hit > 90% |
| Coûts | NFR5-NFR7 | Zéro appel API redondant, persistance disque, limite 5MB JSON |
| Intégration | NFR8-NFR10 | Composants dual-mode (contextualisé/libre), enrichissement prompts optionnel, article-progress source unique |
| Maintenabilité | NFR11-NFR12 | Pas de duplication composants (prop de mode), prompts .md séparés avec pré-processing |

**Scale & Complexity :**

- Domaine principal : Full-stack SPA (Vue 3 + Express 5)
- Complexité : Moyenne — orchestration workflows, intégrations API multiples, pas de contraintes réglementaires
- Contexte : Brownfield — 75+ composants, 21 stores Pinia, 29 services, 11 vues existantes

### Technical Constraints & Dependencies

- **Brownfield** : la restructuration doit préserver les composants internes existants — seuls les wrappers (MoteurView) et le système de progression changent
- **Stack figé** : Vue 3, Pinia, TipTap, Express 5, Claude API (Anthropic SDK), DataForSEO, Zod, Vitest
- **Mono-utilisateur local** : Pas d'auth, pas de multi-tenant, pas de déploiement cloud
- **Store article-progress existant** : Contient `completedChecks: string[]` — fondation de la progression
- **Prompts IA en fichiers .md** : `server/prompts/*.md` avec `{{variable}}` — l'enrichissement est un pré-processing
- **Cache DataForSEO en place** : Pattern à étendre aux autres services

### Cross-Cutting Concerns Identified

1. **Dual-mode composants** — Chaque composant Moteur doit fonctionner avec ou sans contexte article/cocon
2. **Progression réactive** — Le store article-progress reçoit des événements de 7+ sources
3. **Cache systématique** — 6+ services doivent implémenter le même pattern cache
4. **Enrichissement prompts** — La stratégie du Cerveau doit être injectée dans les appels Claude du Moteur
5. **Navigation libre avec guidage** — Aucun gating dur, mais messages conditionnels et bandeaux

---

## Starter Template — Brownfield Assessment

### Stack existante (pas de starter template — brownfield)

Ce projet est **brownfield**. Aucun starter template n'est nécessaire. Le stack est en place et verrouillé.

**Stack actuelle vérifiée :**

| Technologie | Version | Rôle |
|-------------|---------|------|
| Vue | 3.5.29 | Framework frontend |
| Vue Router | 5.0.3 | Routing SPA |
| Pinia | 3.0.4 | State management |
| TipTap | 3.20.1 | Éditeur rich-text |
| Express | 5.2.1 | Serveur API |
| TypeScript | 5.9.3 | Typage |
| Vite | 7.3.1 | Build & dev server |
| Vitest | 4.0.18 | Tests unitaires |
| Zod | 4.3.6 | Validation schemas |
| Anthropic SDK | 0.78.0 | API Claude |
| Hugging Face Transformers | 3.8.1 | Embeddings NLP |
| VueUse | 14.2.1 | Composables utilitaires |
| Chalk | 5.6.2 | Logs colorés |

**Tooling :**

| Outil | Usage |
|-------|-------|
| oxlint + ESLint | Linting |
| Prettier | Formatage |
| concurrently | Dev server front + back simultanés |
| tsx | Exécution TypeScript backend |
| vue-tsc | Type-checking |

**Commande de dev :**

```bash
npm run dev  # concurrently: vite (front) + node --watch server/index.ts (back)
```

---

## Core Architectural Decisions

### Decision Priority Analysis

**Décisions critiques (bloquent l'implémentation) :**

1. Pattern dual-mode composants (workflow vs libre)
2. Architecture du système de progression
3. Pattern d'enrichissement des prompts IA
4. Restructuration du MoteurView

**Décisions importantes (façonnent l'architecture) :**

5. Pattern cache étendu
6. Architecture du Labo
7. Fusion Local + Maps

**Décisions différées (post-MVP) :**

8. Batch processing multi-articles
9. Boucle GSC post-publication

### Data Architecture

**Stockage : fichiers JSON locaux (inchangé)**

- Base de données : Fichiers JSON dans `data/` — pas de SGBD
- Écriture atomique : `writeJson()` via fichier `.tmp` + `rename()` (pattern existant dans `server/utils/json-storage.ts`)
- Validation : Schemas Zod partagés dans `shared/schemas/`
- Limite mémoire : 5MB par fichier JSON (limite Express body-parser)

**Fichiers de données pour la progression :**

```
data/article-progress.json     # Existant — { [slug]: ArticleProgress }
data/article-keywords.json     # Existant — assignations capitaine/lieutenants/lexique
```

Pas de nouveau fichier de données. Le store `article-progress` existant avec `completedChecks: string[]` est suffisant.

**Stratégie de cache :**

Pattern uniforme pour tous les services qui appellent des APIs externes :

```typescript
// Pseudo-code du pattern cache
async function getOrFetch<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = await readFromDisk(cacheKey)
  if (cached) return cached
  const result = await fetcher()
  await writeToDisk(cacheKey, result)
  return result
}
```

Services concernés : DataForSEO (déjà en place), Discovery, Intent, Validation, Local, Autocomplete.

### Authentication & Security

**Pas d'authentification** — application locale mono-utilisateur.

- CORS : localhost only (pattern existant)
- Pas de tokens, sessions, ou middleware auth
- Clés API (Claude, DataForSEO) : fichier `.env`, jamais exposées au frontend
- Express body limit : 5MB (déjà en place)

### API & Communication

**REST API existante (inchangée) :**

- Prefix : `/api/`
- Format succès : `{ data: T }`
- Format erreur : `{ error: { code: string, message: string } }`
- Streaming : SSE pour les appels Claude (génération article, sommaire, actions contextuelles)
- Proxy Vite : `/api` → `http://localhost:3005`

**Wrapper frontend existant :**

- `apiGet<T>()`, `apiPost<T>()`, `apiPut<T>()`, `apiDelete<T>()` dans `src/services/api.service.ts`
- Décode automatiquement `json.data` — le type `T` est le contenu du champ `data`
- Log automatique des erreurs

**Nouvelles routes nécessaires :**

| Route | Méthode | Usage | FR |
|-------|---------|-------|-----|
| `/api/articles/:slug/progress/check` | POST | Ajouter un check automatique | FR17 |
| `/api/cocoons/:id/strategy/context` | GET | Récupérer le contexte stratégique pour enrichissement | FR21 |

Toutes les autres routes existent déjà.

### Frontend Architecture

**State management : Pinia (composition API)**

Pattern existant (tous les stores utilisent ce format) :

```typescript
export const useXxxStore = defineStore('xxx', () => {
  const data = ref<T>(initialValue)
  const isLoading = ref(false)

  async function fetchData() { /* ... */ }
  function getData() { /* ... */ }

  return { data, isLoading, fetchData, getData }
})
```

**Composants : organisés par feature/domaine**

```
src/components/
├── moteur/          # Composants spécifiques au Moteur
├── intent/          # Discovery, Douleur, Exploration, Validation
├── keywords/        # Audit, Assignation, Comparaison
├── local/           # Local, Maps
├── strategy/        # Cerveau / stratégie cocon
├── panels/          # Panneaux SEO/GEO latéraux
├── shared/          # Composants réutilisables (Badge, Breadcrumb, etc.)
└── ...
```

**Routing : Vue Router avec lazy loading**

Pattern existant — toutes les vues sauf Dashboard sont lazy-loaded.

**Nouvelle route pour le Labo :**

```typescript
{
  path: '/labo',
  name: 'labo',
  component: () => import('../views/LaboView.vue'),
}
```

### Infrastructure & Deployment

- **Local only** : `npm run dev` lance front + back en parallèle
- **Pas de CI/CD** : projet solo, pas de pipeline
- **Pas de Docker** : exécution directe avec Node.js
- **Pas de monitoring** : logs console via `chalk` (module `server/utils/logger.ts`)
- **Build** : `npm run build` (Vite) — pas de déploiement cloud

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Fichiers :**

| Type | Convention | Exemple |
|------|-----------|---------|
| Vue components | PascalCase | `KeywordAuditTable.vue` |
| Stores | kebab-case + `.store.ts` | `article-progress.store.ts` |
| Services backend | kebab-case + `.service.ts` | `keyword-discovery.service.ts` |
| Routes backend | kebab-case + `.routes.ts` | `article-progress.routes.ts` |
| Composables | camelCase + `use` prefix | `useKeywordScoring.ts` |
| Types | kebab-case + `.types.ts` | `article-progress.types.ts` |
| Schemas | kebab-case + `.schema.ts` | `article-progress.schema.ts` |
| Prompts | kebab-case + `.md` | `generate-article.md` |
| Tests | source mirroring + `.test.ts` | `tests/unit/stores/article-progress.store.test.ts` |

**Code :**

| Contexte | Convention | Exemple |
|----------|-----------|---------|
| Variables / fonctions | camelCase | `selectedArticle`, `fetchProgress()` |
| Types / Interfaces | PascalCase | `ArticleProgress`, `SelectedArticle` |
| Constantes | UPPER_SNAKE_CASE | `MAX_RETRIES`, `DEFAULT_PORT` |
| Props Vue | camelCase | `modelValue`, `cocoonId` |
| Events Vue | kebab-case | `@update:model-value`, `@check-added` |
| API endpoints | kebab-case pluriel | `/api/articles/:slug/progress` |
| JSON fields | camelCase | `{ completedChecks: [], phase: "moteur" }` |

### Structure Patterns

**Organisation par feature/domaine (pas par type) :**

Les composants sont regroupés par domaine métier (`intent/`, `keywords/`, `local/`, `moteur/`) et non par type technique (`buttons/`, `forms/`, `tables/`).

**Tests : miroir de la source dans `tests/unit/` :**

```
tests/unit/
├── components/     # Tests de composants Vue
├── composables/    # Tests de composables
├── routes/         # Tests de routes Express
├── services/       # Tests de services backend
├── stores/         # Tests de stores Pinia
└── utils/          # Tests d'utilitaires
```

### Format Patterns

**API Response wrapper :**

```typescript
// Succès — TOUJOURS envelopper dans { data: T }
res.json({ data: result })

// Erreur — TOUJOURS envelopper dans { error: { code, message } }
res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid slug' } })

// Le frontend décode automatiquement json.data via apiGet/apiPost/apiPut/apiDelete
```

**SSE Streaming (Claude API) :**

```typescript
// Événements SSE standards
event: chunk\ndata: {"text": "..."}\n\n
event: done\ndata: {"usage": {...}}\n\n
event: error\ndata: {"message": "..."}\n\n
```

### Communication Patterns — Dual-Mode Composants

**Décision architecturale majeure : prop `mode` sur chaque composant réutilisable.**

```typescript
// Prop commune à tous les composants du Moteur réutilisés dans le Labo
interface DualModeProps {
  mode: 'workflow' | 'libre'
  // En mode 'workflow': articleSlug et cocoonId sont requis
  articleSlug?: string
  cocoonId?: number
  // En mode 'libre': keywordQuery est le point d'entrée
  keywordQuery?: string
}
```

**Règles :**

1. Un composant en mode `workflow` utilise `articleSlug` pour charger/sauvegarder le cache et mettre à jour la progression
2. Un composant en mode `libre` utilise `keywordQuery` comme clé — pas de cache persistant, pas de progression
3. Le composant **ne sait pas** s'il est dans le Moteur ou le Labo — c'est la vue parente qui passe le mode
4. Pas de `if (mode === 'workflow')` dans la logique métier — le composant reçoit les callbacks de save/cache par injection (props ou provide/inject)

### Communication Patterns — Progression

**Le store `article-progress` est la source unique de vérité (NFR10).**

Pattern de notification de progression :

```typescript
// Quand un onglet produit un résultat, il émet un événement
// La vue MoteurView intercepte et appelle addCheck()

// Dans le composant enfant :
const emit = defineEmits<{ 'check-completed': [checkName: string] }>()
// Quand le résultat arrive :
emit('check-completed', 'discovery_done')

// Dans MoteurView :
async function onCheckCompleted(check: string) {
  if (!selectedArticle.value) return
  await progressStore.addCheck(selectedArticle.value.slug, check)
}
```

**Checks standardisés (7 étapes) :**

| Check name | Déclenché quand | Phase |
|-----------|-----------------|-------|
| `discovery_done` | Discovery IA termine l'analyse | ① Générer |
| `radar_done` | Douleur Intent scanner termine | ① Générer |
| `intent_done` | Exploration analyse l'intention | ② Valider |
| `audit_done` | DataForSEO retourne des données | ② Valider |
| `local_done` | Comparaison Local s'affiche | ② Valider |
| `captain_chosen` | Un mot-clé est validé comme capitaine dans l'Audit | ③ Assigner |
| `assignment_done` | Capitaine + lieutenants + lexique assignés | ③ Assigner |

### Process Patterns

**Error handling :**

```typescript
// Backend : erreur handler global (existant)
app.use(errorHandler)
// → res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } })

// Frontend : try/catch dans chaque action de store, log via log.warn/log.error
// Pas de toast global — les composants gèrent l'affichage d'erreur localement
```

**Loading states :**

```typescript
// Pattern standard dans chaque store
const isLoading = ref(false)

async function fetchData() {
  isLoading.value = true
  try { /* ... */ }
  finally { isLoading.value = false }
}
```

### Enforcement Guidelines

**Tous les agents IA DOIVENT :**

1. Utiliser le wrapper `apiGet/apiPost/apiPut/apiDelete` pour tous les appels API côté frontend — jamais `fetch()` directement
2. Envelopper les réponses API dans `{ data: T }` côté backend — jamais de réponse JSON brute
3. Utiliser `defineStore('name', () => { ... })` (composition API) pour tout nouveau store — jamais l'options API
4. Placer les tests dans `tests/unit/` en miroir de la structure source — jamais de tests co-localisés
5. Utiliser `log.debug/info/warn/error` (module logger) pour les logs — jamais `console.log` directement
6. Utiliser `loadPrompt()` pour charger les prompts IA — jamais de strings inline
7. Utiliser `readJson/writeJson` pour la persistance JSON — jamais `fs.readFile/writeFile` directement
8. Émettre `check-completed` quand un onglet du Moteur produit un résultat en mode workflow

**Anti-patterns à éviter :**

- Créer un nouveau fichier de données JSON sans schema Zod correspondant dans `shared/schemas/`
- Appeler une API externe sans vérifier le cache d'abord
- Dupliquer un composant entre Moteur et Labo au lieu d'utiliser la prop `mode`
- Bloquer la navigation (gating dur) au lieu d'afficher un message inline
- Modifier un fichier `.md` de prompt au lieu de pré-processer en amont

---

## Project Structure & Boundaries

### Structure du projet (état actuel + ajouts PRD)

```
blog-redactor-seo/
├── .env                          # Clés API (Claude, DataForSEO)
├── .env.example                  # Template sans clés
├── package.json                  # Dependencies & scripts
├── vite.config.ts                # Vite + proxy /api → :3005
├── tsconfig.json                 # TypeScript config
│
├── data/                         # Fichiers JSON (base de données locale)
│   ├── BDD_Articles_Blog.json    # Articles
│   ├── BDD_Mots_Clefs_SEO.json  # Mots-clés
│   ├── article-keywords.json     # Assignations capitaine/lieutenants/lexique
│   ├── article-progress.json     # Progression par article (completedChecks[])
│   ├── article-statuses.json     # Statuts des articles
│   ├── article-semantic-fields.json
│   ├── hierarchy.json            # Silos → Cocons → Articles
│   ├── local-entities.json       # Entités locales
│   ├── theme-config.json         # Configuration du thème
│   └── strategies/               # Stratégies cocons (Cerveau)
│
├── server/                       # Backend Express 5
│   ├── index.ts                  # Point d'entrée, montage routes
│   ├── routes/                   # Routes REST
│   │   ├── articles.routes.ts
│   │   ├── article-progress.routes.ts
│   │   ├── cocoons.routes.ts
│   │   ├── content-gap.routes.ts
│   │   ├── dataforseo.routes.ts
│   │   ├── discovery-cache.routes.ts
│   │   ├── export.routes.ts
│   │   ├── generate.routes.ts
│   │   ├── gsc.routes.ts
│   │   ├── intent.routes.ts
│   │   ├── intent-scan.routes.ts
│   │   ├── keywords.routes.ts
│   │   ├── links.routes.ts
│   │   ├── local.routes.ts
│   │   ├── silos.routes.ts
│   │   └── strategy.routes.ts
│   ├── services/                 # Logique métier
│   │   ├── article-content.service.ts
│   │   ├── article-progress.service.ts
│   │   ├── autocomplete.service.ts
│   │   ├── claude.service.ts         # Appels Claude API + streaming SSE
│   │   ├── cocoon-strategy.service.ts # Stratégies du Cerveau
│   │   ├── community-discussions.service.ts
│   │   ├── content-gap.service.ts
│   │   ├── data.service.ts           # Chargement BDD JSON
│   │   ├── dataforseo.service.ts     # DataForSEO + cache
│   │   ├── discovery-cache.service.ts
│   │   ├── embedding.service.ts      # Hugging Face Transformers
│   │   ├── export.service.ts
│   │   ├── gsc.service.ts
│   │   ├── intent.service.ts
│   │   ├── intent-scan.service.ts    # Radar Douleur Intent
│   │   ├── keyword-assignment.service.ts
│   │   ├── keyword-discovery.service.ts
│   │   ├── keyword-radar.service.ts
│   │   ├── linking.service.ts
│   │   ├── local-entities.service.ts
│   │   ├── local-seo.service.ts
│   │   ├── paa-cache.service.ts
│   │   ├── semantic-field.service.ts
│   │   ├── strategy.service.ts
│   │   ├── suggest.service.ts
│   │   ├── theme-config.service.ts
│   │   └── word-groups.service.ts
│   ├── prompts/                  # Prompts IA en Markdown
│   │   ├── actions/              # Prompts d'actions contextuelles
│   │   ├── generate-article.md
│   │   ├── generate-outline.md
│   │   ├── intent-keywords.md
│   │   ├── pain-translate.md
│   │   ├── cocoon-brainstorm.md
│   │   ├── strategy-*.md         # Prompts stratégie cocon
│   │   └── ...
│   └── utils/                    # Utilitaires backend
│       ├── error-handler.ts      # Error handler global Express
│       ├── json-storage.ts       # readJson / writeJson (atomic write)
│       ├── logger.ts             # Logs colorés (chalk)
│       └── prompt-loader.ts      # loadPrompt() avec {{variables}}
│
├── shared/                       # Types & schemas partagés front/back
│   ├── types/                    # Interfaces TypeScript
│   │   ├── index.ts              # Barrel export
│   │   ├── article.types.ts
│   │   ├── article-progress.types.ts
│   │   ├── api.types.ts
│   │   ├── cocoon.types.ts
│   │   ├── dataforseo.types.ts
│   │   ├── intent.types.ts
│   │   ├── keyword.types.ts
│   │   ├── keyword-audit.types.ts
│   │   ├── keyword-discovery.types.ts
│   │   ├── linking.types.ts
│   │   ├── local.types.ts
│   │   ├── seo.types.ts
│   │   ├── geo.types.ts
│   │   ├── silo.types.ts
│   │   ├── strategy.types.ts
│   │   └── ...
│   ├── schemas/                  # Schemas Zod
│   │   ├── article.schema.ts
│   │   ├── article-progress.schema.ts
│   │   ├── keyword.schema.ts
│   │   ├── generate.schema.ts
│   │   └── ...
│   └── constants/                # Constantes partagées
│       ├── geo.constants.ts
│       └── seo.constants.ts
│
├── src/                          # Frontend Vue 3
│   ├── App.vue                   # Layout racine
│   ├── router/index.ts           # Routes (lazy loading)
│   ├── assets/
│   │   └── styles/
│   │       ├── main.css          # Styles globaux
│   │       ├── variables.css     # Design tokens CSS
│   │       └── editor.css        # Styles TipTap
│   ├── services/
│   │   └── api.service.ts        # apiGet, apiPost, apiPut, apiDelete
│   ├── stores/                   # Pinia stores (composition API)
│   │   ├── articles.store.ts
│   │   ├── article-keywords.store.ts
│   │   ├── article-progress.store.ts  # Hub progression (source unique)
│   │   ├── brief.store.ts
│   │   ├── cocoons.store.ts
│   │   ├── cocoon-strategy.store.ts
│   │   ├── editor.store.ts
│   │   ├── intent.store.ts
│   │   ├── keyword-audit.store.ts
│   │   ├── keyword-discovery.store.ts
│   │   ├── keywords.store.ts
│   │   ├── linking.store.ts
│   │   ├── local.store.ts
│   │   ├── outline.store.ts
│   │   ├── seo.store.ts
│   │   ├── silos.store.ts
│   │   ├── strategy.store.ts
│   │   └── theme-config.store.ts
│   ├── composables/              # Composables Vue
│   │   ├── useAutoSave.ts
│   │   ├── useContextualActions.ts
│   │   ├── useKeywordScoring.ts
│   │   ├── useKeywordDiscoveryTab.ts
│   │   ├── useNlpAnalysis.ts
│   │   ├── useStreaming.ts
│   │   └── ...
│   ├── components/               # Composants Vue (par domaine)
│   │   ├── moteur/               # Wrapper MoteurView, sélection article, contexte
│   │   │   ├── MoteurContextRecap.vue
│   │   │   ├── SelectedArticlePanel.vue
│   │   │   └── KeywordDiscoveryTab.vue
│   │   ├── intent/               # Discovery, Douleur, Exploration, Validation
│   │   │   ├── DouleurIntentScanner.vue
│   │   │   ├── ExplorationInput.vue
│   │   │   ├── IntentStep.vue
│   │   │   ├── AutocompleteValidation.vue
│   │   │   ├── ExplorationVerdict.vue
│   │   │   ├── PainTranslator.vue
│   │   │   ├── PainValidation.vue
│   │   │   └── LocalComparisonStep.vue
│   │   ├── keywords/             # Audit, Assignation
│   │   │   ├── KeywordAuditTable.vue
│   │   │   ├── KeywordComparison.vue
│   │   │   ├── KeywordEditor.vue
│   │   │   └── DiscoveryPanel.vue
│   │   ├── local/                # Maps & GBP
│   │   │   └── MapsStep.vue
│   │   ├── strategy/             # Cerveau / stratégie cocon
│   │   ├── panels/               # Panneaux latéraux SEO/GEO
│   │   ├── dashboard/            # Dashboard, SiloCard
│   │   ├── editor/               # TipTap, BubbleMenu
│   │   ├── outline/              # Sommaire
│   │   ├── brief/                # Brief SEO, Content Gap
│   │   ├── actions/              # Actions contextuelles
│   │   ├── export/               # Export HTML
│   │   ├── linking/              # Maillage interne
│   │   └── shared/               # Badge, Breadcrumb, Spinner, etc.
│   ├── utils/                    # Utilitaires frontend
│   │   └── logger.ts
│   └── views/                    # Vues (1 par route)
│       ├── DashboardView.vue
│       ├── ThemeConfigView.vue
│       ├── SiloDetailView.vue
│       ├── CocoonLandingView.vue
│       ├── CerveauView.vue
│       ├── MoteurView.vue           # Restructuré en 3 phases (changement principal)
│       ├── LaboView.vue             # NOUVEAU — Recherche libre
│       ├── RedactionView.vue
│       ├── ArticleWorkflowView.vue
│       ├── ArticleEditorView.vue
│       ├── LinkingMatrixView.vue
│       └── PostPublicationView.vue
│
└── tests/                        # Tests Vitest
    └── unit/
        ├── components/
        ├── composables/
        ├── routes/
        ├── services/
        ├── stores/
        └── utils/
```

### Architectural Boundaries

**Boundary frontend/backend :**

```
[Vue App] ──fetch──→ [Vite Proxy /api] ──→ [Express :3005]
                                               │
                                     ┌─────────┼─────────┐
                                     ▼         ▼         ▼
                                  [Claude]  [DataForSEO]  [JSON files]
                                  (SSE)     (REST)        (disk)
```

- Le frontend ne touche JAMAIS au filesystem — toujours via API
- Le backend ne sert JAMAIS de HTML — uniquement JSON et SSE
- Les types partagés dans `shared/` sont la seule dépendance commune

**Boundary composants du Moteur :**

```
MoteurView.vue (orchestrateur)
├── SelectedArticlePanel        # Sélection article (obligatoire)
├── MoteurContextRecap          # Résumé stratégie Cerveau (collapsable)
├── MoteurPhaseNavigation       # Navigation 3 phases + bandeaux
│
├── Phase ① Générer
│   ├── KeywordDiscoveryTab     # Discovery IA (optionnel)
│   ├── DouleurIntentScanner    # Radar (optionnel)
│   └── PainTranslator          # Douleur → mots-clés
│
├── Phase ② Valider
│   ├── PainValidation          # Validation multi-sources
│   ├── ExplorationInput + IntentStep + AutocompleteValidation  # Exploration
│   ├── KeywordAuditTable       # Audit DataForSEO
│   └── LocalComparisonStep + MapsStep  # Local fusionné
│
└── Phase ③ Assigner
    └── KeywordEditor + KeywordMigrationPreview  # Assignation
```

**Boundary Labo :**

```
LaboView.vue (orchestrateur — mode libre)
├── Champ de recherche libre (pas de sélection article)
│
├── KeywordDiscoveryTab     mode="libre"
├── DouleurIntentScanner    mode="libre"
├── ExplorationInput + ...  mode="libre"
├── KeywordAuditTable       mode="libre"
└── LocalComparisonStep + MapsStep  mode="libre"
```

### Data Flow — Enrichissement prompts IA (Pont Cerveau→Moteur)

```
┌──────────────────┐     ┌─────────────────────────┐
│ Cerveau Strategy │     │ Prompt .md template      │
│ (data/strategies/│     │ (server/prompts/xxx.md)  │
│  cocon-{id}.json)│     │                          │
└────────┬─────────┘     └──────────┬──────────────┘
         │                          │
         ▼                          ▼
┌────────────────────────────────────────────────┐
│ prompt-loader.ts — loadPrompt()                │
│                                                │
│ 1. Load prompt .md                             │
│ 2. Load strategy context (si cocoonId fourni)  │
│ 3. Inject {{strategy_context}} variable        │
│ 4. Return enriched prompt                      │
└────────────────────┬───────────────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │ Claude API   │
              │ (SSE stream) │
              └──────────────┘
```

**Règle :** Si aucune stratégie n'existe pour le cocon, `{{strategy_context}}` est remplacé par une string vide — le prompt fonctionne sans enrichissement (NFR9).

### Data Flow — Progression automatique

```
┌────────────────────┐
│ Composant onglet   │  emit('check-completed', 'discovery_done')
│ (ex: Discovery)    │──────────────────────────────────────────┐
└────────────────────┘                                          │
                                                                ▼
┌────────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│ MoteurView.vue     │────→│ article-progress     │────→│ Backend API  │
│ onCheckCompleted() │     │ store.addCheck()     │     │ POST /check  │
└────────────────────┘     └─────────┬───────────┘     └──────┬───────┘
                                     │                        │
                                     ▼                        ▼
                           ┌─────────────────┐     ┌───────────────────┐
                           │ Dots UI update  │     │ article-progress  │
                           │ (computed)      │     │ .json (disk)      │
                           └─────────────────┘     └───────────────────┘
```

### Requirements to Structure Mapping

| Feature PRD | Fichiers principaux impactés |
|-------------|------------------------------|
| FR1-FR5 : Moteur 3 phases | `src/views/MoteurView.vue` (restructuration), nouveau `MoteurPhaseNavigation.vue` |
| FR4 : Fusion Local+Maps | `LocalComparisonStep.vue` + `MapsStep.vue` → composant wrapper fusionné |
| FR5 : Retrait Content Gap | `src/views/MoteurView.vue` — retirer import ContentGapPanel |
| FR16-FR17 : Dots + checks auto | `src/stores/article-progress.store.ts`, `server/services/article-progress.service.ts` |
| FR18-FR19 : Bandeaux transition | Nouveau `src/components/moteur/PhaseTransitionBanner.vue` |
| FR15 : Message inline Assignation | Nouveau `src/components/moteur/AssignmentGate.vue` |
| FR20 : Contexte stratégique | `src/components/moteur/MoteurContextRecap.vue` (existant, à enrichir) |
| FR21 : Enrichissement prompts | `server/utils/prompt-loader.ts` + `server/services/cocoon-strategy.service.ts` |
| FR22 : Indicateur alignement | `src/components/keywords/KeywordAuditTable.vue` (ajout colonne) |
| FR23-FR25 : Labo | Nouveau `src/views/LaboView.vue` + route `/labo` |

---

## Architecture Validation Results

### Coherence Validation ✅

**Compatibilité des décisions :**

- Stack figée et cohérente — pas de conflits de versions
- Le pattern dual-mode (prop `mode`) est compatible avec la composition API Pinia existante
- L'enrichissement prompts via `loadPrompt()` s'insère dans le pattern existant sans casser l'interface
- Le système de progression s'appuie sur le store `article-progress` existant

**Cohérence des patterns :**

- Tous les patterns (naming, structure, API format) sont extraits du code existant — pas de rupture
- Le pattern cache à étendre suit le même modèle que `dataforseo.service.ts`

### Requirements Coverage Validation ✅

**Couverture fonctionnelle :**

| FR | Couvert | Mécanisme architectural |
|----|---------|------------------------|
| FR1-FR5 | ✅ | Restructuration MoteurView + MoteurPhaseNavigation |
| FR6-FR9 | ✅ | Composants existants + verrouillage conditionnel (computed) |
| FR10-FR13 | ✅ | Composants existants inchangés |
| FR14-FR15 | ✅ | AssignmentGate inline |
| FR16-FR19 | ✅ | article-progress store + emit check-completed + PhaseTransitionBanner |
| FR20-FR22 | ✅ | MoteurContextRecap + loadPrompt enrichment + colonne alignement |
| FR23-FR25 | ✅ | LaboView + prop mode="libre" |
| FR26-FR28 | ✅ | Pattern cache étendu + readJson/writeJson |

**Couverture non-fonctionnelle :**

| NFR | Couvert | Mécanisme |
|-----|---------|-----------|
| NFR1-NFR4 | ✅ | Architecture locale, pas de latence réseau |
| NFR5-NFR7 | ✅ | Pattern cache systématique + writeJson atomic |
| NFR8-NFR10 | ✅ | Prop mode dual + enrichissement optionnel + article-progress source unique |
| NFR11-NFR12 | ✅ | Composants partagés via prop + prompts .md séparés |

### Implementation Readiness ✅

**Complétude :**

- Toutes les décisions critiques documentées
- Patterns extraits du code existant — pas d'invention
- Structure projet complète et spécifique
- Mapping FR → fichiers explicite

**Gaps identifiés (aucun bloquant) :**

- `MoteurPhaseNavigation.vue` — à créer
- `PhaseTransitionBanner.vue` — à créer
- `AssignmentGate.vue` — à créer
- `LaboView.vue` — à créer
- Variable `{{strategy_context}}` à ajouter dans les prompts concernés

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Contexte projet analysé (brownfield, 75+ composants)
- [x] Scale et complexité évalués (moyenne, mono-utilisateur)
- [x] Contraintes techniques identifiées (stack figée, JSON, local)
- [x] Cross-cutting concerns mappés (dual-mode, progression, cache, enrichissement)

**✅ Architectural Decisions**

- [x] Décisions critiques documentées (dual-mode, progression, enrichissement, restructuration)
- [x] Stack technique spécifiée avec versions exactes
- [x] Patterns d'intégration définis (API wrapper, SSE, cache)
- [x] Performance considérée (cache, streaming, lazy loading)

**✅ Implementation Patterns**

- [x] Conventions de nommage établies (fichiers, code, API, JSON)
- [x] Patterns de structure définis (par domaine, tests miroir)
- [x] Patterns de communication spécifiés (emit check-completed, API wrapper)
- [x] Patterns de process documentés (error handling, loading states)

**✅ Project Structure**

- [x] Arborescence complète définie
- [x] Boundaries composants établies (Moteur, Labo, Backend)
- [x] Points d'intégration mappés (data flows)
- [x] Mapping requirements → structure complet

### Architecture Readiness Assessment

**Status global : READY FOR IMPLEMENTATION**

**Niveau de confiance : HIGH**

**Points forts :**

- Architecture brownfield — on s'appuie sur des patterns prouvés en production
- Complexité maîtrisée — la plupart des composants existent déjà
- Le store article-progress est la seule vraie nouveauté architecturale
- Le pattern dual-mode est simple (une prop) et ne casse rien

**Améliorations futures (hors scope) :**

- Batch processing multi-articles (Phase 3 PRD)
- Boucle GSC post-publication (Phase 3 PRD)
- Suggestions proactives de cocons (Phase 3 PRD)

### Implementation Handoff

**Guidelines pour les agents IA :**

1. Suivre les décisions architecturales exactement comme documentées
2. Utiliser les patterns d'implémentation de manière cohérente
3. Respecter les boundaries et la structure du projet
4. Se référer à ce document pour toute question architecturale
5. Émettre `check-completed` dans les composants Moteur en mode workflow
6. Ne jamais dupliquer un composant — utiliser la prop `mode`

**Priorité d'implémentation suggérée :**

1. Restructuration MoteurView en 3 phases (FR1-FR5)
2. Fusion Local + Maps (FR4)
3. Dots de progression + checks automatiques (FR16-FR17)
4. Message inline Assignation (FR15)
5. Enrichissement prompts Cerveau→Moteur (FR21)
6. Bandeaux de transition (FR18-FR19)
7. Contexte stratégique collapsable (FR20)
8. Indicateur d'alignement (FR22)
9. Labo (FR23-FR25)
