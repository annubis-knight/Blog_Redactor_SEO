---
title: 'Stories — Refonte schéma keyword_metrics'
slug: stories-keyword-metrics-decomposition
version: 1.1.0
last_updated: 2026-05-09
status: archived
related_nfr: NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION
synced_with:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/tech-spec-keyword-metrics-decomposition.md
  - _bmad-output/planning-artifacts/epics-keyword-metrics-decomposition.md
  - _bmad-output/planning-artifacts/sprint-plan-keyword-metrics-decomposition.md
---

# Stories — Décomposition `keyword_metrics`

> **⚠️ ARCHIVED 2026-05-09** — Sprint keyword-metrics-decomposition livré sur `feat/keyword-metrics-decomposition`. NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION : statut **active** (PRD §8.3.bis). Ce document est conservé pour traçabilité ; ne pas l'utiliser comme source de vérité — voir le code et les data-flows à jour.

> Stories détaillées avec ACs testables. Format : Given/When/Then. Chaque story est mergeable indépendamment.

**Conventions** :
- `[T]` = test à écrire en TDD strict avant le code (services backend, routes).
- `[I]` = test d'intégration (DB locale, vraie base de test).
- `[U]` = test unitaire (mocks).
- Préfixe checks workflow : N/A (chantier infra, pas d'émission de check).

---

## Epic A — Schéma & migration data

### Story A1 — Application DDL des 4 tables + snapshot

**Pourquoi** : sans le schéma, rien ne peut être écrit ni lu côté nouvelles tables.

**Quoi** :
1. Créer un script TypeScript jetable `scripts/apply-keyword-serp-schema.ts` qui applique le DDL des 4 tables (cf. tech-spec §3) à la DB locale via `pg.Pool` + `dotenv`. Idempotent : `CREATE TABLE IF NOT EXISTS …`. Pas de DROP.
2. Exécuter `node --import tsx scripts/apply-keyword-serp-schema.ts` (ou équivalent selon le runner du projet) sur la DB locale.
3. Lancer `npm run db:snapshot` pour régénérer `server/db/schema.sql`.
4. Vérifier `npm run db:check` vert (empreinte DB live ≡ snapshot).
5. Commit du diff `schema.sql` (les 4 nouveaux `CREATE TABLE` apparaissent dans le snapshot).
6. Le script `scripts/apply-keyword-serp-schema.ts` est **conservé pendant le sprint** (pour pouvoir rejouer sur une DB neuve si besoin) puis **supprimé en Story D3** (archivage). Sa trace reste dans `git log` et dans le diff `schema.sql`.

**ACs** :
- **AC.A1.1** [I] Given DB après application du DDL, When `\d keyword_serp_results` (psql), Then 7 colonnes attendues + PK composite `(keyword, lang, country, position)` + FK vers `keyword_metrics` + index `idx_keyword_serp_results_domain` et `idx_keyword_serp_results_fetched`.
- **AC.A1.2** [I] Given DB après application, When `\d keyword_serp_scrapes`, Then 8 colonnes + PK composite + FK vers `keyword_serp_results` (cascade delete) + index `idx_keyword_serp_scrapes_scraped`.
- **AC.A1.3** [I] Given DB après application, When `\d keyword_paa_questions`, Then `id BIGSERIAL PRIMARY KEY` + UNIQUE `(keyword, lang, country, question, depth)` + index `idx_keyword_paa_kw`.
- **AC.A1.4** [I] Given DB après application, When `\d keyword_autocomplete`, Then PK `(keyword, lang, country, position)` + index `idx_keyword_autocomplete_fetched`.
- **AC.A1.5** [I] Given DB après application, When INSERT dans `keyword_serp_scrapes` sans row parent dans `keyword_serp_results`, Then erreur FK violation.
- **AC.A1.6** [I] Given DB après application, When DELETE d'une row `keyword_metrics`, Then les rows enfants des 4 tables sont supprimées en cascade.
- **AC.A1.7** [snapshot] `server/db/schema.sql` après `npm run db:snapshot` contient bien les 4 nouveaux `CREATE TABLE` ; `npm run db:check` est vert ; le compteur `Tables` du header passe de 21 à 25.
- **AC.A1.8** [idempotence] Re-exécuter `apply-keyword-serp-schema.ts` deux fois ne génère ni erreur ni effet de bord (`CREATE TABLE IF NOT EXISTS`).

**Files** :
- `scripts/apply-keyword-serp-schema.ts` (nouveau, jetable supprimé en D3).
- `server/db/schema.sql` (modif via `db:snapshot`, ne pas éditer à la main).

**Estimation** : S (½ journée).

---

### Story A2 — Script de backfill `serp_raw_json` → 4 tables

**Pourquoi** : récupérer les 7 lignes existantes (vérifié DB live 2026-05-09) sans perte avant de basculer les consommateurs.

**Quoi** : script `scripts/backfill-keyword-serp.ts` qui lit chaque `keyword_metrics` avec `serp_raw_json IS NOT NULL`, extrait `competitors[]` / `paaQuestions[]`, INSERT dans les 4 nouvelles tables (UPSERT idempotent : `ON CONFLICT DO NOTHING`). Tolère payloads partiels (champs `headings` / `textContent` / `isBlog` peuvent être absents). Script jetable supprimé en Story D3.

**ACs** :
- **AC.A2.1** [I] Given DB avec N rows `serp_raw_json` non-null, When `backfill-keyword-serp.ts` est exécuté, Then `COUNT(keyword_serp_results)` = somme des `jsonb_array_length(serp_raw_json->'competitors')`.
- **AC.A2.2** [I] Given DB avec un payload `serp_raw_json` typique (10 competitors avec `headings` non-vides), When backfill, Then 10 rows dans `keyword_serp_results` ET 10 rows dans `keyword_serp_scrapes`.
- **AC.A2.3** [I] Given DB avec un payload `serp_raw_json` partiel (competitors sans `textContent`), When backfill, Then `keyword_serp_scrapes.text_content` est `NULL` (pas de crash, pas de string vide).
- **AC.A2.4** [I] Given un row `keyword_metrics` SANS `serp_raw_json` mais AVEC `paa_questions` (cas vu DB : 64 rows avec PAA seules), When backfill, Then `keyword_paa_questions` est peuplée à partir de `paa_questions` JSONB **uniquement si pas déjà migrée** (idempotence).
- **AC.A2.5** [I] Given `autocomplete_suggestions` présent (1738 rows en DB), When backfill (passe autocomplete), Then `keyword_autocomplete` contient une row par suggestion avec `position` correct.
- **AC.A2.6** [I] Idempotence : exécuter le backfill **deux fois** d'affilée → comptages identiques (pas de doublons ; `ON CONFLICT DO NOTHING` actif).
- **AC.A2.7** [U] Given un payload `serp_raw_json` malformé (ex: `competitors: null`), When backfill traite ce row, Then la fonction loggue un warning et continue avec les rows suivants (pas de crash).

**Files** : `scripts/backfill-keyword-serp.ts` (nouveau, jetable supprimé en D3), `tests/integration/backfill-keyword-serp.test.ts` (nouveau, conservé comme régression).

**Estimation** : M (1 journée).

---

## Epic B — Couche service + dual-write

### Story B1 — Création `keyword-serp.service.ts`

**Pourquoi** : centraliser tous les accès aux 4 nouvelles tables dans un seul service typé, suivant le pattern `keyword-metrics.service.ts`.

**Quoi** : nouveau fichier `server/services/keyword/keyword-serp.service.ts` exposant :
- Types : `SerpResult`, `SerpScrape`, `PaaQuestion`, `AutocompleteEntry`.
- Getters : `getSerpResults(keyword, lang, country): SerpResult[]`, `getSerpScrapes(keyword, lang, country): SerpScrape[]`, `getPaaQuestions(keyword, lang, country): PaaQuestion[]`, `getAutocomplete(keyword, lang, country): AutocompleteEntry[]`.
- Upserts : `upsertSerpResults(rows: SerpResult[])`, `upsertSerpScrapes(rows: SerpScrape[])`, `upsertPaaQuestions(rows: PaaQuestion[])`, `upsertAutocomplete(rows: AutocompleteEntry[], source)`.
- Helpers : `getSerpResultsFresh(keyword, lang, country, ttlDays = 7): SerpResult[] | null` (retourne `null` si stale).
- Header `AUTHORITY:` complet (cf. tech-spec §2.5).

**ACs** :
- **AC.B1.1** [U] Given mocks `query()` retournent 10 rows, When `getSerpResults('seo local')`, Then retourne array de 10 `SerpResult` avec `position` croissant.
- **AC.B1.2** [U] Given DB ne contient aucune row pour ce keyword, When `getSerpResults`, Then retourne `[]` (pas `null`, pas d'erreur).
- **AC.B1.3** [U] Given un appel `upsertSerpResults` avec 10 rows, When SQL généré, Then une seule requête `INSERT … VALUES (...) ON CONFLICT (keyword, lang, country, position) DO UPDATE` (pas 10 requêtes).
- **AC.B1.4** [U] Given `getSerpResultsFresh` avec `fetched_at` < 7 jours, Then retourne les rows ; avec ≥ 7 jours, Then retourne `null`.
- **AC.B1.5** [U] `upsertPaaQuestions` est idempotent : appel 2× avec mêmes inputs → 0 doublon (UNIQUE constraint respectée, ON CONFLICT DO NOTHING).
- **AC.B1.6** [U] `upsertSerpScrapes` refuse silencieusement (warn log) si la row parent n'existe pas dans `keyword_serp_results` (FK violation captée et logguée explicitement).
- **AC.B1.7** Header `AUTHORITY:` présent et conforme au template de la tech-spec §2.5.

**Files** : `server/services/keyword/keyword-serp.service.ts` (nouveau), `tests/unit/services/keyword-serp.service.test.ts` (nouveau).

**Estimation** : M (1 journée).

---

### Story B2 — Dual-write dans `analyzeSerpCompetitors`

**Pourquoi** : quand le code prod tourne après merge de B1, on veut que tout nouveau scan SERP peuple à la fois `serp_raw_json` (legacy) et les 4 nouvelles tables, en transaction. Ainsi pendant Epic C, on peut switcher chaque consommateur en sachant que les nouvelles tables sont à jour.

**Quoi** : modifier `server/services/external/serp-analysis.service.ts` pour qu'`analyzeSerpCompetitors` :
1. Effectue le scrape (inchangé).
2. Construit le payload `SerpAnalysisResult` (inchangé).
3. **En une transaction** : `upsertKeywordSerp(payload)` (legacy) + `upsertSerpResults(...)` + `upsertSerpScrapes(...)` + `upsertPaaQuestions(...)`.
4. Si la transaction échoue, rollback total et erreur remontée.

**ACs** :
- **AC.B2.1** [I] Given un keyword vierge (jamais scrapé), When `POST /api/serp/analyze`, Then après réponse `keyword_metrics.serp_raw_json` ET les 4 nouvelles tables sont peuplées avec les mêmes URLs.
- **AC.B2.2** [I] Given un fault injection sur `upsertSerpScrapes`, When `POST /api/serp/analyze`, Then `keyword_serp_results` ET `keyword_metrics.serp_raw_json` ne contiennent **rien** pour ce keyword (transaction rollback).
- **AC.B2.3** [I] Given un fault injection sur `upsertKeywordSerp` (legacy), When `POST /api/serp/analyze`, Then les nouvelles tables ne contiennent **rien** non plus (rollback).
- **AC.B2.4** [I] Cohérence : pour un keyword fraîchement scrapé, `JSON.stringify(serp_raw_json.competitors.map(c => c.url))` doit être égal à `getSerpResults().map(r => r.url)` (même ordre, mêmes URLs).
- **AC.B2.5** [U] Aucun `console.log` ni `// TODO` introduit ; logs structurés via `log` du logger existant.

**Files** : `server/services/external/serp-analysis.service.ts` (modif), `server/services/keyword/keyword-serp.service.ts` (légère extension si helpers transactionnels nécessaires), `tests/integration/serp-analyze-dual-write.test.ts` (nouveau).

**Estimation** : M (1 journée).

---

## Epic C — Bascule des consommateurs

### Story C1 — Bascule TF-IDF Lexique

**Pourquoi** : TF-IDF est le plus gros consommateur de `text_content` (~50-100 ko utiles). C'est la story qui **commence à matérialiser le gain perf** (AC.SCHEMA.4) car Lexique ne paiera plus la charge concurrente des 100 ko qu'il ignore (titres, headings) en parallèle.

**Quoi** :
1. `server/services/keyword/tfidf.service.ts` : remplacer la lecture du paramètre `competitors: SerpCompetitor[]` par lecture directe de `keyword_serp_scrapes` via `getSerpScrapes(keyword)` (nouveau paramètre `keyword` au lieu de `competitors[]`). Garder le format de sortie identique.
2. `server/routes/serp-analysis.routes.ts:67` : route `/serp/tfidf` ne lit plus `metrics?.serpRawJson` → appelle directement `getSerpScrapes(keyword)`. Conserver le code 404 et le message "Lancez d'abord l'analyse SERP" si `getSerpScrapes` retourne `[]`.

**ACs** :
- **AC.C1.1** [U] Given `keyword_serp_scrapes` vide pour un keyword, When `POST /api/serp/tfidf`, Then 404 avec message "Lancez d'abord l'analyse SERP" (texte exact preserved — invariant NFR-INT-SERP-ONCE et FR-LEX-TFIDF).
- **AC.C1.2** [I] Given 5 rows dans `keyword_serp_scrapes` avec `text_content` non-null, When `POST /api/serp/tfidf`, Then réponse 200 avec format `TfidfResult` identique à l'ancien comportement.
- **AC.C1.3** [I] Given 10 rows `keyword_serp_results` mais 0 rows `keyword_serp_scrapes` (cas où le scrape HTTP a échoué pour toutes les URLs), When `/serp/tfidf`, Then 404 (pas 200 avec résultats vides).
- **AC.C1.4** [I] **Aucune régression** : sur un keyword où `serp_raw_json` est encore présent, le comportement de TF-IDF avant/après bascule retourne le même top 10 obligatoires (test snapshot).
- **AC.C1.5** [U] La fonction `extractTfidf` ne reçoit plus le paramètre `competitors` mais lit via `getSerpScrapes` — vérifié par signature TypeScript.
- **AC.C1.6** [grep] Aucune occurrence de `serpRawJson`/`serp_raw_json` dans `tfidf.service.ts` ni dans la branche route `/serp/tfidf`.

**Files** : `server/services/keyword/tfidf.service.ts` (modif), `server/routes/serp-analysis.routes.ts` (modif lignes ~52-89), `tests/unit/services/tfidf.service.test.ts` (modif), `tests/unit/routes/serp-tfidf.routes.test.ts` (modif mocks).

**Estimation** : M (1 journée).

---

### Story C2 — Bascule cache check `/serp/analyze`

**Pourquoi** : la route `/serp/analyze:34-37` lit `existing?.serpRawJson && isKeywordMetricsFresh(existing.fetchedAt)` pour décider du cache hit. Tant que cette logique lit la legacy, le dual-write reste obligatoire et la promesse "le check freshness ne touche plus le payload lourd" n'est pas tenue.

**Quoi** :
1. Remplacer la condition par `getSerpResultsFresh(keyword, lang, country, 7)` qui retourne soit les 10 URLs (hit) soit `null` (miss/stale).
2. Si hit, reconstruire un `SerpAnalysisResult` partiel à partir de `keyword_serp_results` + `keyword_serp_scrapes` + `keyword_paa_questions` (lecture combinée). Marquer `fromCache: true`.
3. Si miss, déclencher `analyzeSerpCompetitors(keyword)` (inchangé : Epic B garantit dual-write).

**ACs** :
- **AC.C2.1** [I] Given keyword avec `keyword_serp_results.fetched_at` < 7j, When `POST /api/serp/analyze`, Then réponse `fromCache: true` ET aucun appel HTTP externe (mock count = 0).
- **AC.C2.2** [I] Given keyword avec `keyword_serp_results.fetched_at` ≥ 7j, When `POST /api/serp/analyze`, Then `analyzeSerpCompetitors` appelé exactement 1×.
- **AC.C2.3** [I] **NFR-INT-SERP-ONCE** : article A appelle `/serp/analyze`, puis article B avec même keyword → mock externe count = 1 total (preserved).
- **AC.C2.4** [I] Reconstruction du payload : un `SerpAnalysisResult` reconstruit depuis nouvelles tables doit avoir `competitors.length`, `paaQuestions.length`, et la liste des `domain` identiques à ce que retournait `serp_raw_json` avant bascule (test snapshot par fixture).
- **AC.C2.5** [I] Cas mixte : 10 `keyword_serp_results` mais 5 `keyword_serp_scrapes` seulement (scrapes partiels). Réponse contient 10 competitors avec `headings: []` / `textContent: null` pour les 5 manquants (pas de crash).
- **AC.C2.6** [grep] La route `/serp/analyze` ne référence plus `serpRawJson`/`serp_raw_json` après cette story.

**Files** : `server/routes/serp-analysis.routes.ts` (modif lignes 19-50), `server/services/keyword/keyword-serp.service.ts` (extension : helper `reconstructSerpAnalysisResult`), `tests/unit/routes/serp-analyze.routes.test.ts` (nouveau ou modif).

**Estimation** : L (1.5 journée — la reconstruction du payload demande de la rigueur).

---

### Story C3 — Bascule brief Capitaine

**Pourquoi** : le brief Capitaine charge actuellement `metricsCapitaine?.serpRawJson` (~50-100 ko inutile) alors qu'il a besoin uniquement des URLs. C'est la deuxième source de gain perf.

**Quoi** :
1. `server/services/queries/keyword-queries.service.ts:269` : remplacer `serp: metricsCapitaine?.serpRawJson ?? null` par `serp: { competitors: getSerpResults(keyword) }` (ou structure équivalente côté brief consumer — à vérifier en lisant le consumer).
2. `server/services/external/dataforseo/brief.ts:19` : idem — `serp: getSerpResults(keyword).map(...)` au lieu de `metrics.serpRawJson?.competitors`.

**ACs** :
- **AC.C3.1** [U] Given un keyword avec 10 rows `keyword_serp_results`, When `getKeywordsForCapitaine`, Then `result.serp.competitors` contient 10 entrées avec `position`, `url`, `domain`, `title` (pas `textContent` ni `headings`).
- **AC.C3.2** [U] Le payload Capitaine **ne contient plus** `textContent` ni `headings[]` (vérifié : `JSON.stringify(brief).length` < 50 % de l'avant — test bench).
- **AC.C3.3** [I] Régression brief Capitaine : pour un cocon avec keyword scrapé, le brief retourné a la même structure (`{ competitors: [...] }`) mais sans `textContent`.
- **AC.C3.4** [grep] `keyword-queries.service.ts` et `dataforseo/brief.ts` ne référencent plus `serpRawJson`.

**Files** : `server/services/queries/keyword-queries.service.ts` (modif ligne 269 et alentours), `server/services/external/dataforseo/brief.ts` (modif ligne 19), `tests/unit/services/keyword-queries.service.test.ts` (modif si existe), `tests/unit/services/dataforseo-brief.test.ts` (modif si existe).

**Estimation** : S (½ journée).

---

### Story C4 — Stop dual-write & retrait `serpRawJson` du type

**Pourquoi** : à ce stade, **plus aucun consommateur** ne lit `serp_raw_json`. On peut arrêter d'y écrire et retirer le champ du type `KeywordMetrics` pour empêcher toute réintroduction silencieuse.

**Quoi** :
1. `server/services/external/serp-analysis.service.ts` : retirer l'appel `upsertKeywordSerp` (l'écriture legacy).
2. `server/services/keyword/keyword-metrics.service.ts` : retirer le champ `serpRawJson` du type `KeywordMetrics` ; retirer la fonction `upsertKeywordSerp` ; retirer `serp_raw_json` du `SELECT` de `getKeywordMetrics`.
3. Mettre à jour les 5 fichiers de tests qui mockaient `serp_raw_json` / `serpRawJson` :
   - `tests/unit/services/keyword-metrics.service.test.ts`
   - `tests/unit/coherence/lieutenants.test.ts`
   - `tests/unit/coherence/lexique.test.ts`
   - `tests/unit/coherence/keyword-metrics.test.ts`
   - `tests/unit/routes/serp-tfidf.routes.test.ts`
4. La colonne `serp_raw_json` reste en DB (drop hors scope, AC.SCHEMA.5).

**ACs** :
- **AC.C4.1** [grep] `grep -r "serpRawJson\|upsertKeywordSerp" src/ server/ shared/` retourne 0 occurrence.
- **AC.C4.2** [grep] `grep -r "serp_raw_json" server/services/ src/` retourne 0 occurrence. (Note : `server/db/schema.sql` peut encore contenir la colonne en lecture seule transitoire — c'est attendu, son drop est différé en Epic E1. Le marqueur cherchable de cet état est dans le header AUTHORITY de `keyword-metrics.service.ts`, cf. AC.C4.6.)
- **AC.C4.3** [U] Le type `KeywordMetrics` exporté par `keyword-metrics.service.ts` n'a plus de champ `serpRawJson`.
- **AC.C4.4** [I] Après merge de la story, `POST /api/serp/analyze` n'écrit **plus** dans `keyword_metrics.serp_raw_json` (vérifié : la valeur reste à ce qu'elle était avant la requête).
- **AC.C4.5** [I] Aucune régression test : `npm run test:unit` vert ; `npm run test:browser` (parties Lexique/Lieutenants/Capitaine) vert.
- **AC.C4.6** Header `AUTHORITY:` de `keyword-metrics.service.ts` mis à jour pour ne plus mentionner SERP. Y inclure une ligne : `-- serp_raw_json column kept read-only until post-stabilization drop (Epic E1, ≥ 14 jours)` pour servir de marqueur cherchable en attendant le drop.
- **AC.C4.7** `docs/data-flows/keyword-metrics.md` mentionne explicitement que `serp_raw_json` reste en DB en lecture seule transitoire (justification visible côté doc, pas seulement code).

**Files** : `server/services/external/serp-analysis.service.ts` (modif), `server/services/keyword/keyword-metrics.service.ts` (modif), 5 fichiers de tests (modif), `docs/data-flows/keyword-metrics.md` (modif headers + note transitoire).

**Estimation** : M (1 journée).

---

## Epic D — Validation perf + clôture

### Story D1 — Bench perf SELECT brief Capitaine

**Pourquoi** : prouver AC.SCHEMA.4 ("gain perf vérifiable") avec un chiffre concret.

**Quoi** : script `scripts/bench-keyword-metrics.ts` qui :
1. Sur une copie locale de la DB de prod (1821 lignes), mesure 3× le temps + payload size de :
   - `getKeywordMetrics('seo local')` **avant** le retrait de `serp_raw_json` du SELECT (commit avant Story C4).
   - `getKeywordMetrics('seo local')` **après** (commit après Story C4).
2. Documente les résultats en bytes et ms dans `docs/perf-bench-keyword-metrics-decomposition.md` (ad-hoc, ne pas créer un fichier permanent).

**ACs** :
- **AC.D1.1** Le bench montre une réduction du payload brief Capitaine d'au moins **80 %** sur les keywords avec `serp_raw_json` rempli (référence : top-5 mesurés 50-115 ko).
- **AC.D1.2** Le bench montre que le SELECT Capitaine **n'inclut plus** la colonne `serp_raw_json` (vérifié par `EXPLAIN` ou trace SQL).
- **AC.D1.3** Bench documenté dans la PR (commentaire ou fichier ad-hoc en `_archive/`).

**Files** : `scripts/bench-keyword-metrics.ts` (nouveau, jetable supprimé en D3), résultats inlinés dans la description de PR.

**Estimation** : S (½ journée).

---

### Story D2 — Mise à jour docs + statut NFR

**Quoi** :
1. `docs/data-flows/keyword-metrics.md` : retirer mentions `serp_raw_json` côté **producteurs/consommateurs**, ajouter section "Tables filles SERP" pointant vers `keyword-serp.service.ts`. Ajouter note "colonne `serp_raw_json` conservée en DB read-only jusqu'à drop différé".
2. `docs/data-flows/lieutenants.md` : remplacer `keyword_metrics.serp_raw_json` par `keyword_serp_scrapes.headings` dans diagrammes Mermaid + table autorités.
3. `docs/data-flows/lexique.md` : remplacer `keyword_metrics.serp_raw_json` par `keyword_serp_scrapes.text_content`.
4. `_bmad-output/planning-artifacts/prd.md` §8.3.bis NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION : changer `Statut: proposed` → `Statut: active`, `Depuis: 2026-05-XX`, ajouter ligne `Source: tech-spec-keyword-metrics-decomposition`.
5. Vérifier `synced_with` partout.

**ACs** :
- **AC.D2.1** Aucun lien cassé : `grep "serp_raw_json" docs/data-flows/` ne renvoie plus que des mentions historiques explicitement marquées (ex: "Sprint 15.5-bis : ancienne colonne, supersedée par decomposition").
- **AC.D2.2** Diagrammes Mermaid mis à jour (le rendu est cohérent avec le nouveau schéma).
- **AC.D2.3** PRD : `Statut: active` + matrice de couverture `§8.14.bis` mise à jour avec les 4 nouvelles tables.

**Files** : `docs/data-flows/keyword-metrics.md`, `docs/data-flows/lieutenants.md`, `docs/data-flows/lexique.md`, `_bmad-output/planning-artifacts/prd.md` (modif §8.3.bis + §8.14.bis matrice).

**Estimation** : S (½ journée).

---

### Story D3 — Archivage + cleanup scripts jetables + sprint-status

**Quoi** :
1. Déplacer `tech-spec-keyword-metrics-decomposition.md`, `epics-*.md`, `stories-*.md`, `sprint-plan-*.md` dans `_bmad-output/planning-artifacts/_archive/` avec bandeau **ARCHIVED** en haut.
2. **Supprimer les scripts jetables** : `scripts/apply-keyword-serp-schema.ts`, `scripts/backfill-keyword-serp.ts`, `scripts/bench-keyword-metrics.ts`. La trace reste dans `git log` et dans le diff `schema.sql`.
3. Mettre à jour `_bmad-output/implementation-artifacts/sprint-status.yaml` : ajouter sprint terminé.

**ACs** :
- **AC.D3.1** Les 4 artefacts sont dans `_archive/` avec front-matter `status: archived`.
- **AC.D3.2** `sprint-status.yaml` reflète l'avancement.
- **AC.D3.3** Aucune référence `synced_with:` cassée vers ces fichiers depuis ailleurs.
- **AC.D3.4** Les 3 scripts jetables (`apply-keyword-serp-schema.ts`, `backfill-keyword-serp.ts`, `bench-keyword-metrics.ts`) sont supprimés. `npm run check:dead` (knip) reste vert.

**Files** : déplacements (move), suppressions (rm), `sprint-status.yaml` (modif).

**Estimation** : XS (1-2h).

---

## Récapitulatif estimations

| Story | Estimation | Cumul |
|---|---|---|
| A1 — Migration SQL | S (½j) | 0.5j |
| A2 — Backfill script | M (1j) | 1.5j |
| B1 — Service `keyword-serp` | M (1j) | 2.5j |
| B2 — Dual-write | M (1j) | 3.5j |
| C1 — TF-IDF Lexique | M (1j) | 4.5j |
| C2 — Cache check `/serp/analyze` | L (1.5j) | 6j |
| C3 — Brief Capitaine | S (½j) | 6.5j |
| C4 — Stop dual-write + retrait type | M (1j) | 7.5j |
| D1 — Bench perf | S (½j) | 8j |
| D2 — Docs + NFR active | S (½j) | 8.5j |
| D3 — Archivage | XS (½j max) | 9j |

**Total** : ~9 jours-personne. **Sprint cible** : 1 sprint de 2 semaines (10 jours ouvrés) — confortable, marge pour imprévus.
