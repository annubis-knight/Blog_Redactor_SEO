---
title: 'Stories — Découplage Lieutenants/Lexique + scrape-corpus neutre'
slug: stories-decouplage-lieutenants-lexique
version: 1.1.0
last_updated: 2026-05-09
status: archived
related_nfr: NFR-MOT-LEXIQUE-DECOUPLAGE
related_fr:
  - FR-INFRA-SCRAPE-CORPUS-NEUTRE
  - FR-LIE-SCRAPE-DEDIE
  - FR-LEX-SCRAPE-DEDIE
synced_with:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/tech-spec-decouplage-lieutenants-lexique.md
  - _bmad-output/planning-artifacts/epics-decouplage-lieutenants-lexique.md
  - _bmad-output/planning-artifacts/sprint-plan-decouplage-lieutenants-lexique.md
---

> ⚠️ **ARCHIVED 2026-05-09** — 11 stories livrées (A1, A2, B1, B2, B3, C1, C2, C3, D1, D2, D3).

# Stories — Découplage Lieutenants/Lexique + `scrape-corpus`

> Stories détaillées avec ACs testables. Format : Given/When/Then. Chaque story est mergeable indépendamment.

**Conventions** :
- `[T]` = test à écrire en TDD strict avant le code (services backend, routes).
- `[I]` = test d'intégration (DB locale, vraie base de test).
- `[U]` = test unitaire (mocks).
- `[grep]` = test architectural par lecture du source + regex.
- Préfixe checks workflow : N/A (chantier infra, pas d'émission de check).

---

## Epic A — Service neutre `scrape-corpus`

### Story A1 — Création `scrape-corpus.service.ts`

**Pourquoi** : sans le service neutre, les services métier Lieutenants/Lexique ne peuvent pas exister sans dupliquer la logique de scrape (et donc le couplage actuel).

**Quoi** :
1. Créer `server/services/external/scrape-corpus.service.ts` avec l'API publique définie tech-spec §3.1 :
   - `fetchAndPersist(keyword, articleLevel, lang?, country?): Promise<ScrapeCorpusResult>`
   - `getHeadings(keyword, lang?, country?): Promise<HeadingsRow[]>` (lit `keyword_serp_scrapes` SELECT scopé : `keyword, position, url, domain, headings, is_blog`).
   - `getTextContent(keyword, lang?, country?): Promise<TextContentRow[]>` (lit `keyword_serp_scrapes` SELECT scopé : `position, url, text_content`).
   - `getPaaQuestions(keyword, lang?, country?)` — wrapper sur `keyword-serp.service.getPaaQuestions`.
2. Cache mémoire 1h LRU module-scoped (Map + `lastAccessedAt` + eviction à 100 entrées). Constantes `MEMORY_CACHE_TTL_MS = 60 * 60 * 1000`, `MEMORY_CACHE_MAX_ENTRIES = 100`.
3. Migrer les helpers depuis [serp-analysis.service.ts:24-104](../../server/services/external/serp-analysis.service.ts#L24-L104) : `extractHeadings`, `extractTextContent`, `classifyIsBlog`, `fetchPageHtml`. Décision : déplacement complet (pas de double export) — les helpers ne sont plus utilisés que par `scrape-corpus`. Si tests legacy de `serp-analysis.test.ts` les importent, ils seront migrés en C3.
4. La transaction d'écriture réutilise `withSerpTransaction` + les `upsert*` existants de `keyword-serp.service.ts` (chantier 1).
5. Header `AUTHORITY:` complet conforme template tech-spec §2.5.

**ACs** :
- **AC.A1.1** [U] Given un appel `fetchAndPersist('seo', 'pilier')` avec mock `fetchSerp`/`fetchPaa`/`fetch` (HTTP), When la fonction retourne, Then `result.serpResults.length === 10`, `result.scrapes.length === 10`, `result.fromCache === null`. Mock count `fetchPageHtml` = 10.
- **AC.A1.2** [U] Given un keyword en cache mémoire avec `cachedAt = Date.now() - 30min`, When `fetchAndPersist`, Then retourne `{ ..., fromCache: 'memory' }` ; mock count `fetch` = 0.
- **AC.A1.3** [U] Given DB freshness OK (mock `getSerpResultsFresh` retourne array non vide), cache mémoire vide, When `fetchAndPersist`, Then retourne `{ ..., fromCache: 'db' }` ; cache mémoire est hydraté pour les prochains appels ; mock count `fetch` externe = 0.
- **AC.A1.4** [U] Cache mémoire eviction LRU : insérer 101 entrées séquentielles → la 1ère est éjectée. La 101ème est présente.
- **AC.A1.5** [U] `getHeadings` produit la requête SQL `SELECT keyword, position, url, domain, headings, is_blog FROM keyword_serp_scrapes WHERE keyword = $1 AND lang = $2 AND country = $3 ORDER BY position` — **NE select pas `text_content`**. Vérifié par snapshot SQL ou par mock du driver.
- **AC.A1.6** [U] `getTextContent` produit la requête `SELECT position, url, text_content FROM keyword_serp_scrapes WHERE ...` — **NE select pas `headings`**.
- **AC.A1.7** [U] Given DB vide pour le keyword, When `getHeadings` ou `getTextContent`, Then retourne `[]` (pas `null`, pas d'erreur).
- **AC.A1.8** Header `AUTHORITY:` présent et conforme au template tech-spec §2.5 (mentionne `NEVER IMPORTS: tfidf.service, lieutenants-*.service, lexique-*.service`).

**Files** :
- `server/services/external/scrape-corpus.service.ts` (nouveau).
- `server/services/external/serp-analysis.service.ts` (légèrement allégé — helpers migrés ; `analyzeSerpCompetitors` reste pour l'instant).
- `tests/unit/services/scrape-corpus.service.test.ts` (nouveau).

**Estimation** : M (1 journée).

---

### Story A2 — Tests intégration + grep architectural `scrape-corpus`

**Pourquoi** : prouver les ACs `AC.SCRAPE.*` du PRD avec des tests qui touchent la DB + le mock HTTP.

**Quoi** :
1. Test d'intégration `tests/integration/scrape-corpus.test.ts` (DB locale + mocks externes) qui couvre AC.SCRAPE.2/.3/.4.
2. Test architectural grep `tests/unit/architecture/decouplage-lieutenants-lexique.test.ts` (lit le source `scrape-corpus.service.ts`, vérifie zero match sur `/tfidf|lieutenants|lexique/i`).

**ACs** :
- **AC.A2.1 ↔ AC.SCRAPE.1** [grep] Given le source de `scrape-corpus.service.ts`, When grep des lignes `import .* from .*['"]`, Then aucun match avec les patterns `/tfidf/i`, `/lieutenants-/i`, `/lexique-/i`.
- **AC.A2.2 ↔ AC.SCRAPE.2** [I] Given un keyword avec scrapes en cache mémoire (1h non écoulée), When `fetchAndPersist` 2× consécutifs, Then mock count `fetchPageHtml` = 10 (le 2ème appel hit le cache mémoire).
- **AC.A2.3 ↔ AC.SCRAPE.3** [I] Given un keyword vierge (DB et cache mémoire vides), When `fetchAndPersist`, Then 10 fetchs HTTP en parallèle ; après réponse, `keyword_serp_scrapes` contient 10 rows pour ce keyword.
- **AC.A2.4 ↔ AC.SCRAPE.4** [I] Given un mock où l'URL en position 5 retourne 404 (les 9 autres OK), When `fetchAndPersist`, Then `keyword_serp_scrapes` contient 10 rows mais celle en position 5 a soit `text_content: null + headings: []`, soit la fonction `fetchPageHtml` capte l'erreur et la row est créée avec un champ `fetch_error` rempli (selon implémentation Story A1). La cohérence DB est maintenue (transaction OK).
- **AC.A2.5 ↔ AC.SCRAPE.5** [contract] Given le type exporté par `scrape-corpus.service.ts`, When inspection des signatures TypeScript, Then `getHeadings` et `getTextContent` sont **deux fonctions distinctes** (pas une seule fonction qui retourne un blob). Vérifié par `keyof typeof module` ou par lecture de la signature publique.

**Files** :
- `tests/integration/scrape-corpus.test.ts` (nouveau).
- `tests/unit/architecture/decouplage-lieutenants-lexique.test.ts` (nouveau — fichier sera étendu en Story B3).

**Estimation** : M (1 journée).

---

## Epic B — Services métier `lieutenants-analysis` + `lexique-analysis`

### Story B1 — Création `lieutenants-analysis.service.ts`

**Pourquoi** : centraliser la logique « propose Lieutenants depuis SERP » dans un service métier qui ne connaît rien au Lexique. Aujourd'hui éparpillée entre `analyzeSerpCompetitors` (scrape) et la route `/serp/analyze` (orchestration IA).

**Quoi** :
1. Créer `server/services/keyword/lieutenants-analysis.service.ts` exposant `proposeLieutenants(keyword, articleLevel, opts?: { articleId?, painPoint? }): Promise<ProposeLieutenantsServiceResult>`.
2. Pipeline interne :
   - `await scrapeCorpus.fetchAndPersist(keyword, articleLevel)` (assure que les scrapes existent).
   - `headings = await scrapeCorpus.getHeadings(keyword)` (rejette `text_content`).
   - `paa = await scrapeCorpus.getPaaQuestions(keyword)`.
   - Construit le prompt IA Lieutenants (réutilise la fonction existante — déplacement, pas réécriture).
   - Appel `aiProvider` + parsing du JSON IA + filtrage existants.
   - Persistance optionnelle dans `lieutenant_explorations` si `articleId` fourni.
3. Header `AUTHORITY:` conforme template tech-spec §2.5.

**ACs** :
- **AC.B1.1 ↔ AC.LIE-SCRAPE.2** [U] Given un mock `scrape-corpus.service` qui trace les colonnes lues, When `proposeLieutenants('seo', 'pilier')`, Then **aucun appel à `getTextContent`** (mock count = 0). Seuls `fetchAndPersist`, `getHeadings`, `getPaaQuestions` sont appelés.
- **AC.B1.2 ↔ AC.LIE-SCRAPE.3** [I] Given un keyword vierge dans `keyword_serp_results`, When `proposeLieutenants(keyword, 'pilier')`, Then `scrape-corpus.fetchAndPersist` est appelé une fois, les 10 URLs sont scrapées, le service retourne `ProposeLieutenantsServiceResult` non-vide. **Pas de 404 silencieux**, pas d'exception.
- **AC.B1.3 ↔ AC.LIE-SCRAPE.4** [U] Given un test isolé (Vitest unit) qui mock `scrape-corpus`, `aiProvider`, `lieutenants-exploration.service`, When `proposeLieutenants('test')`, Then la fonction retourne sans dépendance à un contexte HTTP/Express.
- **AC.B1.4** [U] Given un keyword avec scrapes existants (cache mémoire 1h chaud), When `proposeLieutenants`, Then `fetchAndPersist` est appelé mais retourne immédiatement (mock count `fetch HTTP` = 0).
- **AC.B1.5** Header `AUTHORITY:` présent. Mention `NEVER IMPORTS: tfidf.service, lexique-*.service` (vérifié en Story B3).

**Files** :
- `server/services/keyword/lieutenants-analysis.service.ts` (nouveau).
- `tests/unit/services/lieutenants-analysis.service.test.ts` (nouveau).

**Estimation** : M (1 journée).

---

### Story B2 — Création `lexique-analysis.service.ts`

**Pourquoi** : symétrique à B1 côté Lexique. Le service expose `analyzeLexique` qui consomme `text_content` uniquement.

**Quoi** :
1. Créer `server/services/keyword/lexique-analysis.service.ts` exposant `analyzeLexique(keyword, opts?: { articleId?, painPoint?, triggerScrapeIfMissing? }): Promise<LexiqueAnalysisServiceResult>`.
2. Pipeline interne :
   - Si `triggerScrapeIfMissing === true` : `await scrapeCorpus.fetchAndPersist(keyword, 'libre')`. Sinon, ne déclenche pas (le défaut reste l'ancien comportement où le scrape doit avoir été fait par Lieutenants — résolution UX du 404 en chantier 3).
   - `texts = await scrapeCorpus.getTextContent(keyword)` (rejette `headings`).
   - Si `texts.length === 0` → throw `LexiqueScrapeMissingError(message: "Lancez d'abord l'analyse SERP dans l'onglet Lieutenants")` (texte verbatim — préserve AC.C1.1 chantier 1).
   - `tfidfResult = await extractTfidf(keyword)` (réutilise [tfidf.service.ts:94](../../server/services/keyword/tfidf.service.ts#L94)).
   - Persistance optionnelle via `saveLexiqueTfidf(articleId, keyword, tfidfResult)` si `articleId` fourni.
3. Le service **ne fait pas l'appel IA Lexique** (l'IA est gérée par `keyword-ai-panel.routes.ts`, FR-LEX-AI-PANEL — hors périmètre de cette refonte). Si un appel IA est ajouté ici plus tard, ce sera une story dédiée.
4. Header `AUTHORITY:` conforme.

**ACs** :
- **AC.B2.1 ↔ AC.LEX-SCRAPE.2** [U] Given un mock `scrape-corpus.service`, When `analyzeLexique('seo')`, Then **aucun appel à `getHeadings`** (mock count = 0). Seuls `getTextContent` et éventuellement `fetchAndPersist` sont appelés.
- **AC.B2.2 ↔ AC.LEX-SCRAPE.3** [I] Given un keyword vierge avec `triggerScrapeIfMissing: true`, When `analyzeLexique`, Then `fetchAndPersist` est appelé, scrape effectué, TF-IDF retourné. Pas d'erreur 404.
- **AC.B2.3 ↔ AC.LEX-SCRAPE.3.bis** [I] Given un keyword vierge **sans** `triggerScrapeIfMissing` (défaut `false`), When `analyzeLexique`, Then **throw** `LexiqueScrapeMissingError` avec message verbatim (préserve compat chantier 1).
- **AC.B2.4 ↔ AC.LEX-SCRAPE.4** [U] Given un test isolé qui mock `scrape-corpus` et `extractTfidf`, When `analyzeLexique('test')`, Then la fonction retourne sans dépendance HTTP/Express.
- **AC.B2.5** [U] Given des scrapes en DB (mock `getTextContent` retourne 5 rows), When `analyzeLexique`, Then `extractTfidf(keyword)` est appelé exactement 1×. Le `tfidfResult` retourné est strictement celui d'`extractTfidf`.
- **AC.B2.6** Header `AUTHORITY:` présent. Mention `NEVER IMPORTS: lieutenants-*.service` (vérifié en Story B3).

**Files** :
- `server/services/keyword/lexique-analysis.service.ts` (nouveau).
- `tests/unit/services/lexique-analysis.service.test.ts` (nouveau).

**Estimation** : M (1 journée).

---

### Story B3 — Tests architecturaux croisés

**Pourquoi** : matérialiser les ACs grep `AC.SCRAPE.1`, `AC.LIE-SCRAPE.1`, `AC.LEX-SCRAPE.1`, `AC.DECOUPLAGE.3` dans un seul fichier de tests architecturaux qui sert de filet de sécurité permanent contre la régression.

**Quoi** : étendre `tests/unit/architecture/decouplage-lieutenants-lexique.test.ts` (créé en A2) avec les vérifications croisées.

**Implémentation** : `fs.readFileSync` du fichier source, regex sur les lignes commençant par `import` (multi-ligne supporté). Filtre : ignore les imports `from './types/...'` et `from '../../shared/...'` (types-only). Cible les chemins relatifs ET les noms de modules.

**ACs** :
- **AC.B3.1 ↔ AC.SCRAPE.1** [grep] `scrape-corpus.service.ts` n'importe ni `tfidf.service`, ni `lieutenants-*`, ni `lexique-*`.
- **AC.B3.2 ↔ AC.LIE-SCRAPE.1** [grep] `lieutenants-analysis.service.ts` n'importe ni `tfidf.service`, ni `lexique-*.service`.
- **AC.B3.3 ↔ AC.LEX-SCRAPE.1** [grep] `lexique-analysis.service.ts` n'importe ni `lieutenants-*.service`, ni `components/moteur/Lieutenants*` (impossible côté server, mais filet supplémentaire).
- **AC.B3.4 ↔ AC.DECOUPLAGE.3** [grep] Vérification croisée explicite : `lieutenants-analysis.service.ts` n'importe pas `lexique-analysis.service.ts`, et inversement.
- **AC.B3.5** [meta] Le test échoue avec un message clair pointant le path interdit trouvé (ex: `expected scrape-corpus.service.ts to NOT import './lexique-analysis.service.js' but found at line 12`).

**Files** :
- `tests/unit/architecture/decouplage-lieutenants-lexique.test.ts` (étendu).

**Estimation** : S (½ journée).

---

## Epic C — Bascule des routes + dépréciation `analyzeSerpCompetitors`

### Story C1 — Bascule route `POST /api/serp/analyze`

**Pourquoi** : le passage en prod du nouveau pipeline Lieutenants. Toute régression visible côté UI Lieutenants se manifeste ici en premier.

**Quoi** :
1. Modifier [server/routes/serp-analysis.routes.ts:20-51](../../server/routes/serp-analysis.routes.ts#L20-L51) :
   - Cache check `getSerpResultsFresh` reste (chantier 1, NFR-INT-SERP-ONCE).
   - Si miss : appeler `lieutenantsAnalysis.proposeLieutenants(keyword, articleLevel)` au lieu de `analyzeSerpCompetitors`. Le service interne fait le scrape via `scrape-corpus`.
   - Le contrat de réponse (`SerpAnalysisResult`) est préservé. La route reconstruit éventuellement le format depuis le retour service (un helper `toSerpAnalysisResult(scrapeCorpusResult, articleLevel)` est ajouté dans la route ou dans `scrape-corpus.service` selon ce qui est le plus propre).
2. Transformer `analyzeSerpCompetitors` ([serp-analysis.service.ts:168](../../server/services/external/serp-analysis.service.ts#L168)) en **wrapper deprecated** :
   - JSDoc `@deprecated use lieutenants-analysis.service or scrape-corpus.service directly`.
   - Délègue à `scrape-corpus.fetchAndPersist` + reconstruit le format.
   - `log.warn('analyzeSerpCompetitors deprecated wrapper, switch to lieutenants-analysis or scrape-corpus directly')`.
3. Tests existants (`tests/unit/services/serp-analysis.test.ts`, `tests/integration/serp-analyze-dual-write.test.ts`) restent verts grâce au wrapper.
4. Test snapshot ajouté : `tests/integration/serp-analyze-route-snapshot.test.ts` qui appelle `POST /api/serp/analyze` avec une fixture stable et compare le JSON retourné à un snapshot.

**ACs** :
- **AC.C1.1** [I] Given fixture stable (10 URLs mockées avec headings/text_content connus), When `POST /api/serp/analyze`, Then réponse JSON identique au snapshot capturé avant bascule (zéro drift sur ordre, champs, types).
- **AC.C1.2** [I] **NFR-INT-SERP-ONCE** : article A appelle `/serp/analyze`, puis article B avec même keyword → mock externe count = 1 total.
- **AC.C1.3** [I] Given un keyword avec `keyword_serp_results.fetched_at` < 7j, When `POST /api/serp/analyze`, Then `fromCache: true` ET aucun appel à `lieutenants-analysis.proposeLieutenants` (le cache check court-circuite avant).
- **AC.C1.4** [grep] La route `/serp/analyze` n'importe plus `analyzeSerpCompetitors` directement (seulement `lieutenantsAnalysis.proposeLieutenants` ou `scrapeCorpus.fetchAndPersist` selon décision).
- **AC.C1.5** [I] Le wrapper deprecated `analyzeSerpCompetitors` reste appelable (compat tests legacy) et retourne le même format. `log.warn` est émis à chaque appel.
- **AC.C1.6** [U] Aucun nouveau `console.log` ; tous les logs passent par `log` du logger existant.

**Files** :
- `server/routes/serp-analysis.routes.ts` (modif lignes 20-51).
- `server/services/external/serp-analysis.service.ts` (modif : `analyzeSerpCompetitors` devient wrapper).
- `tests/integration/serp-analyze-route-snapshot.test.ts` (nouveau).

**Estimation** : M (1 journée).

---

### Story C2 — Bascule route `POST /api/serp/tfidf`

**Pourquoi** : symétrique à C1 côté Lexique. C'est aussi cette story qui matérialise l'AC.LEX-SCRAPE.5 (route conservée, logique interne basculée).

**Quoi** :
1. Modifier [server/routes/serp-analysis.routes.ts:54-91](../../server/routes/serp-analysis.routes.ts#L54-L91) :
   - Remplacer la lecture directe `getSerpScrapes(trimmed)` + appel `extractTfidf(trimmed)` par un seul appel `lexiqueAnalysis.analyzeLexique(trimmed, { articleId: hasArticleId ? articleIdNum : undefined })`.
   - Si `LexiqueScrapeMissingError` thrown → 404 avec message verbatim (préservé tel quel).
   - Sinon → 200 avec `{ data: tfidfResult }`.
2. La persistance `saveLexiqueTfidf` est désormais à l'intérieur de `lexique-analysis.service` (déplacée depuis la route).

**ACs** :
- **AC.C2.1 ↔ AC.LEX-SCRAPE.5** [I] La route `POST /api/serp/tfidf` existe toujours et accepte le même body `{ keyword, articleId? }`.
- **AC.C2.2** [I] Given un keyword sans scrapes, When `POST /api/serp/tfidf`, Then 404 avec message exact `"Lancez d'abord l'analyse SERP dans l'onglet Lieutenants"` (verbatim).
- **AC.C2.3** [I] Given 5 rows dans `keyword_serp_scrapes` avec `text_content` non-null, When `POST /api/serp/tfidf`, Then 200 avec `{ data: TfidfResult }` au format inchangé.
- **AC.C2.4** [I] Given `articleId` fourni dans le body, When `POST /api/serp/tfidf`, Then `lexique_explorations` reçoit la row attendue (test DB).
- **AC.C2.5** [grep] La route `/serp/tfidf` n'importe plus `extractTfidf` ni `getSerpScrapes` directement (seulement `lexiqueAnalysis.analyzeLexique`).
- **AC.C2.6** [U] Régression test : ancien comportement (mock `getSerpScrapes` retourne 5 rows) vs nouveau (via `lexique-analysis`) → top 10 obligatoires identique.

**Files** :
- `server/routes/serp-analysis.routes.ts` (modif lignes 54-91).
- `server/services/keyword/lexique-analysis.service.ts` (extension : intègre `saveLexiqueTfidf`).
- `tests/unit/routes/serp-tfidf.routes.test.ts` (modif : mock `lexique-analysis` au lieu de `extractTfidf`).

**Estimation** : S (½ journée).

---

### Story C3 — Suppression `analyzeSerpCompetitors` + nettoyage tests legacy

**Pourquoi** : à ce stade, aucun consommateur de production ne dépend de `analyzeSerpCompetitors`. Le wrapper deprecated peut disparaître. Les tests legacy doivent être migrés vers les nouveaux services ou supprimés s'ils ne testent plus rien d'utile.

**Quoi** :
1. Supprimer la fonction `analyzeSerpCompetitors` ([serp-analysis.service.ts:168-295](../../server/services/external/serp-analysis.service.ts#L168-L295)).
2. Audit des fichiers de tests qui l'importent :
   - `tests/unit/services/serp-analysis.test.ts` — **migrer** les tests utiles vers `tests/unit/services/scrape-corpus.service.test.ts`. Si redondants avec A2/B1, supprimer.
   - `tests/integration/serp-analyze-dual-write.test.ts` — la story testait la transaction atomique. Migrer côté `scrape-corpus.service` (le test reste pertinent : la transaction existe toujours, même propriétaire).
   - `tests/unit/routes/serp-analysis.routes.test.ts`, `tests/unit/routes/serp-tfidf.routes.test.ts` — adapter les mocks (s'ils mockaient `analyzeSerpCompetitors`, les remplacer par `lieutenants-analysis.proposeLieutenants` ou `lexique-analysis.analyzeLexique`).
3. Statuer sur `serp-analysis.service.ts` lui-même : si vide après suppression, le supprimer. S'il reste 1-2 helpers utilitaires, le réduire ou les déplacer.
4. Vérifier qu'aucun import résiduel ne reste dans `src/`, `server/`, `shared/`, `tests/`.

**ACs** :
- **AC.C3.1** [grep] `grep -r "analyzeSerpCompetitors" src/ server/ shared/ tests/` retourne 0 occurrence.
- **AC.C3.2** [grep] Si `serp-analysis.service.ts` est supprimé : `grep -r "from .*serp-analysis.service" src/ server/ shared/ tests/` retourne 0 occurrence.
- **AC.C3.3** [I] `npm run test:unit` reste vert. Aucun test orphelin ne reste (tests qui importeraient un module supprimé → erreur de compilation).
- **AC.C3.4** [I] `npm run check:health` (lint + type-check + cycles + dead + arch) reste vert.
- **AC.C3.5** [I] La transaction d'écriture (test `serp-analyze-dual-write.test.ts` migré) reste fonctionnelle : fault injection sur `upsertSerpScrapes` → rollback complet.
- **AC.C3.6** Le scope de `serp-analysis.service.ts` après cleanup est documenté en commit message (supprimé / réduit à `extractHeadings`+`extractTextContent` si déplacement non-trivial / ou intégralement migré dans `scrape-corpus`).

**Files** :
- `server/services/external/serp-analysis.service.ts` (suppression ou réduction).
- `tests/unit/services/serp-analysis.test.ts` (migré ou supprimé).
- `tests/integration/serp-analyze-dual-write.test.ts` (migré ou supprimé).
- `tests/unit/routes/serp-analysis.routes.test.ts` (modif mocks).
- `tests/unit/routes/serp-tfidf.routes.test.ts` (modif mocks).

**Estimation** : M (1 journée — l'audit des tests legacy demande de la rigueur).

---

## Epic D — Validation découplage + clôture

### Story D1 — Tests d'intégration AC.DECOUPLAGE.*

**Pourquoi** : matérialiser les invariants NFR (Lexique vierge sans Lieutenants, Lieutenants vierge sans Lexique, cache mémoire partagé) avec des tests qui restent en place comme régression.

**Quoi** : créer `tests/integration/decouplage-lieutenants-lexique.test.ts` avec 3 scénarios.

**ACs** :
- **AC.D1.1 ↔ AC.DECOUPLAGE.1** [I] Given un keyword vierge dans `keyword_serp_results`/`_scrapes`, When `lexiqueAnalysis.analyzeLexique(keyword, { triggerScrapeIfMissing: true })`, Then la fonction réussit sans erreur, retourne un `tfidfResult` non vide. **Mock count d'appel à `lieutenantsAnalysis.proposeLieutenants` = 0** (vérifié par spy Vitest).
- **AC.D1.2 ↔ AC.DECOUPLAGE.2** [I] Given un keyword vierge, When `lieutenantsAnalysis.proposeLieutenants(keyword, 'pilier')`, Then la fonction réussit. **Mock count d'appel à `lexiqueAnalysis.analyzeLexique` = 0**.
- **AC.D1.3 ↔ AC.DECOUPLAGE.4** [I] Given un keyword vierge, When d'abord `lieutenantsAnalysis.proposeLieutenants(kw)` (qui scrape les 10 URLs), puis `lexiqueAnalysis.analyzeLexique(kw, { triggerScrapeIfMissing: true })` 30s plus tard, Then **mock count `fetchPageHtml` total = 10** (pas 20). Le cache mémoire 1h évite le re-scrape.
- **AC.D1.4** [I] Inverse de D1.3 : `analyzeLexique` puis `proposeLieutenants` → mock count `fetchPageHtml` = 10 (cache mémoire fonctionne dans les deux sens).
- **AC.D1.5** [I] Cache mémoire **expiré** (mock `Date.now` avancé de 61 minutes) → 2ème appel re-scrape (mock count `fetchPageHtml` = 20).

**Files** :
- `tests/integration/decouplage-lieutenants-lexique.test.ts` (nouveau).

**Estimation** : M (1 journée — les mocks Date.now et le mock count croisé demandent de la rigueur).

---

### Story D2 — Mise à jour docs + statut FR/NFR

**Quoi** :
1. `docs/data-flows/lieutenants.md` : remplacer les mentions `analyzeSerpCompetitors` par `lieutenants-analysis.service` + `scrape-corpus.service`. Mettre à jour les diagrammes Mermaid avec la nouvelle topologie (3 services + cache mémoire 1h).
2. `docs/data-flows/lexique.md` : symétrique côté Lexique.
3. `docs/data-flows/keyword-metrics.md` : ajouter la note "scrapes consommés via `scrape-corpus.service` (single producer cross-domaine)" dans la section authorities.
4. `_bmad-output/planning-artifacts/prd.md` :
   - `NFR-MOT-LEXIQUE-DECOUPLAGE` (§8.3) : `Statut: proposed → active`, `Depuis: 2026-05-XX`, `Source: tech-spec-decouplage-lieutenants-lexique`.
   - `FR-INFRA-SCRAPE-CORPUS-NEUTRE` (§8.14) : idem.
   - `FR-LIE-SCRAPE-DEDIE` (§8.7) : idem.
   - `FR-LEX-SCRAPE-DEDIE` (§8.8) : idem.
5. Vérifier les `synced_with` dans tous les front-matters touchés.

**ACs** :
- **AC.D2.1** [grep] `grep "analyzeSerpCompetitors" docs/data-flows/` ne retourne plus que des mentions historiques explicitement marquées (ex: "Avant chantier 2 : `analyzeSerpCompetitors`...").
- **AC.D2.2** Diagrammes Mermaid de `lieutenants.md` et `lexique.md` reflètent la nouvelle topologie (3 services + cache mémoire 1h visible).
- **AC.D2.3** PRD : les 4 FRs/NFRs ont `Statut: active` et la date `Depuis: 2026-05-XX` cohérente.
- **AC.D2.4** Tous les `synced_with` des artefacts BMAD pointent vers les bons fichiers (croisé tech-spec ↔ epics ↔ stories ↔ sprint-plan).

**Files** :
- `docs/data-flows/lieutenants.md` (modif).
- `docs/data-flows/lexique.md` (modif).
- `docs/data-flows/keyword-metrics.md` (modif).
- `_bmad-output/planning-artifacts/prd.md` (modif §8.3, §8.7, §8.8, §8.14).

**Estimation** : S (½ journée).

---

### Story D3 — Archivage BMAD + sprint-status

**Quoi** :
1. Déplacer les 4 artefacts (`tech-spec-decouplage-lieutenants-lexique.md`, `epics-decouplage-*.md`, `stories-decouplage-*.md`, `sprint-plan-decouplage-*.md`) dans `_bmad-output/planning-artifacts/_archive/` avec bandeau **ARCHIVED 2026-05-XX** en tête.
2. Mettre à jour `_bmad-output/implementation-artifacts/sprint-status.yaml` : ajouter une entrée `sprint-decouplage-lieutenants-lexique: done` avec la liste des stories livrées et les FR/NFR passées `active`.

**ACs** :
- **AC.D3.1** Les 4 artefacts sont dans `_archive/` avec front-matter `status: archived`.
- **AC.D3.2** `sprint-status.yaml` a la nouvelle entrée avec date 2026-05-XX (date de merge).
- **AC.D3.3** Aucune référence `synced_with:` cassée vers ces fichiers depuis ailleurs.

**Files** :
- Déplacements (move) × 4.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modif).

**Estimation** : XS (1-2h).

---

## Récapitulatif estimations

| Story | Estimation | Cumul |
|---|---|---|
| A1 — Création `scrape-corpus.service` | M (1j) | 1.0j |
| A2 — Tests intégration + grep `scrape-corpus` | M (1j) | 2.0j |
| B1 — Création `lieutenants-analysis.service` | M (1j) | 3.0j |
| B2 — Création `lexique-analysis.service` | M (1j) | 4.0j |
| B3 — Tests architecturaux croisés | S (½j) | 4.5j |
| C1 — Bascule route `/serp/analyze` | M (1j) | 5.5j |
| C2 — Bascule route `/serp/tfidf` | S (½j) | 6.0j |
| C3 — Suppression `analyzeSerpCompetitors` + cleanup tests | M (1j) | 7.0j |
| D1 — Tests intégration AC.DECOUPLAGE | M (1j) | 8.0j |
| D2 — Docs + FR/NFR active | S (½j) | 8.5j |
| D3 — Archivage + sprint-status | XS (½j max) | 9.0j |

**Total** : ~9 jours-personne. **Sprint cible** : 1 sprint de 2 semaines (10 jours ouvrés) — confortable, marge ~10 % pour imprévus.
