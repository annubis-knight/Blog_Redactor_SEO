---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-28.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-31.md'
workflowType: 'architecture'
project_name: 'Blog Redactor SEO'
user_name: 'Utilisateur'
date: '2026-03-31'
lastStep: 8
status: 'complete'
completedAt: '2026-03-30'
lastUpdated: '2026-03-31'
updateReason: 'Alignement avec PRD mis à jour post-brainstorming 2026-03-31 — Phase ② Valider restructurée en 3 sous-onglets (Capitaine/Lieutenants/Lexique), extraction Intention/Audit/Local vers Dashboard, suppression Phase ③ Assigner'
---

# Architecture Decision Document — Blog Redactor SEO

**Auteur :** Utilisateur + Claude (Architect)
**Date :** 2026-03-30

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements (51 FRs en 8 domaines) :**

| Domaine | FRs | Implication architecturale |
|---------|-----|--------------------------|
| Moteur — Structure 2 phases | FR1-FR5 | Refactoring du MoteurView en 2 phases visuelles (Générer, Valider), suppression Content Gap, fusion Local dans Dashboard |
| Phase ① Générer | FR6-FR9 | Onglets optionnels avec verrouillage conditionnel (si mots-clés validés) |
| Phase ② Valider — Capitaine | FR10-FR20 | Sous-onglet verdict GO/NO-GO : thermomètre + 6 KPIs contextuels + feu tricolore, seuils par niveau article, panel IA streaming, input alternatif + historique slider, lock/unlock, feedback NO-GO orienté, découpage racine longue traîne |
| Phase ② Valider — Lieutenants | FR21-FR28 | Sous-onglet SERP : bouton "Analyser SERP" (curseur 3-10), Hn concurrents, PAA N+2, Groupes croisés, badges pertinence multi-source, sélection checkbox + compteur recommandé, panel IA structure Hn |
| Phase ② Valider — Lexique | FR29-FR33 | Sous-onglet TF-IDF : extraction des données SERP héritées (zéro requête), 3 niveaux (Obligatoire/Différenciateur/Optionnel), densité/page, checkbox pré-cochées, panel IA lexical |
| Phase ② Valider — Règles transversales | FR34-FR36 | Aucune action auto au changement de sous-onglet, KPIs bruts toujours visibles, persistance cache TTL |
| Extraction Dashboard + Progression + Pont Cerveau | FR37-FR45 | Intention/Audit/Local extraits vers Dashboard indépendant, checks modifiés (capitaine_locked/lieutenants_locked/lexique_validated), dots progression par article, bandeaux transition, contexte stratégique collapsable + enrichissement prompts |
| Labo & Cache | FR46-FR51 | Composants dual-mode (contextualisé/libre), cache par article par service, persistance JSON, zéro appel redondant |

**Non-Functional Requirements (14 NFRs sur 4 axes) :**

| Axe | NFRs | Contrainte architecturale |
|-----|------|--------------------------|
| Performance | NFR1-NFR4 | API locales < 200ms, SSE premier token < 2s, changement de vue < 500ms, cache hit > 90% |
| Coûts | NFR5-NFR7 | Zéro appel API redondant, persistance disque, limite 5MB JSON |
| Intégration | NFR8-NFR12 | Composants dual-mode (contextualisé/libre), enrichissement prompts optionnel, article-progress source unique avec checks (capitaine_locked, lieutenants_locked, lexique_validated), SERP scraping unique cascade Lieutenants→Lexique, seuils scoring configurables et transparents |
| Maintenabilité | NFR13-NFR14 | Pas de duplication composants (prop de mode), prompts .md séparés avec pré-processing |

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
2. **Progression réactive** — Le store article-progress reçoit des événements de 5 checks (discovery_done, radar_done, capitaine_locked, lieutenants_locked, lexique_validated)
3. **Cache systématique** — 6+ services doivent implémenter le même pattern cache
4. **Enrichissement prompts** — La stratégie du Cerveau doit être injectée dans les appels Claude du Moteur
5. **Navigation libre avec guidage** — Aucun gating dur, mais messages conditionnels et bandeaux
6. **Cascade de données SERP** — Un seul scraping (sous-onglet Lieutenants) alimente Lieutenants ET Lexique (TF-IDF) — zéro requête dupliquée
7. **Seuils contextuels** — Les KPIs du verdict GO/NO-GO s'adaptent au niveau d'article (Pilier/Intermédiaire/Spécifique) sans changement d'interface
8. **Verrouillage séquentiel** — Capitaine verrouillé → débloque Lieutenants → débloque Lexique, mais navigation libre maintenue (consultation sans action)

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

1. Restructuration du MoteurView en 2 phases (Générer, Valider) avec 3 sous-onglets séquentiels dans Valider
2. Architecture du verdict GO/NO-GO : scoring contextuel par niveau article, feu tricolore, seuils transparents
3. Cascade de données SERP : un seul scraping alimente Lieutenants ET Lexique (TF-IDF)
4. Pattern dual-mode composants (workflow vs libre)
5. Architecture du système de progression (5 checks, dots, bandeaux)

**Décisions importantes (façonnent l'architecture) :**

6. Pattern d'enrichissement des prompts IA (Pont Cerveau→Moteur)
7. Pattern cache étendu (par article, par service)
8. Extraction Intention/Audit/Local vers Dashboard
9. Architecture du Labo

**Décisions différées (post-MVP — Phase 3 PRD) :**

10. Batch processing multi-articles
11. Boucle GSC post-publication
12. Score de complémentarité Capitaine ↔ Lieutenants

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
| `/api/articles/:slug/progress/check` | POST | Ajouter un check automatique | FR41 |
| `/api/cocoons/:id/strategy/context` | GET | Récupérer le contexte stratégique pour enrichissement | FR45 |
| `/api/keywords/:keyword/validate` | POST | Verdict GO/NO-GO : appels DataForSEO + Autocomplete + PAA en parallèle, scoring contextuel | FR11-FR16 |
| `/api/keywords/:keyword/roots` | GET | Découpage automatique en racine(s) pour mots-clés longue traîne | FR15 |
| `/api/serp/analyze` | POST | Scraping SERP top 3-10 : extraction Hn, PAA, contenus pour TF-IDF | FR22-FR23 |
| `/api/serp/tfidf` | POST | Extraction TF-IDF des contenus SERP déjà scrapés → 3 niveaux lexique | FR29-FR30 |
| `/api/keywords/:keyword/ai-panel` | POST | Panel IA expert SEO en streaming (SSE) — ne touche pas au verdict | FR17 |

Toutes les autres routes existent déjà (Discovery, Intent, DataForSEO, etc.).

### Phase ② Valider — Architecture du verdict GO/NO-GO

**Décision architecturale majeure : workflow séquentiel en 3 sous-onglets avec verrouillage progressif.**

```
Phase ② Valider
├── Sous-onglet Capitaine (mot-clé principal)
│   ├── Input : mot-clé pré-rempli (Cerveau ou Phase ①) + input alternatif + historique slider
│   ├── Requêtes parallèles : DataForSEO, Autocomplete, PAA, (racine si longue traîne)
│   ├── Scoring : 6 KPIs contextuels selon niveau article (Pilier/Intermédiaire/Spécifique)
│   ├── Verdict : feu tricolore GO/ORANGE/NO-GO + panel IA expert streaming
│   ├── Actions : forcer GO, saisir alternatif, verrouiller ("Valider ce Capitaine")
│   └── Sortie verrouillée : capitaine, KPIs, PAA pertinents, groupes, verdict
│
├── Sous-onglet Lieutenants (mots-clés secondaires H2/H3)
│   ├── Prérequis : Capitaine verrouillé (gating souple — consultation possible)
│   ├── Bouton "Analyser SERP" → scraping top 3-10 (curseur configurable, défaut 10)
│   ├── 3 sections dépliables : Hn concurrents (% récurrence), PAA N+2, Groupes croisés
│   ├── Candidats avec badges [SERP] [PAA] [Groupe] + pertinence Fort/Moyen/Faible
│   ├── Sélection checkbox + compteur recommandé (Pilier 5-8, Intermédiaire 3-5, Spécifique 1-3)
│   ├── Panel IA dépliable : structure Hn recommandée
│   └── Sortie verrouillée : lieutenants[], données SERP brutes, structure Hn
│
└── Sous-onglet Lexique (termes sémantiques LSI)
    ├── Prérequis : Lieutenants verrouillés (gating souple)
    ├── Données : TF-IDF des contenus SERP DÉJÀ scrapés — ZÉRO nouvelle requête API
    ├── 3 niveaux : Obligatoire (70%+), Différenciateur (30-70%), Optionnel (<30%)
    ├── Densité récurrence/page (ex: ×4.2/page)
    ├── Checkbox par terme — obligatoires pré-cochés
    ├── Panel IA dépliable : analyse lexicale expert
    └── Sortie finale : lexique[] → ArticleKeywords store (capitaine + lieutenants + lexique)
```

**Scoring contextuel du Capitaine (6 KPIs) :**

```typescript
// Seuils adaptatifs selon le niveau d'article
interface ThresholdConfig {
  volume: { green: number; orange: number }  // > green = vert, < orange = rouge
  kd: { green: number; orange: number }       // < green = vert, > orange = rouge (inversé)
  cpc: { bonus: number }                      // > bonus = bonus vert, sinon neutre (jamais rouge)
  paa: { green: number; orange: number }      // % pertinents
  intent: 'match' | 'mixed' | 'contradiction'
  autocomplete: { green: number }             // position dans les suggestions
}

const THRESHOLDS: Record<ArticleLevel, ThresholdConfig> = {
  pilier:        { volume: { green: 1000, orange: 200 },  kd: { green: 40, orange: 65 }, ... },
  intermediaire: { volume: { green: 200,  orange: 50 },   kd: { green: 30, orange: 50 }, ... },
  specifique:    { volume: { green: 30,   orange: 5 },    kd: { green: 20, orange: 40 }, ... },
}
```

**Règle du verdict global :**
- GO si : ≥4/6 verts, AUCUN rouge sur Volume ou KD, PAA non-rouge
- ORANGE si : mix sans rouge critique, OU données insuffisantes + signaux
- NO-GO si : rouge Volume ET KD, OU PAA rouge + Volume rouge
- NO-GO automatique si : volume=0 ET PAA=0 ET autocomplete=0

**Règle CPC asymétrique :** CPC > 2€ = bonus vert, CPC 0-2€ = neutre, jamais de rouge.

**Cascade SERP (Lieutenants → Lexique) :**

```
Bouton "Analyser SERP" (sous-onglet Lieutenants)
    │
    ▼
Scraping top N résultats (curseur 3-10, défaut 10)
    │
    ├──→ Extraction Hn concurrents → candidats Lieutenants
    ├──→ PAA associés (N+2 pertinence) → candidats Lieutenants
    ├──→ Croisement avec Groupes (Cerveau) → candidats Lieutenants
    │
    └──→ Contenus HTML stockés en mémoire
              │
              ▼ (pas de re-fetch — données héritées)
         Sous-onglet Lexique : TF-IDF sur contenus stockés
              │
              ├──→ Obligatoire (70%+ des concurrents)
              ├──→ Différenciateur (30-70%)
              └──→ Optionnel (<30%)
```

**Curseur SERP intelligent :**
- Sous le défaut (10) = filtre local instantané (pas de re-scraping)
- Au-dessus du défaut = scraping complémentaire (nouvelles requêtes)

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

**Nouvelles routes :**

```typescript
// Labo — Recherche libre (mêmes composants que Moteur en mode libre)
{
  path: '/labo',
  name: 'labo',
  component: () => import('../views/LaboView.vue'),
}

// Explorateur/Dashboard — Intention, Audit, Local (extraits du Moteur)
{
  path: '/explorateur',
  name: 'explorateur',
  component: () => import('../views/ExplorateurView.vue'),
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

**Checks standardisés (5 étapes) :**

| Check name | Déclenché quand | Phase |
|-----------|-----------------|-------|
| `discovery_done` | Discovery IA termine l'analyse | ① Générer |
| `radar_done` | Douleur Intent scanner termine | ① Générer |
| `capitaine_locked` | L'utilisateur verrouille le Capitaine via "Valider ce Capitaine" | ② Valider — Capitaine |
| `lieutenants_locked` | L'utilisateur verrouille les Lieutenants via "Valider les Lieutenants" | ② Valider — Lieutenants |
| `lexique_validated` | L'utilisateur valide le Lexique via "Valider le Lexique" — écriture finale dans ArticleKeywords store | ② Valider — Lexique |

**Note :** Les anciens checks `intent_done`, `audit_done`, `local_done`, `captain_chosen`, `assignment_done` sont remplacés. Intention/Audit/Local migrent vers le Dashboard (hors workflow progression).

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
- Lancer un scraping SERP dans le sous-onglet Lexique — les données DOIVENT provenir du scraping Lieutenants
- Faire toucher le verdict GO/NO-GO par le panel IA — l'IA conseille, ne juge JAMAIS
- Déclencher une action automatique au changement de sous-onglet — l'utilisateur clique toujours
- Utiliser des seuils en dur sans les rendre transparents au survol (tooltip)

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
│   │   ├── keyword-validate.routes.ts # NOUVEAU — Verdict GO/NO-GO Capitaine (FR10-FR16)
│   │   ├── keywords.routes.ts
│   │   ├── links.routes.ts
│   │   ├── local.routes.ts
│   │   ├── serp.routes.ts             # NOUVEAU — Scraping SERP + TF-IDF (FR22-FR23, FR29-FR30)
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
│   │   ├── keyword-validate.service.ts  # NOUVEAU — Scoring contextuel GO/NO-GO (FR10-FR16)
│   │   ├── serp-analysis.service.ts     # NOUVEAU — Scraping SERP + extraction Hn/PAA (FR22-FR23)
│   │   ├── tfidf.service.ts             # NOUVEAU — TF-IDF contenus SERP → Lexique (FR29-FR30)
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
│   │   ├── useKeywordScoring.ts       # Scoring contextuel GO/NO-GO + seuils par niveau
│   │   ├── useKeywordDiscoveryTab.ts
│   │   ├── useNlpAnalysis.ts
│   │   ├── useStreaming.ts
│   │   └── ...
│   ├── components/               # Composants Vue (par domaine)
│   │   ├── moteur/               # Wrapper MoteurView, sélection article, contexte, sous-onglets Phase ②
│   │   │   ├── MoteurContextRecap.vue
│   │   │   ├── SelectedArticlePanel.vue
│   │   │   ├── KeywordDiscoveryTab.vue
│   │   │   ├── CaptainValidation.vue      # NOUVEAU — Sous-onglet Capitaine (FR10-FR20)
│   │   │   ├── LieutenantsSelection.vue   # NOUVEAU — Sous-onglet Lieutenants (FR21-FR28)
│   │   │   └── LexiqueExtraction.vue      # NOUVEAU — Sous-onglet Lexique (FR29-FR33)
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
│       ├── MoteurView.vue           # Restructuré en 2 phases (Générer, Valider avec 3 sous-onglets)
│       ├── ExplorateurView.vue      # NOUVEAU — Dashboard (Intention, Audit, Local extraits du Moteur)
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
├── MoteurContextRecap          # Résumé stratégie Cerveau (collapsable) — FR44
├── MoteurPhaseNavigation       # Navigation 2 phases + bandeaux + dots
│
├── Phase ① Générer
│   ├── KeywordDiscoveryTab     # Discovery IA (optionnel) — FR6
│   ├── DouleurIntentScanner    # Radar (optionnel) — FR7
│   └── PainTranslator          # Douleur → mots-clés — FR8
│
└── Phase ② Valider (3 sous-onglets séquentiels)
    ├── CaptainValidation       # Capitaine — FR10-FR20
    │   ├── Input alternatif + historique slider
    │   ├── RadarThermometer (composant existant) + feu tricolore
    │   ├── KPIs contextuels (6 barres avec zones vert/orange/rouge)
    │   ├── Section "Analyse racine" (conditionnelle, longue traîne)
    │   ├── Sections dépliables (PAA, Groupes, Autocomplete)
    │   ├── Panel IA expert streaming (dépliable, ne touche pas au verdict)
    │   └── Bouton "Valider ce Capitaine" + lock/unlock
    │
    ├── LieutenantsSelection    # Lieutenants — FR21-FR28
    │   ├── En-tête : Capitaine verrouillé + niveau article
    │   ├── Curseur SERP 3-10 (défaut 10) + bouton "Analyser SERP"
    │   ├── 3 sections dépliables : Hn concurrents, PAA N+2, Groupes croisés
    │   ├── Liste candidats avec badges [SERP] [PAA] [Groupe] + pertinence
    │   ├── Sélection checkbox + compteur recommandé
    │   ├── Panel IA structure Hn recommandée (dépliable)
    │   └── Bouton "Valider les Lieutenants" + lock/unlock
    │
    └── LexiqueExtraction       # Lexique — FR29-FR33
        ├── En-tête : Capitaine + Lieutenants + niveau article
        ├── TF-IDF des données SERP héritées (ZÉRO requête)
        ├── 3 niveaux : Obligatoire / Différenciateur / Optionnel
        ├── Densité récurrence/page par terme
        ├── Checkbox par terme (obligatoires pré-cochés)
        ├── Panel IA analyse lexicale (dépliable)
        └── Bouton "Valider le Lexique" → écriture ArticleKeywords store
```

**Boundary Dashboard/Explorateur (extraction du Moteur) :**

```
ExplorateurView.vue (nouvelle vue — FR37-FR38)
├── Sélection article (optionnelle — fonctionne aussi sans)
│
├── Onglet Intention          # SERP intent — ex-Phase ② Moteur
│   ├── ExplorationInput
│   ├── IntentStep
│   └── AutocompleteValidation
│
├── Onglet Audit              # Cocon complet — ex-Phase ② Moteur
│   └── KeywordAuditTable
│
└── Onglet Local              # Local vs National + Maps — ex-Phase ② Moteur
    ├── LocalComparisonStep
    └── MapsStep
```

**Boundary Labo :**

```
LaboView.vue (orchestrateur — mode libre — FR46-FR48)
├── Champ de recherche libre (pas de sélection article ni cocon)
│
├── KeywordDiscoveryTab     mode="libre"
├── DouleurIntentScanner    mode="libre"
└── CaptainValidation       mode="libre"  # Verdict GO/NO-GO sans contexte article
    └── Seuils par défaut = "Intermédiaire" (NFR8)
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

### Data Flow — Progression automatique (5 checks)

```
┌──────────────────────┐
│ Composant sous-onglet│  emit('check-completed', 'capitaine_locked')
│ (ex: CaptainValid.)  │──────────────────────────────────────────┐
└──────────────────────┘                                          │
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
                           │ ●●●○○ (5 dots)  │     └───────────────────┘
                           └─────────────────┘

Dots mapping :
  ● discovery_done      (Phase ①)
  ● radar_done          (Phase ①)
  ● capitaine_locked    (Phase ② — Capitaine)
  ● lieutenants_locked  (Phase ② — Lieutenants)
  ● lexique_validated   (Phase ② — Lexique)
```

### Data Flow — Cascade SERP (Lieutenants → Lexique)

```
┌─────────────────────────────────────────────────┐
│ Sous-onglet Lieutenants                         │
│                                                 │
│  Bouton "Analyser SERP" ──→ POST /api/serp/analyze
│  Curseur: top [████████] 10                     │
│                                                 │
│  Réponse:                                       │
│  ├── hnData[]          → Section Hn concurrents │
│  ├── paaData[]         → Section PAA N+2        │
│  ├── groupCrossData[]  → Section Groupes croisés│
│  └── rawContents[]     → Stocké en mémoire (ref)│
└─────────────────┬───────────────────────────────┘
                  │ rawContents transmis via props/provide
                  ▼
┌─────────────────────────────────────────────────┐
│ Sous-onglet Lexique                             │
│                                                 │
│  rawContents ──→ POST /api/serp/tfidf           │
│  (ZÉRO nouveau scraping — données héritées)     │
│                                                 │
│  Réponse:                                       │
│  ├── obligatoire[]     (70%+ concurrents)       │
│  ├── differenciateur[] (30-70%)                 │
│  └── optionnel[]       (<30%)                   │
│  Chaque terme: { term, frequency, density/page }│
└─────────────────────────────────────────────────┘
```

### Requirements to Structure Mapping

| Feature PRD | Fichiers principaux impactés |
|-------------|------------------------------|
| FR1-FR5 : Moteur 2 phases | `src/views/MoteurView.vue` (restructuration), `MoteurPhaseNavigation.vue` (existant), retrait Content Gap |
| FR6-FR9 : Phase ① Générer | Composants existants (`KeywordDiscoveryTab`, `DouleurIntentScanner`, `PainTranslator`) — verrouillage conditionnel |
| FR10-FR20 : Capitaine GO/NO-GO | Nouveau `src/components/moteur/CaptainValidation.vue`, `RadarThermometer.vue` (existant), nouveau `src/composables/useKeywordScoring.ts`, nouveau `server/routes/keyword-validate.routes.ts`, nouveau `server/services/keyword-validate.service.ts` |
| FR21-FR28 : Lieutenants SERP | Nouveau `src/components/moteur/LieutenantsSelection.vue`, nouveau `server/routes/serp.routes.ts`, nouveau `server/services/serp-analysis.service.ts` |
| FR29-FR33 : Lexique TF-IDF | Nouveau `src/components/moteur/LexiqueExtraction.vue`, nouveau `server/services/tfidf.service.ts` |
| FR34-FR36 : Règles transversales | Pattern dans `MoteurView.vue` — aucune action auto, KPIs visibles, cache TTL |
| FR37-FR39 : Extraction Dashboard | `src/views/ExplorateurView.vue` (existant), migration composants `IntentStep`, `KeywordAuditTable`, `LocalComparisonStep`, `MapsStep` |
| FR40-FR43 : Dots + checks + bandeaux | `src/stores/article-progress.store.ts` (5 checks), `PhaseTransitionBanner.vue` (existant) |
| FR44-FR45 : Pont Cerveau→Moteur | `MoteurContextRecap.vue` (existant), `server/utils/prompt-loader.ts` enrichissement |
| FR46-FR48 : Labo | `src/views/LaboView.vue` + route `/labo` — composants en mode `libre` |
| FR49-FR51 : Cache & persistance | Pattern cache uniforme dans tous les services, `readJson/writeJson` |

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
| FR1-FR5 | ✅ | Restructuration MoteurView en 2 phases + MoteurPhaseNavigation |
| FR6-FR9 | ✅ | Composants existants + verrouillage conditionnel (computed) |
| FR10-FR20 | ✅ | CaptainValidation : thermomètre + 6 KPIs contextuels + feu tricolore + panel IA streaming + input alternatif + historique slider + lock/unlock + feedback NO-GO + découpage racine |
| FR21-FR28 | ✅ | LieutenantsSelection : bouton "Analyser SERP" + curseur 3-10 + Hn/PAA/Groupes + badges pertinence + sélection checkbox + panel IA Hn |
| FR29-FR33 | ✅ | LexiqueExtraction : TF-IDF données SERP héritées + 3 niveaux + densité/page + checkbox + panel IA lexical |
| FR34-FR36 | ✅ | Règles dans MoteurView : aucune action auto, KPIs visibles, cache TTL |
| FR37-FR39 | ✅ | ExplorateurView : extraction Intention/Audit/Local + checks modifiés |
| FR40-FR43 | ✅ | article-progress store (5 checks) + PhaseTransitionBanner + dots computed |
| FR44-FR45 | ✅ | MoteurContextRecap collapsable + loadPrompt enrichissement optionnel |
| FR46-FR48 | ✅ | LaboView + composants en mode "libre" (seuils défaut Intermédiaire) |
| FR49-FR51 | ✅ | Pattern cache uniforme par article par service + readJson/writeJson |

**Couverture non-fonctionnelle :**

| NFR | Couvert | Mécanisme |
|-----|---------|-----------|
| NFR1-NFR4 | ✅ | Architecture locale, pas de latence réseau |
| NFR5-NFR7 | ✅ | Pattern cache systématique + writeJson atomic |
| NFR8-NFR10 | ✅ | Prop mode dual + enrichissement optionnel + article-progress source unique |
| NFR11-NFR12 | ✅ | SERP scraping unique cascade Lieutenants→Lexique + seuils configurables transparents |
| NFR13-NFR14 | ✅ | Composants partagés via prop mode + prompts .md séparés avec pré-processing |

### Implementation Readiness ✅

**Complétude :**

- Toutes les décisions critiques documentées
- Patterns extraits du code existant — pas d'invention
- Structure projet complète et spécifique
- Mapping FR → fichiers explicite

**Gaps identifiés (aucun bloquant) :**

- `CaptainValidation.vue` — à créer (sous-onglet Capitaine complet : thermomètre + KPIs + feu tricolore + panel IA)
- `LieutenantsSelection.vue` — à créer (sous-onglet Lieutenants : SERP + badges + sélection)
- `LexiqueExtraction.vue` — à créer (sous-onglet Lexique : TF-IDF + 3 niveaux)
- `useKeywordScoring.ts` — à créer (composable scoring contextuel GO/NO-GO)
- `keyword-validate.routes.ts` + `keyword-validate.service.ts` — à créer (API verdict Capitaine)
- `serp.routes.ts` + `serp-analysis.service.ts` — à créer (API scraping SERP + extraction Hn/PAA)
- `tfidf.service.ts` — à créer (extraction TF-IDF des contenus SERP)
- `ExplorateurView.vue` — à créer (Dashboard extraction Intention/Audit/Local)
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
- Le pattern dual-mode est simple (une prop) et ne casse rien
- La cascade SERP (un scraping, deux usages) est un pattern élégant et économique
- Les seuils contextuels sont une config statique — pas de complexité runtime
- Le RadarThermometer existant est réutilisé directement dans le Capitaine
- Le verrouillage séquentiel (Capitaine → Lieutenants → Lexique) est un gating souple — la navigation reste libre

**Améliorations futures (hors scope) :**

- Batch processing multi-articles (Phase 3 PRD)
- Boucle GSC post-publication (Phase 3 PRD)
- Suggestions proactives de cocons (Phase 3 PRD)
- Score de complémentarité Capitaine ↔ Lieutenants (Phase 3 PRD)

### Implementation Handoff

**Guidelines pour les agents IA :**

1. Suivre les décisions architecturales exactement comme documentées
2. Utiliser les patterns d'implémentation de manière cohérente
3. Respecter les boundaries et la structure du projet
4. Se référer à ce document pour toute question architecturale
5. Émettre `check-completed` dans les composants Moteur en mode workflow
6. Ne jamais dupliquer un composant — utiliser la prop `mode`

**Priorité d'implémentation suggérée (alignée avec le PRD Phase 1/Phase 2) :**

**Phase 1 — MVP : Le socle Capitaine**

1. Restructuration MoteurView en 2 phases visuelles (FR1-FR5)
2. Sous-onglet Capitaine — Thermomètre + KPIs contextuels + feu tricolore GO/NO-GO (FR10-FR13)
3. Seuils contextuels par niveau article + tooltip (FR12, FR16)
4. Panel IA expert SEO en streaming (FR17)
5. Input alternatif + historique slider + lock/unlock (FR10, FR18-FR20)
6. Découpage racine longue traîne (FR15)
7. Feedback NO-GO orienté (FR19)
8. Dots de progression + checks automatiques (FR40-FR41)
9. Enrichissement prompts Cerveau→Moteur (FR44-FR45)

**Phase 2 — Growth : Lieutenants + Lexique + Dashboard**

10. Sous-onglet Lieutenants — SERP analysis + badges + sélection (FR21-FR28)
11. Curseur SERP intelligent (FR26)
12. Sous-onglet Lexique — TF-IDF + 3 niveaux (FR29-FR33)
13. Extraction Intention/Audit/Local vers ExplorateurView (FR37-FR39)
14. Bandeaux de transition (FR42-FR43)
15. Contexte stratégique collapsable (FR44)
16. Vue Labo (FR46-FR48)
