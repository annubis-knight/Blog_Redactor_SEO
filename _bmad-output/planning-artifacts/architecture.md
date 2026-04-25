---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
workflowType: 'architecture'
project_name: 'Blog Redactor SEO'
user_name: 'Utilisateur'
date: '2026-03-31'
lastStep: 8
status: 'complete'
completedAt: '2026-03-30'
lastUpdated: '2026-04-24'
updateReason: 'Mise à jour majeure reflétant l''état réel : 3 phases / 6 onglets dans Moteur (pas 2 phases / 3 sous-onglets), migration PostgreSQL complète, réorganisation stores (5 domaines) / composables (5 domaines) / services (7 domaines), ajout Finalisation, cache multi-niveau (api_cache + keyword_metrics cross-article)'
---

# Architecture Decision Document — Blog Redactor SEO

**Auteur :** Utilisateur + Claude (Architect)
**Date :** 2026-03-30 — mis à jour 2026-04-24

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements (60 FRs en 11 domaines) :**

| Domaine | FRs | Implication architecturale |
|---------|-----|--------------------------|
| Moteur — Structure 3 phases / 6 onglets | FR1-FR4 | Restructuration MoteurView en 3 phases (Explorer, Valider, Finalisation) sur 6 onglets. Content Gap, Intention, Audit, Local extraits |
| Phase ① Explorer | FR5-FR7 | Onglets Discovery + Radar toujours accessibles, émettent checks automatiques |
| Phase ② Valider — Capitaine | FR8-FR18 | `CaptainValidation.vue` : thermomètre + 6 KPIs + feu tricolore + panel IA streaming + input alternatif + historique + lock/unlock + feedback NO-GO + découpage racine |
| Phase ② Valider — Lieutenants | FR19-FR26 | `LieutenantsSelection.vue` : bouton "Analyser SERP" (curseur 3-10), 3 sections dépliables, badges multi-source, sélection + compteur, panel IA Hn |
| Phase ② Valider — Lexique | FR27-FR31 | `LexiqueExtraction.vue` : TF-IDF des contenus SERP hérités (zéro requête), 3 niveaux, checkbox pré-cochées, panel IA lexical |
| Phase ③ Finalisation | FR32-FR34 | `FinalisationRecap.vue` read-only — débloqué quand 3 checks Phase ② OK |
| Règles transversales | FR35-FR37 | Aucune action auto, KPIs visibles, cache multi-niveau |
| Dashboard & Explorateur | FR38-FR39 | `ExplorateurView` pour intent/comparaison/autocomplete, `local/` pour GBP |
| Progression + Pont Cerveau | FR40-FR45 | `articles.completed_checks` TEXT[] avec 5 checks `moteur:*`, `MoteurStrategyContext` collapsable, enrichissement prompts |
| Labo & Cache | FR46-FR52 | Composants bimodaux (workflow/libre), `api_cache` TTL + `keyword_metrics` cross-article |
| Stratégie + Rédaction | FR53-FR60 | Cerveau 6 étapes (strategy-suggest/deepen/consolidate), Brief + Outline + Article streamés SSE |

**Non-Functional Requirements (17 NFRs) :**

| Axe | NFRs | Contrainte architecturale |
|-----|------|--------------------------|
| Performance | NFR1-NFR4 | API locales < 200ms, SSE premier token < 2s, changement de vue < 500ms, cache hit > 90% |
| Coûts | NFR5-NFR7 | Zéro appel redondant (api_cache + keyword_metrics), persistance PostgreSQL, body 5MB |
| Intégration | NFR8-NFR12 | Composants bimodaux, enrichissement prompts optionnel, `completed_checks` source unique, SERP unique cascade, seuils configurables |
| Maintenabilité | NFR13-NFR17 | Pas de duplication composants, prompts .md séparés, organisation par domaine, tests Vitest + Playwright, tooling qualité |

**Scale & Complexity :**

- Domaine : Full-stack SPA (Vue 3 + Express 5 + PostgreSQL)
- Complexité : Moyenne — orchestration de workflows, multi-provider IA, cache multi-niveau
- Contexte : Brownfield mature — 100+ composants, 22 stores Pinia (5 domaines), 42 services (7 domaines), 15 vues, 24 groupes de routes, 45 prompts `.md`

### Technical Constraints & Dependencies

- **Brownfield mature** : les patterns (cache, SSE, API wrapper, progression) sont éprouvés en production
- **Stack figé** : Vue 3.5, Pinia 3, TipTap 3, Express 5.2, PostgreSQL (pg 8), Anthropic SDK, Google GenAI, Zod 4, Vitest 4, Playwright
- **Mono-utilisateur local** : pas d'auth, pas de multi-tenant, pas de cloud
- **Persistance PostgreSQL** : toutes les données chaudes — articles, keywords, cocoons, strategies, api_cache, keyword_metrics, article_explorations, completed_checks (TEXT[])
- **Prompts IA en fichiers .md** : 45 prompts dans `server/prompts/` avec `{{variable}}` injectées par `loadPrompt()`
- **Tooling qualité** : oxlint + eslint + prettier + knip + madge + husky + lint-staged

### Cross-Cutting Concerns Identified

1. **Composants bimodaux** — Prop `mode: 'workflow' | 'libre'` pour Moteur vs Labo
2. **Progression réactive** — `articles.completed_checks` TEXT[] reçoit 5 checks Moteur + 3 Cerveau + 5 Rédaction (namespace préfixé)
3. **Cache multi-niveau** — `api_cache` (TTL, clé par requête) + `keyword_metrics` (permanent, clé par mot-clé, partagé cross-article)
4. **Enrichissement prompts** — `{{strategy_context}}` injecté via `loadPrompt()`
5. **Navigation libre avec guidage** — Verrouillage = gating souple (bouton Suivant désactivé), navigation toujours libre
6. **Cascade SERP** — Scraping Lieutenants → contenus hérités → TF-IDF Lexique (zéro doublon)
7. **Seuils contextuels** — Config statique par niveau d'article (Pilier/Intermédiaire/Spécifique) dans `shared/kpi-scoring.ts`
8. **Multi-provider IA** — Claude (Anthropic), Gemini (Google GenAI), OpenRouter, Mock — sélection via `ai-provider.service.ts`

---

## Starter Template — Brownfield Assessment

Projet brownfield mature. Aucun starter template. Le stack est en place.

**Stack actuelle vérifiée :**

| Technologie | Version | Rôle |
|-------------|---------|------|
| Vue | 3.5.29 | Framework frontend |
| Vue Router | 5.0.3 | Routing SPA |
| Pinia | 3.0.4 | State management |
| TipTap Core | 3.22.3 | Éditeur rich-text |
| TipTap extensions | 3.20.1 (link, placeholder, starter-kit, vue-3) | Éditeur |
| Express | 5.2.1 | Serveur API |
| PostgreSQL (pg) | 8.20.0 | Base de données |
| TypeScript | 5.9.3 | Typage |
| Vite | 7.3.1 | Build & dev server |
| Vitest | 4.0.18 | Tests unitaires |
| Playwright | 1.59.1 | Tests navigateur |
| Zod | 4.3.6 | Validation schemas |
| Anthropic SDK | 0.78.0 | Claude API |
| Google GenAI | 1.50.1 | Gemini API |
| HuggingFace Transformers | 3.8.1 | Embeddings NLP |
| VueUse | 14.2.1 | Composables utilitaires |
| Marked | 17.0.5 | Markdown parsing |
| DOMPurify | 3.3.3 | Sanitization HTML |
| Chalk | 5.6.2 | Logs colorés |

**Tooling :**

| Outil | Usage |
|-------|-------|
| oxlint + ESLint | Linting (fix auto via lint-staged) |
| Prettier | Formatage |
| concurrently | Dev server front + back (`npm run dev`) |
| tsx | Exécution TypeScript backend (`--import=tsx/esm --watch`) |
| vue-tsc | Type-checking |
| knip | Détection de code mort (`npm run check:dead`) |
| madge | Détection de cycles (`npm run check:cycles`) |
| husky + lint-staged | Pre-commit hook |

**Commande de dev :**

```bash
npm run dev  # concurrently: vite (front) + node --watch server/index.ts (back)
```

---

## Core Architectural Decisions

### Decision Priority Analysis

**Décisions critiques (livrées) :**

1. ✅ Restructuration MoteurView en 3 phases (Explorer / Valider / Finalisation) sur 6 onglets
2. ✅ Architecture du verdict GO/NO-GO : scoring contextuel par niveau article, feu tricolore, seuils transparents (`shared/kpi-scoring.ts`)
3. ✅ Cascade SERP : scraping Lieutenants alimente TF-IDF Lexique
4. ✅ Pattern bimodal (prop `mode`)
5. ✅ Système de progression via `articles.completed_checks` TEXT[] (5 checks Moteur)
6. ✅ Migration PostgreSQL complète (ex-fichiers JSON archivés dans `data/_archive/`)
7. ✅ Enrichissement prompts (Pont Cerveau→Moteur)
8. ✅ Cache multi-niveau : `api_cache` (TTL) + `keyword_metrics` (permanent cross-article)
9. ✅ Extraction Intention/Audit/Local vers Dashboard et Explorateur
10. ✅ Labo (`/labo`) avec composants en mode `libre`

**Décisions différées (vision) :**

11. Batch processing multi-articles
12. Boucle GSC post-publication (store présent, usage à étendre)
13. Score de complémentarité Capitaine ↔ Lieutenants
14. Suggestions proactives de cocons

### Data Architecture

**Stockage : PostgreSQL (pg 8.20)**

- Connexion via `server/db/client.ts` (pool exporté)
- Health check au démarrage (`pool.query('SELECT 1')`)
- Purge horaire : `DELETE FROM api_cache WHERE expires_at < NOW()`
- Backup : `_backup_pg_20260418.sql` en racine

**Tables principales (inférées via services/routes) :**

| Table | Rôle |
|-------|------|
| `articles` | Articles (id, slug, title, type, cocoon_id, completed_checks TEXT[], …) |
| `cocoons` | Cocons (id, name, silo_id, …) |
| `silos` | Silos |
| `keywords` | Mots-clés assignés aux articles (capitaine / lieutenants / lexique) |
| `keyword_metrics` | Métriques mot-clé partagées cross-article (volume, KD, CPC, PAA) |
| `api_cache` | Cache générique TTL (clé = hash de requête, expires_at) |
| `discovery_cache` | Cache Discovery par seed |
| `radar_cache` | Cache Radar |
| `paa_cache` | Cache PAA |
| `article_explorations` | Explorations par article (radar, lexique) |
| `strategies` | Stratégies Cerveau (cible, douleur, aiguillage, angle, promesse, CTA) |
| `theme_config` | Configuration thème global |
| `local_entities` | Entités locales |
| `links` | Liens internes inter-articles |
| `article_micro_context` | Micro-contexte par article |

**Zéro fichier JSON en chaud.** `data/_archive/` conserve les anciens fichiers (articles, autocomplete cache, BDD_*.json, strategies/*.json) pour référence.

**Stratégie de cache :**

Pattern uniforme via `server/services/infra/*-cache.service.ts` (`discovery-cache`, `paa-cache`, `radar-cache`) et `server/utils/json-storage.ts` côté disque (legacy). Pattern type :

```typescript
async function getOrFetch<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = await readFromApiCache(cacheKey)
  if (cached && !isExpired(cached)) return cached.value
  const result = await fetcher()
  await writeToApiCache(cacheKey, result, ttl)
  return result
}
```

Pour les métriques mot-clé : consultation `keyword_metrics` AVANT DataForSEO (`keyword-metrics.service.ts`).

### Authentication & Security

**Pas d'authentification applicative** — app locale mono-utilisateur.

- CORS restrictif : regex `/^http:\/\/localhost(:\d+)?$/` uniquement
- Pas de tokens/sessions/auth middleware
- Clés API (Anthropic, Google GenAI, OpenRouter, DataForSEO) : fichier `.env`
- Connexion DB via `DATABASE_URL` dans `.env`
- Express body limit : 5MB
- GSC : OAuth2 flow via `/api/gsc/auth` et `/api/gsc/callback`

### API & Communication

**REST API :**

- Prefix : `/api/`
- Format succès : `{ data: T }`
- Format erreur : `{ error: { code: string, message: string } }`
- Streaming : SSE pour génération (outline, article, reduce-section, AI panels)
- Proxy Vite : `/api` → `http://localhost:3005`

**Wrapper frontend :**

- `apiGet<T>`, `apiPost<T>`, `apiPut<T>`, `apiDelete<T>` dans `src/services/api.service.ts`
- Décode `json.data` — le type `T` est le contenu du champ `data`
- Log automatique des erreurs

**Routes enregistrées (`server/index.ts`) — 24 modules :**

| Module | Préfixe monté | Fonction |
|--------|--------------|----------|
| cocoons.routes | `/api` | CRUD cocons |
| keywords.routes | `/api` | Keywords (discover, audit, suggest-lexique…) |
| articles.routes | `/api` | Articles (CRUD, status, micro-context, progress) |
| dataforseo.routes | `/api/dataforseo` | DataForSEO (brief, cost-status) |
| generate.routes | `/api` | Génération SSE (outline, article, reduce-section, meta) |
| links.routes | `/api` | Matrice liens internes |
| export.routes | `/api` | Export HTML |
| intent.routes | `/api` | Analyse d'intention |
| local.routes | `/api` | Local (maps, score, entities) |
| content-gap.routes | `/api` | Content gap |
| gsc.routes | `/api` | Google Search Console |
| silos.routes | `/api` | Silos + thème |
| strategy.routes | `/api` | Stratégie (Cerveau : suggest/deepen/consolidate) |
| intent-scan.routes | `/api` | Scan Douleur Intent (radar) |
| discovery-cache.routes | `/api` | Cache Discovery |
| radar-cache.routes | `/api` | Cache Radar |
| radar-exploration.routes | `/api` | Exploration Radar |
| article-explorations.routes | `/api` | Explorations par article |
| keyword-queries.routes | `/api` | Usage/metrics d'un mot-clé |
| keyword-validate.routes | `/api` | Verdict GO/NO-GO Capitaine |
| keyword-ai-panel.routes | `/api` | Panels IA (Capitaine, Hn structure, propose lieutenants) |
| serp-analysis.routes | `/api/serp` | Scraping SERP + TF-IDF |
| paa.routes | `/api/paa` | PAA batch |

### Phase ② Valider — Architecture du verdict GO/NO-GO

**Workflow séquentiel en 3 onglets avec verrouillage progressif (gating souple).**

```
Phase ② Valider
├── Onglet Capitaine (CaptainValidation.vue)
│   ├── Input : mot-clé pré-rempli (Cerveau ou Phase ①) + input alternatif + historique slider (CaptainInput, CaptainCarousel)
│   ├── Requêtes parallèles : keyword-validate.service → DataForSEO + Autocomplete + PAA + (racine si longue traîne)
│   ├── Scoring : 6 KPIs contextuels (shared/kpi-scoring.ts) selon niveau article
│   ├── Verdict : feu tricolore GO/ORANGE/NO-GO (VerdictBar) + CaptainVerdictPanel
│   ├── IA : CaptainAiPanel (streaming SSE via /api/keywords/:kw/ai-panel, prompt capitaine-ai-panel.md)
│   ├── Actions : forcer GO, saisir alternatif, CaptainLockPanel ("Valider ce Capitaine")
│   └── Émet : moteur:capitaine_locked
│
├── Onglet Lieutenants (LieutenantsSelection.vue)
│   ├── Prérequis : capitaine_locked (gating souple)
│   ├── Bouton "Analyser SERP" → POST /api/serp/analyze (serp-analysis.service)
│   ├── 3 sections dépliables : LieutenantH2Structure + PAA N+2 + Groupes croisés
│   ├── Candidats (LieutenantCard, LieutenantProposals) avec badges [SERP] [PAA] [Groupe]
│   ├── Sélection checkbox + compteur recommandé selon niveau
│   ├── Panel IA : LieutenantSerpAnalysis + prompts propose-lieutenants.md / lieutenants-hn-structure.md
│   └── Émet : moteur:lieutenants_locked
│
└── Onglet Lexique (LexiqueExtraction.vue)
    ├── Prérequis : lieutenants_locked (gating souple)
    ├── Données : TF-IDF des contenus SERP DÉJÀ scrapés (tfidf.service) — ZÉRO nouvelle requête
    ├── 3 niveaux : Obligatoire (70%+) / Différenciateur (30-70%) / Optionnel (<30%)
    ├── Densité récurrence/page
    ├── Checkbox par terme (obligatoires pré-cochés)
    ├── Panel IA : lexique-ai-panel.md / lexique-analysis-upfront.md
    └── Émet : moteur:lexique_validated → écriture finale ArticleKeywords (capitaine + lieutenants + lexique)
```

**Scoring contextuel du Capitaine (6 KPIs)** — `shared/kpi-scoring.ts` + `shared/scoring.ts` :

```typescript
interface ThresholdConfig {
  volume: { green: number; orange: number }
  kd: { green: number; orange: number }       // inversé — bas = bon
  cpc: { bonus: number }                      // asymétrique — jamais rouge
  paa: { green: number; orange: number }
  intent: 'match' | 'mixed' | 'contradiction'
  autocomplete: { green: number }
}
```

**Règle CPC asymétrique :** CPC > 2€ = bonus vert, CPC 0-2€ = neutre, jamais rouge.
**NO-GO automatique** si `volume === 0 && paa === 0 && autocomplete === 0`.

**Cascade SERP (Lieutenants → Lexique) :**

```
Bouton "Analyser SERP" (LieutenantsSelection)
    │
    ▼  POST /api/serp/analyze (serp-analysis.service)
Scraping top N résultats (curseur 3-10, défaut 10, DataForSEO)
    │
    ├──→ hnData[] → LieutenantH2Structure
    ├──→ paaData[] → PAA N+2
    ├──→ groupCrossData[] → Groupes croisés
    │
    └──→ rawContents[] stockés (api_cache + article_explorations)
              │
              ▼  POST /api/serp/tfidf (tfidf.service) — pas de re-scraping
         LexiqueExtraction
              ├──→ obligatoire[] (70%+ concurrents)
              ├──→ differenciateur[] (30-70%)
              └──→ optionnel[] (<30%)
```

### Frontend Architecture

**State management : Pinia (composition API)**

Pattern :

```typescript
export const useXxxStore = defineStore('xxx', () => {
  const data = ref<T>(initialValue)
  const isLoading = ref(false)
  async function fetchData() { /* ... */ }
  return { data, isLoading, fetchData }
})
```

**Stores organisés par domaine (5 sous-dossiers dans `src/stores/`) :**

| Domaine | Stores |
|---------|--------|
| `article/` | articles, editor, moteur-basket, outline, seo, article-keywords, article-progress, geo |
| `keyword/` | keywords, keyword-discovery, keyword-audit, intent, linking |
| `strategy/` | silos, cocoons, cocoon-strategy, strategy, brief, theme-config |
| `external/` | gsc, local |
| `ui/` | notification, cost-log, captain-trigger, workflow-nav |

**Composables organisés par domaine (5 sous-dossiers dans `src/composables/`) :**

| Domaine | Composables |
|---------|-------------|
| `keyword/` | useKeywordDiscoveryTab, useCapitaineValidation, useDiscoveryCache, useDiscoverySelection, useOpportunityScore, useAlignmentScore, useKeywordScoring, useRelevanceScoring, useResonanceScore, useRadarCarousel |
| `intent/` | useIntentVerdict, usePainVerdict, useMultiSourceVerdict, useNlpAnalysis |
| `editor/` | useContextualActions, useAutoSave, useArticleProposals, useStreaming, useArticleResults |
| `seo/` | useCompositionCheck, useCannibalization, useGeoScoring, useInternalLinking, useSeoScoring |
| `ui/` | useKeyboardShortcuts, usePanelToggle, useRecapRadioGroup, useResizablePanel, useVerdictColors, useNotify |

**Composants organisés par feature/domaine** (`src/components/moteur/`, `intent/`, `keywords/`, `editor/`, `outline/`, `brief/`, `panels/`, `linking/`, `dashboard/`, `strategy/`, `production/`, `actions/`, `export/`, `local/`, `workflow/`, `article/`, `shared/`).

**Routing : Vue Router 5 avec lazy loading** (sauf Dashboard chargé immédiatement, et NotFoundView importé statiquement).

**Routes actuelles :**

```
/                              → DashboardView (eager)
/config                        → ThemeConfigView
/silo/:siloId                  → SiloDetailView
/cocoon/:cocoonId              → CocoonLandingView
/cocoon/:cocoonId/cerveau      → CerveauView
/cocoon/:cocoonId/moteur       → MoteurView
/cocoon/:cocoonId/redaction    → RedactionView
/cocoon/:cocoonId/article/:id  → ArticleWorkflowView
/article/:articleId/editor     → ArticleEditorView
/article/:articleId/preview    → ArticlePreviewView (hideNavbar: true)
/labo                          → LaboView
/explorateur                   → ExplorateurView
/linking                       → LinkingMatrixView
/post-publication              → PostPublicationView
/:pathMatch(.*)*               → NotFoundView
```

**Redirects legacy** : `/theme/:themeId/*` → `/cocoon/:cocoonId/*`.

**Router guards :**
- `beforeEach` : rejette params vides/whitespace vers not-found
- `afterEach` : logs navigation
- `onError` : gère les chunk loading errors (reload avec compteur sessionStorage)

### Backend Services — Organisation

**Services organisés par domaine (7 sous-dossiers dans `server/services/`) :**

| Domaine | Services |
|---------|----------|
| `keyword/` | autocomplete, keyword-assignment, keyword-discovery, keyword-discovery-db, keyword-metrics, keyword-radar, keyword-validate, lexique-exploration, suggest, tfidf, word-groups |
| `external/` | ai-provider, claude, dataforseo, dataforseo-cost-guard, embedding, gemini, gsc, mock (+ mock-fixtures), openrouter, serp-analysis |
| `intent/` | community-discussions, intent, intent-scan, keyword-intent-analysis |
| `article/` | article-content, content-gap, export, linking, target-word-count |
| `strategy/` | cocoon-strategy, local-seo, strategy, theme-config |
| `infra/` | data, discovery-cache, paa-cache, radar-cache, radar-exploration, local-entities |
| `queries/` | keyword-queries |

**Multi-provider IA** : `ai-provider.service.ts` orchestre Claude / Gemini / OpenRouter / Mock (selon env vars). Mock utilisé en dev/tests.

### Infrastructure & Deployment

- **Local only** : `npm run dev` lance front + back en parallèle via concurrently
- **Pas de CI/CD cloud** : projet solo
- **Pas de Docker** : Node.js direct (engines : `^20.19.0 || >=22.12.0`)
- **PostgreSQL** : instance locale, pool partagé via `server/db/client.ts`
- **Tests navigateur** : Playwright (`test:browser`, `test:browser:ui`)
- **Pre-commit hook** : husky + lint-staged (oxlint + eslint)
- **Pas de monitoring** : logs console via `chalk` (`server/utils/logger.ts`)
- **Build** : `npm run build` (type-check + vite build)

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Fichiers :**

| Type | Convention | Exemple |
|------|-----------|---------|
| Vue components | PascalCase | `CaptainValidation.vue` |
| Stores | kebab-case + `.store.ts` | `article-progress.store.ts` |
| Services backend | kebab-case + `.service.ts` | `keyword-validate.service.ts` |
| Routes backend | kebab-case + `.routes.ts` | `serp-analysis.routes.ts` |
| Composables | camelCase + `use` prefix | `useKeywordScoring.ts` |
| Types | kebab-case + `.types.ts` | `article-progress.types.ts` |
| Schemas | kebab-case + `.schema.ts` | `article-progress.schema.ts` |
| Prompts | kebab-case + `.md` | `capitaine-ai-panel.md` |
| Tests | miroir source + `.test.ts` | `tests/unit/stores/article-progress.store.test.ts` |

**Code :**

| Contexte | Convention |
|----------|-----------|
| Variables / fonctions | camelCase |
| Types / Interfaces | PascalCase |
| Constantes | UPPER_SNAKE_CASE |
| Props Vue | camelCase |
| Events Vue | kebab-case |
| API endpoints | kebab-case pluriel |
| JSON fields | camelCase |
| Workflow checks | `workflow:snake_case` (ex: `moteur:capitaine_locked`) |

### Structure Patterns

**Organisation par domaine** — stores, composables, services regroupés par domaine métier (non par type technique).

**Tests miroir** dans `tests/unit/` :

```
tests/unit/
├── components/
├── composables/
├── routes/
├── services/
├── stores/
└── utils/
```

Tests navigateur Playwright dans `tests/browser/` (ou équivalent selon `test:browser` script).

### Format Patterns

**API Response wrapper :**

```typescript
// Succès
res.json({ data: result })
// Erreur (via errorHandler)
res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid id' } })
```

**SSE Streaming :**

```
event: chunk\ndata: {"text": "..."}\n\n
event: section_start\ndata: {"title": "..."}\n\n
event: section_done\ndata: {"title": "..."}\n\n
event: usage\ndata: {"inputTokens": ..., "outputTokens": ..., "cost": ...}\n\n
event: done\ndata: {"result": ...}\n\n
event: error\ndata: {"message": "..."}\n\n
```

### Communication Patterns — Composants bimodaux

**Prop `mode` sur chaque composant réutilisable :**

```typescript
interface DualModeProps {
  mode: 'workflow' | 'libre'
  articleId?: string     // requis en 'workflow' (ex-slug, migration id)
  cocoonId?: string      // requis en 'workflow'
  keywordQuery?: string  // point d'entrée en 'libre'
}
```

**Règles :**
1. Mode `workflow` : `articleId` sert à charger/sauvegarder cache + mettre à jour la progression
2. Mode `libre` : `keywordQuery` comme clé, pas de persistance, pas de progression
3. Le composant ne sait pas dans quelle vue il est — la vue parente passe le mode
4. Pas de `if (mode === 'workflow')` dans la logique métier — callbacks injectés

### Communication Patterns — Progression

**`articles.completed_checks` TEXT[] = source unique de vérité (NFR10).**

```typescript
// Composant Moteur
const emit = defineEmits<{ 'check-completed': [checkName: string] }>()
emit('check-completed', MOTEUR_CAPITAINE_LOCKED)

// MoteurView
async function onCheckCompleted(check: string) {
  const id = selectedArticle.value?.id
  if (!id) return
  await articleProgressStore.addCheck(id, check)
}
```

**Checks standardisés (préfixés par workflow) — `shared/constants/workflow-checks.constants.ts` :**

| Workflow | Checks |
|----------|--------|
| Moteur (5) | `moteur:discovery_done`, `moteur:radar_done`, `moteur:capitaine_locked`, `moteur:lieutenants_locked`, `moteur:lexique_validated` |
| Cerveau (3) | `cerveau:strategy_defined`, `cerveau:hierarchy_built`, `cerveau:articles_proposed` |
| Rédaction (5) | `redaction:brief_validated`, `redaction:outline_validated`, `redaction:content_written`, `redaction:seo_validated`, `redaction:published` |

**Règle d'or** : toujours passer par la constante, jamais hardcoder la string.

### Process Patterns

**Error handling :**

```typescript
// Backend : middleware global
app.use(errorHandler)

// Frontend : try/catch par action, log via log.warn/log.error
// Pas de toast global — composants gèrent localement, sauf notification.store pour notifs globales
```

**Loading states :**

```typescript
const isLoading = ref(false)
async function fetchData() {
  isLoading.value = true
  try { /* ... */ }
  finally { isLoading.value = false }
}
```

### Enforcement Guidelines

**Règles obligatoires :**

1. Utiliser `apiGet/apiPost/apiPut/apiDelete` côté frontend — jamais `fetch()` direct
2. Envelopper les réponses backend dans `{ data: T }` — jamais JSON brut
3. Utiliser `defineStore('name', () => { ... })` (composition API) — jamais options API
4. Placer les tests dans `tests/unit/` en miroir — jamais co-localisés
5. Utiliser `log.debug/info/warn/error` (`server/utils/logger.ts` ou `src/utils/logger.ts`) — jamais `console.log`
6. Utiliser `loadPrompt()` pour les prompts IA — jamais de strings inline
7. Passer par le pool `pg` (`server/db/client.ts`) pour PostgreSQL — jamais de nouvelle connexion
8. Utiliser les constantes `MOTEUR_*` / `CERVEAU_*` / `REDACTION_*` pour les checks — jamais de string hardcodée
9. Émettre `check-completed` dans les composants Moteur en mode workflow
10. Importer depuis les sous-dossiers par domaine : `@/stores/article/...`, `@/composables/seo/...`, `@/services/keyword/...`

**Anti-patterns à éviter :**

- Réintroduire des fichiers JSON de données chaudes (tout doit être en PostgreSQL ou cache)
- Appeler une API externe sans vérifier `api_cache` / `keyword_metrics` d'abord
- Dupliquer un composant entre Moteur et Labo au lieu d'utiliser la prop `mode`
- Bloquer la navigation (gating dur) au lieu d'un message inline
- Modifier un `.md` de prompt au lieu de pré-processer en amont via `loadPrompt()`
- Lancer un scraping SERP dans l'onglet Lexique — les données DOIVENT venir du scraping Lieutenants
- Faire toucher le verdict GO/NO-GO par le panel IA — l'IA conseille, ne juge JAMAIS
- Action automatique au changement d'onglet — l'utilisateur clique toujours
- Hardcoder les seuils au lieu de `shared/kpi-scoring.ts` / `shared/scoring.ts`
- Ajouter un nouveau check sans l'enregistrer dans `workflow-checks.constants.ts`

---

## Project Structure & Boundaries

### Structure du projet (état réel)

```
Blog_Redactor_SEO_rebirth/
├── .env                          # Clés API + DATABASE_URL
├── .env.example                  # Template
├── package.json                  # Dépendances & scripts
├── vite.config.ts
├── tsconfig.json
├── _backup_pg_20260418.sql       # Backup PostgreSQL
├── ARCHITECTURE_FLOWS.md         # Diagrammes Mermaid
│
├── data/                         # Archives seulement (plus de données chaudes)
│   └── _archive/                 # JSON historiques (articles, BDD_*, strategies/, cache autocomplete)
│
├── scripts/                      # Scripts de migration et maintenance
│   └── migrate-slug-to-id.ts     # Migration slug → id
│
├── server/                       # Backend Express 5
│   ├── index.ts                  # Point d'entrée : middleware + 24 modules de routes + health PG + purge cache
│   ├── db/
│   │   └── client.ts             # Pool PostgreSQL partagé
│   ├── routes/                   # 23 fichiers de routes (+ index.ts monte 24 modules)
│   │   ├── articles.routes.ts
│   │   ├── article-explorations.routes.ts
│   │   ├── cocoons.routes.ts
│   │   ├── content-gap.routes.ts
│   │   ├── dataforseo.routes.ts
│   │   ├── discovery-cache.routes.ts
│   │   ├── export.routes.ts
│   │   ├── generate.routes.ts
│   │   ├── gsc.routes.ts
│   │   ├── intent.routes.ts
│   │   ├── intent-scan.routes.ts
│   │   ├── keyword-ai-panel.routes.ts
│   │   ├── keyword-queries.routes.ts
│   │   ├── keyword-validate.routes.ts
│   │   ├── keywords.routes.ts
│   │   ├── links.routes.ts
│   │   ├── local.routes.ts
│   │   ├── paa.routes.ts
│   │   ├── radar-cache.routes.ts
│   │   ├── radar-exploration.routes.ts
│   │   ├── serp-analysis.routes.ts
│   │   ├── silos.routes.ts
│   │   └── strategy.routes.ts
│   ├── services/                 # 42 services en 7 domaines
│   │   ├── keyword/              # autocomplete, keyword-assignment, keyword-discovery, keyword-discovery-db, keyword-metrics, keyword-radar, keyword-validate, lexique-exploration, suggest, tfidf, word-groups
│   │   ├── external/             # ai-provider, claude, dataforseo, dataforseo-cost-guard, embedding, gemini, gsc, mock (+ mock-fixtures/), openrouter, serp-analysis
│   │   ├── intent/               # community-discussions, intent, intent-scan, keyword-intent-analysis
│   │   ├── article/              # article-content, content-gap, export, linking, target-word-count
│   │   ├── strategy/             # cocoon-strategy, local-seo, strategy, theme-config
│   │   ├── infra/                # data, discovery-cache, paa-cache, radar-cache, radar-exploration, local-entities
│   │   └── queries/              # keyword-queries
│   ├── prompts/                  # 45 prompts .md
│   │   ├── generate-outline.md, generate-article.md, generate-article-section.md, generate-meta.md, generate-reduce-section.md
│   │   ├── strategy-suggest.md, strategy-deepen.md, strategy-consolidate.md, strategy-merge.md, strategy-enrich.md
│   │   ├── cocoon-brainstorm.md, cocoon-paa-queries.md, cocoon-articles.md, cocoon-articles-topics.md, cocoon-articles-spe.md, cocoon-add-article.md
│   │   ├── intent-keywords.md, intent-scan.md
│   │   ├── capitaine-ai-panel.md, lexique-ai-panel.md, brief-ia-panel.md
│   │   ├── pain-translate.md, theme-parse.md, humanize-section.md, micro-context-suggest.md
│   │   ├── propose-lieutenants.md, lieutenants-hn-structure.md
│   │   ├── lexique-suggest.md, lexique-analysis-upfront.md, lexique-exploration-upfront.md
│   │   ├── system-propulsite.md
│   │   └── actions/              # reformulate, simplify, convert-list, pme-example, keyword-optimize, add-statistic, answer-capsule, question-heading, localize, sources-chiffrees, exemples-reels, ce-quil-faut-retenir
│   └── utils/
│       ├── error-handler.ts      # Middleware d'erreur global
│       ├── json-storage.ts       # Legacy (archives uniquement)
│       ├── logger.ts             # Logs colorés (chalk)
│       └── prompt-loader.ts      # loadPrompt() avec variables {{...}}
│
├── shared/                       # Types, schemas, constantes partagés
│   ├── types/                    # 20+ types (barrel : index.ts)
│   │   ├── article, keyword, geo, cocoon, silo, keyword-audit, keyword-discovery, keyword-validate
│   │   ├── content-gap, serp-analysis, intent, discovery-cache, outline, linking, brief
│   │   ├── article-progress, action, article-micro-context, strategy, local, api, gsc, discovery-tab, composition
│   ├── schemas/                  # 15+ Zod schemas (barrel : index.ts)
│   │   ├── article, keyword, generate, serp-analysis, strategy, discovery-cache
│   │   ├── article-keywords, article-progress, linking, article-micro-context, theme-config
│   │   ├── local-entities, dataforseo, shared-enums
│   ├── constants/
│   │   ├── geo.constants.ts
│   │   ├── seo.constants.ts
│   │   └── workflow-checks.constants.ts    # MOTEUR_*, CERVEAU_*, REDACTION_* + ALL_WORKFLOW_CHECKS
│   ├── html-utils.ts
│   ├── kpi-scoring.ts            # Seuils contextuels par niveau d'article
│   ├── scoring.ts                # Calcul des scores
│   ├── composition-rules.ts
│   └── composition-dictionaries.ts
│
├── src/                          # Frontend Vue 3
│   ├── App.vue                   # Layout racine (navbar + router-view)
│   ├── main.ts
│   ├── router/index.ts           # 14 routes + legacy redirects + 404
│   ├── assets/
│   │   └── styles/
│   ├── services/
│   │   └── api.service.ts        # apiGet/apiPost/apiPut/apiDelete
│   ├── stores/                   # 22 stores en 5 domaines
│   │   ├── article/              # articles, editor, moteur-basket, outline, seo, article-keywords, article-progress, geo
│   │   ├── keyword/              # keywords, keyword-discovery, keyword-audit, intent, linking
│   │   ├── strategy/             # silos, cocoons, cocoon-strategy, strategy, brief, theme-config
│   │   ├── external/             # gsc, local
│   │   └── ui/                   # notification, cost-log, captain-trigger, workflow-nav
│   ├── composables/              # 30+ composables en 5 domaines
│   │   ├── keyword/, intent/, editor/, seo/, ui/
│   ├── components/               # 100+ composants en 17 dossiers
│   │   ├── moteur/               # CaptainValidation, LieutenantsSelection, LexiqueExtraction, CaptainAiPanel, CaptainCarousel, CaptainInput, CaptainVerdictPanel, LieutenantCard, LieutenantProposals, LieutenantSerpAnalysis, LieutenantH2Structure, MoteurContextRecap, MoteurStrategyContext, KeywordDiscoveryTab, DouleurIntentScanner, FinalisationRecap, SelectedArticlePanel, BasketStrip, TabCachePanel, PhaseTransitionBanner, ProgressDots, UnlockLieutenantsModal, VerdictBar, CaptainInteractiveWords, CaptainLockPanel
│   │   ├── intent/               # VerdictBadge, ConfidenceBar, SourceDots, LatentAlert, ValidationSummary, SourceBlock, DiscussionList, AutocompleteChips, ValidationRow, RadarCardCheckable, PainVerdict, PainTranslator, NlpOptinBanner, RowDetail
│   │   ├── keywords/             # KeywordAlertBadge, KeywordLevelBadge, KeywordMigrationPreview
│   │   ├── brief/                # KeywordList, DataForSeoPanel, ContentRecommendation
│   │   ├── editor/               # EditorToolbar, EditorBubbleMenu, ArticleEditor (TipTap)
│   │   ├── outline/              # OutlineDisplay, OutlineEditor, OutlineNode
│   │   ├── article/              # ArticleMetaDisplay, ArticleStreamDisplay, ArticleActions, OutlineRecap
│   │   ├── panels/               # ParagraphAlerts, JargonAlerts, KeywordListPanel, NlpTerms, SerpDataTab, ResizablePanel, BlocksPanel, indicators/, geo/
│   │   ├── linking/              # AnchorDiversityPanel, CrossCocoonPanel, LinkingMatrix, LinkSuggestions, OrphanDetector
│   │   ├── dashboard/            # CocoonCard, ArticleList, WorkflowChoice, ArticleCard
│   │   ├── strategy/             # SubQuestionCard, StrategyStep, ContextRecap, ProposedArticleRow
│   │   ├── production/           # GenerationStepper, TopicSuggestions, AddArticleMenu, ArticleColumn
│   │   ├── actions/              # ArticlePicker, ActionResult, ActionMenu
│   │   ├── local/, export/, workflow/
│   │   └── shared/               # StatusBadge, KeywordBadge, ScoreGauge, ProgressBar, LoadingSpinner, ApiCostBadge, CollapsableSection, Breadcrumb, ErrorMessage, ErrorBoundary, AsyncContent, SkeletonLoader, KpiRow, KpiItem, RadarThermometer, RecapToggle, BasketFloatingPanel, WorkflowNav, icons/
│   ├── utils/
│   │   └── logger.ts
│   └── views/                    # 15 vues
│       ├── DashboardView.vue (eager)
│       ├── NotFoundView.vue (eager)
│       ├── ThemeConfigView, SiloDetailView
│       ├── CocoonLandingView, CerveauView, MoteurView, RedactionView
│       ├── ArticleWorkflowView, ArticleEditorView, ArticlePreviewView
│       ├── LaboView, ExplorateurView
│       ├── LinkingMatrixView, PostPublicationView
│
└── tests/                        # Vitest unit + Playwright browser
    └── unit/
        ├── components/, composables/, routes/, services/, stores/, utils/
```

### Architectural Boundaries

**Boundary frontend/backend :**

```
[Vue App] ──fetch──→ [Vite Proxy /api] ──→ [Express :3005]
                                               │
                            ┌──────────────────┼────────────────────┐
                            ▼                  ▼                    ▼
                   [PostgreSQL :5432]  [APIs externes]         [Mock Provider]
                                           │                   (tests/dev)
                                           ├─ Anthropic Claude
                                           ├─ Google GenAI
                                           ├─ OpenRouter
                                           ├─ DataForSEO
                                           ├─ Google Autocomplete
                                           └─ Google Search Console
```

- Le frontend ne touche JAMAIS au filesystem ni à PostgreSQL — toujours via API
- Le backend ne sert JAMAIS de HTML — uniquement JSON et SSE
- Les types/schemas partagés dans `shared/` sont la seule dépendance commune

**Boundary composants du Moteur :**

```
MoteurView.vue (orchestrateur, 6 onglets)
├── SelectedArticlePanel          # Sélection article (obligatoire pour workflow)
├── MoteurContextRecap            # Résumé général du contexte
├── MoteurStrategyContext         # Stratégie Cerveau (collapsable) — FR44
├── BasketStrip                   # Sélection de mots-clés candidats
├── BasketFloatingPanel           # Panel flottant du basket
├── TabCachePanel                 # État du cache par onglet
│
├── Phase ① Explorer
│   ├── KeywordDiscoveryTab       # Discovery IA (FR5) — émet moteur:discovery_done
│   └── DouleurIntentScanner      # Radar Douleur Intent (FR6) — émet moteur:radar_done
│
├── Phase ② Valider (3 onglets séquentiels)
│   ├── CaptainValidation         # Capitaine (FR8-FR18)
│   │   ├── CaptainInput + CaptainCarousel (input alternatif + historique)
│   │   ├── RadarThermometer (shared) + VerdictBar (feu tricolore)
│   │   ├── CaptainVerdictPanel (KPIs détaillés)
│   │   ├── CaptainInteractiveWords (découpage racine longue traîne)
│   │   ├── CaptainAiPanel (streaming SSE, ne touche pas au verdict)
│   │   └── CaptainLockPanel ("Valider ce Capitaine" + lock/unlock) → émet moteur:capitaine_locked
│   │
│   ├── LieutenantsSelection      # Lieutenants (FR19-FR26)
│   │   ├── En-tête : Capitaine verrouillé + niveau article
│   │   ├── Bouton "Analyser SERP" (curseur 3-10)
│   │   ├── LieutenantSerpAnalysis (sections dépliables : Hn, PAA, Groupes)
│   │   ├── LieutenantH2Structure (structure recommandée)
│   │   ├── LieutenantProposals + LieutenantCard (badges [SERP] [PAA] [Groupe])
│   │   ├── UnlockLieutenantsModal (confirmation d'édition après lock)
│   │   └── "Valider les Lieutenants" → émet moteur:lieutenants_locked
│   │
│   └── LexiqueExtraction         # Lexique (FR27-FR31)
│       ├── TF-IDF des données SERP héritées (ZÉRO requête)
│       ├── 3 niveaux : Obligatoire / Différenciateur / Optionnel
│       ├── Densité récurrence/page
│       ├── Checkbox par terme (obligatoires pré-cochés)
│       └── "Valider le Lexique" → émet moteur:lexique_validated → écriture ArticleKeywords
│
├── Phase ③ Finalisation
│   └── FinalisationRecap         # Read-only, récap des 3 verrouillages (FR32-FR34)
│
└── PhaseTransitionBanner         # Bandeau suggestion (FR42-FR43)
```

**Boundary Explorateur (hors Moteur) :**

```
ExplorateurView.vue (FR38-FR39)
├── Analyse d'intention SERP
├── Comparaison local/national
└── Autocomplete / signaux Local (via composants local/)
```

**Boundary Labo :**

```
LaboView.vue (mode libre — FR46-FR48)
├── Champ de recherche libre (pas de sélection article ni cocon)
├── KeywordDiscoveryTab    mode="libre"
├── DouleurIntentScanner   mode="libre"
└── CaptainValidation      mode="libre"   # Seuils par défaut = Intermédiaire (NFR8)
```

### Data Flow — Enrichissement prompts IA (Pont Cerveau→Moteur)

```
┌──────────────────┐     ┌─────────────────────────┐
│ Strategy en DB   │     │ Prompt .md template     │
│ (table strategies│     │ (server/prompts/xxx.md) │
│  par cocoon_id)  │     │                         │
└────────┬─────────┘     └──────────┬──────────────┘
         │                          │
         ▼                          ▼
┌────────────────────────────────────────────────┐
│ prompt-loader.ts — loadPrompt(name, vars)      │
│                                                │
│ 1. Load prompt .md                             │
│ 2. Load strategy context (si cocoonId fourni)  │
│ 3. Inject {{strategy_context}} et autres vars  │
│ 4. Return enriched prompt                      │
└────────────────────┬───────────────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │ ai-provider  │  Claude / Gemini / OpenRouter / Mock
              │ (SSE stream) │
              └──────────────┘
```

**Règle :** Si aucune stratégie n'existe pour le cocon, `{{strategy_context}}` = string vide (NFR9).

### Data Flow — Progression automatique (5 checks Moteur)

```
┌──────────────────────┐
│ Composant onglet     │  emit('check-completed', MOTEUR_CAPITAINE_LOCKED)
│ (ex: CaptainLockPanel│──────────────────────────────────────────┐
└──────────────────────┘                                          │
                                                                  ▼
┌────────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│ MoteurView.vue     │────→│ article-progress      │────→│ POST /api/articles/
│ onCheckCompleted() │     │ store.addCheck()      │     │ :id/progress/check
└────────────────────┘     └─────────┬────────────┘     └─────────┬────────┘
                                     │                            │
                                     ▼                            ▼
                           ┌─────────────────┐         ┌─────────────────────┐
                           │ ProgressDots UI │         │ UPDATE articles     │
                           │ ●●●○○  (5 dots) │         │ SET completed_checks│
                           └─────────────────┘         │ = array_append(...) │
                                                       └─────────────────────┘

Dots mapping :
  ● moteur:discovery_done      (Phase ① Explorer)
  ● moteur:radar_done          (Phase ① Explorer)
  ● moteur:capitaine_locked    (Phase ② Valider — Capitaine)
  ● moteur:lieutenants_locked  (Phase ② Valider — Lieutenants)
  ● moteur:lexique_validated   (Phase ② Valider — Lexique)

Phase ③ Finalisation débloquée quand les 3 checks Phase ② sont présents.
```

### Data Flow — Cascade SERP (Lieutenants → Lexique)

```
┌─────────────────────────────────────────────────┐
│ Onglet Lieutenants                              │
│                                                 │
│  Bouton "Analyser SERP" ──→ POST /api/serp/analyze
│  Curseur: top [████████] 10                     │
│                                                 │
│  serp-analysis.service orchestre:               │
│  ├── Check api_cache (clé = SERP top N hash)    │
│  ├── Si miss: DataForSEO top N                  │
│  └── Write api_cache + article_explorations     │
│                                                 │
│  Réponse:                                       │
│  ├── hnData[]          → LieutenantH2Structure  │
│  ├── paaData[]         → PAA N+2                │
│  ├── groupCrossData[]  → Groupes croisés        │
│  └── rawContents[]     → stockés en DB          │
└─────────────────┬───────────────────────────────┘
                  │ rawContents disponibles via article_explorations
                  ▼
┌─────────────────────────────────────────────────┐
│ Onglet Lexique                                  │
│                                                 │
│  POST /api/serp/tfidf                           │
│  (ZÉRO nouveau scraping — lecture article_explorations)
│                                                 │
│  tfidf.service:                                 │
│  ├── obligatoire[]     (70%+ concurrents)       │
│  ├── differenciateur[] (30-70%)                 │
│  └── optionnel[]       (<30%)                   │
│  Chaque terme: { term, frequency, density/page }│
└─────────────────────────────────────────────────┘
```

### Data Flow — Cache multi-niveau cross-article

```
Appel service keyword-validate pour "crm pme"
    │
    ▼
┌──────────────────────────────┐
│ 1. Consulter keyword_metrics  │  ← Partagé cross-article
└─────────┬────────────────────┘
          │ HIT (existe pour ce keyword) → retour direct
          │ MISS
          ▼
┌──────────────────────────────┐
│ 2. Consulter api_cache        │  ← Par requête hashée + TTL
└─────────┬────────────────────┘
          │ HIT + not expired → retour
          │ MISS ou expired
          ▼
┌──────────────────────────────┐
│ 3. Appel DataForSEO           │  ← dataforseo-cost-guard vérifie quota
└─────────┬────────────────────┘
          │
          ▼
┌──────────────────────────────┐
│ 4. Écrire keyword_metrics     │
│    + écrire api_cache (TTL)   │
└──────────────────────────────┘

→ Un mot-clé partagé par 3 articles = 1 seul appel DataForSEO
```

### Requirements to Structure Mapping

| Feature PRD | Fichiers principaux |
|-------------|---------------------|
| FR1-FR4 : Moteur 3 phases / 6 onglets | `src/views/MoteurView.vue` |
| FR5-FR7 : Phase ① Explorer | `src/components/moteur/KeywordDiscoveryTab.vue`, `intent/DouleurIntentScanner.vue` |
| FR8-FR18 : Capitaine GO/NO-GO | `src/components/moteur/CaptainValidation.vue` (+ Captain* sub-components), `src/composables/keyword/useCapitaineValidation.ts`, `useKeywordScoring.ts`, `server/routes/keyword-validate.routes.ts`, `server/services/keyword/keyword-validate.service.ts`, `shared/kpi-scoring.ts` |
| FR19-FR26 : Lieutenants SERP | `src/components/moteur/LieutenantsSelection.vue` (+ Lieutenant* sub-components), `server/routes/serp-analysis.routes.ts`, `server/services/external/serp-analysis.service.ts`, prompts `propose-lieutenants.md` + `lieutenants-hn-structure.md` |
| FR27-FR31 : Lexique TF-IDF | `src/components/moteur/LexiqueExtraction.vue`, `server/services/keyword/tfidf.service.ts`, `lexique-exploration.service.ts`, prompts `lexique-*.md` |
| FR32-FR34 : Finalisation | `src/components/moteur/FinalisationRecap.vue` |
| FR35-FR37 : Règles transversales | Pattern dans `MoteurView.vue` |
| FR38-FR39 : Dashboard & Explorateur | `src/views/ExplorateurView.vue`, `src/views/DashboardView.vue`, `src/components/local/*` |
| FR40-FR43 : Dots + checks + bandeaux | `src/stores/article/article-progress.store.ts` (5 checks), `src/components/moteur/ProgressDots.vue`, `PhaseTransitionBanner.vue`, `shared/constants/workflow-checks.constants.ts` |
| FR44-FR45 : Pont Cerveau→Moteur | `src/components/moteur/MoteurStrategyContext.vue`, `server/utils/prompt-loader.ts` |
| FR46-FR48 : Labo | `src/views/LaboView.vue` (composants en mode `libre`) |
| FR49-FR52 : Cache & persistance | `server/services/infra/*-cache.service.ts`, `server/services/keyword/keyword-metrics.service.ts`, `server/db/client.ts`, purge horaire dans `server/index.ts` |
| FR53-FR54 : Cerveau | `src/views/CerveauView.vue`, `src/components/strategy/*`, `src/stores/strategy/{strategy,cocoon-strategy}.store.ts`, `server/services/strategy/*`, prompts `strategy-*.md` |
| FR55-FR60 : Rédaction | `src/views/RedactionView.vue`, `ArticleWorkflowView.vue`, `ArticleEditorView.vue`, `src/components/editor/ArticleEditor.vue`, `src/components/outline/*`, `src/stores/article/{brief,outline,editor,seo}.store.ts`, `server/routes/generate.routes.ts`, `server/services/article/*`, prompts `generate-*.md`, `actions/*.md` |

---

## Architecture Validation Results

### Coherence Validation ✅

- Stack figée et cohérente — versions alignées
- Patterns éprouvés en production (le projet est en phase de consolidation, pas de greenfield)
- Composants bimodaux compatibles avec Pinia composition API
- Enrichissement prompts insert dans `loadPrompt()` existant
- Progression s'appuie sur `articles.completed_checks` TEXT[] + constantes partagées

### Requirements Coverage Validation ✅

Toutes les FRs et NFRs sont couvertes par l'architecture livrée (voir mapping ci-dessus). Les items "à créer" mentionnés dans l'ancien document sont maintenant présents :

- ✅ `CaptainValidation.vue` (et 14+ composants Captain* + Lieutenant*)
- ✅ `LieutenantsSelection.vue` + `LieutenantSerpAnalysis.vue` + `LieutenantH2Structure.vue`
- ✅ `LexiqueExtraction.vue`
- ✅ `useKeywordScoring.ts` + `useCapitaineValidation.ts`
- ✅ `keyword-validate.routes.ts` + `keyword-validate.service.ts`
- ✅ `serp-analysis.routes.ts` + `serp-analysis.service.ts`
- ✅ `tfidf.service.ts`
- ✅ `ExplorateurView.vue`, `LaboView.vue`
- ✅ `FinalisationRecap.vue` (nouveau — Phase ③)
- ✅ `{{strategy_context}}` intégré dans plusieurs prompts
- ✅ Migration PostgreSQL + archivage JSON

### Architecture Readiness Assessment

**Status global : DELIVERED — PHASE DE CONSOLIDATION**

**Niveau de confiance : HIGH**

**Points forts :**

- Architecture brownfield mature, patterns prouvés en production
- Pattern bimodal simple (prop `mode`)
- Cascade SERP unique (un scraping, deux usages) économique
- Cache multi-niveau avec `keyword_metrics` cross-article : gros levier de réduction des coûts
- Seuils contextuels en config statique (`shared/kpi-scoring.ts`) — pas de complexité runtime
- `RadarThermometer` partagé réutilisé dans le Capitaine
- Verrouillage séquentiel = gating souple — navigation libre maintenue
- PostgreSQL + purge horaire automatique des caches expirés
- Multi-provider IA : bascule Claude/Gemini/OpenRouter/Mock via `ai-provider.service.ts`
- Organisation par domaine (stores/composables/services) facilitant la navigation
- Tooling qualité complet : oxlint + eslint + prettier + knip + madge + husky

**Améliorations futures (vision) :**

- Batch processing multi-articles
- Boucle GSC post-publication (exploitation du store `gsc`)
- Suggestions proactives de cocons
- Score de complémentarité Capitaine ↔ Lieutenants
- Extension des tests Playwright

### Implementation Handoff

**Guidelines pour les agents IA :**

1. Respecter l'organisation par domaine (stores/composables/services)
2. Utiliser les constantes `MOTEUR_*` / `CERVEAU_*` / `REDACTION_*` pour tout check de progression
3. Passer par `apiGet/apiPost/apiPut/apiDelete` côté frontend
4. Envelopper les réponses dans `{ data: T }`
5. Utiliser `loadPrompt()` pour les prompts IA
6. Consulter `api_cache` et `keyword_metrics` avant tout appel externe
7. Ne jamais dupliquer un composant — utiliser la prop `mode`
8. Ne jamais introduire de fichier JSON de données chaudes — tout passe par PostgreSQL
9. Ne jamais hardcoder les seuils de scoring — utiliser `shared/kpi-scoring.ts` / `shared/scoring.ts`
10. Émettre `check-completed` dans les composants Moteur en mode workflow
