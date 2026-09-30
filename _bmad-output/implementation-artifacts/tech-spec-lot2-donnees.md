---
name: tech-spec-lot2-donnees
title: Recette du 2026-09-30, lot 2 — les pertes et mélanges de données
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md (FR-MOT-CHECK-RECONCILIATION, FR-MOT-EXPLORATIONS-HYDRATATION, FR-CAP-PERSIST, FR-RAD-PERSIST, FR-RAD-SEND-CAPTAIN, FR-LIE-CHECKBOX-COUNT, FR-LIE-CHECKBOX-LOCK-IMMEDIATE, FR-LIE-SERP-ANALYZE, FR-UI-MOTEUR-SHARED, FR-RED-EDITOR-TIPTAP, FR-RED-SEO-SCORE-PERSIST, FR-RED-OUTLINE, FR-RED-BRIEF, FR-RED-DRAFT-SINGLE-PASS)
  - spec/05-moteur.md, spec/07-radar.md, spec/09-lieutenants.md, spec/13-redaction.md, spec/15-interface.md
  - spec/recette/01-dashboard-interface.md, 03-moteur-cadre.md, 04-discovery-radar.md, 07-redaction.md ; spec/18-recette-manuelle.md ; spec/parcours/PU-01 à PU-07
  - design/12-moteur.md, design/14-radar-capitaine.md, design/15-lieutenants-structure-lexique.md, design/17-redaction.md, design/03-api.md, design/07-tests-et-outillage.md
  - design/data-flows/completed-checks.md, keywords.md, lieutenants.md, moteur.md, captain-keyword-locked.md, radar-explorations.md, radar-keywords.md, seo.md
---

# Tech-spec — Lot 2 : les pertes et mélanges de données

La recette complète du 2026-09-30 (`recette-2026-09-30/`, surtout `03-moteur-cadre.md` T1 et `99-phase-finale.md` F4) a trouvé des données perdues (une étape validée, une liste d'attente, un texte qu'on croyait supprimé) et mélangées (le score, le texte ou le sommaire d'un article affichés ou écrits dans un autre). Principe commun, tiré de FR-MOT-NO-AUTO-ACTION et NFR-INT-COMPLETED-CHECKS-SSOT : **choisir un article ou ouvrir un onglet ne fait que relire** ; rien d'un article ne passe à un autre.

## 1. F4 — rechoisir un article effaçait « Structure validée »

- **Constat.** Choisir (ou rechoisir) un article au Moteur retirait `moteur:hn_locked`, reproduit sur 3 articles (pilier publié 1335 compris).
- **Cause (vérifiée).** `MoteurView.handleSelectArticle` vidait le store des mots-clés (`$reset`) avant de le relire. Pendant ce trou, `LieutenantsPanel` (monté, ou remonté au rechoix) voyait « aucun lieutenant verrouillé » alors que l'étape était en base : réconciliation → `withdrawCheck` → `POST …/uncheck`, et le serveur retirait `hn_locked` avec (`checksRemovedWith`, voulu). Les mots-clés arrivés, la transition « faux → vrai » passait pour un geste : `saveDecisions` (PUT), `invalidateValidatedStructure`, puis l'étape Lieutenants redemandée. La Structure, jamais. Même mécanique dans `LexiquePanel` (lexique retiré puis rendu, 06-T6).
- **Décision.** Deux gardes, sans toucher aux panneaux du lot 1 :
  1. `useMoteurArticleSync` lit les données de l'article choisi (mots-clés + progression si absente) et expose `articleReady` ; `MoteurView` ne monte les onglets qu'ensuite, dans un conteneur `:key="selectedArticle.id"` (« Lecture des données de l’article… », message et « Réessayer » en cas d'échec). `emitCheckCompleted` / `handleCheckRemoved` ignorent toute étape tant que l'article n'est pas relu.
  2. `LieutenantsPanel` ne juge que des données chargées (`articleDataReady`) et tient leur arrivée pour un point de départ, pas pour un geste (`baselineArticleId`, `arrivalSignature`) : réconciliation seulement, qui ne fait rien si données et étape concordent.
  La réconciliation d'une vraie contradiction (FR-MOT-CHECK-RECONCILIATION) est gardée.
- **Store.** `article-keywords.store` : `loadedArticleId`, réponse d'un article quitté ignorée (`requestedArticleId`), données d'un autre article remplacées au lieu d'être fusionnées.
- **Fichiers.** `src/views/MoteurView.vue`, `src/composables/moteur/useMoteurArticleSync.ts`, `src/components/moteur/LieutenantsPanel.vue`, `src/stores/article/article-keywords.store.ts`.
- **Tests.** `tests/unit/components/lieutenants-reconcile-loading.test.ts` (la course, rouge avant), `tests/unit/composables/useMoteurArticleSync.test.ts` (rouge avant), `tests/unit/stores/article-keywords.loading.test.ts`, `tests/unit/architecture/moteur-lecture-article.test.ts` (câblage de la vue, dans `verify`).
- **Exigence.** FR-MOT-CHECK-RECONCILIATION (critère ajouté, active), FR-CAP-PERSIST (critère ajouté, reste non tenue pour la provenance).

## 2. Écritures parasites au choix d'un article

- **Constat.** `PUT /articles/:id/keywords` en double ou à l'identique, `lexique_validated` retiré puis rendu (01-T5, 01-T7, 06-T6).
- **Cause.** Les transitions dues à l'arrivée des données (Lieutenants : `verifyLockedLieutenants(true)` → `saveDecisions` ; Lexique : `syncLexiqueGate` → `saveDecisions`) et, au Capitaine, l'avis IA automatique (`Watcher 3` → `requestSave`).
- **Décision.** Réglé par le point 1 pour les Lieutenants et le Lexique. **Reste au lot 1** : les `PUT` qui suivent un avis IA automatique du Capitaine (T2), que le lot 1 supprime.
- **Tests.** Ceux du point 1 (`saveDecisions` jamais appelé à l'arrivée des données).

## 3. Score SEO écrit sur l'article précédent (01-T1)

- **Cause (vérifiée).** Rédaction du pilier, puis de l'enfant sans F5 : `editor.store` gardait le texte du pilier et `lastSaved` (1335). Les mots-clés de l'enfant arrivés, `useSeoScoring` renotait le texte du pilier et `recordScore` l'envoyait au pilier (l'empreinte ne dépend que du texte et de la méta).
- **Décision.** `editorStore.openArticle(id)` à l'entrée des deux vues (avant les abonnements des calculs) ; `recordScore(kind, value, key, scoredForArticleId)` refuse un score calculé avec les mots-clés d'un autre article que celui de `lastSaved` (`seo.store` passe `articleKeywords.articleId`).
- **Fichiers.** `src/stores/article/editor.store.ts`, `src/stores/article/seo.store.ts`, les deux vues.
- **Tests.** `tests/unit/stores/editor-score-persist.test.ts` (2 cas, rouges avant), `tests/unit/components/article-opening-no-bleed.test.ts`.
- **Exigence.** FR-RED-SEO-SCORE-PERSIST : le manque « en passant d'un article à l'autre… » est retiré ; reste non tenue (premier jet interrompu).

## 4. RED-3 et RED-26 — texte, méta, sommaire d'un autre article ; « Supprimer le contenu »

- **Cause RED-3.** `ArticleWorkflowView.onMounted` n'hydratait `outlineStore` / `editorStore` que si le contenu enregistré en avait, sans remise à zéro ; l'éditeur (`loadContent`) de même.
- **Décision RED-3.** `editorStore.openArticle(id)` + `outlineStore.resetOutline()` dès la création des deux vues ; l'éditeur charge par `loadExistingContent`.
- **Cause RED-26.** `handleDeleteContent` envoyait `content: null` par `PUT /articles/:id` ; `saveArticleContent` lit `null` comme « inchangé » (`COALESCE`), à juste titre : un écran pas encore chargé ne doit jamais effacer un texte.
- **Décision RED-26.** Une écriture dédiée : `DELETE /api/articles/:id/content` → `clearArticleContent` (texte, méta, scores à `NULL` ; sommaire et phase gardés ; liens du texte sortis de la matrice). `editorStore.deleteContent` vide l'écran après la réussite, garde le texte et affiche l'erreur sinon.
- **Fichiers.** `src/views/ArticleWorkflowView.vue`, `src/views/ArticleEditorView.vue`, `src/stores/article/editor.store.ts`, `server/routes/articles.routes.ts`, `server/services/article/article-content.service.ts`.
- **Tests.** `tests/unit/components/article-opening-no-bleed.test.ts` (rouge avant), `tests/unit/stores/editor-delete-content.test.ts`, `tests/unit/services/article-content.service.test.ts`, `tests/unit/routes/articles.routes.test.ts`.
- **Exigences.** FR-RED-EDITOR-TIPTAP → **active** (deux critères ajoutés). FR-RED-OUTLINE : le manque « sommaire de l'article ouvert juste avant » est retiré ; reste non tenue.

## 5. MOT-10 et RAD-14 — Radar

- **Cause MOT-10.** `useKeywordRadar._saveToExploration` envoyait la liste mémoire du composable, vide en mode guidé : chaque scan vidait `generated_keywords`. Et les cartes enregistrées ne revenaient que par « Charger Radar » (ou si l'onglet était déjà monté).
- **Décision.** `_saveToExploration(articleId, seed, scannedKeywords)` envoie la liste scannée. `RadarPanel` reprend à son montage le dernier scan du store (`mergeRadarPayload`), sans appel ni événement `scanned`, s'il a des cartes.
- **Cause RAD-14.** `longTailSelectedSuggestions` n'était jamais vidé ; `RadarLongTailSuggestions` n'émettait sa sélection qu'au changement.
- **Décision.** Émission dès le montage (`immediate`), et `handleScan` / `handleReset` vident la sélection.
- **Fichiers.** `src/composables/keyword/useResonanceScore.ts` (en-tête `AUTHORITY` ajouté), `src/components/intent/RadarPanel.vue`, `src/components/intent/RadarLongTailSuggestions.vue`. `radar-exploration.store.ts` non touché (lot 1 y déduplique les envois).
- **Tests.** `tests/unit/composables/useResonanceScore.save.test.ts`, `tests/unit/components/radar-panel-reopen.test.ts`, `tests/unit/components/RadarLongTailSuggestions.test.ts` (rouges avant).
- **Exigences.** FR-RAD-PERSIST (manque « vider la liste d'attente » retiré, critères réécrits ; reste non tenue : longues traînes), FR-RAD-SEND-CAPTAIN (critère ajouté ; reste non tenue : provenance).

## 6. LIE-8 / INFRA-16, FIN-4, 01-T9 — Lieutenants

- **LIE-8.** `totalGenerated` n'était rempli qu'à la fin d'un flux IA → « N / 0 sélectionnés » et « Aucune génération IA » après rechargement. Décision : `countStoredProposals` (retenues + proposées + écartées) dans `restoreLockedLieutenants` et le watcher `richLieutenants`, désormais immédiat (panneau monté après la lecture : sans lui, des propositions sans lieutenant retenu ne s'affichaient plus).
- **FIN-4.** Après « Déverrouiller » → « Les garder », le Capitaine enregistré vaut `''` ; `MoteurView` calculait `capitaine ?? mot-clé de l'article` → `''` → « Analyser SERP » et « Extraire le Lexique » grisés. Décision : `moteurWorkingKeyword` (`shared/utils/article-keyword.ts`), une valeur vide ne compte pas. Aussi nécessaire depuis CAP-7 (un article jamais étudié a désormais un Capitaine `''`). Le Lexique (`LexiquePanel`, lot 1) profite du même correctif sans être modifié.
- **01-T9.** « Lancer une suggestion IA » sans analyse SERP : `proposeLieutenants` sortait en silence. Décision : même préalable qu'« Analyser SERP » (`proposeDisabledReason` → bouton grisé + raison dans `LieutenantsAiPanel`) ; quand il est rempli mais que l'analyse n'est pas relue (rechargement), `relaunchProposal` la relit d'abord puis relance l'IA.
- **Badge du niveau** (signalé par le lot 4 après sa fusion) : « intermediaire » (le code) près de « Lieutenants proposes par l'IA » ; `LieutenantProposals` passe par `articleLevelToDisplayLabel` (`shared/utils/article-level.ts`, lot 4). Test : `tests/unit/components/lieutenant-proposals.test.ts` (FR-CER-AIGUILLAGE).
- **Fichiers.** `src/composables/moteur/useLieutenantsIa.ts`, `src/components/moteur/LieutenantsPanel.vue`, `src/components/moteur/LieutenantProposals.vue`, `src/components/moteur/LieutenantsAiPanel.vue`, `src/components/moteur/lieutenants/LieutenantsResultsLayout.vue`, `src/views/MoteurView.vue`, `shared/utils/article-keyword.ts`.
- **Tests.** `tests/unit/composables/moteur/useLieutenantsIa.test.ts` (2 cas), `tests/unit/components/lieutenants-reopen.test.ts`, `tests/unit/shared/article-keyword.test.ts` (rouges avant).
- **Exigences.** FR-LIE-CHECKBOX-COUNT et FR-LIE-CHECKBOX-LOCK-IMMEDIATE (manques retirés ; restent non tenues pour le reste), FR-LIE-SERP-ANALYZE (critère précisé), FR-UI-AI-PANELS-PATTERN (cité par le test).

## 7. CAP-7 — store `null` pour un article jamais étudié

- **Cause (vérifiée).** `fetchKeywordsMerge` sortait sur `if (!remote) return` : le store restait `null` toute la session.
- **Décision.** Réponse vide → `initEmpty(id)` et `loadedArticleId = id`. Le déclenchement de l'avis IA (qui ne partait pas à cause de ce `null`) est décidé par le lot 1, prévenu.
- **Test.** `tests/unit/stores/article-keywords.loading.test.ts`. **Exigence.** FR-MOT-EXPLORATIONS-HYDRATATION (critère précisé, active).

## 8. RED-1 et `ErrorMessage` — Rédaction guidée

- **RED-1.** `capitaine ?? titre` ne remplaçait pas `''` : `keyword: ''` → 400 muet. Décision : `articleBriefKeyword` (capitaine enregistré, verrouillé, suggéré, puis titre) ; l'erreur du flux s'affiche dans le panneau (`iaBriefError`).
- **ErrorMessage.** Utilisé sans import dans `ArticleWorkflowView` : aucune panne affichée. Importé, et ajouté à l'éditeur ; `hide-retry` (« Réessayer » relançait la rédaction entière, payante, pour toute panne).
- **Valideur.** `tests/unit/architecture/template-components-imported.test.ts` (dans `verify`) : aucune balise de composant sans import dans `src/`.
- **Exigences.** FR-RED-BRIEF (critères ajoutés ; reste non tenue : analyse non enregistrée), FR-RED-DRAFT-SINGLE-PASS → **active**.

## 9. UI-7 — le bandeau « Résultats déjà calculés »

- **Cause.** `.cache-bar` en `left: 50%` + `translateX(-50%)` : sa largeur disponible était la moitié de l'écran ; avec l'invite, il passait sur deux lignes et se décalait.
- **Décision.** Centrage `left: 0; right: 0; margin: 0 auto; width: max-content` ; invite dans `.cache-bar__prompt`, en `position: absolute` à droite (au-dessus sous 1200 px).
- **Test.** `tests/unit/architecture/moteur-lecture-article.test.ts`. **Exigence.** FR-UI-MOTEUR-SHARED (critère ajouté, active).

## 10. Après la CI — ce que le lot a démasqué (repris par l'orchestrateur)

Les tests navigateur de la CI échouaient sur 4 tests, depuis le premier envoi du lot : ils ne passaient avant que grâce aux courses que le lot a supprimées.

- **Données de test incohérentes.** `gates.browser` (porte des lieutenants) et `structure.browser` (①, ②) posaient un capitaine par `PUT …/keywords` sans son étape `moteur:capitaine_locked`. L'onglet Capitaine, désormais monté sur des données relues, fait ce que FR-MOT-CHECK-RECONCILIATION demande : donnée présente, étape absente → l'étape est demandée à sa porte, et l'alarme s'ouvrait par-dessus l'écran. Avant, le panneau se montait sur un store vide et ne voyait aucun capitaine. **Décision** : le code a raison ; les tests créent l'article avec ses étapes (`createArticle(…, { checks })`, `tests/browser-e2e/helpers/test-fixtures.ts`), constantes `MOTEUR_*`.
- **FR-CAP-LOCK-INTEGRITY, rendu systématique par CAP-7.** Cliquer un mot d'une carte affiche la racine dans `entry.card` ; le « watcher 1 » de `CaptainPanel` enregistrait alors `entry.card.keyword` (la racine) comme candidat (`addCaptainPanel`), l'historique dépassait la liste et `restoreFromHistory` la reconstruisait avec la racine en carte à part (`interactions-capitaine` : « Aucune racine » dans le tiroir). Avant, le store resté `null` d'un article jamais étudié (CAP-7) bloquait cet enregistrement. **Correctif** : le watcher 1 n'enregistre que les cartes qui affichent leur mot-clé d'origine ; `candidatesFromHistory` ([`shared/captain-candidates.ts`](../../shared/captain-candidates.ts)) écarte d'un historique les études qui sont la racine d'un autre candidat (données déjà écrites par l'ancienne version) ; `restoreFromHistory` range ces études sous leur mot-clé long et donne à la ligne de racine les mesures de leur étude enregistrée. Décision d'Arnaud du 2026-09-29 appliquée en partie : racines sous la carte, jamais candidates d'office (le bouton « Prendre celui-ci » reste à faire).
- **Tests.** `tests/unit/shared/captain-candidates.test.ts` (dans `verify`), `tests/unit/composables/useExploredKeywords-roots-candidates.test.ts` ; test navigateur de la moyenne des racines : l'écran écrit « MOYENNE » en capitales, la comparaison ignore la casse (le test sortait avant faute de racine notée).
- **Exigences.** FR-CAP-LOCK-INTEGRITY (critère ajouté ; reste non tenue : deux casses d'un même mot-clé font deux candidats), FR-CAP-ROOTS (statut précisé : seule une racine sans étude enregistrée revient « — »).

## Ce qui reste ailleurs

- Lot 1 : avis IA automatiques du Capitaine et leurs `PUT` (T2) ; `LexiquePanel` ne vérifie pas lui-même que ses données sont chargées (couvert par le montage différé de `MoteurView`) ; en-tête du Lexique après déverrouillage : il montre désormais le mot-clé de l'article (comme avant tout verrou), pas encore « — » (FR-MOT-DISPLAY-FROM-STORE).
- Coûts comptés deux fois (`useResonanceScore.generate`, `editor.store.generateMeta` : `addEntry` en plus de `apiPost`), signalé par le lot 1 : non traité ici.
