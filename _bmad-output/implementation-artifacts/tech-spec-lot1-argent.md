---
title: 'Tech-spec — Recette 2026-09-30, lot 1 : l’argent'
name: tech-spec-lot1-argent
type: tech-spec
status: in-review
version: 1.0.0
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md (FR-INFRA-RUNTIME-MODE, NFR-COST-AI-MOCK, FR-EXT-DATAFORSEO-SANDBOX, FR-MOT-NO-AUTO-ACTION, FR-CAP-AI-PANEL, FR-CAP-INPUT, FR-CAP-ROOTS, FR-LEX-AI-PANEL, FR-DIS-RELEVANCE-FILTER, FR-DIS-SEND-TO-RADAR, FR-INFRA-COST-LOG-STORE, NFR-COST-CACHE-FIRST, FR-INFRA-KEYWORD-METRICS, FR-MOT-CACHE-CASCADE, FR-INFRA-LIEUTENANT-EXPLORATIONS)
  - spec/recette/ (03, 05, 06, 08, 09) et spec/parcours/ (PU-01 à PU-07)
  - design/12-moteur.md, design/13-discovery.md, design/14-radar-capitaine.md, design/15-lieutenants-structure-lexique.md, design/18-integrations.md, design/20-infrastructure.md
  - design/data-flows/ (moteur, lexique, keyword-metrics, intent, radar-keywords, captain-keyword-locked)
  - _bmad-output/implementation-artifacts/recette-2026-09-30/
---

# Tech-spec — lot 1 : l'argent

Tout ce qui pouvait faire payer sans que l'utilisateur le sache ou le veuille, relevé par la recette complète du 2026-09-30 (journal : `recette-manuelle-journal.md`, détail : `recette-2026-09-30/`).

## 1. F1 — le badge dit « MOCK » alors que DataForSEO est en production

- **Constat :** `AI_PROVIDER=mock`, `DATAFORSEO_SANDBOX` absent, aucun clic : badge « MOCK », `isSandbox()` faux → DataForSEO facturé (99-phase-finale F1, INFRA-2).
- **Cause :** `getEffectiveMode()` disait « mock » si l'IA **ou** le bac à sable l'était, mais `isSandbox()` et `getProvider()` relisaient chacun leur variable. Le badge ne se resynchronisait qu'au chargement de la page.
- **Décision (orchestrateur) :** sans override, le mode effectif est la **seule autorité** pour l'IA et DataForSEO ; le badge se resynchronise sans rechargement. Un override posé ailleurs (robot, autre onglet) est adopté, jamais renversé (le renvoyer ferait payer un run simulé).
- **Fichiers :** `server/services/infra/runtime-mode.service.ts`, `server/services/external/dataforseo/_client.ts` (`isSandbox`), `server/services/external/ai-provider.service.ts` (`getProvider`), `src/stores/ui/runtime-mode.store.ts` (`hydrate` unique, `startAutoResync` : focus, onglet visible, 15 s), `src/components/shared/AppNavbar.vue`.
- **Tests :** `tests/unit/services/runtime-mode-consumers.test.ts` (toutes les combinaisons configuration × override : badge MOCK ⇔ rien de facturé), `tests/unit/stores/runtime-mode.store.test.ts` ; tests DataForSEO « production » calés sur une IA réelle.
- **Exigences :** FR-INFRA-RUNTIME-MODE → active ; NFR-COST-AI-MOCK → active ; FR-EXT-DATAFORSEO-SANDBOX (critère « jamais déduit de l'environnement » reformulé : jamais deviné d'après le type d'environnement, activé par la configuration — bac à sable ou IA simulée — ou le bouton ; statut inchangé, défaut « réponses du bac à sable gardées comme vraies » hors lot).

## 2. Avis expert IA du Capitaine jamais enregistré, redemandé à chaque sélection

- **Constat :** MOT-4, 01-T2, 05 point 2, 06-T2 : jusqu'à 19 appels payants à chaque clic sur un article ; `captain_explorations.ai_panel_markdown` vide partout.
- **Cause :** le « watcher 1 » de `CaptainPanel` lançait l'avis pour toute entrée validée, y compris relue de la base ; le « watcher 3 » ne mettait à jour que la mémoire puis un `PUT` des décisions (qui n'enregistre pas l'avis) ; `saveCaptainExplorationAiPanel` n'était jamais appelé. En plus, choisir un article sans candidat étudiait d'office son mot-clé suggéré.
- **Décision :** étude au clic, jamais d'office (décision d'Arnaud du 29/09, CAP-1). Une étude demandée par l'utilisateur (saisie, « Analyser », envoi depuis le Radar, recalcul) reçoit son avis d'office à la fin de l'étude (CAP-7), une fois ; une sélection d'article n'est pas une demande. Un avis en échec n'est pas relancé seul ; « Régénérer » reste le geste.
- **Fichiers :** `src/components/moteur/CaptainPanel.vue` (`adviceRequested`, watcher d'article sans `addEntry`, « watcher 1 », `launchAiStream` → `saveCaptainExplorationAiPanel`), `src/composables/keyword/useExploredKeywords.ts` (`isScanning`).
- **Test :** `tests/unit/components/captain-ai-advice-persist.test.ts`.
- **Exigences :** FR-MOT-NO-AUTO-ACTION → active (avec le point 3) ; FR-CAP-AI-PANEL : reste non tenue pour la stratégie du cocon non transmise et la confirmation « appel Claude » en simulé.

## 3. Lexique : ouvrir l'onglet lançait extraction et analyse IA, et l'analyse partait deux fois

- **Constat :** express étape 5 ; 06-T4 (deux `ai-lexique-upfront` par extraction, menés au bout par le serveur) ; LEX-7 (changement d'onglet d'exploration).
- **Cause :** la restauration appelait `fetchTfidf` quand rien n'était relu ; `watch(tfidfResult)` lançait `generateLexiqueUpfront` à chaque nouvelle liste, y compris la liste relue de la base juste après une extraction.
- **Décision :** l'analyse ne part que sur un clic (FR-LEX-AI-PANEL : « Elle ne part que sur un clic ») ; la restauration ne fait que relire.
- **Fichiers :** `src/components/moteur/LexiquePanel.vue` ; test navigateur `tests/browser-e2e/parcours/lexique.parcours.test.ts` (clic « Analyser avec l'IA » explicite).
- **Tests :** `tests/unit/components/lexique-extraction.test.ts`, `lexique-extraction.gaps.test.ts`, `lexique-extraction-architecture.test.ts`.
- **Exigences :** FR-LEX-AI-PANEL : partie « part d'elle-même » retirée du statut (reste non tenue : deux listes de recommandations).

## 4. Appels en double

- **« Découvrir » envoie deux fois les mêmes lots `relevance-score` :** même cause que le point 5 (jugements oubliés puis rejugés) et passe stricte qui reprenait tous les pertinents connus. Voir point 5.
- **« Envoyer au Radar → » envoie deux fois le même `POST` :** `useMoteurCrossTabState.handleSendToRadar` et le watcher `injectedKeywords` de `RadarPanel` (fichiers du lot 2, non modifiés). Correctif dans `src/stores/article/radar-exploration.store.ts` : un envoi identique encore en cours est repris (`batchesInFlight`). Test : `tests/unit/stores/radar-exploration.store.test.ts`. Exigence : critère ajouté à FR-DIS-SEND-TO-RADAR.
- **Double-clic sur « Analyser » = 2 études :** `useExploredKeywords.scanOnce` tient `scansInFlight` ; `addEntry` ignore un mot-clé déjà en cours d'étude. Tests : `tests/unit/composables/useExploredKeywords-roots-reopen.test.ts`, `captain-ai-advice-persist.test.ts`. Exigence : critère ajouté à FR-CAP-INPUT.
- **Chaque génération IA de Discovery comptée deux fois :** `apiPost` inscrit déjà le `usage` de la réponse ; `useDiscoveryPanel` l'ajoutait encore. `ApiOptions.usageLabel` (nouveau) nomme la ligne (« Courte-traîne IA ») ; le composable n'inscrit plus rien. Test : `tests/unit/composables/discovery-cost-log-once.test.ts`. Exigence : FR-INFRA-COST-LOG-STORE, partie « analyse Discovery comptée deux fois » retirée.

## 5. DIS-5 / DIS-6 — le filtre de pertinence oublie au-delà de 500 mots-clés

- **Cause :** `MAX_RELEVANCE_SCORES = 500` dans `mergeScores` : au-delà, les premiers jugés étaient évincés, traités comme pertinents (`score === undefined → true`) et rejugés à chaque ajout ; la sauvegarde ne gardait que 500 jugements (DIS-8).
- **Décision :** plus de plafond (les jugements vivent le temps d'une découverte, remis à zéro à chaque racine) ; la passe stricte ne reprend que les mots-clés jugés pendant sa passe.
- **Fichiers :** `src/composables/keyword/useRelevanceScoring.ts`. **Test :** `tests/unit/composables/relevance-scoring-no-forget.test.ts`.
- **Exigence :** FR-DIS-RELEVANCE-FILTER (active) : critère ajouté (tous les jugements gardés, jamais rejugés).

## 6. MOT-8 — le Radar n'écrit pas `keyword_metrics`, le Capitaine remesure

- **Cause :** `scanRadarKeywords` demandait volume, KD, CPC et intention à DataForSEO sans relire la base, et ne les rangeait que dans `radar_explorations.scan_result`.
- **Décision :** cache avant appel externe — relire `keyword_metrics` (moins de 7 jours, volume, KD, CPC et intention présents), n'appeler DataForSEO que pour le reste, puis écrire la mesure (`upsertKeywordKpis`, questions PAA de premier niveau par `upsertKeywordPaa`). Rien n'est écrit pour un mot-clé non mesuré.
- **Fichiers :** `server/services/keyword/keyword-radar.service.ts`. **Test :** `tests/unit/services/keyword-radar-metrics.test.ts`.
- **Exigences :** NFR-COST-CACHE-FIRST, FR-INFRA-KEYWORD-METRICS, FR-MOT-CACHE-CASCADE : partie « le scan Radar rachète » retirée (restent non tenues pour d'autres manques) ; critère ajouté à FR-INFRA-KEYWORD-METRICS.

## 7. CaptainPanel : INFRA-18 et CAP-20 geste 4

- **INFRA-18 :** `handleUnlockArchive` lisait le nombre après `archiveLockedLieutenants` (qui vide la liste) → « 0 lieutenant(s) archivé(s) ». Compté avant ; le `saveKeywords` redondant (deux `PUT` concurrents) est retiré, `performUnlock` enregistre seul. Test : `captain-ai-advice-persist.test.ts`. Exigences : FR-INFRA-LIEUTENANT-EXPLORATIONS (partie « message 0 » retirée ; l'archivage non enregistré en base reste non tenu), FR-CAP-PERSIST (partie « deux enregistrements concurrents » retirée).
- **CAP-20 geste 4 :** la cause n'était pas un échec muet mais une racine relue de la base **sans mesures** (`richRootKeywords.kpis = []`) : un clic l'affichait « — » sans l'étudier. `isVariantMeasured` : une racine sans mesures est étudiée au clic (mot de la carte ou colonne de détail), et un échec affiche « Impossible de valider "…" ». Test : `useExploredKeywords-roots-reopen.test.ts`. Exigence : FR-CAP-ROOTS, statut précisé (la colonne de détail relue reste sans mesures tant qu'aucun clic ne les étudie).

## Hors lot, signalé

- Double comptage des coûts ailleurs : `src/composables/keyword/useResonanceScore.ts` (« Génération keywords radar ») et `src/stores/article/editor.store.ts` (« Génération meta », à vérifier) — fichiers du lot 2, signalés à son agent.
- `lieutenant_explorations` n'enregistre pas l'archivage de « Tout réinitialiser » (FR-INFRA-LIEUTENANT-EXPLORATIONS) : persistance, non traitée ici.
