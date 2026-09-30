---
status: référence
last_updated: 2026-09-28
code_ref: '60b9818 (branche feat/cerveau-generer-au-choix)'
---

# Moteur — Discovery

`DiscoveryPanel.vue` assemble l'onglet. `useDiscoveryPanel` porte l'état et les appels. Trois sous-composables s'y greffent : `useRelevanceScoring` (filtre), `useDiscoveryCache` (sauvegarde), `useDiscoverySelection` (cases). Le serveur expose six routes de mots-clés et quatre routes de sauvegarde. La découverte n'écrit en base qu'à la sauvegarde (`keyword_discoveries`), à l'envoi au Radar (`radar_explorations`) et par la pré-analyse Capitaine (`captain_explorations`).

## Composants et état
*Exigences : FR-DIS-SOURCES, FR-MOT-ARTICLE-SELECTION · Design : DESIGN-DIS-SOURCES*

- **Code :** [`src/components/moteur/DiscoveryPanel.vue`](../src/components/moteur/DiscoveryPanel.vue) — `seedInput`, `hasDiscovered`, `sections` (sept `SourceSection`, `actionLabel: 'Générer'` sur `longtail-ai`), `VISIBLE_THRESHOLD = 100`, `handleDiscover`, `handleGenerateLongTail`, `handleKeywordClick`, `handleSendToRadar`, `handleAnalyze`, `aiPanelState`, `aiCtaDisabled`, `aiIdleMessage`, `aiCtaLabel`, watcher `[pilierKeyword, articleKeyword]`.
- **Sous-composants :** [`discovery/DiscoverySourcesList.vue`](../src/components/moteur/discovery/DiscoverySourcesList.vue), [`discovery/DiscoveryAnalysisResults.vue`](../src/components/moteur/discovery/DiscoveryAnalysisResults.vue), [`discovery/DiscoveryWordGroupsSidebar.vue`](../src/components/moteur/discovery/DiscoveryWordGroupsSidebar.vue), [`discovery/KeywordDiscoveryRelevanceToggle.vue`](../src/components/moteur/discovery/KeywordDiscoveryRelevanceToggle.vue), [`discovery/KeywordDiscoveryCacheBar.vue`](../src/components/moteur/discovery/KeywordDiscoveryCacheBar.vue), [`ai-panel/AiPanel.vue`](../src/components/moteur/ai-panel/AiPanel.vue) (coque toujours rendue ; confirmation de relance dans `AiTriggerButton`).
- **Code :** [`src/composables/keyword/useDiscoveryPanel.ts`](../src/composables/keyword/useDiscoveryPanel.ts).
- **Données :**

| État | Portée |
|---|---|
| listes des sept sources, chargements, `error`, `wordGroups`, `activeGroupFilter`, `analysisResult`, `lastSeed`, `lastFetchKey`, `lastArticleContext` | module (partagé par tous les appels) |
| `relevanceScores`, `relevanceFilterEnabled`, `scoringProgress`, `filteringSuspect` (`useRelevanceScoring`) | instance |
| `selected` (`useDiscoverySelection`) | instance |
| `cacheStatus`, `cacheLoading` (`useDiscoveryCache`) | instance |

- **Règles et décisions :**
  - L'état module permet de retrouver les résultats en changeant d'onglet sans store dédié.
  - `MoteurView` appelle aussi `useDiscoveryPanel()` : son `reset` vide l'état module, mais son `checkCacheForSeed` n'atteint pas le bandeau du panneau (conflit 36).
  - Le panneau reste monté : résultats et cases survivent au changement d'article (conflit 35).

## Sources et lancement
*Exigences : FR-DIS-SOURCES, FR-DIS-LONGTAIL-GENERATION · Design : DESIGN-DIS-SOURCES*

- **Code :** `useDiscoveryPanel.discover(seed, title?, keyword?, painPoint?)` — ne refait rien si `buildFetchKey` est identique et que des résultats existent ; sinon vide tout et lance trois appels en parallèle. `generateLongTail` (courte-traîne), `fetchWordGroups` (au moins 5 mots-clés), `crossSourceMap`, `isMultiSource`, `filteredList` (filtre de groupe + pertinence, tri multi-sources d'abord).
- **API :**

| Route | Service | Contrat de réponse |
|---|---|---|
| `POST /api/keywords/suggest-all` `{ keyword }` | `suggestAll` (4 angles Google Suggest, cache `suggest` 1 h) | `suggestAllContract` |
| `POST /api/keywords/discover` `{ keyword, options.maxResults: 100 }` | `discoverKeywords` (DataForSEO, cache `keyword-discovery` 24 h) | `keywordDiscoveryContract` |
| `POST /api/keywords/radar/generate` `{ title, keyword, painPoint }` | `generateRadarKeywords` (Claude Haiku, prompt `intent-keywords`) — sert la section IA Claude **et** la courte-traîne | `radarGenerateContract` |
| `POST /api/keywords/word-groups` `{ keywords }` | `computeWordGroups` (calcul local) | `wordGroupsContract` |

  Routes dans [`server/routes/keywords.routes.ts`](../server/routes/keywords.routes.ts) et [`server/routes/intent-scan.routes.ts`](../server/routes/intent-scan.routes.ts) (`radar/generate`). Contrats dans [`shared/contracts/discovery.contract.ts`](../shared/contracts/discovery.contract.ts) et [`shared/contracts/radar.contract.ts`](../shared/contracts/radar.contract.ts).
- **Règles et décisions :**
  - Appels parallèles côté navigateur : chaque source s'affiche à son arrivée.
  - La génération IA n'est appelée qu'avec un titre ou un mot-clé d'article. Elle reçoit `painPoint || seed`.
  - Une source en échec vide sa liste et journalise, sans message à l'écran.
  - Coût IA inscrit dans la pile d'activité **une seule fois**, par `apiPost` (champ `usage` de la réponse ; libellé tiré de l'adresse, ou `usageLabel` : « Courte-traîne IA » pour `generateLongTail`). Le composable ne l'ajoute plus lui-même : chaque génération et chaque analyse IA étaient comptées deux fois (recette 2026-09-30, 04 point 1). Garde : [`tests/unit/composables/discovery-cost-log-once.test.ts`](../tests/unit/composables/discovery-cost-log-once.test.ts).

## Filtre de pertinence
*Exigences : FR-DIS-RELEVANCE-FILTER · Design : DESIGN-DIS-RELEVANCE-FILTER*

- **Code :** [`src/composables/keyword/useRelevanceScoring.ts`](../src/composables/keyword/useRelevanceScoring.ts) — `RELEVANCE_THRESHOLD = 0.5`, `SCORE_BATCH_SIZE = 120`, `SCORE_CONCURRENCY = 4`, `STRICT_PASS_TRIGGER_RATIO = 0.10` ; `fetchRelevanceScores` (verrou `_scoringInProgress` + file `_scoreQueuePending`, ne score que les non-scorés) ; `checkRelevance` (non scoré = pertinent ; racine sans mot de 3 lettres = pas de filtre) ; `relevantCount` (uniques) ; `irrelevantCount` (occurrences) ; contrôle « > 90 % sur ≥ 20 » → `filteringSuspect`.
- **API :** `POST /api/keywords/relevance-score` `{ seed, keywords, strict?, articleContext? }` → `{ scores: Record<mot-clé, 0|1>, fallback: false, usage }` ; erreur → 500. Prompt construit dans la route : contexte métier (`getThemeConfig`), règle éliminatoire si douleur ≥ 10 caractères, outil `classify_relevance` (`classifyWithTool`, [`server/services/external/ai-provider.service.ts`](../server/services/external/ai-provider.service.ts)).
- **Données :** aucune écriture ; les scores ne sont conservés que dans la sauvegarde de découverte.
- **Règles et décisions :** la seconde passe (stricte) n'est lancée que si la première a rejeté au moins 10 %, pour ne pas doubler le coût, et ne reprend que les mots-clés jugés pendant cette passe. Un lot en échec reste non scoré, donc visible. `relevanceScores` garde **tous** les jugements de la découverte (remis à zéro par `resetScores` à chaque nouvelle racine) : l'ancien plafond `MAX_RELEVANCE_SCORES = 500` oubliait les premiers jugés au-delà de 500 mots-clés, qui repassaient pour pertinents et étaient rejugés (et repayés) à chaque ajout, et la sauvegarde ne gardait que 500 jugements (recette 2026-09-30, DIS-5 / DIS-6 / DIS-8). Garde : [`tests/unit/composables/relevance-scoring-no-forget.test.ts`](../tests/unit/composables/relevance-scoring-no-forget.test.ts).

## Analyse IA
*Exigences : FR-DIS-AI-ANALYSIS · Design : DESIGN-DIS-AI-ANALYSIS*

- **Code :** `useDiscoveryPanel.analyzeResults` — pool dédupliqué des mots-clés visibles avec sources et métriques ; `analysisResult` remis à `null` au départ ; échec → `error = « Échec de l'analyse IA. Réessayez. »` (partagé avec l'affichage d'erreur de l'onglet). `DiscoveryPanel.handleAnalyze` resauvegarde après succès.
- **API :** `POST /api/keywords/analyze-discovery` `{ seed, keywords[], wordGroups[], articleContext? }` → `{ keywords: [{ keyword, reasoning, priority }], summary, usage }` ; modèle `claude-haiku-4-5-20251001`, 8 192 jetons, outil `curate_keywords` ; 30 groupes au plus dans le prompt ; douleur ≥ 10 caractères comme critère d'inclusion.
- **Règles et décisions :** coque `AiPanel` toujours rendue (états `idle`, `streaming`, `success`, `error`). Priorité illisible ramenée à `low` par le contrat.
- **Tests :** [`tests/unit/components/moteur/DiscoveryAiPanelPersistence.test.ts`](../tests/unit/components/moteur/DiscoveryAiPanelPersistence.test.ts).

## Sauvegarde de découverte
*Exigences : FR-DIS-CACHE · Design : DESIGN-DIS-CACHE*

- **Code :** [`src/composables/keyword/useDiscoveryCache.ts`](../src/composables/keyword/useDiscoveryCache.ts) — `checkCacheForSeed`, `loadFromCache`, `saveToCache`, `clearCacheForSeed`. `useDiscoveryPanel.loadFromCacheAndHydrate` / `saveToCacheFromState` (six sources, `relevanceScores` en `Record`, `wordGroups`, `analysisResult` ; **pas** la courte-traîne). `DiscoveryPanel.vue` — `watch(seedInput)` à 400 ms (sans `immediate`), sauvegarde automatique quand `suggestLoading`, `aiLoading`, `dataforseoLoading` et `semanticLoading` repassent tous à faux avec des résultats.
- **API :** `GET /api/discovery-cache/check?seed=` → `{ cached, cachedAt?, keywordCount?, hasAnalysis? }` ; `GET /api/discovery-cache/load?seed=` → entrée ou `null` ; `POST /api/discovery-cache/save` (validé par `saveDiscoveryCacheSchema`, [`shared/schemas/discovery-cache.schema.ts`](../shared/schemas/discovery-cache.schema.ts)) ; `DELETE /api/discovery-cache?seed=`. Routes : [`server/routes/discovery-cache.routes.ts`](../server/routes/discovery-cache.routes.ts).
- **Code serveur :** [`server/services/infra/discovery-cache.service.ts`](../server/services/infra/discovery-cache.service.ts) — `checkCache`, `loadCache`, `saveCache` (écrit `cachedAt`, `expiresAt` = +30 j), `clearCache`, `countKeywords` (six sources). [`server/services/keyword/keyword-discovery-db.service.ts`](../server/services/keyword/keyword-discovery-db.service.ts) — `getKeywordDiscovery`, `saveKeywordDiscoverySources` (upsert sur `(seed, lang)`), `deleteKeywordDiscovery`, `isKeywordDiscoveryFresh` (non appelée).
- **Données :** `keyword_discoveries (seed, lang, sources_json JSONB, ai_analysis_json JSONB, fetched_at)`, clé `(seed, lang='fr')`, correspondance exacte du texte. Tout l'état, analyse comprise, va dans `sources_json` ; `ai_analysis_json` n'est pas écrit.
- **Règles et décisions :**
  - Clé par mot-clé racine, pas par article : une découverte sert à tout le cocon. La dernière analyse sauvegardée remplace la précédente.
  - Pas d'expiration appliquée (conflit 21).

## Envoi au Radar et étape Discovery
*Exigences : FR-DIS-SEND-TO-RADAR, FR-DIS-CHECK · Design : DESIGN-DIS-SEND-TO-RADAR, DESIGN-DIS-CHECK*

- **Code :** `useDiscoveryPanel.getRadarKeywords` — cochés parmi DataForSEO, IA, les quatre angles Suggest (`toRadarKeywords`, [`shared/types/discovery-tab.types.ts`](../shared/types/discovery-tab.types.ts) : sans raison de l'IA, « Trouvé par Discovery : <section>. », d'après `DISCOVERY_SOURCE_LABELS`), puis cochés de l'analyse IA absents, avec leur raison. `DiscoveryPanel.handleSendToRadar` émet `send-to-radar`. `useMoteurCrossTabState.handleSendToRadar` : `setActiveTab('radar')`, `emitCheckCompleted(MOTEUR_DISCOVERY_DONE)`, puis `radarStore.addKeywordsBatch` (non attendu). `RadarPanel.vue` — watcher `injectedKeywords` (`immediate`) rejoue `addKeywordsBatch`.
- **API :** `POST /api/articles/:id/radar-exploration/keywords` `{ keywords: [{ keyword, reasoning? }] }` → `{ entry, added }` (ajout idempotent, `addKeywordsBatchToRadarExploration`, [`server/services/infra/radar-exploration.service.ts`](../server/services/infra/radar-exploration.service.ts)) ; `POST /api/articles/:id/progress/check` `{ check: 'moteur:discovery_done' }`.
- **Données :** `radar_explorations.generated_keywords` ; `articles.completed_checks`.
- **Règles et décisions :**
  - L'étape est émise par le composable parent, jamais par le panneau : Discovery ne connaît pas la constante.
  - Double écriture sans doublon.
  - Navigation et étape avant l'écriture ; courte-traîne exclue (conflits 20 et 22).

## Pré-analyse Capitaine
*Exigences : FR-DIS-CAPTAIN-PRESCAN · Design : (aucun DESIGN existant ; ID créé)*

- **Code :** [`src/stores/ui/captain-trigger.store.ts`](../src/stores/ui/captain-trigger.store.ts) — `schedule` (`SCHEDULED_MS = 5_000`, une entrée par mot-clé), `cancel`, `cancelAll`, `runValidation` (`POST /keywords/:kw/scan` avec `level`, `articleId`, `painPoint?`, puis `POST /articles/:id/captain-explorations`), `recentlyFired`. [`src/components/shared/CaptainTriggerToast.vue`](../src/components/shared/CaptainTriggerToast.vue) — monté dans `App.vue`. `DiscoveryPanel.handleKeywordClick` : planifie au cochage (si `articleId`), annule au décochage.
- **Données :** `captain_explorations` (et métriques cross-article du scan).
- **Règles et décisions :** store global pour que le toast et le panneau voient la même file. Échec silencieux (journal seulement). Pas d'annulation au démontage de l'onglet.

---
