---
name: keyword-metrics
description: Mesures d'un mot-clé partagées entre tous les articles (volume, difficulté, CPC, concurrence, intention de la SERP, suggestions Google, questions PAA, analyses locale et content gap) — une ligne `keyword_metrics` par mot-clé, relue avant tout appel payant.
type: "keyword_metrics { keyword, lang, country (PK), search_volume, keyword_difficulty, cpc, competition, intent_raw, intent_label, autocomplete_suggestions JSONB, autocomplete_source, paa_questions JSONB, local_analysis, content_gap_analysis, local_comparison, fetched_at }"
last_updated: 2026-09-30
related_fr: [FR-INFRA-KEYWORD-METRICS, FR-INFRA-PAA-CACHE, FR-MOT-CACHE-CASCADE, NFR-COST-CACHE-FIRST, NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION, FR-MOT-RAW-KPIS, FR-CER-KEYWORD-REAL-DATA, FR-EXT-DATAFORSEO, FR-EXT-AUTOCOMPLETE-GOOGLE, FR-EXP-CONTENT-GAP, FR-CAP-SCAN, FR-CAP-RELEVANCE-INTENT-SIGNAL, FR-INFRA-KPI-NULLABLE, FR-INFRA-KPI-DISPLAY-DASH, FR-INFRA-KPI-CONSISTENCY, FR-INFRA-KPI-SCORING-NULLSAFE]
---

# Data Flow — keyword-metrics

> **Description métier :** la « mémoire d'achat » des mesures d'un mot-clé. Un mot-clé mesuré pour un article sert à tous les autres articles et cocons : on ne paie DataForSEO ou Google qu'une fois par mot-clé et par période de fraîcheur.
> **Type/format :** table `keyword_metrics`, clé `(keyword, lang, country)` (`'fr'`, `'fr'` par défaut). Chaque mesure peut être `NULL` indépendamment ; `intent_label` n'accepte que `commercial`, `transactional`, `informational`, `navigational` (contrainte `CHECK`). Un seul `fetched_at` pour toute la ligne.
> **Références :** [20 — Infrastructure](../20-infrastructure.md) § « Mémoire permanente des mots-clés et relevé SERP » et § « Scores et indicateurs nullables » ; [02 — Modèle de données](../02-donnees.md) ; [14 — Radar et Capitaine](../14-radar-capitaine.md) ; [18 — Intégrations externes](../18-integrations.md). Les pages concurrentes (top 10, titres, texte) vivent dans les tables filles `keyword_serp_results`, `keyword_serp_scrapes`, `keyword_paa_questions` : elles ne font pas partie de cette fiche.

## Producteurs

Qui crée ou met à jour cette donnée. Toutes les écritures passent par [`keyword-metrics.service.ts`](../../server/services/keyword/keyword-metrics.service.ts) (en-tête `AUTHORITY:`), sauf la ligne parente créée par le relevé SERP.

| Écrivain | Colonnes | Déclencheur |
|---|---|---|
| Étude Capitaine — `POST /api/keywords/:keyword/scan` ([`keyword-scan.routes.ts`](../../server/routes/keyword-scan.routes.ts)) | `upsertKeywordKpis` (volume, KD, CPC, concurrence, `intent_raw`, `intent_label`) ; `upsertKeywordPaa` si des PAA sont trouvées | mesures absentes ou de plus de 7 jours (`hitDb` faux) |
| Mesure des candidats du Cerveau — `measureKeywords` ([`keyword-measure.service.ts`](../../server/services/keyword/keyword-measure.service.ts)) | `upsertKeywordKpis` (dont intention) | mots-clés absents ou de plus de 7 jours ; un appel groupé |
| Brief de la Rédaction — `getBrief` ([`dataforseo/brief.ts`](../../server/services/external/dataforseo/brief.ts)) | `upsertKeywordKpis` (sans intention), `upsertKeywordPaa` | pas de ligne fraîche avec un volume connu, ou `forceRefresh` |
| Suggestions Google — `fetchAutocomplete` ([`autocomplete.service.ts`](../../server/services/external/autocomplete.service.ts)) | `upsertKeywordAutocomplete` (`autocomplete_suggestions`, `autocomplete_source = 'google'`) | pas de suggestions de moins d'un jour (30 min si la liste gardée est vide) ; appelé par l'étude Capitaine et le scan Radar |
| Questions PAA du Radar — `writePaaCache` ([`paa-cache.service.ts`](../../server/services/infra/paa-cache.service.ts)) | `upsertKeywordPaa` (arbre avec `depth`, `parentQuestion`) | PAA absentes, de plus d'un jour, ou moins profondes que demandé |
| Content gap — `analyzeContentGap` ([`content-gap.service.ts`](../../server/services/article/content-gap.service.ts)) | `upsertKeywordContentGap` | `POST /api/content-gap/analyze` ; aucun écran monté ne l'appelle (FR-EXP-CONTENT-GAP) |
| Relevé SERP — `fetchAndPersist` ([`scrape-corpus.service.ts`](../../server/services/external/scrape-corpus.service.ts)) | ligne parente seule (`INSERT … ON CONFLICT DO UPDATE SET fetched_at = NOW()`) pour les clés étrangères des tables filles | analyse SERP des Lieutenants et du Lexique |

- **Règle d'écriture des KPI** : `upsertKeywordKpis` fait `COALESCE(nouvelle, ancienne)` sur chaque colonne ; une mesure absente n'efface jamais une valeur connue (FR-INFRA-KEYWORD-METRICS).
- **Autres colonnes** : suggestions, PAA, content gap sont **remplacées** entières à chaque écriture.
- **Toute écriture** remet `fetched_at` à maintenant.
- **Frontière de la source** : l'étude Capitaine passe chaque valeur DataForSEO par `toKpiValue` (texte illisible → `null`) et ramène l'intention à l'une des 4 valeurs (`coerceIntentLabel`), sinon `null`.
- **Sans appelant** : `upsertKeywordLocalAnalysis`, `upsertKeywordLocalComparison` et `deleteKeywordMetrics`. `local_analysis` et `local_comparison` ne sont donc plus alimentées.

## Persistance

**Autorité** : `keyword_metrics` (PostgreSQL), permanente, partagée entre articles et cocons. Index `idx_keyword_metrics_fetched` sur `fetched_at`. Aucune purge automatique.

La fraîcheur n'est pas imposée par la base : chaque lecteur l'applique avec `isKeywordMetricsFresh(fetchedAt, ttlDays)` (faux si `fetched_at` absent).

| Lecteur | Fraîcheur exigée |
|---|---|
| Étude Capitaine (`hitDb`) | 7 j, et volume, KD, CPC non nuls, et `autocomplete_source` renseigné |
| Mesure des candidats du Cerveau | 7 j |
| Brief (`getBrief`) | 7 j et volume connu |
| Content gap | 7 j |
| Suggestions Google | 1 j (0,02 j ≈ 30 min si la liste est vide) |
| PAA du Radar (`readPaaCache`) | 1 j, liste non vide, profondeur suffisante |
| Relecture du Capitaine, Score Pertinence, porte `captain-lock` | aucune : la ligne est lue telle quelle |

- `external_api_cache` (type `dataforseo`, 7 j) garde en plus certaines réponses brutes ; le brief le relit en dernier recours (cf. chapitre 20).
- Côté navigateur, aucune copie autonome : les écrans reçoivent ces mesures dans les réponses d'étude (`ScanResponse`) ou de relecture (`GET /api/articles/:id/keywords`).

## Consommateurs

### Affichage (UI)

- **Capitaine** — les 6 KPI d'une carte : à l'étude, depuis la réponse du scan ; à la réouverture, `getCaptainExplorations` joint `keyword_metrics` et recompose les KPI par `captainKpisFromMetricsRow` ([`captain-kpis.ts`](../../server/services/keyword/captain-kpis.ts)), la même fonction que l'étude (volume, KD, CPC, intention bornée 0..1, position dans les suggestions — 0 si récupérées sans le mot-clé, `null` si jamais récupérées — et score PAA recalculé contre le titre de l'article). Mot-clé jamais mesuré → aucun KPI, verdict GRAY.
- **Panneau « KPIs marché »** — [`CaptainSidePanel.vue`](../../src/components/moteur/CaptainSidePanel.vue) lit `entry.card.kpis` : « — » pour volume, KD, CPC absents.
- **Cerveau** — les candidats d'un nouvel article affichent volume, KD, CPC et intention (`KeywordMeasure.metrics`).
- **Explorations relues** — `GET /api/articles/:id/explorations` et ses compteurs exposent `local_analysis` et `content_gap_analysis` du Capitaine ([`article-explorations.routes.ts`](../../server/routes/article-explorations.routes.ts)).
- **Radar** — son scan relit volume, KD, CPC et intention dans cette table (moins de 7 jours, tous présents) avant d'appeler DataForSEO pour les autres mots-clés, puis y écrit ce qu'il a mesuré (`readReusableMeasures`, `saveMeasures`, [`keyword-radar.service.ts`](../../server/services/keyword/keyword-radar.service.ts)) ; la carte affichée est aussi rangée dans `radar_explorations` (cf. [radar-explorations](radar-explorations.md)). Radar et Capitaine partagent ainsi la même mesure (recette 2026-09-30, MOT-8).

### Calcul / tri / filtre / agrégat

- **Verdict et Score Marché de l'étude** — `computeVerdict` et `computeMarketScore` (l'intention de la SERP `intent_label` entre dans le Score Marché, cf. [score-capitaine](score-capitaine.md)).
- **Score Pertinence** — `computeRelevanceForCaptainTab` lit `paa_questions`, `autocomplete_suggestions` et `intent_label` (cf. [relevance-score-live-computation](relevance-score-live-computation.md)).
- **Porte `captain-lock`** — `captainGate` ([`gate.service.ts`](../../server/services/gates/gate.service.ts)) : verdict recalculé par `captainKpisFromMetricsRow`, volume, place de la requête dans les suggestions (le KPI `autocomplete` de ces mêmes lignes, `captainAutocompletePosition` : la valeur « Autocomplete » du panneau ; 0 = « Google ne suggère pas », même si Google renvoie des suggestions approchées), intention de la SERP ; l'empreinte de la porte garde le nombre brut de suggestions ; `exploredCandidates` propose les autres candidats de l'article dont le volume est mesuré.
- **Création d'un article du Cerveau** — `cocoon-article.service` refuse (422 `KEYWORD_NOT_MEASURED`) un mot-clé sans ligne dans `keyword_metrics` (FR-CER-KEYWORD-REAL-DATA).
- **Longueur conseillée** — `POST /api/articles/:id/recommend-word-count` ([`articles.routes.ts`](../../server/routes/articles.routes.ts)) lit `content_gap_analysis.averageWordCount` du Capitaine s'il existe.
- **Sans écran** — `GET /api/keywords/:keyword/metrics`, `GET /api/cocoons/:id/keyword-metrics` (`getCocoonKeywordMetrics`), `…/local-for-article`, `…/content-gap-for-article` ([`keyword-queries.routes.ts`](../../server/routes/keyword-queries.routes.ts)).

> **Règle de cohérence affichage / calcul** — Si une valeur est **affichée à l'utilisateur** ET utilisée pour du **tri / filtre / calcul dérivé / agrégat**, **la même expression** produit les deux. Pas de fallback différent entre l'affichage et le calcul. Si la valeur est `null` à l'affichage, elle est `null` partout.
>
> Ici : une mesure absente reste `null` de la base jusqu'à l'écran. `scoreKpi(null)` rend un KPI neutre « — » que le verdict ignore ; `computeKpiScore` retire la composante de la pondération ; l'écran affiche « — » par `formatVolume` / `formatKd` / `formatCpc` ; le tri la place en bas (`compareScores`) et les moyennes l'excluent (`averageScores`). L'étude et la relecture recomposent les KPI par la même fonction (`captain-kpis.ts`). Détail et exceptions : [20 — Infrastructure](../20-infrastructure.md), [09 — Contrats d'affichage](../09-contrats-affichage.md).

## Cas d'usage à risque

| Cas | Lecture | Écriture | Comportement |
|---|---|---|---|
| Mot-clé jamais vu | ligne absente | étude → KPI + PAA ; `fetchAutocomplete` → suggestions | Une mesure par mot-clé, pour tous les articles. |
| Même mot-clé, autre article, moins de 7 jours | ligne fraîche (`hitDb`) | aucune | Pas d'appel payant ; verdict et score PAA recalculés pour le niveau et le titre de l'article. |
| DataForSEO sans difficulté ou sans CPC | `NULL` | `COALESCE` garde l'ancienne valeur si elle existe | « KD — », jamais « KD 0 ». Tant que l'une manque, `hitDb` reste faux : chaque étude remesure. |
| SERP en panne pendant l'étude | — | pas d'écriture PAA | KPI PAA `null` (inconnu), pas « 0 question ». |
| Réouverture de l'article | jointure `keyword_metrics` | aucune | Mêmes KPI qu'à l'étude, sauf si la ligne a été remesurée entre-temps. |
| Radar puis étude Capitaine sur le même mot-clé | PAA en arbre (profondeur 2) | l'étude remplace `paa_questions` par une liste plate | Le scan Radar suivant voit une profondeur 1 et repaie ses PAA. |

## Limites connues

- **Un seul `fetched_at`** : une écriture de PAA, de suggestions ou la ligne parente d'un relevé SERP rajeunit en apparence des KPI anciens ; une étude Capitaine peut alors servir un volume de plus de 7 jours (cf. chapitre 20).
- **Formes mêlées dans `paa_questions`** : le Radar écrit un arbre (`depth`, `parentQuestion`), l'étude et le brief une liste plate ; chaque écriture remplace la précédente.
- **Colonnes orphelines** : `local_analysis` et `local_comparison` n'ont plus d'écrivain ; `content_gap_analysis` n'est écrite que par une route qu'aucun écran n'appelle.
- **Mot-clé à la casse près** : la clé est le mot-clé exact ; seule la porte (`exploredCandidates`) compare en minuscules.
- **Mesures du bac à sable gardées comme réelles** (FR-EXT-DATAFORSEO-SANDBOX, non tenue) : en simulé, le bac à sable écrit ici et dans les tables filles comme la production ; en réel, ces lignes de moins de 7 jours sont resservies. Contrairement à `external_api_cache` et `keyword_discoveries`, rangés par mode (`modeScopedKey`), la clé `(keyword, lang, country)` ne peut pas l'être sans réécrire tous les lecteurs ; la séparation attend une marque en base (cf. [18 — Intégrations externes](../18-integrations.md) § « Interrupteur simulé / réel »).

## Tests de cohérence qui la gardent

- [`tests/unit/coherence/keyword-metrics.test.ts`](../../tests/unit/coherence/keyword-metrics.test.ts) — fraîcheur de 7 jours (`isKeywordMetricsFresh`), lecture en base avant tout appel, `upsertKeywordKpis` garde une valeur connue face à `null` et remet `fetched_at` à jour, `null` en bas du tri et exclu des moyennes.
- [`tests/unit/coherence/kpi-nullable.test.ts`](../../tests/unit/coherence/kpi-nullable.test.ts) — KPI absents « — », tri et moyennes sans faux zéro, adaptateur DataForSEO qui propage `null`.
- [`tests/unit/services/keyword-metrics.service.test.ts`](../../tests/unit/services/keyword-metrics.service.test.ts), [`tests/unit/services/captain-kpis.test.ts`](../../tests/unit/services/captain-kpis.test.ts) (même expression à l'étude et à la relecture), [`tests/unit/routes/keyword-scan.routes.test.ts`](../../tests/unit/routes/keyword-scan.routes.test.ts).
- À écrire (encore `it.todo` dans `keyword-metrics.test.ts`) : deux articles qui étudient le même mot-clé ne déclenchent qu'un appel DataForSEO ; une valeur `null` affichée « — » et placée en bas, testée sur un composant.

---

*Document maintenu par la discipline data-flow-discipline. Cf. [README](./README.md).*
