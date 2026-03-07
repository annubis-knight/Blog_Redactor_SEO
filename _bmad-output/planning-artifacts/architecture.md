---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - prd.md
  - product-brief-BMAD-2026-03-06.md
workflowType: 'architecture'
project_name: 'Blog Redactor SEO'
user_name: 'Arnau'
date: '2026-03-06'
lastStep: 8
status: 'complete'
completedAt: '2026-03-06'
---

# Architecture Decision Document — Blog Redactor SEO

_Document d'architecture complet pour guider l'implémentation par agents IA de manière cohérente et sans conflits._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

60 FRs organisées en 11 domaines fonctionnels :

| Domaine | FRs | Implications architecturales |
|---------|-----|------------------------------|
| Plan Éditorial / Dashboard | FR1-FR5 | Composants de visualisation par cocon, state management des statuts articles |
| Brief SEO/GEO | FR6-FR9 | Service DataForSEO avec cache, agrégation de données multi-sources |
| Génération de Structure | FR10-FR13 | Service IA dédié sommaire, éditeur de plan interactif, blocs pédagogiques |
| Génération de Contenu | FR14-FR20 | Streaming IA, system prompt Propulsite externalisé, méta-données auto |
| Éditeur Rich Text | FR21-FR24 | TipTap/ProseMirror, template Propulsite préchargé, auto-save |
| Actions Contextuelles | FR25-FR33 | 9 actions IA distinctes, toolbar flottante, intégration éditeur |
| Scoring SEO | FR34-FR38 | Moteur de calcul temps réel, analyse de densité, checklist, NLP terms |
| Scoring GEO | FR39-FR44 | Score composite, détection patterns (capsules, questions, stats, jargon) |
| Maillage Interne | FR45-FR52 | Graphe orienté persistant, contraintes hiérarchie cocon, détection orphelins |
| Export | FR53-FR56 | Moteur de template HTML, Schema markup JSON-LD, mise à jour statut |
| Données & Persistance | FR57-FR60 | Lecture/écriture JSON, sauvegarde atomique, persistance maillage |

**Non-Functional Requirements:**

17 NFRs regroupées en 6 catégories :

- **Performance** (NFR1-5) : Sommaire < 10s, article < 60s, scoring < 2s, chargement < 3s, navigation < 500ms
- **Coût** (NFR6-7) : < 0.50€/article, cache DataForSEO obligatoire
- **Fiabilité** (NFR8-10) : Auto-save 30s, gestion erreurs API avec retry, sauvegarde atomique JSON
- **Sécurité** (NFR11-12) : Clés API côté serveur, app locale uniquement
- **Maintenabilité** (NFR13-15) : Règles GEO configurables, system prompt externalisé, templates HTML séparés
- **Intégration** (NFR16-17) : DataForSEO REST avec rate limiting, Claude SDK avec streaming

**Scale & Complexity:**

- Domaine principal : Full-stack web application (SPA + API backend)
- Niveau de complexité : Moyen-haut
- Composants architecturaux estimés : ~18 modules distincts
- Utilisateur unique, pas de multi-tenancy, pas d'auth, app locale

### Technical Constraints & Dependencies

- **Vue 3 + Composition API** : imposé par choix utilisateur
- **TipTap (ProseMirror)** : éditeur rich text — dépendance critique, conditionne toute l'expérience d'édition
- **Claude API (Anthropic SDK)** : génération IA — streaming requis pour les contenus longs (NFR17)
- **DataForSEO API** : enrichissement SEO — 4 endpoints, rate limiting, cache obligatoire
- **JSON files** : stockage V1 — simplicité mais contraintes d'atomicité
- **Node/Express** : backend proxy — principalement proxy API + persistence fichiers
- **Desktop-only** : 1280px minimum, pas de responsive mobile
- **Chrome-first** : Firefox/Edge en best-effort

### Cross-Cutting Concerns Identified

1. **Tracking mots-clés omniprésent** : chaque modification de contenu doit recalculer les densités, checklist, NLP terms — le moteur de scoring doit être découplé et performant
2. **Hiérarchie de cocon** : règles métier (Pilier ↔ Intermédiaire ↔ Spécialisé) qui affectent dashboard, maillage, brief, et structure du contenu
3. **Ton Propulsite** : system prompt externalisé (NFR14) utilisé par toutes les générations IA — centralisation critique
4. **Gestion coûts API** : monitoring Claude + DataForSEO, cache stratégique, génération en une passe
5. **Persistance cohérente** : articles, mots-clés, maillage, configuration — multiples fichiers JSON interdépendants avec sauvegarde atomique
6. **Réactivité scoring** : boucle éditeur → calcul → affichage en < 2s, via debounce dans les composables

### Existing Data Assets

Le projet possède déjà 3 fichiers de données à la racine :

- **`BDD_Articles_Blog.json`** : structure `{ cocons_semantiques: [{ nom, articles: [{ titre, type, slug, theme }] }] }` — 6 cocons, 54 articles
- **`BDD_Mots_Clefs_SEO.json`** : structure `{ seo_data: [{ mot_clef, cocon_seo, type_mot_clef }] }` — ~100 mots-clés classés Pilier / Moyenne traine / Longue traine
- **`templateArticle.html`** : template HTML Propulsite avec Tailwind CSS, polices DM Serif Text + Red Hat Text, structure hero → sommaire → article → conclusion

---

## Starter Template Evaluation

### Primary Technology Domain

**Web Application SPA** — Vue 3 + Composition API avec backend Node/Express, basé sur les exigences du PRD.

### Starter Options Considered

| Starter | Description | Verdict |
|---------|-------------|---------|
| **create-vue** (officiel) | Scaffolding officiel Vue avec choix interactif TypeScript, Router, Pinia, Vitest, ESLint, Prettier | **Retenu** — standard de l'écosystème, tous les outils nécessaires |
| **Vitesse** (antfu) | Template riche avec file-based routing, auto-imports, UnoCSS, i18n, PWA | Trop opinionated — features inutiles (PWA, i18n, file routing) |
| **npm create vite@latest** | Template Vite minimal avec Vue | Trop minimal — pas de Router, Pinia, testing inclus |
| **Nuxt** | Framework full-stack Vue avec SSR | Overkill — pas besoin de SSR, app locale simple |

### Selected Starter: create-vue

**Rationale :** Outil officiel de l'équipe Vue, inclut exactement les dépendances nécessaires sans opinions superflues. Parfaitement adapté à une SPA avec Pinia et Vue Router.

**Initialization Command:**

```bash
npm create vue@latest blog-redactor-seo -- --typescript --router --pinia --vitest --eslint-with-prettier
```

**Versions vérifiées (Mars 2026) :**

| Package | Version | Rôle |
|---------|---------|------|
| **Vue** | 3.5.x | Framework frontend |
| **Vite** | 7.x | Build tool & dev server |
| **create-vue** | 3.19.x | Scaffolding |
| **Pinia** | 3.0.x | State management |
| **Vue Router** | 5.0.x | Routing SPA |
| **Vitest** | 4.0.x | Tests unitaires |
| **TypeScript** | 5.x | Typage statique |
| **ESLint** | 9.x | Linting (flat config) |
| **Prettier** | 3.x | Formatting |

**Dépendances additionnelles à installer :**

| Package | Version | Rôle |
|---------|---------|------|
| **@tiptap/vue-3** | 3.x | Éditeur rich text pour Vue |
| **@tiptap/starter-kit** | 3.x | Extensions TipTap de base |
| **@anthropic-ai/sdk** | latest | SDK Claude API |
| **express** | 5.x | Backend API proxy |
| **zod** | 3.x | Validation de données runtime |
| **@vueuse/core** | latest | Composables utilitaires (debounce, storage, etc.) |

**Architectural Decisions Provided by Starter:**

- **Language** : TypeScript strict avec paths aliases `@/`
- **Styling** : CSS natif (pas de framework CSS — le template Propulsite utilise Tailwind via CDN dans l'export, mais l'app elle-même reste en CSS simple)
- **Build** : Vite avec HMR, optimisations de production automatiques
- **Tests** : Vitest avec couverture de code
- **Linting** : ESLint flat config + Prettier
- **Structure** : `src/` avec `components/`, `views/`, `router/`, `stores/`, `assets/`

**Note:** L'initialisation du projet avec cette commande devrait être la première story d'implémentation.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Bloquent l'implémentation) :**
- Architecture monorepo client/server
- Stockage JSON avec sauvegarde atomique
- Communication client-server via REST + SSE
- Intégration TipTap avec extensions custom

**Important Decisions (Shaping) :**
- Organisation des stores Pinia
- Pattern de scoring temps réel
- Stratégie de cache DataForSEO
- Structure des prompts IA

**Décisions Reportées (Post-V1) :**
- Migration JSON → SQLite/Supabase
- CI/CD pipeline
- Monitoring avancé

### Data Architecture

**Stockage : JSON Files (V1)**

- **Décision :** Fichiers JSON plats stockés dans un dossier `data/` à la racine du projet
- **Rationale :** Simplicité maximale pour V1, utilisateur unique, pas de concurrent access. Les fichiers JSON existants (`BDD_Articles_Blog.json`, `BDD_Mots_Clefs_SEO.json`) définissent déjà le format
- **Affects :** Tous les services backend, sauvegarde, persistance

**Modèle de données :**

```
data/
├── BDD_Articles_Blog.json        # Source: 54 articles × 6 cocons (lecture + mise à jour statut)
├── BDD_Mots_Clefs_SEO.json       # Source: ~100 mots-clés (lecture seule)
├── articles/                      # Contenu généré par article
│   └── {article-slug}.json        # { outline, content, metadata, seoScore, geoScore, status }
├── cache/                         # Cache DataForSEO
│   └── {keyword-slug}.json        # { serp, paa, relatedKeywords, keywordData, cachedAt }
└── links/                         # Données de maillage
    └── linking-matrix.json        # { links: [{ sourceSlug, targetSlug, anchorText, position }] }
```

**Validation : Zod**

- **Décision :** Zod pour la validation runtime des données JSON et des payloads API
- **Rationale :** Validation TypeScript-first, inference de types automatique, messages d'erreur clairs
- **Usage :** Schemas partagés entre client et server via un dossier `shared/`

**Cache DataForSEO :**

- **Décision :** Cache fichier JSON par mot-clé pilier, durée illimitée (données peu volatiles)
- **Rationale :** 1 appel par article (NFR7), résultat réutilisé pour brief + sommaire + NLP terms
- **Invalidation :** Manuelle uniquement (bouton "Rafraîchir les données SEO" dans le brief)

### Authentication & Security

**Pas d'authentification — App locale (NFR12)**

- **Décision :** Aucun système d'auth. L'app tourne sur `localhost` uniquement
- **Rationale :** Utilisateur unique (Arnau), pas d'exposition internet
- **Sécurité API :**
  - Clés API Claude et DataForSEO en variables d'environnement côté serveur (`.env`)
  - Le frontend n'a jamais accès aux clés — tout passe par le proxy Express
  - CORS restreint à `http://localhost:*`

### API & Communication Patterns

**REST API interne + Server-Sent Events (SSE)**

- **Décision :** API REST pour les opérations CRUD et requêtes DataForSEO. SSE pour le streaming de contenu IA
- **Rationale :** REST est simple et suffisant pour 90% des interactions. SSE permet le streaming natif de Claude API vers le frontend sans WebSocket

**Endpoints API :**

| Méthode | Endpoint | Description | Type |
|---------|----------|-------------|------|
| GET | `/api/cocoons` | Liste des cocons avec stats | REST |
| GET | `/api/cocoons/:id/articles` | Articles d'un cocon | REST |
| GET | `/api/articles/:slug` | Détail article + contenu sauvegardé | REST |
| PUT | `/api/articles/:slug` | Sauvegarde contenu article | REST |
| PUT | `/api/articles/:slug/status` | Mise à jour statut (brouillon/publié) | REST |
| GET | `/api/keywords/:cocoon` | Mots-clés d'un cocon | REST |
| POST | `/api/dataforseo/brief` | Enrichissement brief SEO | REST |
| POST | `/api/generate/outline` | Génération sommaire | SSE stream |
| POST | `/api/generate/article` | Génération article complet | SSE stream |
| POST | `/api/generate/action` | Action contextuelle (reformuler, etc.) | SSE stream |
| GET | `/api/links/matrix` | Matrice de maillage complète | REST |
| POST | `/api/links/suggest` | Suggestions de liens internes | REST |
| PUT | `/api/links` | Sauvegarde liens de maillage | REST |
| POST | `/api/export/:slug` | Export HTML d'un article | REST |

**Format de réponse standardisé :**

```typescript
// Succès
{ data: T }

// Erreur
{ error: { code: string, message: string } }

// SSE stream
event: chunk\ndata: { content: string }\n\n
event: done\ndata: { metadata: {...} }\n\n
event: error\ndata: { code: string, message: string }\n\n
```

**Gestion d'erreurs :**

- Codes HTTP standards : 200, 201, 400, 404, 500, 503
- Retry automatique côté client pour les erreurs 503 (rate limiting DataForSEO) avec backoff exponentiel
- Erreurs Claude API : affichage message + bouton retry dans le frontend

### Frontend Architecture

**State Management : Pinia — stores par domaine**

| Store | Responsabilité | Persistence |
|-------|---------------|-------------|
| `articles` | Liste articles, statuts, article actif | Non (chargé depuis API) |
| `cocoons` | Cocons, stats, progression | Non (dérivé des articles) |
| `keywords` | Mots-clés par cocon et par article | Non (chargé depuis API) |
| `editor` | Contenu éditeur, état sauvegarde, dirty flag | Auto-save 30s via API |
| `seo` | Score SEO, densités, checklist, NLP terms | Non (calculé en temps réel) |
| `geo` | Score GEO, capsules, questions, stats | Non (calculé en temps réel) |
| `linking` | Matrice de maillage, suggestions, orphelins | Via API |
| `brief` | Brief SEO actif, données DataForSEO | Non (chargé par article) |
| `ui` | État UI global (panels ouverts, loading, notifications) | Non |

**Routing : Vue Router**

```
/                           → DashboardView (liste des cocons)
/cocoon/:cocoonId           → CocoonView (articles du cocon)
/article/:slug              → ArticleWorkflowView (brief → sommaire → éditeur)
/article/:slug/editor       → ArticleEditorView (éditeur TipTap + panels)
/linking                    → LinkingMatrixView (matrice globale)
```

**Component Architecture : par feature**

Les composants sont organisés par domaine fonctionnel, pas par type. Chaque dossier dans `components/` correspond à un domaine du PRD.

**TipTap Integration :**

- Extensions custom pour les blocs Propulsite : `ContentValeur`, `ContentReminder`, `AnswerCapsule`, `InternalLink`
- Toolbar flottante contextuelle sur sélection de texte (Bubble Menu TipTap)
- L'éditeur émet des événements `update` que le store `editor` écoute pour déclencher le scoring
- Le scoring est calculé côté client via des composables dédiés avec debounce (300ms)

**Scoring en temps réel :**

```
TipTap Editor
  → event: update (content changed)
    → debounce 300ms
      → useSeoScoring(content, keywords) → met à jour store seo
      → useGeoScoring(content) → met à jour store geo
        → SeoPanel / GeoPanel réagissent via Pinia reactivity
```

### Infrastructure & Deployment

**Local uniquement — pas de déploiement**

- **Dev server :** `npm run dev` lance Vite (frontend) + Express (backend) simultanément
- **Vite proxy :** Les requêtes `/api/*` sont proxied vers Express en développement
- **Pas de Docker, pas de CI/CD** pour la V1
- **Node.js 20 LTS** minimum

**Configuration environnement :**

```env
# .env (jamais commité)
ANTHROPIC_API_KEY=sk-ant-...
DATAFORSEO_LOGIN=...
DATAFORSEO_PASSWORD=...
CLAUDE_MODEL=claude-sonnet-4-6
PORT=3001
```

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Fichiers et dossiers :**

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Composants Vue | PascalCase.vue | `CocoonCard.vue`, `SeoPanel.vue` |
| Composables | camelCase avec prefix `use` | `useSeoScoring.ts`, `useArticleWorkflow.ts` |
| Stores Pinia | kebab-case avec suffix `.store` | `articles.store.ts`, `seo.store.ts` |
| Services | kebab-case avec suffix `.service` | `claude.service.ts`, `dataforseo.service.ts` |
| Types/Interfaces | kebab-case avec suffix `.types` | `article.types.ts`, `seo.types.ts` |
| Utils | kebab-case | `seo-calculator.ts`, `html-generator.ts` |
| Routes Express | kebab-case avec suffix `.routes` | `articles.routes.ts`, `generate.routes.ts` |
| Tests | même nom + suffix `.test` | `seo-calculator.test.ts`, `CocoonCard.test.ts` |

**Code TypeScript :**

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Variables / fonctions | camelCase | `articleSlug`, `calculateSeoScore()` |
| Interfaces / Types | PascalCase | `Article`, `SeoScore`, `CocoonStats` |
| Enums | PascalCase + PascalCase members | `ArticleStatus.Published` |
| Constantes globales | UPPER_SNAKE_CASE | `MAX_KEYWORD_DENSITY`, `AUTO_SAVE_INTERVAL` |
| Props Vue | camelCase | `articleSlug`, `isLoading` |
| Emits Vue | kebab-case | `@update-content`, `@save-article` |

**API :**

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Endpoints | kebab-case, noms pluriels | `/api/articles`, `/api/cocoons` |
| Query params | camelCase | `?cocoonId=...&status=draft` |
| JSON fields (request/response) | camelCase | `{ articleSlug, seoScore, metaTitle }` |
| JSON fields (fichiers data existants) | snake_case (préservé) | `{ mot_clef, cocon_seo, type_mot_clef }` |

**Important :** Les fichiers JSON existants (`BDD_Articles_Blog.json`, `BDD_Mots_Clefs_SEO.json`) gardent leur format snake_case original. La conversion snake_case → camelCase se fait dans les services backend lors du chargement.

### Structure Patterns

**Organisation par feature (pas par type) :**

```
src/components/
├── dashboard/      # FR1-FR5 : tout ce qui concerne le dashboard
├── brief/          # FR6-FR9 : brief SEO
├── outline/        # FR10-FR13 : génération de sommaire
├── editor/         # FR21-FR24 : éditeur TipTap
├── actions/        # FR25-FR33 : actions contextuelles
├── panels/         # FR34-FR44 : panels SEO et GEO
├── linking/        # FR45-FR52 : maillage interne
├── export/         # FR53-FR56 : export HTML
└── shared/         # Composants réutilisables (ScoreGauge, StatusBadge, etc.)
```

**Tests à la racine :**

- Les tests unitaires sont dans un dossier `tests/` à la racine (pas co-localisés)
- Structure miroir de `src/` : `tests/unit/stores/`, `tests/unit/composables/`, `tests/unit/utils/`
- Raison : séparation claire code source vs code test, pas de pollution du tree `src/`

**Un composant Vue = un fichier :**

- Pas de dossier par composant sauf si assets spécifiques nécessaires
- `<script setup lang="ts">` obligatoire (Composition API)
- Ordre dans le SFC : `<script setup>` → `<template>` → `<style scoped>`

### Format Patterns

**Réponses API standardisées :**

```typescript
// Toute réponse succès
interface ApiSuccess<T> {
  data: T
}

// Toute réponse erreur
interface ApiError {
  error: {
    code: string    // 'ARTICLE_NOT_FOUND', 'CLAUDE_API_ERROR', 'DATAFORSEO_RATE_LIMIT'
    message: string // Message humain en français
  }
}
```

**Dates :** ISO 8601 strings (`2026-03-06T14:30:00Z`) dans toutes les APIs et fichiers JSON.

**Null handling :** `null` explicite dans le JSON, jamais `undefined`. Les champs optionnels sont présents avec valeur `null`.

### Communication Patterns

**Events Vue :**

- Naming : kebab-case verbe-nom (`update-content`, `save-article`, `generate-outline`)
- Payload : toujours un objet typé, jamais de primitifs seuls

**State management Pinia :**

- Stores en mode `setup` (Composition API style), pas Options API
- Actions pour toute opération async (appels API)
- Getters pour les données dérivées (stats cocons, scores calculés)
- Pas de mutations directes du state depuis les composants — toujours via actions

```typescript
// Pattern standard d'un store
export const useArticlesStore = defineStore('articles', () => {
  // State
  const articles = ref<Article[]>([])
  const activeArticle = ref<Article | null>(null)
  const isLoading = ref(false)

  // Getters
  const articlesByCocoon = computed(() => /* ... */)

  // Actions
  async function fetchArticles() { /* ... */ }
  async function saveArticle(slug: string, content: ArticleContent) { /* ... */ }

  return { articles, activeArticle, isLoading, articlesByCocoon, fetchArticles, saveArticle }
})
```

### Process Patterns

**Error Handling :**

- **Backend :** Middleware Express global catch-all. Chaque route wrappée dans un try/catch qui retourne `{ error: { code, message } }`
- **Frontend :** Les stores Pinia gèrent les erreurs dans leurs actions. Les composants affichent les erreurs via un composant `ErrorMessage.vue` réutilisable
- **Pas de throw** dans les stores — les erreurs sont stockées dans le state et affichées par les composants
- **Logging :** `console.error` côté serveur avec le contexte, pas de service de logging externe

**Loading States :**

- Chaque store a son propre `isLoading: ref(false)`
- Les composants affichent un `LoadingSpinner` quand le store associé est en loading
- Pour les générations IA : état intermédiaire `isStreaming: ref(false)` + texte progressif

**Auto-save (NFR8) :**

- Le store `editor` déclenche un save toutes les 30 secondes SI le contenu a changé (`isDirty` flag)
- Save = `PUT /api/articles/:slug` avec le contenu TipTap sérialisé
- Indicateur visuel "Sauvegardé" / "Sauvegarde en cours..." dans l'éditeur

**Sauvegarde atomique JSON (NFR10) :**

- Pattern write-to-temp + rename : écrire dans `{filename}.tmp` puis `fs.rename()` pour remplacer l'original
- Garantit qu'un crash pendant l'écriture ne corrompt pas le fichier existant

### Enforcement Guidelines

**Tous les agents IA DOIVENT :**

1. Utiliser `<script setup lang="ts">` pour tous les composants Vue
2. Typer explicitement toutes les props, emits, et retours de fonctions
3. Utiliser les stores Pinia via actions, jamais de mutation directe
4. Suivre les conventions de nommage exactes définies ci-dessus
5. Utiliser Zod pour valider tout input externe (API responses, fichiers JSON)
6. Écrire des tests Vitest pour tout nouveau composable et utilitaire
7. Garder les prompts IA dans des fichiers Markdown séparés dans `server/prompts/`

**Anti-Patterns à éviter :**

- Options API dans les composants (`data()`, `methods:`, `computed:`)
- `any` en TypeScript — utiliser `unknown` + type guards si nécessaire
- Appels API directs depuis les composants — toujours via services ou stores
- Logique métier dans les composants — extraire dans composables ou utils
- Stockage de clés API côté frontend

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
blog-redactor-seo/
├── .env                              # Variables d'environnement (non commité)
├── .env.example                      # Template des variables d'environnement
├── .eslintrc.cjs                     # Configuration ESLint
├── .gitignore
├── .prettierrc                       # Configuration Prettier
├── index.html                        # Entry point HTML Vite
├── package.json
├── tsconfig.json                     # Config TS frontend
├── tsconfig.node.json                # Config TS backend/node
├── vite.config.ts                    # Config Vite + proxy API
│
├── data/                             # Données persistantes (JSON files)
│   ├── BDD_Articles_Blog.json        # 54 articles × 6 cocons (existant)
│   ├── BDD_Mots_Clefs_SEO.json       # ~100 mots-clés SEO (existant)
│   ├── articles/                     # Contenu généré par article
│   │   └── {slug}.json               # Contenu, outline, metadata, scores
│   ├── cache/                        # Cache DataForSEO
│   │   └── {keyword-slug}.json       # Données SERP, PAA, related keywords
│   └── links/
│       └── linking-matrix.json       # Graphe de maillage interne
│
├── server/                           # Backend Express (API proxy)
│   ├── index.ts                      # Entry point Express, middleware, routes
│   ├── routes/
│   │   ├── articles.routes.ts        # CRUD articles, sauvegarde, statut
│   │   ├── cocoons.routes.ts         # Liste cocons, stats
│   │   ├── keywords.routes.ts        # Mots-clés par cocon/article
│   │   ├── generate.routes.ts        # Proxy Claude API (SSE streaming)
│   │   ├── dataforseo.routes.ts      # Proxy DataForSEO avec cache
│   │   ├── links.routes.ts           # Maillage interne CRUD
│   │   └── export.routes.ts          # Export HTML
│   ├── services/
│   │   ├── claude.service.ts         # SDK Anthropic, streaming, retry
│   │   ├── dataforseo.service.ts     # API DataForSEO, 4 endpoints, rate limiting
│   │   ├── article.service.ts        # Lecture/écriture JSON articles
│   │   ├── linking.service.ts        # Logique de maillage, détection orphelins
│   │   └── export.service.ts         # Génération HTML + Schema markup
│   ├── prompts/                      # Prompts IA externalisés (NFR14)
│   │   ├── system-propulsite.md      # System prompt ton Propulsite
│   │   ├── generate-outline.md       # Prompt génération sommaire
│   │   ├── generate-article.md       # Prompt génération article complet
│   │   └── actions/                  # Prompts actions contextuelles
│   │       ├── reformulate.md
│   │       ├── simplify.md
│   │       ├── to-list.md
│   │       ├── enrich-example.md
│   │       ├── optimize-keyword.md
│   │       ├── add-statistic.md
│   │       ├── answer-capsule.md
│   │       ├── to-question.md
│   │       └── inject-link.md
│   └── utils/
│       ├── json-storage.ts           # Read/write JSON atomique
│       ├── error-handler.ts          # Middleware erreur global Express
│       └── slug.ts                   # Utilitaire slugification
│
├── shared/                           # Code partagé client/server
│   ├── types/
│   │   ├── article.types.ts          # Article, ArticleContent, ArticleStatus
│   │   ├── cocoon.types.ts           # Cocoon, CocoonStats, CocoonType
│   │   ├── keyword.types.ts          # Keyword, KeywordType, KeywordDensity
│   │   ├── seo.types.ts              # SeoScore, SeoChecklist, NlpTerm
│   │   ├── geo.types.ts              # GeoScore, AnswerCapsule, GeoMetrics
│   │   ├── linking.types.ts          # Link, LinkingMatrix, OrphanArticle
│   │   └── api.types.ts              # ApiSuccess<T>, ApiError, SSE events
│   ├── schemas/
│   │   ├── article.schema.ts         # Zod schemas articles
│   │   ├── keyword.schema.ts         # Zod schemas mots-clés
│   │   └── linking.schema.ts         # Zod schemas maillage
│   └── constants/
│       ├── seo.constants.ts          # Seuils SEO, densité cible par type de mot-clé
│       └── geo.constants.ts          # Règles GEO configurables (NFR13)
│
├── src/                              # Frontend Vue 3
│   ├── main.ts                       # Entry point Vue
│   ├── App.vue                       # Layout principal
│   ├── router/
│   │   └── index.ts                  # Vue Router config
│   ├── stores/
│   │   ├── articles.store.ts         # Articles, statuts, article actif
│   │   ├── cocoons.store.ts          # Cocons, stats, progression
│   │   ├── keywords.store.ts         # Mots-clés par cocon et article
│   │   ├── editor.store.ts           # Contenu éditeur, auto-save, dirty flag
│   │   ├── seo.store.ts              # Score SEO temps réel
│   │   ├── geo.store.ts              # Score GEO temps réel
│   │   ├── linking.store.ts          # Matrice maillage, suggestions
│   │   ├── brief.store.ts            # Brief SEO, données DataForSEO
│   │   └── ui.store.ts               # État UI (panels, loading, notifications)
│   ├── composables/
│   │   ├── useArticleWorkflow.ts     # Orchestration workflow article
│   │   ├── useSeoScoring.ts          # Calcul score SEO en temps réel
│   │   ├── useGeoScoring.ts          # Calcul score GEO en temps réel
│   │   ├── useContextualActions.ts   # Gestion des 9 actions contextuelles
│   │   ├── useInternalLinking.ts     # Logique maillage côté client
│   │   ├── useAutoSave.ts            # Auto-save 30s avec dirty detection
│   │   └── useStreaming.ts           # Consommation SSE streams Claude
│   ├── services/
│   │   ├── api.service.ts            # Client HTTP de base (fetch wrapper)
│   │   ├── articles.api.ts           # Appels API articles
│   │   ├── generation.api.ts         # Appels API génération (SSE)
│   │   ├── dataforseo.api.ts         # Appels API DataForSEO
│   │   ├── links.api.ts              # Appels API maillage
│   │   └── export.api.ts             # Appels API export
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── CocoonList.vue        # Liste des 6 cocons avec progression
│   │   │   ├── CocoonCard.vue        # Carte cocon (stats, barre progression)
│   │   │   ├── ArticleList.vue       # Liste articles d'un cocon
│   │   │   ├── ArticleCard.vue       # Carte article (titre, type, statut, mots-clés)
│   │   │   └── CocoonStats.vue       # Statistiques santé cocon
│   │   ├── brief/
│   │   │   ├── SeoBrief.vue          # Brief SEO complet d'un article
│   │   │   ├── KeywordList.vue       # Liste mots-clés (pilier, moyenne, longue traine)
│   │   │   ├── DataForSeoPanel.vue   # Données DataForSEO (SERP, PAA, volumes)
│   │   │   └── ContentRecommendation.vue  # Longueur recommandée, type article
│   │   ├── outline/
│   │   │   ├── OutlineEditor.vue     # Éditeur de sommaire interactif
│   │   │   ├── OutlineNode.vue       # Nœud H2/H3 draggable
│   │   │   └── OutlineActions.vue    # Actions sur le sommaire (valider, régénérer)
│   │   ├── editor/
│   │   │   ├── ArticleEditor.vue     # Wrapper TipTap principal
│   │   │   ├── EditorToolbar.vue     # Toolbar formatage de base
│   │   │   ├── BubbleMenu.vue        # Menu contextuel flottant sur sélection
│   │   │   └── tiptap/
│   │   │       └── extensions/
│   │   │           ├── content-valeur.ts    # Extension bloc content-valeur
│   │   │           ├── content-reminder.ts  # Extension bloc content-reminder
│   │   │           ├── answer-capsule.ts    # Extension answer capsule GEO
│   │   │           └── internal-link.ts     # Extension lien interne traçable
│   │   ├── actions/
│   │   │   ├── ActionMenu.vue        # Menu des 9 actions contextuelles
│   │   │   └── ActionResult.vue      # Affichage résultat action (accept/reject)
│   │   ├── panels/
│   │   │   ├── SeoPanel.vue          # Panel latéral SEO complet
│   │   │   ├── GeoPanel.vue          # Panel latéral GEO complet
│   │   │   ├── KeywordDensity.vue    # Densité par mot-clé avec jauges
│   │   │   ├── SeoChecklist.vue      # Checklist SEO (titre, H1, intro, etc.)
│   │   │   ├── NlpTerms.vue          # Termes NLP DataForSEO à cocher
│   │   │   ├── GeoScore.vue          # Score GEO composite
│   │   │   ├── AnswerCapsuleCheck.vue # Vérification capsules par H2
│   │   │   └── ParagraphLength.vue   # Alerte paragraphes > 3 lignes
│   │   ├── linking/
│   │   │   ├── LinkingMatrix.vue     # Matrice globale de maillage
│   │   │   ├── LinkSuggestions.vue   # Suggestions de liens pour l'article actif
│   │   │   └── OrphanDetector.vue    # Détection articles orphelins
│   │   ├── export/
│   │   │   ├── ExportButton.vue      # Bouton export HTML
│   │   │   └── ExportPreview.vue     # Preview du HTML généré
│   │   └── shared/
│   │       ├── ScoreGauge.vue        # Jauge de score réutilisable (SEO/GEO)
│   │       ├── StatusBadge.vue       # Badge statut article
│   │       ├── ProgressBar.vue       # Barre de progression cocon
│   │       ├── LoadingSpinner.vue    # Spinner de chargement
│   │       └── ErrorMessage.vue      # Affichage erreur avec retry
│   ├── views/
│   │   ├── DashboardView.vue         # Page dashboard (liste cocons)
│   │   ├── CocoonView.vue            # Page cocon (liste articles)
│   │   ├── ArticleWorkflowView.vue   # Page workflow (brief → sommaire → éditeur)
│   │   └── LinkingMatrixView.vue     # Page matrice maillage globale
│   ├── utils/
│   │   ├── seo-calculator.ts         # Logique calcul score SEO
│   │   ├── geo-calculator.ts         # Logique calcul score GEO
│   │   ├── keyword-analyzer.ts       # Analyse densité, placement mots-clés
│   │   ├── html-generator.ts         # Génération HTML depuis contenu TipTap
│   │   └── text-analyzer.ts          # Analyse texte (longueur, paragraphes, jargon)
│   └── assets/
│       ├── styles/
│       │   ├── main.css              # Styles globaux de l'app
│       │   ├── editor.css            # Styles spécifiques TipTap
│       │   └── variables.css         # Variables CSS (couleurs, spacing)
│       └── templates/
│           └── templateArticle.html  # Template HTML Propulsite pour export
│
├── tests/
│   ├── unit/
│   │   ├── stores/                   # Tests des stores Pinia
│   │   ├── composables/              # Tests des composables
│   │   ├── utils/                    # Tests des utilitaires (scoring, analyse)
│   │   └── services/                 # Tests des services backend
│   └── setup.ts                      # Configuration globale Vitest
│
└── public/                           # Assets statiques Vite
```

### Architectural Boundaries

**Diagramme de flux :**

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (Vue 3)                   │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐            │
│  │ Stores  │←→│Composable│←→│Components│            │
│  │ (Pinia) │  │   (use*) │  │  (.vue)  │            │
│  └────┬────┘  └──────────┘  └──────────┘            │
│       │                                               │
│  ┌────┴────┐                                         │
│  │Services │  ← fetch() / EventSource (SSE)          │
│  │ (.api)  │                                         │
│  └────┬────┘                                         │
└───────┼─────────────────────────────────────────────┘
        │ HTTP REST + SSE (localhost:3001)
┌───────┼─────────────────────────────────────────────┐
│       ▼           BACKEND (Express)                  │
│  ┌─────────┐                                         │
│  │ Routes  │                                         │
│  └────┬────┘                                         │
│       │                                               │
│  ┌────┴────────────────────────────────┐             │
│  │           Services                   │             │
│  │  ┌──────────┐  ┌─────────────────┐  │             │
│  │  │ Claude   │  │  DataForSEO     │  │             │
│  │  │ Service  │  │  Service        │  │             │
│  │  └────┬─────┘  └───────┬─────────┘  │             │
│  │       │                │             │             │
│  │  ┌────┴─────┐  ┌──────┴──────────┐  │             │
│  │  │ Article  │  │  Export         │  │             │
│  │  │ Service  │  │  Service        │  │             │
│  │  └────┬─────┘  └───────┬─────────┘  │             │
│  └───────┼────────────────┼─────────────┘             │
│          │                │                           │
│  ┌───────┴────────────────┴─────────┐                │
│  │     JSON Storage (data/)          │                │
│  └───────────────────────────────────┘                │
└─────────────────────────────────────────────────────┘
        │                    │
        ▼                    ▼
  Claude API           DataForSEO API
  (streaming)          (REST + cache)
```

**Règle de boundary critique :** Les composants Vue n'appellent JAMAIS les services API directement. Le flux est toujours : `Component → Store (action) → Service API → Backend`. Seuls les composables peuvent accéder directement aux stores.

### Requirements to Structure Mapping

| Domaine FR | Composants | Store | Service backend | Composable |
|-----------|------------|-------|-----------------|------------|
| FR1-FR5 Dashboard | `dashboard/*` | `cocoons`, `articles` | `cocoons.routes`, `articles.routes` | — |
| FR6-FR9 Brief | `brief/*` | `brief`, `keywords` | `dataforseo.routes`, `keywords.routes` | — |
| FR10-FR13 Sommaire | `outline/*` | `editor` | `generate.routes` | `useStreaming` |
| FR14-FR20 Contenu | `editor/*` | `editor` | `generate.routes`, `claude.service` | `useStreaming`, `useAutoSave` |
| FR21-FR24 Éditeur | `editor/*`, `tiptap/` | `editor` | — | `useAutoSave` |
| FR25-FR33 Actions | `actions/*` | `editor` | `generate.routes` | `useContextualActions` |
| FR34-FR38 SEO | `panels/Seo*` | `seo` | — | `useSeoScoring` |
| FR39-FR44 GEO | `panels/Geo*` | `geo` | — | `useGeoScoring` |
| FR45-FR52 Maillage | `linking/*` | `linking` | `links.routes`, `linking.service` | `useInternalLinking` |
| FR53-FR56 Export | `export/*` | — | `export.routes`, `export.service` | — |
| FR57-FR60 Data | — | — | `article.service`, `json-storage.ts` | — |

---

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility :**
- Vue 3 + Vite + Pinia + Vue Router + TipTap : stack éprouvé, toutes les libs sont compatibles et maintenues activement
- Express backend + Claude SDK + DataForSEO REST : intégration straightforward via HTTP
- TypeScript partagé client/server via le dossier `shared/` : cohérence des types garantie
- JSON storage + sauvegarde atomique : simple et suffisant pour un utilisateur unique

**Pattern Consistency :**
- Naming conventions cohérentes à travers tout le projet (PascalCase composants, camelCase code, kebab-case fichiers)
- Stores Pinia tous en mode Composition API setup — pas de mélange Options/Composition
- Scoring SEO/GEO via composables avec debounce — pattern uniforme

**Structure Alignment :**
- Organisation par feature alignée sur les domaines FR du PRD
- Chaque domaine a ses composants, son store, son service API, et potentiellement son composable
- Le dossier `shared/` évite la duplication des types entre client et server

### Requirements Coverage

**Functional Requirements : 60/60 couverts**

Chaque FR est mappé à au moins un composant, store, service, ou composable dans la structure projet. Voir le tableau "Requirements to Structure Mapping" ci-dessus.

**Non-Functional Requirements : 17/17 adressés**

| NFR | Solution architecturale |
|-----|------------------------|
| NFR1-5 Performance | Debounce 300ms scoring, SSE streaming, Vite build optimisé |
| NFR6-7 Coût | Cache DataForSEO fichier, génération Claude en une passe |
| NFR8 Auto-save | `useAutoSave` composable, 30s interval, dirty detection |
| NFR9 Error handling | Pattern retry + message utilisateur, middleware Express |
| NFR10 Atomic writes | Write-to-temp + fs.rename dans `json-storage.ts` |
| NFR11-12 Sécurité | `.env` server-side, proxy Express, CORS localhost |
| NFR13 GEO configurable | `geo.constants.ts` dans `shared/constants/` |
| NFR14 Prompts externalisés | `server/prompts/` en fichiers Markdown |
| NFR15 Templates séparés | `src/assets/templates/templateArticle.html` |
| NFR16-17 Intégrations | Services dédiés avec SDK/REST, rate limiting, streaming |

### Architecture Completeness Checklist

- [x] Contexte projet analysé en profondeur
- [x] Échelle et complexité évaluées
- [x] Contraintes techniques identifiées
- [x] Préoccupations transversales mappées
- [x] Starter template sélectionné et justifié
- [x] Versions vérifiées via recherche web
- [x] Décisions critiques documentées avec rationale
- [x] Stack technique entièrement spécifié
- [x] Patterns d'intégration définis (REST + SSE)
- [x] Conventions de nommage exhaustives
- [x] Patterns de structure définis
- [x] Patterns de communication spécifiés
- [x] Error handling et loading states documentés
- [x] Structure de répertoires complète (~80 fichiers)
- [x] Boundaries entre composants établies
- [x] Points d'intégration mappés
- [x] Mapping FR → structure complet (60/60)
- [x] Mapping NFR → solutions complet (17/17)

### Architecture Readiness Assessment

**Status global : PRÊT POUR L'IMPLÉMENTATION**

**Niveau de confiance : Haut**

**Forces clés :**
- Stack technologique éprouvé et bien documenté
- Séparation claire frontend/backend/shared
- Scoring temps réel via composables découplés
- Prompts IA externalisés pour itération facile
- Types partagés via Zod + TypeScript
- Mapping 100% des FRs et NFRs vers la structure

**Améliorations futures (post-V1) :**
- Migration JSON → SQLite/Supabase si volume augmente
- CI/CD pipeline si déploiement externe
- Tests E2E avec Playwright
- Monitoring des coûts API avec dashboard dédié

### Implementation Handoff

**Guidelines pour agents IA :**

1. Suivre exactement toutes les décisions architecturales documentées
2. Utiliser les patterns d'implémentation de manière cohérente
3. Respecter la structure projet et les boundaries
4. Se référer à ce document pour toute question architecturale
5. Les prompts IA dans `server/prompts/`, jamais hardcodés
6. Les types dans `shared/types/`, importés par client ET server
7. Les constantes de scoring dans `shared/constants/`, configurables

**Première priorité d'implémentation :**

```bash
npm create vue@latest blog-redactor-seo -- --typescript --router --pinia --vitest --eslint-with-prettier
cd blog-redactor-seo
npm install @tiptap/vue-3 @tiptap/starter-kit @anthropic-ai/sdk express zod @vueuse/core
```

Puis : créer la structure `server/`, `shared/`, `data/`, copier les fichiers JSON existants dans `data/`, et configurer le proxy Vite.
