---
name: score-capitaine
description: Les deux notes sur 100 d'un mot-clé candidat — Score Marché (le mot-clé pèse-t-il en SEO ?) affiché au Radar, Score Pertinence (sert-il la douleur de l'article ?) affiché au Capitaine — et le verdict de l'étude. Aucune n'est enregistrée comme donnée : elles sont recalculées.
type: "MarketScoreResult { total: number, verdict: 'GO'|'ORANGE'|'NOGO', components } ; RelevanceScoreResult { total, verdict, breakdown, rootsContext } | null ; ScanVerdict { level: 'GO'|'ORANGE'|'NO-GO'|'GRAY', … }"
last_updated: 2026-09-30
related_fr: [FR-RAD-SCORING-BIMODAL, FR-RAD-MARKET-COMPUTED-LIVE, FR-RAD-MARKET-LEVEL-AWARE, FR-RAD-NO-RELEVANCE-IN-SCAN, FR-CAP-SCORING-BIMODAL, FR-CAP-SCAN, FR-CAP-AUTO-NOGO, FR-CAP-RELEVANCE-LIVE, FR-CAP-LOCK-INTEGRITY, FR-CAP-LOCK-GATE, FR-CAP-AI-PANEL, FR-INFRA-SCORE-MODULE, FR-INFRA-NO-SCORE-FALLBACK, FR-INFRA-KPI-SCORING-NULLSAFE, FR-INFRA-KPI-CONSISTENCY]
---

# Data Flow — score-capitaine

> **Description métier :** deux notes indépendantes pour chaque mot-clé candidat. Le **Score Marché** répond à « ce mot-clé pèse-t-il en SEO ? » (volume, difficulté, intention, questions PAA, suggestions Google, CPC). Le **Score Pertinence** répond à « ce mot-clé sert-il la douleur de l'article ? ». Une carte n'en montre qu'une : le Marché au Radar, la Pertinence au Capitaine. À côté, l'étude d'un mot-clé rend un **verdict** (GO, ORANGE, NO-GO, GRAY) tiré de ses six indicateurs.
> **Type/format :** voir le front-matter ([`shared/types/scoring.types.ts`](../../shared/types/scoring.types.ts), [`keyword-validate.types.ts`](../../shared/types/keyword-validate.types.ts)). Verdict d'une note : ≥ 70 GO, ≥ 40 ORANGE, sinon NOGO (`verdictFromScore`). Une note absente est `null` et s'affiche « — », jamais 0.
> **Références :** [14 — Radar et Capitaine](../14-radar-capitaine.md) (formules, écrans), [20 — Infrastructure](../20-infrastructure.md) § « Scores et indicateurs nullables » (module `@shared/score`), [09 — Contrats d'affichage](../09-contrats-affichage.md). Le calcul détaillé du Score Pertinence est dans [relevance-score-live-computation](relevance-score-live-computation.md) ; le jugement IA des PAA dans [captain-relevance](captain-relevance.md).

## Producteurs

Qui crée ou met à jour cette donnée :

**Score Marché** — `computeMarketScore(kpis, niveau)` = `computeKpiScore` + verdict ([`shared/scoring-kpi.ts`](../../shared/scoring-kpi.ts)) : volume 30 %, difficulté 20 %, intention 15 %, PAA 10 %, suggestions 10 %, CPC 10 %, seuils selon le niveau de l'article ([`kpi-scoring.ts`](../../shared/kpi-scoring.ts)) ; une composante absente (« — ») sort de la pondération.
- Scan Radar (`scanRadarKeywords`, [`keyword-radar.service.ts`](../../server/services/keyword/keyword-radar.service.ts)) : `card.marketScore`, calculé avec le niveau, et tri serveur des cartes par `compareScores(marketScore.total)`.
- Carte du Radar ([`RadarKeywordCard.vue`](../../src/components/intent/RadarKeywordCard.vue), mode `kpi`) : **recalcule** `computeKpiScore(card.kpis, articleLevel).total` à chaque affichage ; le `marketScore` reçu n'est pas lu pour l'anneau.
- Étude Capitaine (`POST /api/keywords/:keyword/scan`, [`keyword-scan.routes.ts`](../../server/routes/keyword-scan.routes.ts)) : `ScanResponse.marketScore`, avec l'intention de la SERP (`intent_label`).
- Relecture (`getCaptainExplorations`, [`data.service.ts`](../../server/services/infra/data.service.ts)) : copie du `marketScore` de la carte du Radar du même mot-clé dans `radar_explorations.scan_result` ; `null` si le mot-clé n'y figure pas.

**Score Pertinence** — `computeRelevanceScore` ([`shared/scoring.ts`](../../shared/scoring.ts)) : douleur × mot-clé 30 %, PAA × douleur 25 %, suggestions × douleur 15 %, racines 20 %, intention × douleur 10 %. Trois producteurs, détaillés dans [relevance-score-live-computation](relevance-score-live-computation.md) :
- l'étude Capitaine (calcul « à l'étude », sans racines) ;
- la relecture (`computeRelevanceForCaptainTab`, à chaque `GET /api/articles/:id/keywords`) ;
- le jugement IA des PAA (`POST /api/articles/:id/captain/judge-paa`), qui renvoie des notes corrigées.
- Le scan Radar ne produit **aucune** Pertinence (`relevanceScore: null`, FR-RAD-NO-RELEVANCE-IN-SCAN).

**Verdict de l'étude** — `computeVerdict(kpis)` ([`kpi-scoring.ts`](../../shared/kpi-scoring.ts)) sur les six KPI : GRAY sans volume, PAA ni suggestions ; NO-GO d'office si les trois valent 0 (FR-CAP-AUTO-NOGO) ; NO-GO si volume et KD, ou PAA et volume, sont rouges ; GO si au moins 4 verts sans rouge critique ; sinon ORANGE. Recalculé à l'étude, à la relecture (`restoreFromHistory`, seuils du niveau) et par la porte (`captainGate`).

## Persistance

**Aucune note n'est une donnée enregistrée** : ni colonne `market_score` ni `relevance_score` dans le schéma (un test le vérifie). Elles sont recalculées à partir des entrées, qui, elles, sont en base : `keyword_metrics` (cf. [keyword-metrics](keyword-metrics.md)), `articles.pain_point`, `articles.pain_intent_expected`, `captain_explorations.root_keywords`, `paa_explorations`.

| Où vit une note | Durée | Remarque |
|---|---|---|
| `radar_explorations.scan_result.cards[].marketScore` (JSONB) | jusqu'au prochain scan | copie figée au scan ; relue par la relecture du Capitaine et par les pastilles « M » du Radar |
| `useKeywordRadar().scanResult` ([`useResonanceScore.ts`](../../src/composables/keyword/useResonanceScore.ts)) | session | cartes affichées au Radar |
| entrées de `useExploredKeywords` (`card`, `originalCard`, `validation`) | tant que l'onglet est monté | liste du Capitaine |
| `useArticleKeywordsStore().keywords.richCaptain.exploredKeywords[]` | jusqu'au changement d'article ou F5 | réponse de la relecture ; notes corrigées par le jugement IA |

Les anciens instantanés du Radar peuvent encore contenir un `relevanceScore` : `getCaptainExplorations` l'ignore et le signale (`log.warn`).

## Consommateurs

### Affichage (UI)

- **Radar** — anneau de `RadarKeywordCard` en mode `kpi` : `computeKpiScore(card.kpis, articleLevel).total` ; « — » si la carte n'a pas de KPI (longue traîne). Info-bulle : détail des composantes ([`RadarCardScoreRing.vue`](../../src/components/intent/radar-card/RadarCardScoreRing.vue)).
- **Suggestions IA du Radar** — [`RadarAiPanel.vue`](../../src/components/moteur/RadarAiPanel.vue) : pastilles « M » (`card.marketScore.total`) et « P » (`card.relevanceScore.total`) par `formatScore` (« — » si absent ; au Radar, « P » est toujours « — », et son infobulle renvoie au Capitaine).
- **Capitaine** — anneau en mode `relevance` (via [`CaptainInteractiveWords.vue`](../../src/components/moteur/CaptainInteractiveWords.vue)) : `card.relevanceScore.total` ; « — » et la raison (`relevanceUnavailableReason` du serveur, sinon une raison devinée par l'écran).
- **Racines** — [`CaptainRootsSidebar.vue`](../../src/components/moteur/CaptainRootsSidebar.vue) : `ScoreRing` de chaque racine (`variant.card.relevanceScore.total`) et leur moyenne.
- **Verdict** — badge du panneau latéral ([`CaptainSidePanel.vue`](../../src/components/moteur/CaptainSidePanel.vue)) : niveau de `entry.validation.verdict`, raison détaillée pour un NO-GO.

### Calcul / tri / filtre / agrégat

- **Tri du Radar** — « Score KPI » de [`RadarPanel.vue`](../../src/components/intent/RadarPanel.vue) : `computeKpiScore(card.kpis, articleLevel).total`, `null` sans KPI ou si le calcul échoue ; tri générique [`useSortableList`](../../src/composables/moteur/useSortableList.ts) (`null` toujours en bas).
- **Tri du Capitaine** — « Score Pertinence » de [`CaptainPanel.vue`](../../src/components/moteur/CaptainPanel.vue) : `originalCard.relevanceScore.total` ; la carte verrouillée reste en tête (`pinnedPredicate`).
- **Classement des suggestions IA du Radar** — [`useRadarRanking.ts`](../../src/composables/moteur/useRadarRanking.ts) : top 5 par `averageScores([marketScore.total, relevanceScore.total])`, cartes NOGO sur les deux axes écartées.
- **Moyenne des racines** — `averageScores` (absents exclus) ; couleurs vert ≥ 65, orange ≥ 40.
- **Avis de l'IA** — `POST /api/keywords/:keyword/ai-panel` reçoit `marketScore` et `relevanceScore` de `entry.validation`, mis en forme par `formatScoreForPrompt` ([`keyword-ai-panel.routes.ts`](../../server/routes/keyword-ai-panel.routes.ts)).
- **Porte `captain-lock`** — le verdict NO-GO déclenche la règle 🔴 `captain-verdict-nogo` ([`shared/verifiers/captain.ts`](../../shared/verifiers/captain.ts)) ; les notes sur 100 n'entrent pas dans la porte.

> **Règle de cohérence affichage / calcul** — Si une valeur est **affichée à l'utilisateur** ET utilisée pour du **tri / filtre / calcul dérivé / agrégat**, **la même expression** produit les deux. Pas de fallback différent entre l'affichage et le calcul. Si la valeur est `null` à l'affichage, elle est `null` partout (item placé en bas du tri, exclu de la moyenne).
>
> Ici :
> - **Radar** : l'anneau et le tri lisent la même expression, `computeKpiScore(card.kpis, niveau).total`, recalculée à l'écran.
> - **Capitaine** : l'anneau lit `card.relevanceScore.total`, le tri `originalCard.relevanceScore.total`. Les deux sont le même objet tant qu'aucune racine n'est affichée ; quand l'utilisateur affiche une racine, l'anneau montre la note de la racine mais la carte garde sa place (écart voulu, FR-CAP-LOCK-INTEGRITY).
> - Partout : `compareScores` met `null` en bas, `averageScores` l'exclut ; la règle ESLint `no-restricted-syntax` interdit `score ?? 0`.

## Cas d'usage à risque

| Cas | Score Marché | Score Pertinence |
|---|---|---|
| Carte venue du Radar, juste envoyée au Capitaine | anneau du Radar recalculé | la carte du Radar est gardée comme `card` (sans Pertinence) : « — » et carte en bas du tri jusqu'à la réouverture |
| Mot-clé saisi à la main, juste étudié | celui de l'étude | calcul « à l'étude » (sans racines) |
| Réouverture de l'article | copie du Radar, `null` si le mot-clé n'y était pas | relecture recalculée (racines, intention, douleur du moment) |
| Longue traîne sans KPI | « — » | jamais la raison `long-tail` en relecture : score calculé si PAA et suggestions existent, sinon `missing-paa` ou `missing-autocomplete` (voir [relevance-score-live-computation](relevance-score-live-computation.md) § 8) |
| Formule modifiée | l'anneau suit la nouvelle formule ; la copie du Radar et les pastilles « M » gardent l'ancienne jusqu'au prochain scan | toujours recalculée |

## Limites connues

- **Deux Pertinences pour un même mot-clé** : juste après l'étude, la note vient d'un autre calcul que celle de la réouverture (sans racines, avec les signaux de la carte du Radar) — FR-CAP-RELEVANCE-LIVE non tenue. Sans point de douleur, un mot-clé déjà scanné au Radar reçoit quand même une note à l'étude — FR-CAP-PAINPOINT-FALLBACK non tenue.
- **Notes corrigées par l'IA invisibles** : `loadCaptainPaaJudgments` remplace `relevanceScore` dans le store, mais la liste garde les cartes construites avant (cf. [captain-relevance](captain-relevance.md)).
- **Score Marché figé dans la copie du Radar** : les pastilles « M » et l'avis de l'IA après réouverture lisent la copie du scan, pas le recalcul de l'anneau ; un mot-clé étudié hors Radar n'a plus de Score Marché après réouverture.
- **Thermomètre du Radar** : il moyenne `combinedScore`, qui compte 0 pour une donnée absente, et non le Score Marché (dette relevée au chapitre 14).

## Tests de cohérence qui la gardent

- [`tests/unit/coherence/score-capitaine.test.ts`](../../tests/unit/coherence/score-capitaine.test.ts) — `compareScores` place `null` en bas, `averageScores` exclut `null`. Ses blocs `FR-CAP-SCORING-BIMODAL` (« même champ »), `FR-CAP-VERDICT-INFORMATIVE` et `FR-CAP-PAINPOINT-FALLBACK` comparent des objets écrits dans le test : ils ne vérifient pas le code.
- [`tests/unit/coherence/radar-explorations.test.ts`](../../tests/unit/coherence/radar-explorations.test.ts) — `FR-RAD-SCORING-BIMODAL` : anneau et tri identiques en mode KPI et en mode Pertinence, `null` en bas, longue traîne neutre.
- [`tests/unit/components/radar-keyword-card-display-mode.test.ts`](../../tests/unit/components/radar-keyword-card-display-mode.test.ts), [`radar-keyword-card-score-separation.test.ts`](../../tests/unit/components/radar-keyword-card-score-separation.test.ts) (un seul score par carte, pas de repli sur `combinedScore`), [`tests/unit/composables/captain-sort-stable-sprint17.test.ts`](../../tests/unit/composables/captain-sort-stable-sprint17.test.ts) (afficher une racine ne déplace pas la carte), [`tests/unit/shared/scoring-kpi.test.ts`](../../tests/unit/shared/scoring-kpi.test.ts), [`tests/unit/shared/scoring.test.ts`](../../tests/unit/shared/scoring.test.ts), [`tests/unit/coherence/kpi-nullable.test.ts`](../../tests/unit/coherence/kpi-nullable.test.ts).
- À écrire (encore `it.todo`) : un même mot-clé garde la même Pertinence juste après son étude et après réouverture.

---

*Document maintenu par la discipline data-flow-discipline. Cf. [README](./README.md).*
