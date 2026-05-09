---
title: 'Refonte schéma keyword_metrics — décomposition en 5 tables'
slug: keyword-metrics-decomposition
version: 1.1.0
last_updated: 2026-05-09
status: proposed
owner: Arnaud
related_nfr: NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION
related_fr_indirect:
  - FR-LIE-SERP-ANALYZE
  - FR-LEX-TFIDF
  - FR-CAP-RELEVANCE-COMPUTED-LIVE
  - FR-CAP-RELEVANCE-INTENT-SIGNAL
  - FR-INFRA-PAA-EXPLORATIONS
synced_with:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/epics-keyword-metrics-decomposition.md
  - _bmad-output/planning-artifacts/stories-keyword-metrics-decomposition.md
  - _bmad-output/planning-artifacts/sprint-plan-keyword-metrics-decomposition.md
  - docs/data-flows/keyword-metrics.md
  - docs/data-flows/lieutenants.md
  - docs/data-flows/lexique.md
---

# Tech-Spec — Décomposition de `keyword_metrics`

> Plan d'implémentation pour la NFR `NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION` (PRD §8.3.bis).
> **Aucun code dans ce document. C'est un livrable de planification.**

---

## 1. Overview

### Problem

La table `keyword_metrics` est une **god-table à 17 colonnes** (vérifié DB live le 2026-05-09 : 1821 lignes), dont 6 colonnes JSONB héritées des Sprints 15.5 et 15.5-bis. Le payload `serp_raw_json` mêle dans une seule colonne :

- des **identités** d'URL Google (10 résultats × `{position, url, title, domain}`) consommées par Capitaine et lookups SERP — ~5 ko ;
- des **artefacts de scraping** (`headings[]` Hn, `textContent`, `isBlog`) — 50-115 ko (top-5 mesurés), consommés différemment selon les onglets ;
- des **questions PAA** (`paaQuestions[]`) consommées par Capitaine.

### Solution

Éclater `keyword_metrics` en **5 tables à responsabilité unique**, toutes préfixées `keyword_*` (scope cross-article) :

| Table | Rôle | Volume attendu | Source données |
|---|---|---|---|
| `keyword_metrics` (slim) | Métriques numériques + intent (volume, KD, CPC, competition, intent_raw, intent_label) + autocomplete_source | 1 ligne / keyword × lang × country | DataForSEO `/keywords/labs/keyword_overview` |
| `keyword_serp_results` | URLs Google Top 10 : position, title, domain, url | 10 lignes / keyword × lang × country | DataForSEO `/serp/google/organic` |
| `keyword_serp_scrapes` | HTML scrapé : `headings` JSONB, `text_content` TEXT, `is_blog` boolean | 0..10 lignes / keyword × lang × country (FK vers `keyword_serp_results`) | scraping HTTP serveur |
| `keyword_paa_questions` | Questions PAA (Q + answer + depth + parentQuestion) | 0..N lignes / keyword × lang × country | DataForSEO `/serp/google/organic/advanced` |
| `keyword_autocomplete` | Suggestions autocomplete (text + position) | 0..N lignes / keyword × lang × country | DataForSEO autocomplete |

**Périmètre strict** : `keyword_metrics.serp_raw_json` est conservée durant toute la bascule (lecture seule, pas de nouvelles écritures dans la phase finale). Drop de la colonne **différé hors scope** (AC.SCHEMA.5 = migration séparée, après bascule complète).

### In Scope

- Application des **DDL CREATE TABLE × 4** (PK, FK, index) directement sur la DB locale, puis régénération de `server/db/schema.sql` via `npm run db:snapshot`. **Pas de fichier `migrations/NNN_*.sql`** : depuis le commit `01f705b` (2026-05-09), la source de vérité est `schema.sql` (snapshot horodaté + sha256). Le diff de `schema.sql` est ce qui est versionné. Le DDL est appliqué via un script TypeScript jetable (`scripts/apply-keyword-serp-schema.ts`) supprimé après merge.
- Script de migration data idempotent qui éclate les 7 lignes `serp_raw_json` actuelles + tout futur résiduel vers les 4 nouvelles tables, sans perte (test de comptage).
- Service `keyword-serp.service.ts` (nouveau) avec API `getSerpResults`, `getSerpScrapes`, `getPaaQuestions`, `getAutocomplete`, `upsertSerpResults`, `upsertSerpScrapes`, `upsertPaaQuestions`, `upsertAutocomplete` (chacun retourne le strict nécessaire).
- Refactor `keyword-metrics.service.ts` : retirer `serpRawJson` du type `KeywordMetrics`, retirer `upsertKeywordSerp`, retirer `local_*` / `content_gap_*` du select par défaut (perf — relégués à des helpers spécifiques) — limité aux champs SERP pour rester dans le périmètre.
- Bascule des 6 consommateurs identifiés :
  1. `server/services/external/serp-analysis.service.ts` — écriture (`upsertSerpResults` + `upsertSerpScrapes` + `upsertPaaQuestions` au lieu de `upsertKeywordSerp`).
  2. `server/routes/serp-analysis.routes.ts:34-36` — cache check `/serp/analyze` (lit `keyword_serp_results` + freshness via `keyword_metrics.fetched_at` ou colonne dédiée — cf. §3.3).
  3. `server/routes/serp-analysis.routes.ts:67` — `/serp/tfidf` lit `keyword_serp_scrapes`.
  4. `server/services/keyword/tfidf.service.ts` — consomme `text_content` depuis `keyword_serp_scrapes`.
  5. `server/services/queries/keyword-queries.service.ts:269` — brief Capitaine ne charge plus `serpRawJson` ; lit `keyword_serp_results` si besoin (ou ne lit rien — à valider story).
  6. `server/services/external/dataforseo/brief.ts:19` — idem.
- Mise à jour des **mocks de tests** consommant `serp_raw_json` / `serpRawJson` (5 fichiers de test identifiés).
- Mise à jour des **headers AUTHORITY** des services touchés (§3.2 CLAUDE.md).
- Mise à jour des **docs data-flows** : `keyword-metrics.md`, `lieutenants.md`, `lexique.md`.

### Out of Scope

- Découplage Lieutenants/Lexique côté **services** (pas d'extraction `lexique-analysis.service.ts` séparé) — couvert par NFR-MOT-LEXIQUE-DECOUPLAGE.
- Création de `scrape-corpus.service.ts` neutre — couvert par FR-INFRA-SCRAPE-CORPUS-NEUTRE.
- Tout changement UI Lexique / Lieutenants.
- Tout changement de TTL ou de stratégie de cache (les 7 jours actuels restent).
- **Drop de `serp_raw_json`** (AC.SCHEMA.5) — `ALTER TABLE … DROP COLUMN` appliqué hors-chantier après stabilisation (≥ 2 semaines), suivi de `npm run db:snapshot` et commit du diff `schema.sql`. Pas de fichier de migration séparé.
- Migration des autres JSONB monolithiques (`local_analysis`, `content_gap_analysis`, `local_comparison`) — rester scopé.

---

## 2. Cartographie data-flow (Phase 2.0 CLAUDE.md)

### 2.1 État avant

```
DataForSEO SERP organic ──┐
HTTP scraping (headings + text_content) ──┐
DataForSEO PAA ──┐
                  ▼
        upsertKeywordSerp({ competitors, paaQuestions })
                  ▼
        keyword_metrics.serp_raw_json JSONB (50-115 ko/row)
                  │
        ┌─────────┼──────────────────────────────────┐
        ▼         ▼                                  ▼
  Capitaine    Lieutenants                       Lexique TF-IDF
  (URLs only,  (headings[] only,                 (text_content only,
   ~5 ko       ~10-30 ko utiles                  50-100 ko utiles)
   utiles)     mais paie 100 %)                  mais paie 100 %)
```

### 2.2 État après

```
DataForSEO SERP organic ──► upsertSerpResults() ──► keyword_serp_results (10 rows × ~500 o)
HTTP scraping ────────────► upsertSerpScrapes() ──► keyword_serp_scrapes (0-10 rows × ~10-50 ko)
                                                     │  (FK serp_results.id)
DataForSEO PAA ───────────► upsertPaaQuestions() ─► keyword_paa_questions
DataForSEO autocomplete ──► upsertAutocomplete() ─► keyword_autocomplete
DataForSEO KPIs ──────────► upsertKeywordKpis() ──► keyword_metrics (slim)

Consommateurs :
  Capitaine ────────► keyword_serp_results (URLs only) + keyword_paa_questions
  Lieutenants ──────► keyword_serp_scrapes (headings only, SELECT headings)
  Lexique TF-IDF ───► keyword_serp_scrapes (text_content only, SELECT text_content)
  Discovery ────────► keyword_autocomplete + keyword_paa_questions
  Score Marché ─────► keyword_metrics (slim) + COUNT keyword_paa_questions + COUNT keyword_autocomplete
```

### 2.3 Producteurs / consommateurs / persistance / cas d'usage / régressions

| Axe | Avant | Après | Note |
|---|---|---|---|
| **Producteurs** | `analyzeSerpCompetitors` → `upsertKeywordSerp` (1 call, payload monolithique) | `analyzeSerpCompetitors` → 3 calls (`upsertSerpResults`, `upsertSerpScrapes`, `upsertPaaQuestions`) dans une **transaction** pour atomicité | Risque : si le scrape HTTP échoue partiellement, on doit garder cohérence "résultats SERP sans scrapes = OK ; scrapes orphelins = interdit". |
| **Consommateurs** | `getKeywordMetrics` (1 SELECT large) | `getSerpResults`/`getSerpScrapes`/`getPaaQuestions`/`getAutocomplete` (4 SELECT scopés) | Capitaine `keyword-queries.service.ts:269` arrête de lire `serpRawJson` (cf. story de bascule). |
| **Persistance** | `keyword_metrics.serp_raw_json` JSONB | 4 tables relationnelles + colonne JSONB legacy conservée en lecture seule transitoire | `serp_raw_json` reste mais n'est plus écrite après story 4. |
| **Cas d'usage** | (a) Premier `/serp/analyze` ; (b) Reload article frais ; (c) `/serp/tfidf` après `/serp/analyze` ; (d) Multi-article même keyword (NFR-INT-SERP-ONCE) | Idem, garanties préservées par **`keyword_serp_results.fetched_at`** (TTL 7j toujours), checks dans routes mis à jour pour lire la nouvelle colonne | NFR-INT-SERP-ONCE doit rester vert. |
| **Régressions historiques** | Migration `serp_explorations` (article-scoped) → `keyword_metrics.serp_raw_json` (cross-article) en Sprint 15.5-bis (2026-05-03). Cause : duplication. | Cette refonte va **plus loin** dans le découplage sans inverser : reste cross-article. | Vérifier que `serp_explorations` n'est pas réintroduite par erreur. |

### 2.4 Cohérence affichage / calcul

Aucune valeur **affichée** par cette refonte (changements purement backend). MAIS le `fromCache` flag exposé par `/serp/analyze` doit rester cohérent :
- **Avant** : `fromCache: true` si `serpRawJson != null && fresh`.
- **Après** : `fromCache: true` si `EXISTS keyword_serp_results WHERE keyword=$1 AND fetched_at >= now() - interval '7 days'`.
- L'expression de freshness DOIT être identique entre check route et reconstruction `SerpAnalysisResult` à la volée (pas de drift).

### 2.5 Header AUTHORITY mis à jour (template)

`keyword-metrics.service.ts` (slim) :

```
AUTHORITY: PostgreSQL `keyword_metrics` (KPIs numériques + intent).
           Cross-article, 1 ligne par (keyword, lang, country).
READS FROM: getKeywordMetrics (KPIs + intent uniquement, plus de SERP).
WRITES TO: upsertKeywordKpis, upsertKeywordAutocompleteSource.
RELATED: NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION (post-refonte).
```

`keyword-serp.service.ts` (nouveau) :

```
AUTHORITY: PostgreSQL `keyword_serp_results`, `keyword_serp_scrapes`,
           `keyword_paa_questions`, `keyword_autocomplete`.
           Source unique cross-article pour les artefacts SERP.
READS FROM: getSerpResults / getSerpScrapes / getPaaQuestions / getAutocomplete.
WRITES TO: upsertSerpResults / upsertSerpScrapes / upsertPaaQuestions / upsertAutocomplete.
CONSUMERS: serp-analysis.routes (/serp/analyze + /serp/tfidf), tfidf.service,
           keyword-queries.service (brief Capitaine), brief.ts.
RELATED: NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION, NFR-INT-SERP-ONCE.
```

---

## 3. Schéma SQL cible

> **Pattern d'application** (depuis 2026-05-09) : le DDL ci-dessous est appliqué via un script TypeScript jetable (`scripts/apply-keyword-serp-schema.ts`), puis `npm run db:snapshot` régénère `server/db/schema.sql`, et le **diff de `schema.sql` est ce qui part en commit**. Vérification : `npm run db:check` doit passer sur `main` après merge. Aucun fichier `server/db/migrations/NNN_*.sql` n'est créé.

### 3.1 `keyword_serp_results` (URLs Google)

```sql
CREATE TABLE keyword_serp_results (
  keyword       TEXT NOT NULL,
  lang          TEXT NOT NULL DEFAULT 'fr',
  country       TEXT NOT NULL DEFAULT 'fr',
  position      INTEGER NOT NULL,           -- 1..10
  url           TEXT NOT NULL,
  title         TEXT,
  domain        TEXT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (keyword, lang, country, position),
  FOREIGN KEY (keyword, lang, country)
    REFERENCES keyword_metrics(keyword, lang, country)
    ON DELETE CASCADE
);
CREATE INDEX idx_keyword_serp_results_domain ON keyword_serp_results(domain);
CREATE INDEX idx_keyword_serp_results_fetched ON keyword_serp_results(fetched_at);
```

**Choix** : PK `(keyword, lang, country, position)` — un seul enregistrement par position. Pas d'`id SERIAL` (les positions sont stables et la PK composite suffit). FK vers `keyword_metrics` pour préserver l'invariant cross-article. `fetched_at` par row (vs colonne sur `keyword_metrics`) : permet de gérer le TTL SERP indépendamment des autres caches.

### 3.2 `keyword_serp_scrapes` (HTML scrapé)

```sql
CREATE TABLE keyword_serp_scrapes (
  keyword       TEXT NOT NULL,
  lang          TEXT NOT NULL DEFAULT 'fr',
  country       TEXT NOT NULL DEFAULT 'fr',
  position      INTEGER NOT NULL,
  url           TEXT NOT NULL,             -- redondant avec serp_results pour rester scopable
  headings      JSONB NOT NULL DEFAULT '[]'::jsonb,  -- HnNode[] : {level: 'H1'|'H2'|'H3', text, children?}
  text_content  TEXT,
  is_blog       BOOLEAN,
  scraped_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (keyword, lang, country, position),
  FOREIGN KEY (keyword, lang, country, position)
    REFERENCES keyword_serp_results(keyword, lang, country, position)
    ON DELETE CASCADE
);
CREATE INDEX idx_keyword_serp_scrapes_scraped ON keyword_serp_scrapes(scraped_at);
```

**Choix** : table séparée de `keyword_serp_results` car (a) un scrape peut échouer pour 1 URL sur 10 (2xx vs 4xx) sans casser les autres, (b) Lieutenants peut SELECT `headings` only sans payer le `text_content` (~50-100 ko), (c) Lexique inverse (SELECT `text_content` only). FK strict vers `serp_results` : un scrape sans résultat SERP est interdit.

### 3.3 `keyword_paa_questions` (PAA)

```sql
CREATE TABLE keyword_paa_questions (
  id              BIGSERIAL PRIMARY KEY,
  keyword         TEXT NOT NULL,
  lang            TEXT NOT NULL DEFAULT 'fr',
  country         TEXT NOT NULL DEFAULT 'fr',
  question        TEXT NOT NULL,
  answer          TEXT,
  depth           INTEGER DEFAULT 1,         -- 1 = top-level, 2 = expanded
  parent_question TEXT,                       -- nullable, pointe vers la question parent
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (keyword, lang, country)
    REFERENCES keyword_metrics(keyword, lang, country)
    ON DELETE CASCADE,
  UNIQUE (keyword, lang, country, question, depth)
);
CREATE INDEX idx_keyword_paa_kw ON keyword_paa_questions(keyword, lang, country);
```

**Choix** : `id BIGSERIAL` car la PK naturelle (keyword, lang, country, question, depth) peut générer des erreurs avec questions très longues — UNIQUE l'impose tout de même. **Pas de collision** avec `paa_explorations` (table article-scoped pour l'arbre PAA Discovery — cf. FR-INFRA-PAA-EXPLORATIONS).

### 3.4 `keyword_autocomplete` (suggestions)

```sql
CREATE TABLE keyword_autocomplete (
  keyword       TEXT NOT NULL,
  lang          TEXT NOT NULL DEFAULT 'fr',
  country       TEXT NOT NULL DEFAULT 'fr',
  position      INTEGER NOT NULL,            -- ordre dans la liste source
  text          TEXT NOT NULL,
  source        TEXT,                         -- 'google' | 'dataforseo'
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (keyword, lang, country, position),
  FOREIGN KEY (keyword, lang, country)
    REFERENCES keyword_metrics(keyword, lang, country)
    ON DELETE CASCADE
);
CREATE INDEX idx_keyword_autocomplete_fetched ON keyword_autocomplete(fetched_at);
```

**Choix** : `position` PK car l'ordre porte du sens (position 1 = suggestion la plus probable). `source` colonne (au lieu d'une table séparée) car la valeur est répétée partout par paquet.

### 3.5 `keyword_metrics` slim (après refonte)

Aucun changement de structure dans la première phase — colonnes inchangées sauf que `serp_raw_json` est **lecture-seule transitoire**. Phase 4 (Story C4) : retirer `serpRawJson` du type TS et de la requête SELECT par défaut (refactor code, pas DDL). Phase ultérieure (hors scope, AC.SCHEMA.5) : `ALTER TABLE keyword_metrics DROP COLUMN serp_raw_json;` appliqué directement à la DB + `npm run db:snapshot` + commit du diff `schema.sql`.

---

## 4. Stratégie de bascule des consommateurs

Approche **expand-and-contract** classique (zéro downtime, code et schéma compatibles à chaque pas) :

1. **Expand** : créer les 4 nouvelles tables (DDL appliqué + `db:snapshot` regen) sans toucher à `serp_raw_json`. Aucun consommateur ne change.
2. **Dual-write** : `analyzeSerpCompetitors` écrit en parallèle dans les nouvelles tables ET dans `serp_raw_json` (transaction unique pour cohérence).
3. **Backfill** : script idempotent qui éclate les 7 lignes existantes (et tout résiduel) vers les nouvelles tables. Vérifie comptage avant/après (test AC.SCHEMA.2).
4. **Switch reads** : un par un, les 6 consommateurs migrent vers les nouvelles tables. À chaque switch, `serp_raw_json` reste lue uniquement comme fallback en lecture (mais tracé via log warn).
5. **Stop dual-write** : `analyzeSerpCompetitors` n'écrit plus dans `serp_raw_json`. Logs de fallback en lecture deviennent des erreurs.
6. **(hors-scope)** Drop colonne `serp_raw_json` (DDL appliqué + `db:snapshot` regen).

Ce chantier livre les pas 1-5. Le pas 6 fait l'objet d'une story séparée différée (≥ 2 semaines de prod stable).

À chaque story qui modifie la DB (A1, hypothétiquement E1) : avant le `git commit`, lancer `npm run db:snapshot` puis `npm run db:check` (doit être vert) et inclure le diff `schema.sql` dans le commit.

---

## 5. Risques & mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Backfill incomplet (forme `serp_raw_json` variable selon ancienneté) | Moyen | Moyen | Script defensive : tolère absence de `headings`/`textContent`/`isBlog`. Test de comptage strict (`competitors.length` JSONB === `COUNT(*)` `keyword_serp_results`). |
| Dual-write asymétrique → drift entre legacy et nouvelles tables | Moyen | Élevé | Transaction unique côté `analyzeSerpCompetitors`. Test d'intégration : après `/serp/analyze`, lecture nouvelles tables et lecture `serp_raw_json` doivent retourner les mêmes URLs. |
| Régression NFR-INT-SERP-ONCE (cache check route lit ancien chemin alors qu'écriture est nouvelle) | Élevé | Élevé | Story dédiée (Story 5 : freshness check) — vérifier les deux paths au switch. |
| FK CASCADE supprime des scrapes utiles si on `DELETE keyword_metrics` | Faible | Moyen | Documenter dans le header AUTHORITY que `DELETE keyword_metrics` est destructif transitif. La fonction `deleteKeywordMetrics` est déjà utilisée prudemment. |
| TF-IDF retourne 404 différent (legacy → "lancez d'abord l'analyse SERP") | Moyen | Faible | Conserver le code 404 et le message exact dans la story 6. Test de contrat. |
| Collision `keyword_paa_questions` ↔ `paa_explorations` | Faible | Moyen | Documenté NFR : noms distincts, scope cross-article vs article-scoped. Vérifier dans la story migration que les deux coexistent sans cross-import. |

---

## 6. Critères d'acceptation NFR ↔ stories

| AC NFR | Stories qui le couvrent |
|---|---|
| AC.SCHEMA.1 (4 tables PK/FK/index) | Story 1 (migration SQL) |
| AC.SCHEMA.2 (backfill sans perte, comptage avant/après) | Story 2 (script de migration data) |
| AC.SCHEMA.3 (5 fichiers — en réalité 6 — basculés) | Stories 4-7 (un consommateur par story) |
| AC.SCHEMA.4 (gain perf vérifiable) | Story 8 (mesure perf SELECT scopé vs SELECT large) |
| AC.SCHEMA.5 (drop différé) | **HORS SCOPE** — story 9 différée |

---

## 7. Ce que ce chantier ne livre PAS

- Aucune nouvelle fonctionnalité utilisateur.
- Aucun changement UI / endpoint signature publique (les endpoints `/serp/analyze` et `/serp/tfidf` gardent leur contrat).
- Aucun changement de TTL.
- Aucun service `lexique-analysis` ni `scrape-corpus` extrait (NFR-MOT-LEXIQUE-DECOUPLAGE / FR-INFRA-SCRAPE-CORPUS-NEUTRE — chantiers suivants).

---

## 8. Suite

- Découpe en epics : voir [`epics-keyword-metrics-decomposition.md`](epics-keyword-metrics-decomposition.md).
- Stories détaillées : voir [`stories-keyword-metrics-decomposition.md`](stories-keyword-metrics-decomposition.md).
- Sprint plan : voir [`sprint-plan-keyword-metrics-decomposition.md`](sprint-plan-keyword-metrics-decomposition.md).
