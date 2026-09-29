---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# API et routes

## Routes de l'écran

[`../src/router/index.ts`](../src/router/index.ts) — historique HTML5, chargement paresseux sauf
`DashboardView` et `NotFoundView`.

| Chemin | Vue |
|---|---|
| `/` | `DashboardView` |
| `/config` | `ThemeConfigView` |
| `/silo/:siloId` | `SiloDetailView` |
| `/cocoon/:cocoonId` | `CocoonLandingView` |
| `/cocoon/:cocoonId/cerveau` · `/moteur` · `/redaction` | `CerveauView` · `MoteurView` · `RedactionView` |
| `/cocoon/:cocoonId/article/:articleId` | `ArticleWorkflowView` |
| `/article/:articleId/editor` · `/preview` | `ArticleEditorView` · `ArticlePreviewView` (`meta.hideNavbar`) |
| `/linking` · `/post-publication` | `LinkingMatrixView` · `PostPublicationView` |
| `/:pathMatch(.*)*` | `NotFoundView` |

Redirections héritées : `/theme/:themeId[/…]` → `/cocoon/…` ; `/cocoon/:cocoonId/keywords` → `/moteur`.
Gardes : `beforeEach` renvoie vers `not-found` un paramètre vide ; `afterEach` journalise ; `onError`
recharge deux fois au plus sur un échec de chargement de module, puis revient à `/`.

## Catalogue des routes de l'API

Tous les routeurs sont montés sous `/api` (`dataforseo` sous `/api/dataforseo`). Le détail des
contrats relève du domaine de chaque route.

| Fichier | Chemins | Rôle | Domaine |
|---|---|---|---|
| `silos.routes.ts` | `/silos`, `/silos/:name`, `/silos/:name/cocoons`, `/theme`, `/theme/config`, `/theme/config/parse` | Silos, création de cocon, configuration du thème (et son analyse par l'IA) | Dashboard, Cerveau |
| `cocoons.routes.ts` | `/cocoons`, `/cocoons/:id/articles`, `/cocoons/:cocoonId/tree`, `POST /cocoons/:cocoonId/articles`, `/child-candidates`, `PUT …/articles/:articleId/parent`, `/cocoons/:cocoonName/capitaines`, `/cocoons/:id/strategy/context` | Cocons, arbre réel, naissance d'un article, candidats mesurés, rattachement | Cerveau |
| `strategy.routes.ts` | `/strategy/:id[/suggest|deepen|consolidate|enrich]`, `/strategy/cocoon/:cocoonSlug[/…]`, `/strategy/batch-status` | Stratégie d'article et de cocon, assistées par l'IA | Cerveau |
| `articles.routes.ts` | `/articles/:id` (GET, PUT, PATCH, DELETE), `/by-slug/:slug`, `/children`, `/content`, `/micro-context`, `/progress[/check|/uncheck]`, `/status`, `/recommend-word-count` | Article, contenu, micro-contexte, étapes (gardées), statut (publication gardée) | Rédaction, Moteur |
| `gates.routes.ts` | `/articles/:id/gates/:gateId`, `…/gates/:gateId/waivers`, `/articles/:id/waivers` | Évaluer une porte, poser et lire les dérogations | Infrastructure |
| `keyword-scan.routes.ts` | `POST /keywords/:keyword/scan` | Scan d'un candidat capitaine (mesures, verdict, scores) | Moteur (Capitaine) |
| `keywords.routes.ts` | `/keywords` (CRUD des mots-clés d'un cocon), `/keywords/discover`, `/analyze-discovery`, `/discover-from-site`, `/suggest-all`, `/lexique-suggest`, `/relevance-score`, `/word-groups`, `/audit`, `/migrate/…`, `/keywords/:keyword/serp/exists`, `/articles/:id/keywords`, `/captain-explorations`, `/lieutenant-explorations`, `/captain/judge-paa` | Mots-clés : cocon, article, explorations, Discovery | Moteur |
| `intent-scan.routes.ts` | `/keywords/intent-scan`, `/keywords/radar/generate`, `/keywords/radar/scan` | Radar : génération et scan | Moteur (Radar) |
| `radar-exploration.routes.ts` | `/articles/:id/radar-exploration[/status|/keyword|/keywords]` | Exploration Radar d'un article | Moteur (Radar) |
| `long-tail-suggest.routes.ts` | `/articles/:id/radar-exploration/long-tail[/selection]` | Suggestions longue traîne | Moteur (Radar) |
| `radar-cache.routes.ts`, `discovery-cache.routes.ts` | `/radar-cache/…`, `/discovery-cache/…` (`check`, `load`, `save`, DELETE) | Caches Radar et Discovery | Moteur |
| `keyword-ai-panel.routes.ts` | `/keywords/:keyword/ai-panel`, `/ai-lexique`, `/ai-lexique-upfront`, `/ai-hn-structure`, `/propose-lieutenants` | Panneaux IA du Moteur (SSE) | Moteur |
| `serp-analysis.routes.ts` | `/serp/analyze`, `/serp/tfidf` | Analyse des concurrents, TF-IDF du lexique | Moteur |
| `keyword-queries.routes.ts` | `/keywords/:keyword/metrics`, `/usage`, `/local-for-article/:articleId`, `/content-gap-for-article/:articleId`, `/cocoons/:id/keyword-metrics` | Lectures de mesures en base | Moteur |
| `paa.routes.ts` | `/paa/batch` | Questions PAA par lot | Moteur |
| `article-explorations.routes.ts` | `/articles/:id/explorations[/counts]`, `/articles/:id/external-cache` (GET, DELETE) | Explorations d'un article, vidage du cache externe | Moteur |
| `content-gap.routes.ts` | `/content-gap/analyze` | Thèmes absents par rapport aux concurrents | Explorateur (orphelin : aucun écran actif) |
| `generate/` (via `generate.routes.ts`) | `/generate/outline`, `/article-draft`, `/meta`, `/reduce-section`, `/humanize-section`, `/action`, `/enrich/:pass`, `/section-rewrite`, `/micro-context-suggest`, `/brief-explain`, `/auto-intake`, `/placement-suggest` | Générations IA de la Rédaction et du robot | Rédaction |
| `links.routes.ts` | `/links/matrix`, `/links/suggest`, `PUT /links` | Maillage interne | Rédaction |
| `export.routes.ts` | `/preview/:id`, `POST /export/:id` | Aperçu HTML, export (robot) | Rédaction |
| `dataforseo.routes.ts` | `/dataforseo/brief`, `/dataforseo/cost-status` | Brief SEO d'un mot-clé, dépense de la fenêtre + bac à sable | Intégrations |
| `cost-status.routes.ts` | `/cost-status` | Dépense DataForSEO estimée (récap du robot) | Intégrations |
| `gsc.routes.ts` | `/gsc/status`, `/auth`, `/callback`, `/performance`, `/keyword-gap` | Google Search Console (OAuth, performances) | Intégrations |
| `runtime-mode.routes.ts` | `/runtime-mode` (GET, POST) | Mode simulé / réel | Infrastructure |
| `server/index.ts` | `/health` | Santé du serveur | Infrastructure |

Aucun appelant dans `src/` ni `scripts/` : `POST /strategy/batch-status`,
`POST /keywords/autocomplete-suggest`, `POST /keywords/validate-pain`,
`POST /articles/:id/lieutenants/archive`.
