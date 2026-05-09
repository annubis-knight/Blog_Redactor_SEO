---
title: 'Découplage services Lieutenants/Lexique + scrape-corpus neutre'
slug: decouplage-lieutenants-lexique
version: 1.0.0
last_updated: 2026-05-09
status: in-progress
owner: Arnaud
related_nfr: NFR-MOT-LEXIQUE-DECOUPLAGE
related_fr:
  - FR-INFRA-SCRAPE-CORPUS-NEUTRE
  - FR-LIE-SCRAPE-DEDIE
  - FR-LEX-SCRAPE-DEDIE
related_fr_indirect:
  - FR-LIE-SERP-ANALYZE
  - FR-LEX-TFIDF
  - NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION
  - NFR-INT-SERP-ONCE
synced_with:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/_archive/tech-spec-keyword-metrics-decomposition.md
  - _bmad-output/planning-artifacts/epics-decouplage-lieutenants-lexique.md
  - _bmad-output/planning-artifacts/stories-decouplage-lieutenants-lexique.md
  - _bmad-output/planning-artifacts/sprint-plan-decouplage-lieutenants-lexique.md
  - docs/data-flows/lieutenants.md
  - docs/data-flows/lexique.md
  - docs/data-flows/keyword-metrics.md
---

# Tech-Spec — Découplage services Lieutenants/Lexique + `scrape-corpus` neutre

> Plan d'implémentation pour la NFR `NFR-MOT-LEXIQUE-DECOUPLAGE` (PRD §8.3) et les FR `FR-INFRA-SCRAPE-CORPUS-NEUTRE`, `FR-LIE-SCRAPE-DEDIE`, `FR-LEX-SCRAPE-DEDIE`.
> **Aucun code dans ce document. C'est un livrable de planification.**

---

## 1. Overview

### Problème

Aujourd'hui, [server/services/external/serp-analysis.service.ts:168](../../server/services/external/serp-analysis.service.ts#L168) (`analyzeSerpCompetitors`) fait **5 choses dans un seul bloc** :

1. `fetchSerp(keyword)` + `fetchPaa(keyword)` (DataForSEO) en parallèle.
2. `Promise.all` sur 10 URLs — `fetchPageHtml` → `extractHeadings` + `extractTextContent` + `classifyIsBlog`.
3. Construit un blob monolithique `SerpAnalysisResult { competitors[], paaQuestions[], maxScraped, cachedAt, fromCache }`.
4. Persiste atomiquement dans `keyword_serp_results` + `keyword_serp_scrapes` + `keyword_paa_questions` (post-chantier 1).
5. Retourne le blob qui mélange `headings[]` (Lieutenants) ET `textContent` (Lexique).

**Symptômes opérationnels** :
- Le **Lexique ne peut pas démarrer sans qu'un appel Lieutenants ait préalablement peuplé `keyword_serp_scrapes`** → 404 perçu sur `/serp/tfidf` (article 64, 2026-05-08), traité comme erreur technique alors que c'est un état attendu.
- Aucun **cache mémoire courte durée** : si Lieutenants vient de scraper et que Lexique demande la même chose 30 s plus tard, il refait potentiellement le travail (aujourd'hui sauvé par le cache DB 7j, mais l'invariant n'est pas formalisé côté service).
- `serp-analysis.service.ts` est un **point de couplage involontaire** : tout consommateur amont est forcé d'importer le blob complet et de payer la sérialisation `textContent` (~50-100 ko/concurrent) même quand il n'a besoin que de `headings[]`.

### Solution

Décomposer le service monolithique en **3 services à responsabilité unique**, qui partagent la même couche de persistance neutre (`keyword_serp_results` + `keyword_serp_scrapes` + `keyword_paa_questions`, livrée par le chantier 1) :

| Service | Responsabilité | Lit | Écrit | Connaît |
|---|---|---|---|---|
| `scrape-corpus.service.ts` (`server/services/external/`) | Fetch SERP DataForSEO + scrape HTTP des 10 URLs + extraction `headings`/`text_content`/`is_blog` + persistance neutre. **Cache mémoire 1h** par keyword. | `keyword_serp_results` (freshness), `keyword_serp_scrapes` | `keyword_serp_results`, `keyword_serp_scrapes`, `keyword_paa_questions` (DataForSEO PAA piggy-back) | Aucun mot d'onglet (Lieutenants / Lexique). |
| `lieutenants-analysis.service.ts` (`server/services/keyword/` ou `server/services/intent/`) | Demande `getHeadings(keyword)` au scrape-corpus, propose les Lieutenants via IA (`ai-provider.service`), persiste dans `lieutenant_explorations`. | scrape-corpus → `headings[]` + `isBlog` | `lieutenant_explorations` | Aucun import du Lexique. |
| `lexique-analysis.service.ts` (`server/services/keyword/`) | Demande `getTextContent(keyword)` au scrape-corpus, calcule TF-IDF (réutilise [server/services/keyword/tfidf.service.ts](../../server/services/keyword/tfidf.service.ts)) + analyse IA, persiste dans `lexique_explorations`. | scrape-corpus → `text_content[]` | `lexique_explorations` | Aucun import des Lieutenants. |

**Service à déprécier** : `analyzeSerpCompetitors` ([serp-analysis.service.ts:168](../../server/services/external/serp-analysis.service.ts#L168)). Pendant la bascule, il devient un **wrapper deprecated** qui délègue à `scrape-corpus` + retourne un blob compatible. Suppression finale en story C3.

### In Scope

- Création **`server/services/external/scrape-corpus.service.ts`** avec deux fonctions de lecture distinctes (`getHeadings(keyword)`, `getTextContent(keyword)`) + un orchestrateur d'écriture (`fetchAndPersist(keyword, articleLevel)`), cache mémoire 1h par `(keyword, lang, country)`.
- Création **`server/services/keyword/lieutenants-analysis.service.ts`** qui consomme `scrape-corpus.getHeadings` + `getPaaQuestions` (depuis `keyword-serp.service.ts`) + IA (`ai-provider.service`).
- Création **`server/services/keyword/lexique-analysis.service.ts`** qui consomme `scrape-corpus.getTextContent` + `extractTfidf` ([tfidf.service.ts:94](../../server/services/keyword/tfidf.service.ts#L94)) + IA.
- Bascule de la route **`POST /api/serp/analyze`** : appelle désormais `lieutenants-analysis.service` (qui passe par `scrape-corpus`). Le contrat de réponse est préservé (forme `SerpAnalysisResult`) le temps de la transition. Note : l'UI Lieutenants restera consommatrice naturelle ; les ACs Lieutenants couvrent les invariants.
- Bascule de la route **`POST /api/serp/tfidf`** : appelle désormais `lexique-analysis.service` (qui passe par `scrape-corpus.getTextContent`). Le 404 actuel ("Lancez d'abord l'analyse SERP") est **conservé verbatim** — sa résolution UX (FR-LEX-PRECHECK-SERP) est en chantier 3.
- Suppression progressive de `analyzeSerpCompetitors` ([serp-analysis.service.ts:168](../../server/services/external/serp-analysis.service.ts#L168)) : transformé en stub deprecated en C1, supprimé en C3 après bascule complète.
- **Tests architecturaux par grep** (Vitest) qui scannent le source des 3 nouveaux services et vérifient l'absence d'imports croisés interdits (cf. AC.SCRAPE.1, AC.LIE-SCRAPE.1, AC.LEX-SCRAPE.1).
- Tests d'intégration **AC.DECOUPLAGE.1/.2/.4** : Lexique sur keyword vierge sans Lieutenants, Lieutenants sur keyword vierge sans Lexique, cache mémoire partagé (mock count des appels HTTP).
- Headers `AUTHORITY:` posés sur les 3 nouveaux services (CLAUDE.md §3.2).
- Mise à jour des docs `lieutenants.md`, `lexique.md`, `keyword-metrics.md` (data-flows) + PRD (`proposed → active` pour les 3 FRs + 1 NFR).

### Out of Scope

- **Refonte schéma `keyword_metrics`** (chantier 1) — supposé livré (✅ `sprint-keyword-metrics-decomposition: done`, [sprint-status.yaml:68](../implementation-artifacts/sprint-status.yaml#L68)). La colonne `serp_raw_json` a déjà été dropée (commit `b193997`).
- **UI Lexique** : système d'onglets `lexique_explorations`, container `LexiquePanel.vue` refactor (FR-LEX-MULTI-KEYWORD-TABS) — **chantier 3**.
- **Endpoint pré-check 404** : `GET /api/keywords/:keyword/serp/exists` (FR-LEX-PRECHECK-SERP) — **chantier 3**.
- **Refactor IA Lieutenants/Lexique** : les prompts (`lieutenants-ai-panel.md`, `lexique-ai-panel.md`) et la logique d'appel `ai-provider.service` restent identiques — on déplace, on ne ré-écrit pas.
- **Suppression de la route `/serp/tfidf`** : conservée (cf. AC.LEX-SCRAPE.5). Suppression différée hors-chantier.
- **Changements de TTL** : cache mémoire 1h hardcodé en constante du service ; le cache DB 7j (chantier 1) n'est pas touché.
- **Multi-process / cluster** : le cache mémoire 1h est module-scoped (process unique). Si un jour le serveur passe en multi-worker, prévoir une story dédiée (Redis / IPC) — pas dans le périmètre.

---

## 2. Cartographie data-flow (Phase 2.0 CLAUDE.md)

### 2.1 État avant

```
                         POST /api/serp/analyze
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   analyzeSerpCompetitors    │
                    │  (serp-analysis.service)    │
                    └──┬──────────┬───────────────┘
                       │          │
                       ▼          ▼
                  fetchSerp    fetchPageHtml × 10
                  fetchPaa     ├─► extractHeadings
                               ├─► extractTextContent
                               └─► classifyIsBlog
                                  │
                                  ▼
                       SerpAnalysisResult (blob monolithique)
                       { competitors[], paaQuestions[], maxScraped, ... }
                                  │
                       ┌──────────┼──────────────┐
                       ▼          ▼              ▼
                 keyword_serp_   _scrapes      _paa_questions
                 _results        (headings +   (Q + answer)
                 (URLs Top 10)    text_content
                                  + is_blog)

  Consommation côté UI :
  - LieutenantsPanel ──► /serp/analyze  ──► utilise headings + isBlog (ignore textContent)
  - LexiquePanel ─────► /serp/tfidf    ──► utilise getSerpScrapes().text_content
                                          (404 si table vide → couplage d'ordre)
```

### 2.2 État après

```
                ┌───────────────────────────────────┐
                │   scrape-corpus.service.ts        │
                │   (neutre, ignore Lieutenants     │
                │    et Lexique)                    │
                │                                   │
                │   - fetchAndPersist(kw, level)    │
                │   - getHeadings(kw)               │
                │   - getTextContent(kw)            │
                │   - getPaaQuestions(kw)           │
                │   - cache mémoire 1h (Map)        │
                └────────┬──────────┬───────────────┘
                         │          │
                         ▼          ▼
                  fetchSerp,     keyword_serp_results
                  fetchPaa,                        ─┐
                  fetchPageHtml × 10               ─┤── persist atomique
                  extract* + classifyIsBlog         │   (transaction)
                                                  ─┘
                  keyword_serp_scrapes
                  keyword_paa_questions

       ▲                                            ▲
       │ getHeadings + isBlog                       │ getTextContent
       │                                            │
┌──────┴────────────────────┐         ┌────────────┴────────────────┐
│ lieutenants-analysis.svc  │         │ lexique-analysis.svc        │
│ (no import lexique-*)     │         │ (no import lieutenants-*)   │
│                           │         │                             │
│ - propose lieutenants IA  │         │ - extractTfidf              │
│ - écrit lieutenant_       │         │ - analyse IA Lexique        │
│   explorations            │         │ - écrit lexique_explorations│
└─────────┬─────────────────┘         └────────────┬────────────────┘
          │                                        │
          ▼                                        ▼
   POST /api/serp/analyze                  POST /api/serp/tfidf
   (route conservée)                       (route conservée)
```

### 2.3 Producteurs / consommateurs / persistance / cas d'usage / régressions

| Axe | Avant | Après | Note |
|---|---|---|---|
| **Producteurs** scrapes | `analyzeSerpCompetitors` (1 fonction qui fait tout) | `scrape-corpus.fetchAndPersist` (seul producteur cross-domaine). Lieutenants et Lexique délèguent. | Single-writer pattern : aucun chemin alternatif. |
| **Consommateurs** scrapes | `analyzeSerpCompetitors` lit directement le blob qu'il vient d'écrire | `getHeadings(keyword)` (Lieutenants) et `getTextContent(keyword)` (Lexique) — deux lectures **scopées par colonne**. | AC.SCRAPE.5 : pas de blob monolithique. |
| **Persistance** | `keyword_serp_results` / `_scrapes` / `_paa_questions` (chantier 1, ✅ livré) | Idem — pas de nouveau schéma DB. | Le découplage est **service-only**. |
| **Cache** | DB seule (TTL 7j sur `keyword_serp_results.fetched_at`) | DB 7j (inchangé) **+ cache mémoire 1h** module-scoped dans `scrape-corpus`. | Clé : `${keyword}:${lang}:${country}`. Valeur : `{ result, cachedAt }`. Eviction LRU optionnelle (taille bornée à ~100 entrées). |
| **Cas d'usage** | (a) Lieutenants déclenche analyse, Lexique consomme ensuite ; (b) Reload article frais ; (c) Multi-article même keyword (NFR-INT-SERP-ONCE) ; (d) Lexique sur keyword vierge → 404 | (a) Lieutenants déclenche `lieutenants-analysis` → `scrape-corpus` ; cache mémoire chaud → Lexique consomme via `lexique-analysis` sans nouveau scrape ; (b/c) inchangés ; (d) **Lexique vierge peut maintenant déclencher** `scrape-corpus.fetchAndPersist` lui-même via `lexique-analysis` (cf. AC.LEX-SCRAPE.3 + chantier 3 pour l'UX). | Le 404 actuel sur `/serp/tfidf` reste exposé — la résolution UX du 404 est **chantier 3**. |
| **Régressions historiques** | 1) Sprint 15.5-bis (2026-05-03) avait fusionné `serp_explorations` (article-scoped) → `keyword_metrics.serp_raw_json` (cross-article) puis 4 tables filles. 2) Couplage UI Lexique → 404 (article 64, 2026-05-08). | 1) Confirmer qu'aucun nouveau service ne réintroduit un `*_explorations` cross-article. 2) Corrigé en partie ici (le service Lexique peut tourner sans Lieutenants), reste UX en chantier 3. | Tests `tests/unit/coherence/lieutenants.test.ts` et `tests/unit/coherence/lexique.test.ts` doivent rester verts. |

### 2.4 Cohérence affichage / calcul

Pas de valeur affichée à l'utilisateur dans ce chantier (changement purement backend). MAIS un invariant à préserver :

- **`fromCache` flag** (`SerpAnalysisResult.fromCache`) : retourné par la route `/serp/analyze`. Aujourd'hui : `true` si `getSerpResultsFresh(keyword)` retourne un résultat ([serp-analysis.routes.ts:34-37](../../server/routes/serp-analysis.routes.ts#L34-L37)). **Demain** : `true` si soit le cache mémoire 1h hit, soit le cache DB 7j hit (mêmes règles, cache mémoire transparent au consommateur). À documenter dans le contrat.
- **NFR-INT-SERP-ONCE** : article A déclenche analyse → article B même keyword ne refait pas le fetch externe. Test `tests/unit/coherence/lieutenants.test.ts:44` doit rester vert. L'ajout du cache mémoire 1h **renforce** cet invariant (il ne le casse pas).

### 2.5 Headers `AUTHORITY:` à poser

**`scrape-corpus.service.ts`** (nouveau) :

```
AUTHORITY: PostgreSQL `keyword_serp_results` + `keyword_serp_scrapes` + `keyword_paa_questions`
           (writes only — single producer cross-domaine).
           Cache mémoire 1h module-scoped : Map<"keyword:lang:country", {result, cachedAt}>.
READS FROM: getSerpResultsFresh, getSerpScrapes (depuis keyword-serp.service).
WRITES TO: scrape-corpus.fetchAndPersist (transaction unique via withSerpTransaction).
EXPOSES: getHeadings(keyword), getTextContent(keyword), getPaaQuestions(keyword),
         fetchAndPersist(keyword, articleLevel).
CONSUMERS: lieutenants-analysis.service, lexique-analysis.service.
RELATED FR: FR-INFRA-SCRAPE-CORPUS-NEUTRE, NFR-MOT-LEXIQUE-DECOUPLAGE,
            NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION, NFR-INT-SERP-ONCE.
NEVER IMPORTS: tfidf.service, lieutenants-*.service, lexique-*.service
              (test grep architectural — AC.SCRAPE.1).
```

**`lieutenants-analysis.service.ts`** (nouveau) :

```
AUTHORITY: PostgreSQL `lieutenant_explorations`.
           Service métier Lieutenants. Lit headings + isBlog via scrape-corpus.
READS FROM: scrape-corpus.getHeadings, scrape-corpus.getPaaQuestions, ai-provider.service.
WRITES TO: lieutenant_explorations (via lieutenants-exploration.service ou direct).
EXPOSES: proposeLieutenants(keyword, articleLevel, painPoint?).
CONSUMERS: server/routes/serp-analysis.routes (POST /api/serp/analyze).
RELATED FR: FR-LIE-SCRAPE-DEDIE, FR-LIE-SERP-ANALYZE.
NEVER IMPORTS: tfidf.service, lexique-*.service (test grep — AC.LIE-SCRAPE.1).
NEVER READS: textContent du scrape (test mock count — AC.LIE-SCRAPE.2).
```

**`lexique-analysis.service.ts`** (nouveau) :

```
AUTHORITY: PostgreSQL `lexique_explorations`.
           Service métier Lexique. Lit text_content via scrape-corpus.
READS FROM: scrape-corpus.getTextContent, tfidf.service.extractTfidf, ai-provider.service.
WRITES TO: lexique_explorations (via lexique-exploration.service.saveLexiqueTfidf).
EXPOSES: analyzeLexique(keyword, articleId?, painPoint?).
CONSUMERS: server/routes/serp-analysis.routes (POST /api/serp/tfidf).
RELATED FR: FR-LEX-SCRAPE-DEDIE, FR-LEX-TFIDF, FR-LEX-MULTI-KEYWORD.
NEVER IMPORTS: lieutenants-*.service, components/moteur/Lieutenants* (test grep — AC.LEX-SCRAPE.1).
NEVER READS: headings du scrape (test mock count — AC.LEX-SCRAPE.2).
```

---

## 3. Contrats des 3 services

### 3.1 `scrape-corpus.service.ts`

**Localisation** : `server/services/external/scrape-corpus.service.ts`. Côté `external/` car (a) il orchestre les appels externes (DataForSEO + scraping HTTP) et (b) c'est l'agnostic d'onglet (au sens où les services métier `keyword/` le consomment).

**API publique (exhaustive)** :

| Fonction | Signature | Comportement |
|---|---|---|
| `fetchAndPersist` | `(keyword: string, articleLevel: ArticleLevel, lang?: string, country?: string) => Promise<ScrapeCorpusResult>` | Si cache mémoire 1h hit → retourne l'entrée. Sinon : (1) check DB freshness (`getSerpResultsFresh`) → si frais, hydrate cache mémoire et retourne. (2) Sinon : `fetchSerp` + `fetchPaa` parallèles, scrape 10 URLs (Promise.all), persiste en transaction (`upsertSerpResults`+`upsertSerpScrapes`+`upsertPaaQuestions`+stub `keyword_metrics`), met en cache mémoire, retourne. |
| `getHeadings` | `(keyword: string, lang?: string, country?: string) => Promise<Array<{ position, url, domain, headings: HnNode[], isBlog: boolean }>>` | Lit `keyword_serp_scrapes` (`SELECT keyword, position, url, domain, headings, is_blog`). **Ne lit pas `text_content`**. Retourne `[]` si table vide. |
| `getTextContent` | `(keyword: string, lang?: string, country?: string) => Promise<Array<{ position, url, textContent: string \| null }>>` | Lit `keyword_serp_scrapes` (`SELECT position, url, text_content`). **Ne lit pas `headings`**. Retourne `[]` si table vide. |
| `getPaaQuestions` | `(keyword: string, lang?: string, country?: string) => Promise<PaaQuestionRow[]>` | Re-export typé de `keyword-serp.service.getPaaQuestions` (ou wrapper trivial). Permet aux services métier de ne dépendre que de `scrape-corpus`. |

**Type retourné par `fetchAndPersist`** :

```typescript
interface ScrapeCorpusResult {
  keyword: string
  lang: string
  country: string
  fromCache: 'memory' | 'db' | null  // null = fetch externe
  scrapedAt: string                  // ISO timestamp
  serpResults: SerpResult[]          // 10 URLs (réutilise type chantier 1)
  scrapes: SerpScrape[]              // 0..10 rows (peut avoir < 10 en cas d'erreur)
  paaQuestions: PaaQuestionRow[]     // 0..N
}
```

**Cache mémoire** :
- Structure : `Map<string, { result: ScrapeCorpusResult, cachedAt: number /* Date.now() */ }>`.
- Clé : `${keyword.toLowerCase()}:${lang}:${country}`.
- TTL : `60 * 60 * 1000` ms (constante `MEMORY_CACHE_TTL_MS`).
- Eviction : LRU bornée (taille max 100 entrées, constante `MEMORY_CACHE_MAX_ENTRIES`) — implémentation simple : on stocke `lastAccessedAt`, on évince le plus ancien quand la taille dépasse.
- Pas d'invalidation explicite côté API publique pour cette story (si le besoin émerge ultérieurement → story dédiée).

**Helpers extraits depuis `serp-analysis.service.ts`** : `extractHeadings`, `extractTextContent`, `classifyIsBlog`, `fetchPageHtml` migrent dans `scrape-corpus.service.ts` (ou restent exportés depuis `serp-analysis.service.ts` et sont importés — décision à trancher en story A1, mais penche vers déplacement complet pour faire de `scrape-corpus` le seul propriétaire).

### 3.2 `lieutenants-analysis.service.ts`

**Localisation** : `server/services/keyword/lieutenants-analysis.service.ts`.

**API publique** :

| Fonction | Signature | Comportement |
|---|---|---|
| `proposeLieutenants` | `(keyword: string, articleLevel: ArticleLevel, opts?: { articleId?: number, painPoint?: string \| null }) => Promise<ProposeLieutenantsServiceResult>` | (1) `await scrapeCorpus.fetchAndPersist(keyword, articleLevel)` (assure que scrapes existent — si DB déjà fraîche ou cache mémoire, c'est instantané). (2) `headings = await scrapeCorpus.getHeadings(keyword)` (rejette `textContent`). (3) `paa = await scrapeCorpus.getPaaQuestions(keyword)`. (4) Construit le prompt IA Lieutenants existant (réutilise les fonctions actuelles dans `server/services/intent/` ou équivalent). (5) Appelle `aiProvider.generateText` ou équivalent. (6) Persiste via `lieutenants-exploration.service.saveLieutenantsProposal(articleId, ...)` si `articleId` fourni. (7) Retourne `{ proposed, hnStructure, contentGapInsights, totalGenerated }`. |

Le type `ProposeLieutenantsServiceResult` est aligné sur `FilteredProposeLieutenantsResult` ([shared/types/serp-analysis.types.ts:70](../../shared/types/serp-analysis.types.ts#L70)) — pas de nouveau type partagé.

**Logique IA déplacée vs réutilisée** : la prompt Lieutenants et la fonction qui appelle `ai-provider.service` existent déjà aujourd'hui (probablement dans `server/services/intent/` ou inline dans la route `/serp/analyze` historique). Cette story **déplace** cette logique dans `lieutenants-analysis.service.ts` — elle ne ré-écrit pas le prompt.

### 3.3 `lexique-analysis.service.ts`

**Localisation** : `server/services/keyword/lexique-analysis.service.ts`.

**API publique** :

| Fonction | Signature | Comportement |
|---|---|---|
| `analyzeLexique` | `(keyword: string, opts?: { articleId?: number, painPoint?: string \| null, triggerScrapeIfMissing?: boolean }) => Promise<LexiqueAnalysisServiceResult>` | (1) Si `triggerScrapeIfMissing=true` (chantier 3 utilisera ce flag derrière une confirmation UX), `await scrapeCorpus.fetchAndPersist(keyword, 'specifique')` *(ArticleLevel = `'pilier' | 'intermediaire' | 'specifique'` — pas de niveau `'libre'` ; on choisit `'specifique'` par défaut, sémantique = exploration ciblée d'un keyword précis. Le niveau ne change pas le scrape lui-même, il sert au logging)*. Sinon, ne déclenche pas. (2) `texts = await scrapeCorpus.getTextContent(keyword)` (rejette `headings`). (3) Si `texts.length === 0` → throw `LexiqueScrapeMissingError` (message verbatim "Lancez d'abord l'analyse SERP dans l'onglet Lieutenants" — préservé pour ne pas casser AC.C1.1 du chantier 1). (4) `tfidfResult = await extractTfidf(keyword)` (réutilise [tfidf.service.ts:94](../../server/services/keyword/tfidf.service.ts#L94)). (5) Construit le prompt Lexique IA (`lexique-ai-panel.md`) + appelle `ai-provider.service`. (6) Persiste via `lexique-exploration.service.saveLexiqueTfidf(articleId, keyword, tfidfResult)` si `articleId` fourni (existe déjà cf. [serp-analysis.routes.ts:79](../../server/routes/serp-analysis.routes.ts#L79)). (7) Retourne `{ tfidfResult, aiRecommendations, aiMissingTerms, aiSummary }`. |

**Note importante** : la route `/serp/tfidf` actuelle ne fait **pas** d'appel IA (cf. [serp-analysis.routes.ts:75](../../server/routes/serp-analysis.routes.ts#L75) — elle retourne juste `tfidfResult`). L'IA Lexique est appelée séparément via `keyword-ai-panel.routes.ts` (FR-LEX-AI-PANEL). Pour ne pas changer le contrat HTTP, **le service `lexique-analysis` expose `analyzeLexique` qui peut renvoyer juste le TF-IDF** — l'IA reste un appel séparé côté route. Décision finale en story B2 : signature `analyzeLexique` retourne `{ tfidfResult, aiRecommendations?: ... }`, et la route `/serp/tfidf` ne consomme que `tfidfResult`. Code 404 et message "Lancez d'abord l'analyse SERP" préservés verbatim (cf. AC.LEX-SCRAPE.5).

### 3.4 Cache mémoire 1h — détail d'implémentation

Pourquoi pas un LRU lib externe : la complexité de la logique est faible (Map + timestamp), et ajouter une dépendance pour ~30 lignes de code est démesuré. Comparable à [server/utils/cache-helpers.ts](../../server/utils/cache-helpers.ts) qui implémente déjà un cache simple en interne.

**Pseudo-contrat** :

```
type Key = `${string}:${string}:${string}`  // keyword:lang:country (lowercase)

const cache = new Map<Key, { result: ScrapeCorpusResult, cachedAt: number, lastAccessedAt: number }>()

function getFromMemory(key: Key): ScrapeCorpusResult | null
function putInMemory(key: Key, result: ScrapeCorpusResult): void
function evictIfNeeded(): void   // appelée dans putInMemory si cache.size > MAX
```

**Tests d'invariants** (story A2) :
- Cache hit < 1h → retourne `result` avec `fromCache: 'memory'`.
- Cache miss après 1h → retourne `null`, force re-fetch (DB ou externe).
- Eviction LRU : au-delà de 100 entrées, la plus ancienne par `lastAccessedAt` est éjectée.

---

## 4. Stratégie de bascule

Approche **expand-and-contract** sur les 3 services + 2 routes, en 4 vagues claires :

| Vague | Étape | Effet sur le code en prod | Risque |
|---|---|---|---|
| 1 | Création `scrape-corpus.service` (sans consommateurs) + tests | Aucun — code mort jusqu'à v2 | Faible (greenfield) |
| 2 | Création `lieutenants-analysis.service` + `lexique-analysis.service` (sans consommateurs) + tests architecturaux grep | Aucun — toujours mort | Faible |
| 3 | Bascule route `/serp/analyze` → `lieutenants-analysis` (story C1). `analyzeSerpCompetitors` devient un wrapper deprecated qui délègue à `lieutenants-analysis` (compat tests legacy). | Production utilise désormais le nouveau chemin pour Lieutenants. Lexique encore sur `/serp/tfidf` original. | Moyen (NFR-INT-SERP-ONCE à monitorer) |
| 4 | Bascule route `/serp/tfidf` → `lexique-analysis` (story C2). Suppression définitive de `analyzeSerpCompetitors` + tests legacy nettoyés (story C3). | `analyzeSerpCompetitors` n'existe plus. | Moyen (cohérence cache mémoire entre Lieutenants et Lexique à valider) |

**Ce que le wrapper deprecated `analyzeSerpCompetitors` retourne pendant V3** : un blob `SerpAnalysisResult` reconstruit à partir des résultats de `scrape-corpus`. Format strictement compatible avec ce que retournait l'ancien (mêmes clés, mêmes types). Marqué `@deprecated` dans la JSDoc + log warn `analyzeSerpCompetitors deprecated wrapper, switch to lieutenants-analysis or scrape-corpus directly`.

---

## 5. Tests architecturaux par grep

Tests Vitest dédiés (un seul fichier `tests/unit/architecture/decouplage-lieutenants-lexique.test.ts`) qui lisent le source des fichiers et font des assertions :

| Test | Cible | Règle |
|---|---|---|
| AC.SCRAPE.1 | `scrape-corpus.service.ts` | Aucun import dont le path matche `/tfidf|lieutenants|lexique/i`. |
| AC.LIE-SCRAPE.1 | `lieutenants-analysis.service.ts` | Aucun import dont le path matche `/tfidf|lexique-/i`. |
| AC.LEX-SCRAPE.1 | `lexique-analysis.service.ts` | Aucun import dont le path matche `/lieutenants-/i` (côté server) ni `/components\/moteur\/Lieutenants/i` (impossible côté server, mais filet supplémentaire). |
| AC.DECOUPLAGE.3 | `lieutenants-analysis.service.ts` ↔ `lexique-analysis.service.ts` | Vérification croisée : ni l'un ni l'autre n'importe l'autre. |

**Implémentation** : `fs.readFileSync` du fichier source + regex sur les `import` statements. Pas de TypeScript AST nécessaire (c'est suffisant pour la règle simple "0 occurrence du path").

**Tests d'intégration côté DB** (un seul fichier `tests/integration/decouplage-lieutenants-lexique.test.ts`) :

| Test | Cible |
|---|---|
| AC.DECOUPLAGE.1 | Lexique vierge, jamais touché par Lieutenants → `analyzeLexique(keyword, { triggerScrapeIfMissing: true })` réussit ; **mock count** d'`fetch` à `lieutenants-analysis` = 0. |
| AC.DECOUPLAGE.2 | Lieutenants vierge → `proposeLieutenants(keyword)` réussit ; mock count d'`fetch` à `lexique-analysis` = 0. |
| AC.DECOUPLAGE.4 | `proposeLieutenants(kw)` puis `analyzeLexique(kw, { triggerScrapeIfMissing: true })` → mock count `fetchPageHtml` = 10 (pas 20). Cache mémoire 1h fait son travail. |
| AC.SCRAPE.2 | `scrapeCorpus.fetchAndPersist(kw)` 2× consécutifs (< 1h) → mock count `fetchPageHtml` = 10 (pas 20). |
| AC.SCRAPE.3 | `scrapeCorpus.fetchAndPersist(kw)` sur kw vierge → mock count `fetchPageHtml` = 10 ; `keyword_serp_scrapes` peuplée. |
| AC.SCRAPE.4 | Mock 1 URL sur 10 retourne 404 → la row correspondante de `keyword_serp_scrapes` a `text_content: null` (ou champ d'erreur), les 9 autres ok. |

---

## 6. Risques & mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Le wrapper deprecated `analyzeSerpCompetitors` ne reproduit pas exactement le même `SerpAnalysisResult` (drift sur ordre, champs optionnels) | Moyen | Élevé | Test snapshot par fixture en story C1 : appel ancien path vs nouveau path → JSON.stringify identique. Fixture stable (URLs mockées). |
| Le cache mémoire 1h cache des résultats stale après modification DB hors-process (ex: backfill manuel) | Faible | Faible | Hors scope (process unique). Documenter dans le header AUTHORITY. Eviction LRU borne le risque. |
| Régression NFR-INT-SERP-ONCE (multi-article même keyword refait fetch) | Moyen | Élevé | Test d'intégration existant `tests/unit/coherence/lieutenants.test.ts:44` reste vert. Story C1 contient un test explicite multi-article. |
| Test architectural grep faux positif (ex: import légitime via barrel `index.ts`) | Moyen | Faible | Ne grep pas sur `index.ts` ; cibler les imports de modules nommés (`from '*lexique*'`). Si nécessaire, exclude-list explicite + commentaire. |
| Duplication de logique entre `scrape-corpus.fetchAndPersist` et l'ancien `analyzeSerpCompetitors` pendant V3 | Élevé pendant la fenêtre | Moyen | Wrapper deprecated **délègue** au nouveau service (zéro duplication réelle). Le test snapshot prouve l'équivalence. |
| Ordre des stories perturbé (B avant A) → `scrape-corpus` n'existe pas encore quand `lieutenants-analysis` veut l'importer | Faible | Bloquant | Sprint plan strict : A avant B avant C (cf. `sprint-plan-decouplage-lieutenants-lexique.md`). |
| Tests architecturaux vidés de sens si quelqu'un import via require dynamique | Faible | Moyen | Aucun `require` dynamique dans le projet (ESM). Filet de sécurité : check:cycles (madge) + check:arch (dependency-cruiser, règles existantes). |

---

## 7. Couverture AC PRD ↔ stories

| AC PRD | Story qui le couvre | Type |
|---|---|---|
| AC.SCRAPE.1 (no cross-import scrape-corpus) | A2 (test arch) | grep |
| AC.SCRAPE.2 (cache hit 0 fetch HTTP) | A2 (test integration) | mock count |
| AC.SCRAPE.3 (kw vierge = 10 fetchs persistés) | A2 (test integration) | I |
| AC.SCRAPE.4 (1 URL 404, 9 ok) | A2 (test integration) | I |
| AC.SCRAPE.5 (deux fonctions distinctes getHeadings/getTextContent) | A1 (signature service) | contract |
| AC.LIE-SCRAPE.1 (no cross-import lieutenants) | B1 + B3 (test arch) | grep |
| AC.LIE-SCRAPE.2 (mock count : ne lit jamais textContent) | B1 (test unit) | mock count |
| AC.LIE-SCRAPE.3 (kw vierge déclenche fetch) | B1 (test integration) | I |
| AC.LIE-SCRAPE.4 (invocable depuis test sans contexte) | B1 (test unit) | U |
| AC.LEX-SCRAPE.1 (no cross-import lexique) | B2 + B3 (test arch) | grep |
| AC.LEX-SCRAPE.2 (mock count : ne lit jamais headings) | B2 (test unit) | mock count |
| AC.LEX-SCRAPE.3 (kw vierge peut déclencher fetch) | B2 (test integration) | I |
| AC.LEX-SCRAPE.4 (invocable depuis test) | B2 (test unit) | U |
| AC.LEX-SCRAPE.5 (route `/serp/tfidf` conservée) | C2 (test contract) | contract |
| AC.DECOUPLAGE.1 (Lexique vierge sans Lieutenants) | D1 (test integration) | I |
| AC.DECOUPLAGE.2 (Lieutenants vierge sans Lexique) | D1 (test integration) | I |
| AC.DECOUPLAGE.3 (no cross-import) | B3 (test arch) | grep |
| AC.DECOUPLAGE.4 (cache mémoire partagé) | D1 (test integration) | mock count |

**Total** : 18 ACs, couverts par 7 stories (A1, A2, B1, B2, B3, C2, D1) — la couverture est explicite dans chaque story (cf. `stories-decouplage-lieutenants-lexique.md`).

---

## 8. Ce que ce chantier ne livre PAS

- Aucune nouvelle fonctionnalité utilisateur visible.
- Aucun changement de schéma DB (chantier 1 a déjà tout livré).
- Aucun changement UI Lexique (FR-LEX-MULTI-KEYWORD-TABS, FR-LEX-PRECHECK-SERP) — chantier 3.
- Aucun nouveau endpoint HTTP (pré-check SERP `GET /api/keywords/:keyword/serp/exists` est chantier 3).
- Aucun changement de prompt IA Lieutenants ou Lexique (déplacement d'appel uniquement).
- Aucun changement de TTL DB (cache 7j inchangé). Le cache mémoire 1h est un **ajout**, pas une modification.

---

## 9. Suite

- Découpe en epics : voir [`epics-decouplage-lieutenants-lexique.md`](epics-decouplage-lieutenants-lexique.md).
- Stories détaillées : voir [`stories-decouplage-lieutenants-lexique.md`](stories-decouplage-lieutenants-lexique.md).
- Sprint plan : voir [`sprint-plan-decouplage-lieutenants-lexique.md`](sprint-plan-decouplage-lieutenants-lexique.md).
