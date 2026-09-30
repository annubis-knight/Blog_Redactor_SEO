---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Qualités transverses (NFR)

Les exigences non fonctionnelles ne vivent pas dans un module : elles sont tenues par une poignée de mécanismes partagés.

| Famille | Mécanisme principal |
|---|---|
| Performance | routes paresseuses du routeur, score SEO différé, flux SSE (Server-Sent Events : réponse HTTP qui envoie des événements au fil de l'eau) |
| Coût | cache en base consulté avant tout appel, garde-fou de dépense DataForSEO en mémoire, mode d'exécution simulé/réel |
| Intégration | contrats d'affichage (`shared/contracts/`), constantes d'étapes, client d'API unique, chargeur de prompts |
| Observabilité | journaliseurs serveur et navigateur, gestionnaire d'erreurs central, pile d'activité (store Pinia `costLog`) |
| Sécurité | CORS maison, `.env` ignoré, échappement des contenus utilisateur dans les prompts |
| Maintenabilité | scripts `verify` / `check:health`, ESLint + Oxlint, knip, madge, dependency-cruiser, cliquets de tests |

Flux d'une requête type : composant Vue → `apiGet/apiPost/…` ([`src/services/api.service.ts`](../src/services/api.service.ts)) → proxy Vite `/api` → route Express (validation) → service → cache PostgreSQL → (si besoin) service externe via garde-fou → réponse `{ data, dbOps?, usage? }` → contrat d'affichage → pile d'activité.

## Chargement des vues et score SEO différé
*Exigences : NFR-PERF-VIEW-LOAD, NFR-PERF-SEO-DEBOUNCE, NFR-PERF-API-LOCAL · Design : DESIGN-PERF-VIEW-LOAD, DESIGN-PERF-SEO-DEBOUNCE, DESIGN-PERF-API-LOCAL*

- **Code :** [`src/router/index.ts`](../src/router/index.ts) — `DashboardView` et `NotFoundView` importés statiquement ; les 11 autres vues en `() => import(...)`. `router.beforeEach` renvoie vers `not-found` si un paramètre (`cocoonId`, `articleId`, `siloId`, `themeId`) est vide. `router.onError` : sur « Failed to fetch dynamically imported module » ou « Loading chunk », recharge `to.fullPath` au plus 2 fois (compteur `chunk_reload_count` en `sessionStorage`), puis `window.location.href = '/'`.
- **Code :** [`src/composables/seo/useSeoScoring.ts`](../src/composables/seo/useSeoScoring.ts) — `useSeoScoring` : `watch` profond sur contenu, meta title, meta description, mots-clés ; `useDebounceFn(…, 300)` ; `scheduleIdle` = `requestIdleCallback` sinon `setTimeout(…, 0)` ; annule l'idle en attente ; appelle `seoStore.recalculate` sur l'article entier.
- **Règles et décisions :** aucun middleware de chronométrage dans [`server/index.ts`](../server/index.ts) ; la cible de 200 ms n'est pas mesurée. Pas d'indicateur de chargement global : vue-router garde la vue courante tant que le chunk suivant n'est pas résolu.

## Flux SSE des générations d'IA
*Exigences : NFR-PERF-SSE-FIRST-TOKEN · Design : DESIGN-PERF-SSE-FIRST-TOKEN, DESIGN-INFRA-API-STREAM*

- **Code :** [`src/services/api.service.ts`](../src/services/api.service.ts) — `apiStream` (POST + `ReadableStream`) et `consumeSseBody` : événements `chunk` (clé `content` ou `html`), `done` (passe le contrat via `conformStreamResult`), `section-start`, `section-done`, `error`. `eventType` survit entre deux lectures réseau. `AbortError` → `{ aborted: true }`.
- **Code :** [`src/composables/editor/useStreaming.ts`](../src/composables/editor/useStreaming.ts) — `startStream` crée un `AbortController`, `abort()` ; `startStreamOnce` accepte un `signal` parent.
- **Code :** arrêts exposés : `abortReduce` / `abortHumanize` ([`src/stores/article/editor.store.ts`](../src/stores/article/editor.store.ts), boutons de [`src/components/article/ArticleActions.vue`](../src/components/article/ArticleActions.vue)) ; `abort` de [`src/stores/article/enrichment.store.ts`](../src/stores/article/enrichment.store.ts) (bouton « Arrêter » de `EnrichmentPanel.vue`) ; `abortAllAiStreams` de `CaptainPanel.vue`.
- **API :** `POST /api/generate/article-draft` et les autres routes de [`server/routes/generate/`](../server/routes/generate/) écrivent `event:`/`data:` au fil des morceaux du fournisseur.
- **Règles et décisions :** aucune route serveur n'écoute `req.on('close')` : un abandon côté client n'interrompt pas l'itération sur le fournisseur (dette, cf. conflits). Le premier jet n'a pas d'`AbortController` exposé à l'écran.

## Cache avant appel et fraîcheur
*Exigences : NFR-COST-CACHE-FIRST, NFR-PERF-CACHE-HIT-RATE, NFR-PERF-PURGE-HOURLY, NFR-CFG-DATAFORSEO-REFRESH · Design : DESIGN-COST-CACHE-FIRST, DESIGN-PERF-CACHE-HIT-RATE, DESIGN-PERF-PURGE-HOURLY*

- **Code :** [`server/services/keyword/keyword-metrics.service.ts`](../server/services/keyword/keyword-metrics.service.ts) — `isKeywordMetricsFresh(fetchedAt, ttlDays = 7)`. Appelants : `keyword-measure.service.ts` (mesure des mots-clés manquants ou périmés), `keyword-scan.routes.ts` (`FRESHNESS_DAYS = 7`), `paa-cache.service.ts` (1 jour), `autocomplete.service.ts`, `content-gap.service.ts`, `dataforseo/brief.ts`, `keyword-queries.service.ts`.
- **Code :** [`server/services/external/dataforseo/cache.ts`](../server/services/external/dataforseo/cache.ts) — `readCache`/`writeCache` (type `dataforseo`, TTL `DATAFORSEO_CACHE_TTL_MS` = 7 j, défini dans `_client.ts`) ; `getMinRefreshHours` (`DATAFORSEO_MIN_REFRESH_HOURS`, sinon 0 si `NODE_ENV=development`, sinon `DEFAULT_MIN_REFRESH_HOURS` = 168 de [`shared/constants/seo.constants.ts`](../shared/constants/seo.constants.ts)) ; `isCacheFresh` utilisé par `auditCocoonKeywords` et `getAuditCacheStatus` ([`dataforseo/scoring.ts`](../server/services/external/dataforseo/scoring.ts)).
- **Code :** [`server/index.ts`](../server/index.ts) — dans le callback de `app.listen`, `setInterval(…, 60 * 60 * 1000)` : `DELETE FROM external_api_cache WHERE expires_at < NOW()` ; log `debug` si des lignes partent, `error` si échec.
- **Données :** `keyword_metrics` (permanent, jamais purgé), `external_api_cache` (TTL, purgé), `keyword_paa_questions`, `keyword_autocomplete`, `radar_explorations` (fraîcheur 7 j dans `radar-exploration.service.ts`), `keyword_discoveries`.
- **Règles et décisions :** le motif « cache d'abord » est réimplémenté par service, pas centralisé (voir [Infrastructure transversale](20-infrastructure.md), FR-INFRA-GET-OR-FETCH). Aucun compteur de succès/échec du cache. Le job de purge est in-process, armé une fois au démarrage.

## Analyse SERP partagée et décomposition du cache mot-clé
*Exigences : NFR-INT-SERP-ONCE, NFR-MOT-LEXIQUE-DECOUPLAGE, NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION · Design : DESIGN-INT-SERP-ONCE, DESIGN-MOT-LEXIQUE-DECOUPLAGE, DESIGN-MOT-SCHEMA-KEYWORD-DECOMPOSITION*

- **Code :** [`server/services/external/scrape-corpus.service.ts`](../server/services/external/scrape-corpus.service.ts) — `fetchAndPersist` : producteur unique ; cache mémoire `MEMORY_CACHE_TTL_MS` (1 h, `fromCache: 'memory'`), puis `getSerpResultsFresh` + `reconstructSerpAnalysisResult` (`fromCache: 'db'`), sinon DataForSEO + lecture des pages (`fetchPageHtml`).
- **Code :** [`server/services/keyword/keyword-serp.service.ts`](../server/services/keyword/keyword-serp.service.ts) — `getSerpResultsFresh` (7 j sur `keyword_serp_results`) ; `reconstructSerpAnalysisResult` rend `null` si `keyword_serp_scrapes` est vide pour ce mot-clé.
- **Code :** [`server/services/keyword/lexique-analysis.service.ts`](../server/services/keyword/lexique-analysis.service.ts) — `analyzeLexique` peut appeler `fetchAndPersist` (`triggerScrapeIfMissing`), lit `getTextContent`, sinon `LexiqueScrapeMissingError`.
- **API :** `POST /api/serp/analyze` ([`server/routes/serp-analysis.routes.ts`](../server/routes/serp-analysis.routes.ts)) — `cacheOnly` : relecture seule ; sinon « SERP DB hit » si frais et reconstructible, sinon `fetchAndPersist`.
- **Données :** `keyword_metrics` (chiffres seuls, plus de `serp_raw_json`), `keyword_serp_results` (URLs du top 10), `keyword_serp_scrapes` (pages lues), `keyword_paa_questions`, `keyword_autocomplete`. Le relevé des candidats du Cerveau écrit dans `external_api_cache` (type `serp-top`), jamais dans `keyword_serp_results`.
- **Règles et décisions :** « analyse faite » = au moins une page lue. La décomposition par usage a réduit la charge utile d'environ 97 % sur le top 5 (banc ponctuel, gardé dans l'historique git) : `getKeywordMetrics` ne lit plus de JSON SERP.

## Garde-fou de dépense DataForSEO
*Exigences : NFR-COST-DATAFORSEO-BUDGET, NFR-COST-DATAFORSEO-RESERVE, NFR-CFG-DATAFORSEO-BUDGET · Design : DESIGN-COST-DATAFORSEO-BUDGET, DESIGN-COST-DATAFORSEO-RESERVE, DESIGN-EXT-DATAFORSEO-COSTGUARD*

- Voir [Intégrations externes](18-integrations.md) (« Plafond de dépense DataForSEO » ; relances : « Transport DataForSEO et données de marché »).

## Mode d'exécution simulé / réel
*Exigences : NFR-COST-AI-MOCK, NFR-CFG-AI-PROVIDER, NFR-CFG-AI-FALLBACK-OPT-OUT, NFR-CFG-DATAFORSEO-SANDBOX · Design : DESIGN-COST-AI-MOCK, DESIGN-INFRA-RUNTIME-MODE*

- Voir [Intégrations externes](18-integrations.md) (« Interrupteur simulé / réel », « Répartiteur d'IA et chaîne de secours », « Simulation (fournisseur `mock`) », « Coût des suites de tests ») ; vue d'ensemble : [Mode simulé / réel](04-ia-et-prompts.md).

## Persistance et hygiène de la base
*Exigences : NFR-COST-POSTGRESQL, NFR-CFG-PG-CONN · Design : DESIGN-COST-POSTGRESQL*

- **Code :** [`server/db/client.ts`](../server/db/client.ts) — `pool` (`pg.Pool`, `max: 10`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`, défauts `localhost`/5432/`postgres`/`blog_redactor_seo`) ; `pool.on('error')` évite l'arrêt du processus ; `query`.
- **Données :** 26 tables ; état courant dans [`server/db/schema.sql`](../server/db/schema.sql) (en-tête avec empreinte sha256 et commit), schéma rejouable [`server/db/bootstrap.sql`](../server/db/bootstrap.sql). Seul fichier écrit par le serveur : `data/gsc-token.json` via [`server/utils/json-storage.ts`](../server/utils/json-storage.ts) (`writeJson`, écriture atomique par fichier temporaire).
- **Code :** scripts ([`package.json`](../package.json)) — `db:snapshot` (régénère `schema.sql` et `bootstrap.sql`), `db:check` ([`scripts/db-check.ts`](../scripts/db-check.ts) : compare l'empreinte live au snapshot, exit 1 si écart ou base injoignable ; lancé par `predev` en avertissement et par `verify`), `db:backup` (`data/_backup_pg_*.sql`), `db:clean-tests`.
- **Règles et décisions :** le snapshot, pas les migrations (archivées), est la référence du schéma. `verify:content` avertit si la dernière sauvegarde a plus de 14 jours (`BACKUP_MAX_AGE_DAYS`).

## Erreurs : serveur, client, écran
*Exigences : NFR-OBS-ERROR-HANDLER, NFR-OBS-KNOWN-ERRORS, NFR-COST-BODY-LIMIT · Design : DESIGN-OBS-ERROR-HANDLER, DESIGN-OBS-KNOWN-ERRORS, DESIGN-COST-BODY-LIMIT*

- **Code :** [`server/index.ts`](../server/index.ts) — `express.json({ limit: '5mb' })`, déclaré une fois ; `app.use(errorHandler)` en dernier.
- **Code :** [`server/utils/error-handler.ts`](../server/utils/error-handler.ts) — `errorHandler` : `log.error(méthode chemin — message)` ; `DataForSeoQuotaError` → 429 `DATAFORSEO_QUOTA_EXCEEDED` ; `CostBudgetError` → 429 `DATAFORSEO_COST_BUDGET` (+ `endpoint`, `spentUsd`, `budgetUsd`, `windowMin`) ; `AIProviderQuotaError` → 429 `AI_PROVIDER_QUOTA_EXCEEDED` ; `AIProviderOverloadedError` → 503 `AI_PROVIDER_OVERLOADED` ; tout le reste → 500 `INTERNAL_ERROR` avec `err.message`. Le statut porté par l'erreur (`err.status`, ex. 413 du parseur JSON, 400 JSON invalide) est ignoré.
- **Code :** [`server/utils/api-error.ts`](../server/utils/api-error.ts) — `respondWithError(res, err, fallback)` : même correspondance pour les routes qui traitent leurs erreurs elles-mêmes (la majorité), repli sur `fallback`.
- **Code :** [`src/services/api.service.ts`](../src/services/api.service.ts) — `KNOWN_ERROR_CODES` (local au client : `DATAFORSEO_QUOTA_EXCEEDED`, `AI_PROVIDER_QUOTA_EXCEEDED`, `AI_PROVIDER_OVERLOADED`) ; `reportKnownError` → `costLog.addMessage('error', …)` ; `handleApiError` lève `ApiRequestError(message, status, code, details)` (message serveur, sinon `Erreur HTTP <statut>`).
- **Code :** [`src/components/shared/ErrorBoundary.vue`](../src/components/shared/ErrorBoundary.vue) — `onErrorCaptured`, `MAX_RETRIES = 3`, détail visible en développement seulement. [`src/main.ts`](../src/main.ts) — `app.config.errorHandler` journalise.
- **Règles et décisions :** format d'erreur commun `{ error: { code, message, details? } }`. Aucune pile d'appels renvoyée. Le catalogue d'erreurs n'est pas partagé : les codes vivent côté serveur dans `error-handler.ts`/`api-error.ts`, les libellés côté client dans `api.service.ts`.

## Pile d'activité et opérations en base
*Exigences : NFR-OBS-COST-LOG, NFR-OBS-DBOPS-TRACK, NFR-INT-API-WRAPPER · Design : DESIGN-OBS-COST-LOG, DESIGN-OBS-DBOPS-TRACK*

- **Code :** [`src/stores/ui/cost-log.store.ts`](../src/stores/ui/cost-log.store.ts) — store `costLog` : `entries` (niveaux `api` | `db` | `info` | `warning` | `error`, sans plafond de taille), `totalCost`, `addEntry`, `addDbEntry`, `addMessage`, `removeEntry`, `clearAll`, `toggleCollapsed`.
- **Code :** [`src/components/shared/CostLogPanel.vue`](../src/components/shared/CostLogPanel.vue) — `Teleport` vers `body`, pastille / panneau « Coûts API », sondage `refreshCostStatus` toutes les 15 s, barre d'alerte au-delà de 80 % (`budgetRatio`).
- **Code :** [`src/services/api.service.ts`](../src/services/api.service.ts) — `pushUsageIfPresent` (champ `usage` à la racine ou sous `data`, POST seulement) ; `pushDbOpsIfPresent` (champ `dbOps`, tous verbes, et `dbOps` de l'événement `done` d'un flux) ; `apiStream` pousse l'`usage` de l'événement `done`.
- **Code :** [`server/utils/db-telemetry.ts`](../server/utils/db-telemetry.ts) — `measureDb(table, operation, run)` → `DbOp { operation, table, rowCount, ms }`. Routes qui déclarent elles-mêmes leurs `dbOps`, lectures comprises : `GET /api/articles/:id/keywords`, `GET|POST /api/articles/:id/captain-explorations`, `PATCH /api/articles/:id/captain-explorations/ai-panel`, `GET|POST /api/articles/:id/lieutenant-explorations` ([`server/routes/keywords.routes.ts`](../server/routes/keywords.routes.ts), via `data.service.ts`).
- **Code :** [`server/middleware/db-telemetry.middleware.ts`](../server/middleware/db-telemetry.middleware.ts) — `patchPoolForTelemetry` (appelé au démarrage de [`server/index.ts`](../server/index.ts)) + `dbTelemetryMiddleware` (monté sur `/api` avant les routes) + `requestDbOps` : les **écritures** de chaque requête (voir [Infrastructure transversale](20-infrastructure.md), « Pile d'activité »). Tests : `tests/unit/utils/db-telemetry-middleware.test.ts`, `tests/unit/architecture/db-telemetry-mounted.test.ts`.
- **Règles et décisions :** pile de session, non persistée. Les lectures ne sont rapportées que par les routes ci-dessus (choix du lot 6 : ne pas noyer la pile) ; aucun seuil ne signale une route trop gourmande (NFR-OBS-DBOPS-TRACK non tenue).

## Contrats d'affichage
*Exigences : NFR-INT-DISPLAY-CONTRACTS · Design : DESIGN-INT-DISPLAY-CONTRACTS*

- **Code :** [`shared/contracts/core.ts`](../shared/contracts/core.ts) — `defineContract`, `parseContract(contract, raw, 'server' | 'client' | 'db')`, `parseContractList`, `ContractViolationError` (« Réponse reçue dans un format inattendu (contrat « … ») — relancez l'action. »), `setContractReporter`. Un fichier par famille dans [`shared/contracts/`](../shared/contracts/) (captain-scan, article-keywords, captain-paa-judge, radar, serp, lieutenants, lexique, article-explorations, discovery, ai-advice, score-blocks).
- **Code :** rapporteurs branchés sur `log.warn` dans [`server/index.ts`](../server/index.ts) et [`src/main.ts`](../src/main.ts). Option `{ contract }` des fonctions de `api.service.ts`.
- **Code :** [`shared/kpi-scoring.ts`](../shared/kpi-scoring.ts) — niveau `GRAY` (« Données insuffisantes ») quand volume, PAA et autocomplete sont absents ; `captain-scan.contract.ts` ramène un verdict illisible à `GRAY`.
- **Règles et décisions :** tri-état valeur / `null` (« — ») / échec journalisé ; `z.looseObject` ; cliquet [`tests/unit/architecture/display-contracts-coverage.test.ts`](../tests/unit/architecture/display-contracts-coverage.test.ts) (`BASELINE_CLIENT_UNCOVERED = 0`, `BASELINE_SERVER_UNCOVERED = 0`). Détail par famille : § 19 à § 26 (Moteur).

## Progression d'un article et seuils
*Exigences : NFR-INT-COMPLETED-CHECKS-SSOT, NFR-INT-CHECKS-NAMESPACE, NFR-INT-SCORING-CONFIGURABLE, NFR-MAIN-NO-SCORE-FALLBACK · Design : DESIGN-INT-COMPLETED-CHECKS-SSOT, DESIGN-INT-CHECKS-NAMESPACE, DESIGN-INT-SCORING-CONFIGURABLE, DESIGN-MAIN-NO-SCORE-FALLBACK*

- **Code :** [`shared/constants/workflow-checks.constants.ts`](../shared/constants/workflow-checks.constants.ts) — `MOTEUR_*` (6), `MOTEUR_CHECKS`, `REDACTION_DRAFT_ACCEPTED`, `ALL_WORKFLOW_CHECKS`, `checksRemovedWith` (`CHECK_DEPENDENTS` : capitaine et lieutenants entraînent `MOTEUR_HN_LOCKED`).
- **Code :** [`shared/schemas/article-progress.schema.ts`](../shared/schemas/article-progress.schema.ts) — `writeCheckRegex` (`moteur:<snake_case>` ou `redaction:draft_accepted`) ; `readCheckRegex` tolère `cerveau:*` / `redaction:*`.
- **API :** `GET|PUT /api/articles/:id/progress`, `POST /api/articles/:id/progress/check`, `POST /api/articles/:id/progress/uncheck` (retire `checksRemovedWith(check)`) ([`server/routes/articles.routes.ts`](../server/routes/articles.routes.ts)).
- **Code :** [`src/stores/article/article-progress.store.ts`](../src/stores/article/article-progress.store.ts) — `progressMap` (50 articles au plus, `evictOldest`), `addCheck`/`removeCheck` mettent à jour **après** la réponse serveur (pas d'optimisme), pas d'en-tête `AUTHORITY:`.
- **Données :** `articles.completed_checks TEXT[]`.
- **Code :** [`shared/kpi-scoring.ts`](../shared/kpi-scoring.ts) — `THRESHOLDS` par niveau d'article ; [`shared/score/index.ts`](../shared/score/index.ts) — point d'entrée unique (`compareScores`, `averageScores`, formats) ; règle dependency-cruiser `score-internal-only-via-index`.
- **Code :** [`eslint.config.ts`](../eslint.config.ts) — `no-restricted-syntax`, 5 sélecteurs (identifiant, membre, avant-dernier membre, et deux formes `ChainExpression`) sur `[Ss]core|[Vv]olume|[Dd]ifficulty|[Cc]pc|[Cc]ompetition|[Dd]ensity` `?? 0` ; désactivée pour `shared/score/**` et `tests/unit/shared/score.test.ts`.
- **Règles et décisions :** test de cohérence [`tests/unit/coherence/completed-checks.test.ts`](../tests/unit/coherence/completed-checks.test.ts). Détail des consommateurs : [Moteur — cadre commun](12-moteur.md) et [Dashboard et page du cocon](10-dashboard.md).

## Prompts génériques et contenus neutralisés
*Exigences : NFR-INT-PROMPT-AGNOSTIC, NFR-INT-STRATEGY-OPTIONAL, NFR-SEC-PROMPT-INJECTION · Design : DESIGN-INT-PROMPT-AGNOSTIC, DESIGN-INT-STRATEGY-OPTIONAL, DESIGN-SEC-PROMPT-INJECTION*

- **Code :** [`server/utils/prompt-loader.ts`](../server/utils/prompt-loader.ts) — `loadPrompt(name, variables, { cocoonSlug, escapeKeys })` ; `renderPromptTemplate` (sections `{{#clé}}…{{/clé}}`, variables, aucune réinterprétation) ; `PromptTemplateError` levée hors production si variable manquante ou inutilisée (journalisée en production) ; `PROMPT_GLOBALS` (`strategy_context`, `today`, `year`, `zone`, `zone_landmarks`) ; `loadCocoonStrategyBlock` rend `''` si stratégie absente ou en erreur (`log.warn`) ; sans repère `{{strategy_context}}`, la stratégie est ajoutée en fin de prompt.
- **Code :** `escapePromptContent` — neutralise `\n\nHuman:`, `\n\nAssistant:`, `<system>`, `</system>`, `<user-content>`, `</user-content>`, `{{`, `}}` (caractères remplacés par `\uXXXX`) et encadre par `<user-content>…</user-content>` ; appliqué aux seules clés listées dans `escapeKeys` (une valeur vide reste vide).
- **Code :** [`server/services/queries/article-pain-point.service.ts`](../server/services/queries/article-pain-point.service.ts) — `PAIN_POINT_FALLBACK = '(non défini)'`. `pickStrategyContext` ([`server/routes/generate/article-draft.routes.ts`](../server/routes/generate/article-draft.routes.ts)) : stratégie d'article, sinon du cocon, sinon vide.
- **Règles et décisions :** gardes [`tests/unit/architecture/prompt-variables.test.ts`](../tests/unit/architecture/prompt-variables.test.ts) (`USER_CONTENT_KEYS` : `selectedText`, `sectionHtml`, `articleHtml`, `articleContent`, `articleText`, `chapterHtml`, `instruction` doivent figurer dans `escapeKeys` ; chaque appel fournit exactement les repères du prompt) et [`tests/unit/coherence/prompts-no-hardcoded.test.ts`](../tests/unit/coherence/prompts-no-hardcoded.test.ts). Détail des couches de prompts : [Infrastructure transversale](20-infrastructure.md) (FR-INFRA-PROMPT-LOADER, FR-INFRA-PROMPT-LAYERS).

## Validation des entrées
*Exigences : NFR-INT-ZOD-VALIDATION, NFR-SEC-ZOD-INPUT · Design : DESIGN-INT-ZOD-VALIDATION, DESIGN-SEC-ZOD-INPUT*

- **Code :** [`shared/schemas/`](../shared/schemas/) — 15 fichiers `*.schema.ts` partagés.
- **Règles et décisions :** trois motifs coexistent dans [`server/routes/`](../server/routes/) (87 handlers POST/PUT/PATCH) :
  1. `Schema.safeParse(req.body)` → 400 `{ error: { code: 'VALIDATION_ERROR', message } }` (32 appels) ;
  2. contrôles manuels → 400 `MISSING_PARAM` (28 occurrences, surtout `keywords.routes.ts`) ;
  3. `Schema.parse(req.body)` dans un `try` dont le `catch` renvoie 500 `INTERNAL_ERROR` (`strategy.routes.ts`, `silos.routes.ts`) : une entrée invalide y devient une erreur interne.
  Seul `paa.routes.ts` reconnaît explicitement `z.ZodError`. Des routes n'ont aucune validation de corps (ex. `intent-scan`, `keyword-ai-panel`, `radar-exploration`). Harmoniser sur le motif 1 lèverait les statuts « non tenue ».

## Sécurité locale
*Exigences : NFR-SEC-CORS, NFR-SEC-ENV-VARS, NFR-SEC-GSC-TOKENS, NFR-CFG-GSC-OAUTH · Design : DESIGN-SEC-CORS, DESIGN-SEC-ENV-VARS, DESIGN-SEC-GSC-TOKENS*

- **Code :** [`server/index.ts`](../server/index.ts) — middleware CORS maison : `Access-Control-Allow-Origin` renvoyé seulement si l'origine vérifie `/^http:\/\/localhost(:\d+)?$/` ; `Allow-Methods: GET, POST, PUT, DELETE, OPTIONS` ; `OPTIONS` → 204. La requête est traitée quelle que soit l'origine. `app.listen(PORT)` sans hôte : écoute sur toutes les interfaces.
- **Code :** [`.gitignore`](../.gitignore) — ignore `.env`, `data/articles/`, `data/cache/`, `data/links/`, `data/_archive/`, `data/_backup_*.sql` ; **pas** `data/gsc-token.json`. [`.env.example`](../.env.example) — modèle.
- **Code :** [`server/services/external/gsc.service.ts`](../server/services/external/gsc.service.ts) — `TOKEN_PATH = join(process.cwd(), 'data', 'gsc-token.json')` (fixe) ; `getValidToken` rafraîchit à 60 s de l'expiration (`refreshAccessToken`) ; les logs ne contiennent que « token loaded/saved » ; `getAuthUrl`/`exchangeCode` : `GOOGLE_REDIRECT_URI`, sinon `http://localhost:${PORT ?? 3400}/api/gsc/callback`, portée `webmasters.readonly`.
- **Règles et décisions :** le front passe par le proxy Vite (même origine) : le CORS ne sert qu'à bloquer d'autres pages web. Le journaliseur ne filtre rien : l'absence de jeton dans les logs tient à ce que le code ne le passe jamais.

## Journaux, santé, démarrage
*Exigences : NFR-OBS-LOGGER, NFR-OBS-CONFIG, NFR-OBS-HEALTH, NFR-OBS-DB-CHECK · Design : DESIGN-OBS-LOGGER, DESIGN-OBS-CONFIG, DESIGN-OBS-HEALTH, DESIGN-OBS-DB-CHECK*

- **Code :** [`server/utils/logger.ts`](../server/utils/logger.ts) — `log.debug|info|warn|error(msg, data?)` ; `formatLog` : heure `HH:MM:SS.mmm`, `[NIVEAU]` coloré (chalk), émoji, `getCallerInfo` (deux derniers segments du chemin + ligne), sortie `console.log`.
- **Code :** [`logs.config.ts`](../logs.config.ts) (racine) — `logsConfig { level: 'DEBUG', showTimestamp, showFilePath, emoji }` : niveau unique, pas de réglage par module ; `verify:content` le force à `WARN`.
- **Code :** [`src/utils/logger.ts`](../src/utils/logger.ts) — même API côté navigateur, niveau `VITE_LOG_LEVEL` (défaut `DEBUG`), `setLevel`.
- **API :** `GET /api/health` → `{ data: { status: 'ok' } }` (utilisé par la CI pour attendre le serveur).
- **Code :** [`server/index.ts`](../server/index.ts) — après `listen`, `pool.query('SELECT 1')` ; échec → `log.error('PostgreSQL connection failed', { …, hint })` selon `ECONNREFUSED`, `28P01`, `3D000` ; le serveur continue.
- **Règles et décisions :** pas de transport fichier. Exception connue au journaliseur : `console.error` du `pool.on('error')` ; côté navigateur, `drag-handle.ts` (drapeau `DEBUG`) et `seo-calculator.ts` (`console.debug`).

## Configuration et ports
*Exigences : NFR-CFG-* · Design : (aucun DESIGN dédié ; voir DESIGN-COST-AI-MOCK, DESIGN-COST-DATAFORSEO-BUDGET)*

| Variable | Lue par | Défaut |
|---|---|---|
| `AI_PROVIDER` | `ai-provider.service.ts` `getProvider`, `runtime-mode.service.ts` | `claude` |
| `AI_PROVIDER_NO_FALLBACK` | `getProviderChain` (valeur exacte `1`) | chaîne active |
| `CLAUDE_MODEL` | `claude.service.ts` (flux) | `claude-sonnet-4-6` ; outils : `claude-haiku-4-5-20251001` |
| `HAIKU_MODEL` | `keyword-radar.service.ts` | `claude-haiku-4-5-20251001` |
| `GEMINI_MODEL`, `VITE_GEMINI_API_KEY` | `gemini.service.ts` | `gemini-2.0-flash` |
| `OPENROUTER_MODEL`, `OPEN_ROUTER_API_KEY` | `openrouter.service.ts` | `meta-llama/llama-3.3-70b-instruct:free` |
| `MOCK_LATENCY_MS` | `mock.service.ts` | 200 |
| `ANTHROPIC_API_KEY`, `TAVILY_API_KEY` | `claude.service.ts`, `content-gap.service.ts` | — |
| `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | `_client.ts` `getAuthHeader` | erreur si absents |
| `DATAFORSEO_SANDBOX` | `isSandbox`, `getEffectiveMode` (valeur exacte `true`) | production |
| `DATAFORSEO_COST_BUDGET_USD`, `DATAFORSEO_COST_WINDOW_MIN` | `dataforseo-cost-guard.ts` | 0,5 / 30 |
| `DATAFORSEO_MIN_REFRESH_HOURS` | `dataforseo/cache.ts` | 168 (0 si `NODE_ENV=development`) |
| `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE` | `server/db/client.ts` | localhost, 5432, postgres, —, blog_redactor_seo |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | `gsc.service.ts` | adresse calculée |
| `SITE_URL` | `export.service.ts` | `SITE_ORIGIN` |
| `PORT`, `VITE_PORT` | `server/index.ts`, [`vite.config.ts`](../vite.config.ts) | 3400, 5400 |
| `VITE_LOG_LEVEL` | `src/utils/logger.ts` | DEBUG |
| `NODE_ENV` | `prompt-loader.ts` (strict hors `production`), `dataforseo/cache.ts` | non défini |

- **Code :** [`vite.config.ts`](../vite.config.ts) — `BACKEND_PORT`, `FRONTEND_PORT`, `strictPort: true`, proxy `/api` (`timeout: 0`), `cacheDir` = `VITE_CACHE_DIR` sinon `node_modules/.vite`.
- **Code :** [`scripts/kill-port.mjs`](../scripts/kill-port.mjs) — `freePort` (`netstat -ano` + `taskkill /F` sous win32, `lsof -ti` + `kill -9` ailleurs), `freePorts`, sortie toujours 0. Hooks : `predev` (3400 5400, puis `db:check` en avertissement), `prebuild` (3400 5400), `pretest:browser` (3410 5410 puis `scripts/e2e-test-db.ts`). Gardes : [`tests/unit/infra/app-ports.test.ts`](../tests/unit/infra/app-ports.test.ts), [`tests/unit/infra/kill-port.test.ts`](../tests/unit/infra/kill-port.test.ts).
- **Règles et décisions :** `.env.example` livre `AI_PROVIDER=mock`, `AI_PROVIDER_NO_FALLBACK=1`, `DATAFORSEO_SANDBOX=true` : un `.env` copié du modèle démarre gratuit. Variables du modèle jamais lues : `GEMINI_PROJET_NAME`, `GEMINI_PROJET_ID`. Variables lues absentes du modèle : `HAIKU_MODEL`, `SITE_URL`, `VITE_LOG_LEVEL`.

## Écran stable
*Exigences : NFR-UX-STABLE-SKELETON · Design : DESIGN-UX-STABLE-SKELETON, DESIGN-UI-AI-PANELS-PATTERN*

- **Code :** [`src/components/moteur/ai-panel/`](../src/components/moteur/ai-panel/) — `AiPanel.vue`, `AiPanelHeader.vue`, `AiPanelSkeleton.vue`, `AiTriggerButton.vue`… Panneaux conformes : `DiscoveryPanel.vue`, `RadarAiPanel.vue`, `CaptainSidePanel.vue`, `LexiqueAiPanel.vue`, `LieutenantsAiPanel.vue`.
- **Règles et décisions :** garde statique [`tests/unit/components/moteur/ai-panels-persistence.test.ts`](../tests/unit/components/moteur/ai-panels-persistence.test.ts) (lit le source : import d'`AiPanel`/`AiPanelHeader`, pas de `v-if` racine sur un état passager) ; le test de `ArticleWorkflowIaBrief.vue` est ignoré (`SKIP: FR-UI-AI-PANELS-PATTERN`). Détail : [Composants d'interface partagés](19-interface.md).

## Textes lisibles
*Exigences : NFR-UX-SCREEN-TEXT*

- **Code :** [`tests/unit/architecture/screen-text-no-escape.test.ts`](../tests/unit/architecture/screen-text-no-escape.test.ts), dans `verify` — parcourt le `<template>` de chaque `.vue` de `src/` et refuse une séquence d'échappement Unicode (antislash, `u`, quatre chiffres hexadécimaux) dans le **texte fixe** : texte des balises et attributs statiques. Les interpolations `{{ … }}` et les attributs liés (`:attr`, `v-…`, `@…`) sont écartés (`staticText`), car ce sont des expressions JavaScript, où la séquence est interprétée.
- **Code :** [`tests/unit/architecture/screen-text-accents.test.ts`](../tests/unit/architecture/screen-text-accents.test.ts), dans `verify` — valideur d'accents léger, sans dépendance ni réseau. Il lit le texte que l'utilisateur voit dans `src/` : texte des balises (y compris sur plusieurs lignes), attributs de libellé (`title`, `placeholder`, `alt`, et tout attribut finissant par `label`, `title`, `text`, `message`, `hint`, `description`), chaînes des interpolations et du code (`quoted`, hors journaux `log.*` / `console.*` et commentaires). Il refuse les formes de `NEVER_WITHOUT_ACCENT`, qui n'existent jamais sans accent en français (« Resultats », « mots-cles », « Rafraichir »…), et nomme le fichier, la ligne et la forme juste.
- **Code :** [`tests/unit/architecture/screen-text-counters.test.ts`](../tests/unit/architecture/screen-text-counters.test.ts), dans `verify` — refuse un nombre suivi d'un nom au pluriel figé (`{{ n }} articles`, `` `${n} termes` ``). Le nom passe par [`src/utils/plural.ts`](../src/utils/plural.ts) `plural(n, singulier, pluriel?)` : singulier pour 0 et 1, pluriel à partir de 2 ; le nombre reste écrit par l'appelant, dans son format. Un compteur déjà accordé par une branche `n === 1 ? … : …` est admis.
- **Code :** [`shared/types/discovery-tab.types.ts`](../shared/types/discovery-tab.types.ts) `DISCOVERY_SOURCE_LABELS` — libellé français de chaque source de Discovery, lu par les titres de section (`DiscoveryPanel.vue`) et par `toRadarKeywords` : un mot-clé envoyé au Radar sans raison de l'IA porte « Trouvé par Discovery : <section>. » (il portait « Discovered via suggest-alphabet »). Garde : [`tests/unit/shared/discovery-to-radar-reasoning.test.ts`](../tests/unit/shared/discovery-to-radar-reasoning.test.ts).
- **Règles et décisions :** dans un template, le texte fixe n'est pas une chaîne JavaScript : une séquence d'échappement s'y affiche telle quelle. On écrit l'accent directement (fichiers en UTF-8). Le motif du test est construit à partir du code de l'antislash (`String.fromCharCode(92)`), pour qu'aucun outil d'écriture ne le transforme en lettre.
- **Règles et décisions (accents) :** le valideur ne juge que les mots qui n'existent jamais sans accent, et pas les mots anglais courants du code (« selection », « generation », « element » n'y figurent pas) : il ne donne pas de fausse alerte. Les mots justes ou faux selon le sens (« a » / « à », « valide » / « validé ») ne peuvent pas être jugés ainsi ; ils ont été relus à la main le 2026-09-30. Une chaîne d'un seul mot en minuscules (`'intermediaire'`, `'reecriture'`, `'/theme/:themeId'`) est une valeur du code (`isCodeValue`) : niveau d'article, clé, chemin d'API, enregistrés tels quels ; les valeurs de type de mot-clé `'Moyenne traine'` / `'Longue traine'` (`DATA_VALUES`) aussi. Le texte des articles, écrit par l'IA, n'est pas concerné : la porte de publication le juge.

## Boutons visibles
*Exigences : NFR-UX-ACTIONS-VISIBLE*

- **Code :** [`src/components/strategy/ProposedArticleRow.vue`](../src/components/strategy/ProposedArticleRow.vue) — `.proposal-item:hover :deep(.proposal-action-btn)` et `.proposal-item:focus-within :deep(.proposal-action-btn)` révèlent les actions de la carte repliée ; [`ProposedArticleActions.vue`](../src/components/strategy/proposed/ProposedArticleActions.vue) les laisse à `opacity: 0` par défaut et les révèle aussi en `:focus-visible`.
- **Garde :** [`tests/unit/architecture/actions-visible.test.ts`](../tests/unit/architecture/actions-visible.test.ts), dans `verify` — (1) aucun sélecteur d'un style `scoped` de `src/` ne commence par `:deep(` ; (2) le CSS compilé de `ProposedArticleRow.vue` (`@vue/compiler-sfc`, `compileStyle`) révèle `.proposal-action-btn` en `:hover` et en `:focus-within`.
- **Règles et décisions :** un `:deep(.x)` en tête de sélecteur compile en `[data-v-…] .x …` : il ne vise que ce qui est **dans** le composant. Il ne peut donc pas réagir à l'état d'un parent. Les actions de la carte restaient invisibles pour cette raison : la règle de survol était écrite dans le composant enfant. Une règle qui dépend de l'état d'un bloc vit dans le composant qui porte ce bloc : `.parent:hover :deep(.enfant)`.

## Organisation du code
*Exigences : NFR-MAIN-ORG-STORES, NFR-MAIN-ORG-COMPOSABLES, NFR-MAIN-ORG-SERVICES, NFR-MAIN-FILE-SIZE, NFR-INT-MOTEUR-BIMODAL, NFR-INT-API-WRAPPER, NFR-OBS-EXTERNAL-API-OPT-OUT · Design : DESIGN-MAIN-ORG-*, DESIGN-MAIN-FILE-SIZE, DESIGN-INT-MOTEUR-BIMODAL, DESIGN-INT-API-WRAPPER, DESIGN-OBS-EXTERNAL-API-OPT-OUT*

- **Code :** [`src/stores/`](../src/stores/) — `article/` (10), `keyword/` (5), `strategy/` (6), `external/` (`gsc`, `local`), `ui/` (`captain-trigger`, `cost-log`, `gate-alarm`, `notification`, `runtime-mode`, `workflow-nav`).
- **Code :** [`src/composables/`](../src/composables/) — 9 domaines : `article`, `editor`, `intent`, `keyword`, `lexique`, `moteur`, `seo`, `strategy`, `ui`.
- **Code :** [`server/services/`](../server/services/) — 8 domaines : `article`, `external`, `gates`, `infra`, `intent`, `keyword`, `queries`, `strategy`. Deux routes contiennent encore du SQL direct (`article-explorations.routes.ts`, `export.routes.ts`).
- **Code :** prop `mode?: 'workflow' | 'libre'` sur `CaptainPanel.vue`, `DiscoveryPanel.vue`, `LieutenantsPanel.vue`, `StructureHnPanel.vue` et [`src/components/intent/RadarPanel.vue`](../src/components/intent/RadarPanel.vue) ; `LexiquePanel.vue` n'en a pas. `MoteurView.vue` ne passe que `mode="workflow"` : les branches `libre` sont inatteignables.
- **Code :** seuls `fetch()` du navigateur : ceux de `api.service.ts`. Côté serveur, 11 `fetch` précédés de `// External API call — bypass wrapper by design (<fournisseur>)` (DataForSEO ×2, OpenRouter ×2, Google OAuth ×2, GSC, Google Suggest ×3, Tavily) ; `fetchPageHtml` de `scrape-corpus.service.ts` (lecture des pages concurrentes) n'a pas le marqueur.
- **Code :** audit manuel `.claude/skills/data-flow-discipline/scripts/audit_data_flow.py` (`detect_direct_fetch`, `OPT_OUT_MARKER = "External API call"`), non branché sur `verify` ni la CI.
- **Règles et décisions :** taille : aucune règle `max-lines`. Au-delà de 1 000 lignes : `CaptainPanel.vue` (1 614), `data.service.ts` (1 188) ; 53 fichiers dépassent 400.

## Outillage et commandes de vérification
*Exigences : NFR-MAIN-TOOLING, NFR-MAIN-CHECK-HEALTH, NFR-MAIN-NO-CYCLES · Design : DESIGN-MAIN-TOOLING, DESIGN-MAIN-CHECK-HEALTH, DESIGN-MAIN-NO-CYCLES, DESIGN-INFRA-DEPENDENCY-CRUISER*

- **Code :** [`package.json`](../package.json) :
  - `verify` = `run-p` de `verify:lint` (`oxlint .`), `verify:types` (`vue-tsc --build` ∥ `auto:typecheck`), `verify:unit` (Vitest, [`vitest.verify.config.ts`](../vitest.verify.config.ts)), `verify:content` ([`scripts/verify-content.ts`](../scripts/verify-content.ts)), `db:check` ;
  - `verify:full` = `verify` → `verify:eslint` → `check:cycles` → `test:check` ;
  - `check:health` = `run-s lint type-check check:cycles check:dead check:arch` (`lint` corrige : `oxlint --fix`, `eslint --fix`) ;
  - `check:cycles` = `madge --circular … shared server` ([`.madgerc`](../.madgerc) ignore les imports de types) ; `check:arch` = `depcruise shared server src` ([`.dependency-cruiser.cjs`](../.dependency-cruiser.cjs) : `no-server-in-src`, `no-circular`, `score-internal-only-via-index` en erreur ; `no-orphans`, `no-deprecated-core` en avertissement) ; `check:dead` = `knip` ([`knip.json`](../knip.json)) ; `test:mutation` = Stryker.
- **Code :** [`.oxlintrc.json`](../.oxlintrc.json) (catégorie `correctness` en erreur) ; [`eslint.config.ts`](../eslint.config.ts) (Vue essential, TS recommended, Vitest, pont oxlint, `no-explicit-any` en avertissement).
- **Code :** [`.husky/pre-commit`](../.husky/pre-commit) = `npx lint-staged` → `oxlint --fix` puis `eslint --fix --cache` sur `*.{ts,vue,js,mjs}` indexés.
- **Code :** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — sur tout push et PR vers `main` ; Node depuis [`.nvmrc`](../.nvmrc) (24) ; job `unit` (`verify:types`, `vitest run tests/unit tests/functional`) ; job `integration` (PostgreSQL 18, `bootstrap.sql`, silo de départ, serveur 3400, `tests/contract-api`, `tests/integration-tabs`, `tests/e2e-workflows`, deux fichiers de `tests/integration/`) ; job `browser` (après `integration`, ignoré sans secrets DataForSEO).
- **Règles et décisions :** ni le pre-commit ni la CI ne lancent `check:cycles`, `check:dead`, `check:arch` ou ESLint complet : ces contrôles restent manuels (`check:health`, `verify:full`). `madge` ne couvre pas `src/` ; `no-circular` de dependency-cruiser, si.

## Suites de tests et cliquets
*Exigences : NFR-MAIN-TESTS-VITEST, NFR-MAIN-TESTS-PLAYWRIGHT, NFR-MAIN-REQUIREMENTS-TRACE, NFR-TEST-BEHAVIORAL · Design : DESIGN-MAIN-TESTS-VITEST, DESIGN-MAIN-TESTS-PLAYWRIGHT, DESIGN-MAIN-REQUIREMENTS-TRACE, DESIGN-TEST-BEHAVIORAL*

- **Code :** [`vitest.config.ts`](../vitest.config.ts) — `jsdom`, `testTimeout: 20_000`, exclut `tests/browser-e2e/**` et `.stryker-tmp/**`, `globalSetup: tests/helpers/global-runtime-mode.ts`. [`vitest.verify.config.ts`](../vitest.verify.config.ts) — environnement `node`, `tests/unit/{shared,scripts,architecture}` et 6 fichiers de services purs.
- **Données :** `tests/` — `unit/` (427 fichiers : `architecture`, `coherence`, `components`, `composables`, `directives`, `helpers`, `infra`, `router`, `routes`, `schemas`, `scripts`, `services`, `shared`, `stores`, `utils`), `functional/` (4), `contract-api/` (12), `integration-tabs/` (12), `e2e-workflows/` (6), `integration/` (7), `browser-e2e/` (31, dont `parcours/`). Aides : `tests/helpers/` (`test-context.ts` `setupTestContext`, `db-fixtures.ts` `cleanupOrphanedFixtures(maxAgeMs = 1 h)`, `api-client.ts` `expectSuccessOrKnownError`, `external-sources.ts`).
- **Code :** [`scripts/test-snapshot.ts`](../scripts/test-snapshot.ts) / [`scripts/test-check.ts`](../scripts/test-check.ts) — référence `tests/.baseline.json` (`generated_at`, `git`, `totals`, `fingerprint`, `failures`) ; `test:check` sort 1 sur tout nouveau rouge. `verify:content` avertit si la référence a plus de 30 jours.
- **Code :** [`playwright.config.ts`](../playwright.config.ts) — `E2E_SERVER_PORT`/`E2E_CLIENT_PORT` (3410/5410), `testMatch` `*.browser.test.ts` et `*.parcours.test.ts`, `workers: 1`, `webServer` avec `AI_PROVIDER: 'mock'`, `NODE_ENV: 'development'`, `PG_DATABASE` de test, `VITE_CACHE_DIR: 'node_modules/.vite-e2e'` ; `PLAYWRIGHT_NO_SERVER` désactive le démarrage.
- **Code :** [`tests/browser-e2e/e2e-database.ts`](../tests/browser-e2e/e2e-database.ts) — `e2eDatabaseName` (`E2E_PG_DATABASE`, sinon `blog_redactor_seo_test`), `e2eUsesOwnDatabase` (faux si `PARCOURS_REEL=1` ou `PLAYWRIGHT_NO_SERVER`), `refuseToRecreate(target, devDatabase)` ; appliqué par [`scripts/e2e-test-db.ts`](../scripts/e2e-test-db.ts) (coupe les connexions, `DROP`/`CREATE DATABASE`, `bootstrap.sql`, silo « Stratégie & Visibilité »).
- **Code :** [`tests/unit/architecture/requirements-trace.test.ts`](../tests/unit/architecture/requirements-trace.test.ts) — scanne `tests/` (`.ts`, `.js`, `.vue`) pour `(N)FR-…` / `DESIGN-…` ; cherche un FR/NFR dans `spec/requirements.md` puis `prd.md`, un DESIGN dans tous les `.md` de `design/` puis `design-registry.md`, et tout ID dans `epic-qualite-seo-garde-fous.md` ; `LEGACY_ORPHANS` (20) ; sentinelle > 100 IDs. Inclus dans `verify`. Détail : [Tests et outillage](07-tests-et-outillage.md).
- **Code :** [`tests/unit/coherence/test-quality.test.ts`](../tests/unit/coherence/test-quality.test.ts) — `STRICT_LIMITS` (`tautologies: 0`, `conditionalSilent: 0`) ; `SOFT_LIMITS` (`itTodo: 132`, `itSkip: 1`, `alwaysTrueGte0: 6`, `typeofBoolean: 1`, `silentServerSkip: 0`). Hors `verify` ; lancé par `test:unit` et la CI.
- **Code :** tests négatifs des portes : [`tests/browser-e2e/gates.browser.test.ts`](../tests/browser-e2e/gates.browser.test.ts), [`tests/contract-api/gates.contract.test.ts`](../tests/contract-api/gates.contract.test.ts), `tests/unit/components/GateAlarm.test.ts` (détail : [Infrastructure transversale](20-infrastructure.md), « Portes de qualité et dérogations »).
- **Règles et décisions :** les tests Vitest HTTP visent le serveur de développement et sa base (données `[test:<runId>]`, nettoyées). Aucun test navigateur n'emploie `page.goBack` ni `page.route` (panne simulée) ; 3 emploient `page.reload`. Aucun ne passe le texte produit dans `shared/content-validators.ts` ou `shared/seo-validators.ts` : la recette réelle passe par `npm run auto:article -- --mode=real` puis `verify:content`.

## Versions d'exécution
*Exigences : NFR-RT-* · Design : (versions tenues par `package.json`)*

- Voir [Stack et versions](01-architecture.md) (plages de `package.json`, `engines.node: ">=24"`, `.nvmrc` = 24, versions résolues du verrou).
