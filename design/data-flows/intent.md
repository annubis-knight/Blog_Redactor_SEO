---
name: intent
description: Intention de recherche d'un mot-clé selon Google (mesurée par DataForSEO), rangée dans `keyword_metrics` (`intent_label`, `intent_raw`) ou dans les cartes du Radar, et croisée avec l'intention éditoriale attendue de l'article (`articles.pain_intent_expected`). La table `keyword_intent_analyses` est morte.
type: "intent_label : 'commercial' | 'transactional' | 'informational' | 'navigational' | null ; intent_raw : probabilité 0..1 | null ; RadarKeywordKpis.intentTypes : RadarIntentType[]"
last_updated: 2026-09-28
related_fr: [FR-CAP-RELEVANCE-INTENT-SIGNAL, FR-CAP-SCORING-BIMODAL, FR-RAD-SCORING-BIMODAL, FR-CAP-LOCK-GATE, FR-CAP-SCAN, FR-CAP-KPIS-READONLY, FR-CER-KEYWORD-REAL-DATA, FR-EXT-DATAFORSEO, FR-RAD-SCAN-2PASS]
---

# Data Flow — intent

> **Description métier :** ce que l'internaute cherche quand il tape un mot-clé, tel que Google le comprend : s'informer (`informational`), comparer (`commercial`), acheter (`transactional`) ou aller sur un site précis (`navigational`). L'outil la compare à l'intention que l'article doit servir, fixée au Cerveau.
> **Type/format :** un libellé parmi 4 valeurs et une probabilité (la certitude de DataForSEO, entre 0 et 1). L'intention attendue de l'article prend les mêmes 4 valeurs.
> **Références :** [14 — Radar et Capitaine](../14-radar-capitaine.md) (étude, Score Pertinence, porte), [20 — Infrastructure](../20-infrastructure.md) (mémoire des mots-clés, portes), [18 — Intégrations externes](../18-integrations.md) (DataForSEO). Fiches voisines : [keyword-metrics](keyword-metrics.md), [relevance-score-live-computation](relevance-score-live-computation.md), [score-capitaine](score-capitaine.md).

## Producteurs

Qui crée ou met à jour cette donnée :

- **Source unique** — `fetchSearchIntentBatch(keywords)` ([`dataforseo/keywords.ts`](../../server/services/external/dataforseo/keywords.ts)) appelle `dataforseo_labs/google/search_intent/live` par lots de 1 000 et range les réponses sous le mot-clé **en minuscules** : `{ intent: libellé, intentProbability }`. Un lot en échec est journalisé et laissé vide.
- **Étude Capitaine** — `POST /api/keywords/:keyword/scan` ([`keyword-scan.routes.ts`](../../server/routes/keyword-scan.routes.ts)) : si les mesures ne sont pas fraîches, lit `intentMap.get(keyword.toLowerCase())`, ramène le libellé aux 4 valeurs (`coerceIntentLabel`, sinon `null`) et l'enregistre par `upsertKeywordKpis` (`intent_label`, `intent_raw`). Sinon, relit `intent_label` en base.
- **Mesure des candidats du Cerveau** — `measureKeywords` ([`keyword-measure.service.ts`](../../server/services/keyword/keyword-measure.service.ts)) : même enregistrement, pour les mots-clés absents ou de plus de 7 jours.
- **Scan Radar** — `scanRadarKeywords` ([`keyword-radar.service.ts`](../../server/services/keyword/keyword-radar.service.ts)) : `mapIntentTypes(libellé)` → `card.kpis.intentTypes`, et `intentProbability`. Ce résultat part dans la réponse du scan et dans `radar_explorations.scan_result`, et, pour un mot-clé mesuré par ce scan, dans `keyword_metrics` (`intent_label` ramené aux 4 valeurs, `intent_raw`). Une intention déjà gardée depuis moins de 7 jours est relue, sans appel.
- **Intention attendue de l'article** — `articles.pain_intent_expected`, posée au Cerveau (IA, utilisateur ou candidat d'origine) par `insertCocoonArticle` et `updateArticleInCocoon` ([`data.service.ts`](../../server/services/infra/data.service.ts)). Cf. [articles](articles.md) et [11 — Cerveau](../11-cerveau.md).

## Persistance

| Emplacement | Contenu | Écrit par |
|---|---|---|
| `keyword_metrics.intent_label` TEXT (`CHECK` 4 valeurs) | libellé de la SERP | étude Capitaine, mesure du Cerveau (`COALESCE` : jamais effacé par `null`) |
| `keyword_metrics.intent_raw` NUMERIC | probabilité | idem ; le brief de la Rédaction ne l'écrit pas |
| `radar_explorations.scan_result.cards[].kpis.intentTypes` / `.intentProbability` (JSONB) | intention des cartes du Radar | scan Radar (cf. [radar-explorations](radar-explorations.md)) |
| `articles.pain_intent_expected` TEXT | intention attendue de l'article | Cerveau |
| `keyword_intent_analyses` | **morte** : ni lue ni écrite, conservée dans le schéma | personne |

- La lecture de `intent_label` repasse par la même règle des 4 valeurs (`rowToMetrics`). `getArticlePainIntent` ([`article-pain-intent.service.ts`](../../server/services/queries/article-pain-intent.service.ts)) rend `null` pour une valeur absente, inconnue ou en cas d'erreur.
- `keyword_intent_analyses` : [`tests/unit/coherence/db-tables-coverage.test.ts`](../../tests/unit/coherence/db-tables-coverage.test.ts) échoue si un fichier de `server/`, `src/` ou `shared/` la relit ou l'écrit. La réactiver demande un producteur et une décision. `useIntentStore` ([`intent.store.ts`](../../src/stores/keyword/intent.store.ts)) ne garde plus que `comparisonData`, `autocompleteData` et `localComparisons`.

## Consommateurs

### Affichage (UI)

- **Carte du Radar** — [`RadarKeywordCard.vue`](../../src/components/intent/RadarKeywordCard.vue) : une icône par valeur de `card.kpis.intentTypes` ; aucune icône si la liste est vide.
- **Panneau « KPIs marché » du Capitaine** — [`CaptainSidePanel.vue`](../../src/components/moteur/CaptainSidePanel.vue) : `card.kpis.intentTypes` joints par virgule, sinon « — ». Une carte construite par l'étude (`hydrateCardFromValidation`) a toujours `intentTypes: []` : seules les cartes venues du Radar montrent une intention (FR-CAP-KPIS-READONLY, non tenue).
- **Candidats du Cerveau** — `KeywordMeasure.metrics.intent` (= `intent_label`).
- **Alarme de la porte** — message de la règle `captain-intent-mismatch` : « Google traite cette requête comme … » ([`shared/verifiers/captain.ts`](../../shared/verifiers/captain.ts)).

### Calcul / tri / filtre / agrégat

Trois calculs lisent l'intention, chacun avec sa propre expression :

| Calcul | Expression | Intention absente |
|---|---|---|
| Verdict de l'étude (`computeVerdict`, KPI « intent ») | `captainIntentValue(intent_raw)` : **la probabilité** bornée 0..1 ; vert ≥ 0,7, orange ≥ 0,4 ([`kpi-scoring.ts`](../../shared/kpi-scoring.ts)) | KPI neutre « — », ignoré par le verdict |
| Score Marché (`computeKpiScore`, poids 15 %) | `intentValueToPseudoScore(intentTypes, probabilité)` : commercial 1 · transactionnel 0,8 · informationnel 0,5 · navigationnel 0,2, × probabilité (1 si inconnue) ([`scoring-kpi.ts`](../../shared/scoring-kpi.ts)) | pseudo-score 0, composante rouge **comptée** (libellé « inconnu ») |
| Score Pertinence, signal 5 (poids 10 %) | `computeIntentPainAlignment(intentTypes, painIntentExpected)` (matrice 4 × 4) puis malus de 10 points (`INTENT_MISMATCH_MALUS`) si l'intention attendue n'est pas dans la liste ([`scoring.ts`](../../shared/scoring.ts)) | 50 (neutre) si l'une des deux manque |

- **Porte `captain-lock`** — `captainGate` lit `intent_label` et `pain_intent_expected` ; `expectedCaptainIntent` remplace une intention attendue absente par `informational` pour un pilier. Écart 🔴 si l'article est informationnel et la SERP commerciale ou transactionnelle, 🟠 pour tout autre écart ; les deux intentions entrent dans l'empreinte de la porte.
- **Sources de l'étude** — le Score Marché de l'étude prend `intent_label` ; son Score Pertinence prend d'abord l'intention de la carte du Radar du même mot-clé si elle existe, sinon `intent_label`. La relecture (`computeRelevanceForCaptainTab`) prend toujours `intent_label`.

> **Règle de cohérence affichage / calcul** — Si une valeur est **affichée à l'utilisateur** ET utilisée pour du **tri / filtre / calcul dérivé / agrégat**, **la même expression** produit les deux. Pas de fallback différent entre l'affichage et le calcul. Si la valeur est `null` à l'affichage, elle est `null` partout.
>
> Ici : au Radar, les icônes et le Score Marché (anneau et tri) lisent le même `card.kpis.intentTypes`. Au Capitaine, l'étude et la réouverture lisent le même `intent_label` et la même `pain_intent_expected` (FR-CAP-RELEVANCE-INTENT-SIGNAL). L'intention n'est jamais un critère de tri direct.

## Cas d'usage à risque

| Cas | Comportement |
|---|---|
| DataForSEO ne renvoie pas d'intention | `intent_label` et `intent_raw` restent `null` (ou gardent l'ancienne valeur) ; verdict sans KPI intention, Score Marché avec une composante rouge, signal 5 neutre, porte sans alerte d'intention. |
| Mot-clé saisi avec des majuscules | Retrouvé : les réponses sont rangées en minuscules et lues en minuscules. |
| Mot-clé étudié au Radar puis au Capitaine | Une mesure : le scan Radar l'écrit dans `keyword_metrics`, et l'étude du Capitaine la relit. La carte du Radar (figée au scan) ne diverge qu'après une nouvelle mesure, au-delà de 7 jours. |
| Article sans intention attendue | Signal 5 neutre (50) ; la porte suppose « informationnel » pour un pilier et ne dit rien pour les autres niveaux. |
| Mot-clé étudié hors Radar | Panneau « KPIs marché » : Intent « — », alors que l'intention est connue et entre dans les scores. |

## Limites connues

- **Trois sens pour « intention »** : le verdict note la certitude de DataForSEO, pas le type ; un mot-clé navigationnel très certain y compte vert.
- **Intention inconnue comptée rouge** dans le Score Marché au lieu d'être exclue comme les autres données absentes (dette relevée au chapitre 14 ; cf. FR-RAD-SCORING-BIMODAL, « sur les seules données présentes »).
- **Intention attendue** : la porte et le Score Pertinence ne la complètent pas de la même façon pour un pilier (règle de la porte, FR-CAP-LOCK-GATE ; neutralité du signal, FR-CAP-RELEVANCE-INTENT-SIGNAL).

## Tests de cohérence qui la gardent

- [`tests/unit/coherence/intent.test.ts`](../../tests/unit/coherence/intent.test.ts) — seuls les tests sur `intentValueToPseudoScore` vérifient le code réel (poids des 4 intentions, intention absente = 0, la plus forte l'emporte). Les blocs `FR-RAD-SCAN-2PASS`, `FR-EXP-INTENT-ANALYZE` (PAA) et `FR-CAP-VALIDATE` manipulent des objets `IntentAnalysis` fabriqués pour l'ancien Explorateur : ils ne gardent plus rien.
- [`tests/unit/coherence/relevance-live-computation.test.ts`](../../tests/unit/coherence/relevance-live-computation.test.ts) (`FR-CAP-RELEVANCE-INTENT-SIGNAL` : câblage de `painIntentExpected`, malus, colonne à valeur unique), [`tests/unit/shared/intent-mismatch-malus.test.ts`](../../tests/unit/shared/intent-mismatch-malus.test.ts), [`tests/unit/services/article-pain-intent.test.ts`](../../tests/unit/services/article-pain-intent.test.ts), [`tests/unit/shared/verifiers-captain.test.ts`](../../tests/unit/shared/verifiers-captain.test.ts) (règle `captain-intent-mismatch`).
- [`tests/unit/coherence/db-tables-coverage.test.ts`](../../tests/unit/coherence/db-tables-coverage.test.ts) — `keyword_intent_analyses` ni lue ni écrite.
- À écrire : l'étude et la réouverture d'un même mot-clé donnent le même signal 5.

---

*Document maintenu par la discipline data-flow-discipline. Cf. [README](./README.md).*
