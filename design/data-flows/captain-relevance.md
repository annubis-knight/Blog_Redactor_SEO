---
name: captain-relevance
description: Jugement de l'IA sur les questions PAA d'un candidat Capitaine face à la douleur de l'article (`PaaJudgmentBlock`) — calculé à l'entrée dans l'onglet, gardé en mémoire pour la session, jamais enregistré ; il corrige le signal 2 du Score Pertinence. Fiche courte : le calcul du score est dans relevance-score-live-computation.
type: "PaaJudgmentBlock { paaJudgments: { paaIndex, badge: 'pertinent'|'partiel'|'hors-sujet', paaScore 0-100, reasonShort }[], overallPaaScore 0-100, summary }"
last_updated: 2026-09-28
related_fr: [FR-CAP-PAA-JUDGE-HAIKU, FR-CAP-PAA-JUDGE-CACHE-SESSION, FR-CAP-PAA-BADGE-SINGLE, FR-CAP-RELEVANCE-UNAVAILABLE-REASON, FR-CAP-RELEVANCE-LIVE]
synced_with:
  - design/data-flows/relevance-score-live-computation.md
---

# Data Flow — captain-relevance (jugement IA des questions PAA)

> **Angle de cette fiche :** le jugement de l'IA sur les questions « People Also Ask » (PAA : les questions que Google affiche sous « Autres questions posées »). Le Score Pertinence qu'il corrige, ses autres signaux et ses raisons d'absence sont décrits dans [relevance-score-live-computation](relevance-score-live-computation.md) ; les deux notes d'un candidat dans [score-capitaine](score-capitaine.md).
> **Type/format :** `PaaJudgmentBlock` ([`shared/types/captain-paa-judgment.types.ts`](../../shared/types/captain-paa-judgment.types.ts)), mis en forme par le contrat `paa-judgment` / `captain-paa-judge` (badge strict, notes bornées 0..100).
> **Référence :** [14 — Radar et Capitaine](../14-radar-capitaine.md) § « Capitaine — jugement IA des questions PAA ».

## Producteurs

- **Déclencheur** — `CaptainPanel` ([`CaptainPanel.vue`](../../src/components/moteur/CaptainPanel.vue)) : `watch([active, selectedArticle.id], …, { immediate: true })` appelle `loadCaptainPaaJudgments(articleId)` quand l'onglet Capitaine est actif (`MoteurView` passe `:active="activeTab === 'capitaine'"`).
- **Store** — `loadCaptainPaaJudgments` ([`article-keywords.store.ts`](../../src/stores/article/article-keywords.store.ts)) : rien si l'article est déjà jugé ou en cours ; sinon `POST /api/articles/:id/captain/judge-paa` (contrat `captainPaaJudgeContract`). Un échec est journalisé (`log.warn`) et l'article sera rejugé à la prochaine activation.
- **Serveur** — `runPaaJudgmentsForArticle(articleId)` ([`captain-paa-judge.service.ts`](../../server/services/keyword/captain-paa-judge.service.ts)) lit `articles` (titre, douleur, intention attendue), `captain_explorations` (candidats) et `paa_explorations` (questions de l'article), puis appelle `judgePaaForKeyword` pour tous les candidats en parallèle (`Promise.all`, sans limite).
- **Un candidat** — `judgePaaForKeyword` : aucun appel sans douleur d'au moins 10 caractères ni PAA ; sinon prompt [`captain-paa-judge.md`](../../server/prompts/captain-paa-judge.md) via `loadPrompt` (titre, douleur, mot-clé et questions échappés), outil forcé `submit_paa_judgments`, modèle `claude-haiku-4-5-20251001` (`DEFAULT_HAIKU_MODEL`), réglages du fournisseur par défaut ; la sortie passe le contrat `paaJudgmentBlockContract`. Échec → `HaikuJudgmentError`, attrapée par l'appelant : ce candidat reste sans jugement.
- **Mode simulé** — [`mock-fixtures/captain-paa-judge.ts`](../../server/services/external/mock-fixtures/captain-paa-judge.ts) juge par mots communs : `pertinent` 85, `partiel` 55, `hors-sujet` 20, note globale = moyenne.

## Persistance

- **Aucune écriture** en base ni dans le stockage du navigateur (FR-CAP-PAA-JUDGE-CACHE-SESSION).
- **Mémoire de session** : `paaJudgmentsByArticle: Map<articleId, Map<keyword, PaaJudgmentBlock>>` et `paaJudgmentsLoadingByArticle` dans le store. `$reset` (changement d'article) les garde ; F5 les efface. Justification : la douleur ne change pas au Moteur (FR-PAIN-IMMUTABLE-AFTER-CEREVEAU).
- **Effet de bord en mémoire** : si le store porte encore l'article, chaque entrée de `richCaptain.exploredKeywords` reçoit `paaJudgment`, et `relevanceScore` / `relevanceUnavailableReason` recalculés (réponse `relevanceScores`, cf. [relevance-score-live-computation](relevance-score-live-computation.md) § 6).
- La relecture (`getCaptainExplorations`) renvoie toujours `paaJudgment: null`.

## Consommateurs

### Affichage (UI)

- [`RadarKeywordCard.vue`](../../src/components/intent/RadarKeywordCard.vue), seulement avec `cardContext="capitaine"` **et** un `paaJudgment` fourni : une pastille par question (vert `pertinent`, orange `partiel`, gris `hors-sujet`, justification en info-bulle) et « PAA pts » = `overallPaaScore/100`, « ... » pendant le calcul. Sans jugement, la carte garde les pastilles lexicales.
- Seul le mode `libre` de `CaptainPanel` (lecture `getPaaJudgment` pour la carte étudiée) fournit ces deux props. En mode `workflow`, la liste ne les reçoit pas : **aucune pastille IA n'est visible** (FR-CAP-PAA-BADGE-SINGLE, non tenue).

### Calcul / tri / filtre / agrégat

- **Signal 2 du Score Pertinence** (PAA × douleur, 25 %) : `overallPaaScore` remplace le calcul lexical pour ce candidat ; les racines restent lexicales.
- Aucun tri ni filtre ne lit le jugement lui-même.

> **Règle de cohérence affichage / calcul** — Si une valeur est **affichée à l'utilisateur** ET utilisée pour du **tri / filtre / calcul dérivé / agrégat**, **la même expression** produit les deux. Pas de fallback différent entre l'affichage et le calcul. Si la valeur est `null` à l'affichage, elle est `null` partout.
>
> Ici : la même valeur `overallPaaScore` est montrée (« PAA pts ») et injectée dans le signal 2. Mais les notes corrigées ne sont écrites que dans le store : la liste affichée et son tri gardent les cartes construites avant (voir limites).

## Cas d'usage à risque

| Cas | Comportement |
|---|---|
| Première entrée dans l'onglet pour un article | Un appel IA par candidat qui a des PAA et une douleur. |
| Retour sur l'onglet ou sur l'article (même session) | Aucun appel (cache de session). |
| F5 | Nouveaux appels à la prochaine entrée dans l'onglet. |
| Candidat ajouté après le jugement | Pas jugé avant F5 : l'article est déjà marqué jugé. |
| IA en panne pour un candidat | Signal 2 lexical pour ce candidat, sans signalement à l'écran. |
| Mode simulé | Jugement déterministe, sans clé. |

## Limites connues

- **Coût sans effet visible en mode workflow** : le jugement est payé à chaque session, mais ni ses pastilles ni les notes qu'il corrige n'atteignent la liste du Capitaine (`restoreFromHistory` a déjà construit les cartes ; un cache de session ne réapplique rien) — FR-CAP-PAA-JUDGE-HAIKU non tenue.
- **Échec muet** : `PaaJudgmentUnavailableReason` déclare `haiku-unavailable`, jamais produite (FR-CAP-RELEVANCE-UNAVAILABLE-REASON).
- **Deux sources de questions** : le jugement lit `paa_explorations` (questions de l'article), le repli lexical du signal 2 lit `keyword_metrics.paa_questions`.

## Tests de cohérence qui la gardent

- [`tests/unit/stores/article-keywords-paa-judgments.test.ts`](../../tests/unit/stores/article-keywords-paa-judgments.test.ts) (cache de session, pas de second appel), [`tests/unit/services/captain-paa-judge.service.test.ts`](../../tests/unit/services/captain-paa-judge.service.test.ts), [`tests/unit/services/captain-relevance-haiku-override.service.test.ts`](../../tests/unit/services/captain-relevance-haiku-override.service.test.ts), [`tests/unit/shared/contracts/captain-paa-judge.contract.test.ts`](../../tests/unit/shared/contracts/captain-paa-judge.contract.test.ts).
- Aucun test de `tests/unit/coherence/` ne couvre ce jugement. À écrire : après le jugement, la liste du Capitaine affiche et trie la note corrigée (échouera tant que la limite ci-dessus existe).

---

*Document maintenu par la discipline data-flow-discipline. Cf. [README](./README.md).*
