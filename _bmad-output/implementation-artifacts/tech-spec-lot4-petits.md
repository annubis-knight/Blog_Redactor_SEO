---
name: tech-spec-lot4-petits
title: Recette du 2026-09-30, lot 4 — les petits défauts (icônes, libellés, messages, robot)
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md (FR-UI-RADAR-CARD, FR-RAD-AI-SUGGESTIONS, FR-CER-AIGUILLAGE, NFR-UX-SCREEN-TEXT, FR-CER-MICRO-CONTEXT, FR-RED-OUTLINE, FR-RED-CONTEXTUAL-ACTIONS, FR-DASH-WORKFLOW-CHOICE, FR-CER-CREATION-HONNETE, FR-INFRA-VERIFIER-SHARED, FR-HN-LOCK-GATE)
  - spec/recette/ (01, 02, 03, 04, 07, 09)
  - spec/parcours/ (PU-01 à PU-06)
  - spec/01-produit.md, spec/03-dashboard.md, spec/04-cerveau.md, spec/05-moteur.md, spec/07-radar.md, spec/13-redaction.md, spec/16-infrastructure.md
  - design/06-mode-automatique.md, design/08-ecrans.md, design/10-dashboard.md, design/11-cerveau.md, design/12-moteur.md, design/14-radar-capitaine.md, design/17-redaction.md, design/19-interface.md, design/20-infrastructure.md
  - _bmad-output/implementation-artifacts/recette-2026-09-30/
---

# Tech-spec — Lot 4 : les petits défauts de la recette du 2026-09-30

Neuf défauts de taille XS à S, trouvés par la recette complète du 2026-09-30 (`recette-2026-09-30/01-dashboard-interface.md`, `02-cerveau.md`, `04-discovery-radar.md`, `07-redaction.md`, `09-regles-transverses.md`, `99-phase-finale.md`). Un défaut = une exigence écrite ou complétée, un test rouge qui cite son ID, le correctif, la doc.

Valideurs : les règles pures tournent dans `npm run verify` (`tests/unit/shared/`, `tests/unit/scripts/`, `tests/unit/services/mock-cerveau.test.ts`, `tests/unit/composables/article-proposals-warnings.test.ts`) ; les tests de composants (environnement navigateur simulé) tournent dans la CI (`vitest run tests/unit`).

## 1. Pictogrammes d'intention vides (UI-1, UI-2, RAD-4) et infobulle « P — »

- **Constat.** Au Radar et au Capitaine, chaque `span.intent-badge` portait un `<svg>` vide : seule l'infobulle se voyait, au survol d'une place vide. Dans « Suggestions IA Radar », l'infobulle de « P — » disait « PainPoint absent ou signaux nuls » alors que l'article avait une douleur.
- **Cause.** `RadarKeywordCard.vue` pose des tracés sans `<svg>` englobant (`intentConfig[…].svg`) par `v-safe-svg` ; `sanitizeSvg` (`src/directives/v-safe-html.ts`) les donnait à DOMPurify, qui les lit comme du HTML : hors d'un `<svg>`, `<circle>` et `<path>` n'existent pas et sont retirés. L'infobulle de `RadarAiPanel.vue` supposait une douleur absente ; or le Radar ne calcule jamais la pertinence (FR-RAD-NO-RELEVANCE-IN-SCAN).
- **Décision.** `sanitizeSvg` assainit un tracé seul dans un `<svg>` provisoire (même configuration) et ne rend que son intérieur ; un `<svg>` complet passe comme avant. L'infobulle dit « Score Pertinence indisponible au Radar : il se calcule au Capitaine, quand le mot-clé y est étudié » (`RELEVANCE_NOT_YET`).
- **Fichiers.** `src/directives/v-safe-html.ts`, `src/components/moteur/RadarAiPanel.vue` (fichier sans lot attribué, accord de l'orchestrateur).
- **Tests.** `tests/unit/directives/v-safe-html.test.ts` (tracé seul gardé, texte SVG gardé, script et `onclick` retirés), `tests/unit/components/radar-keyword-card-intent-icons.test.ts` (les quatre intentions), `tests/unit/components/moteur/RadarAiPanel.test.ts` (infobulle).
- **Exigences.** FR-UI-RADAR-CARD (critère ajouté, reste active) ; FR-RAD-AI-SUGGESTIONS (critère ajouté, l'infobulle retirée du statut, qui reste non tenue : bouton sans effet, « P » toujours vide).

## 2. Alerte technique « (parentTitle manquant) » (CER-10)

- **Constat.** « Article vide » sur la carte : « Pas de lien vers un Intermédiaire (parentTitle manquant). »
- **Cause.** Messages `missing_parent` écrits en dur dans `src/composables/editor/article-proposals/computeds.ts`.
- **Décision.** « Ce spécialisé n’est rattaché à aucun intermédiaire : rattachez-le avec « Lien ». » (sans le renvoi si la carte n'a aucun intermédiaire, puisque « Lien » n'apparaît pas) ; « Cet intermédiaire n’est rattaché à aucun pilier. ». Header `AUTHORITY:` ajouté au fichier.
- **Test.** `tests/unit/composables/article-proposals-warnings.test.ts` (dans `npm run verify`) : les messages, et aucun mot du code (camelCase, snake_case) dans une alerte de la carte.
- **Exigence.** NFR-UX-SCREEN-TEXT : « (parentTitle manquant) » retiré du statut (reste non tenue pour les accents et les autres textes).

## 3. Niveaux affichés par leur code, « Autre », badge sans couleur (CER-7, CER-12, CER-24, 01-T4)

- **Constat.** « Articles du cocon (N) » rangeait tout sous « AUTRE » ; au Moteur et à la Rédaction, groupes « INTERMEDIAIRE » / « SPECIFIQUE » et badge des spécialisés transparent ; « Base : ~1 200 mots (type specifique) ».
- **Cause.** `ContextRecap.vue` comparait le niveau reçu (« pilier ») à `['Pilier', 'Intermédiaire', 'Spécialisé']` ; `MoteurContextRecap.vue` et `ContextRecap.vue` affichaient `{{ group.type }}` ; la classe calculée `tree-type--specifique` n'avait pas de style (le CSS définissait `.tree-type--specialise`) ; `ContentRecommendation.vue` affichait le code.
- **Décision.** `splitArticleLevelSuffix` (`shared/utils/article-level.ts`) lit « Titre (niveau) » dans tous les formats (mot entier, jamais un préfixe ; une parenthèse qui n'est pas un niveau reste dans le titre). Groupes par `ARTICLE_LEVELS`, titre `articleLevelToDisplayLabel`, classe `tree-type--<niveau>` stylée pour les trois niveaux. `ContentRecommendation` nomme le niveau en toutes lettres.
- **Fichiers.** `shared/utils/article-level.ts`, `src/components/moteur/MoteurContextRecap.vue`, `src/components/strategy/ContextRecap.vue`, `src/components/brief/ContentRecommendation.vue` (sans lot attribué).
- **Tests.** `tests/unit/shared/article-level-display.test.ts` (dans `npm run verify` : lecture des niveaux ; chaque niveau a le style de son badge ; aucun `{{ group.type }}` brut), `tests/unit/components/article-level-badges.test.ts`.
- **Exigence.** FR-CER-AIGUILLAGE : critère « en toutes lettres, rangé sous son niveau, badge coloré » ajouté ; les deux manques écrits corrigés → **active**. NFR-UX-SCREEN-TEXT : « niveaux affichés « INTERMEDIAIRE » ou « specifique » » retiré du statut.
- **Hors lot, noté.** Le badge « intermediaire » à côté de « Lieutenants proposes par l'IA » (`LieutenantsPanel.vue`, lot 2) affiche encore le code.

## 4. « Suggerer par IA » muet sans capitaine (INFRA-9)

- **Constat.** Sur un enfant sans capitaine, 400 « keyword are required », et rien à l'écran.
- **Cause.** `BriefStructureStep.vue` `suggestMicroContext` : `capitaine ?? articleTitle` ; le store garde `''` (pas `null`). L'`error` du flux n'était pas lu.
- **Décision.** `capitaine?.trim() || articleTitle` ; l'erreur s'affiche : « La suggestion n’a pas abouti. Réessayez dans un instant. » (`suggest-error`).
- **Test.** `tests/unit/components/brief-structure-suggest.test.ts`.
- **Exigence.** FR-CER-MICRO-CONTEXT : critère ajouté (reste non tenue pour ses autres manques).
- **Hors lot, noté.** Même défaut pour « IA Brief » (RED-1), dans `ArticleWorkflowView.vue` `triggerBriefExplain` (lot 2).

## 5. Sommaire : Échap garde le titre ; chapitre lâché sur le H1 (RED-7)

- **Cause.** `OutlineNode.vue` : Échap retire le champ, dont le `blur` appelait `confirmEdit`. `OutlineEditor.vue` `onDrop` : `splice(toIndex, 0, moved)` sans garde sur le H1.
- **Décision.** `confirmEdit` ne fait rien hors édition (Entrée n'enregistre plus deux fois). `moveOutlineSection` (`shared/structure-outline.ts`) : le H1 ne bouge pas, une section lâchée sur lui ou avant lui se place juste après.
- **Tests.** `tests/unit/shared/outline-move.test.ts` (dans `npm run verify`), `tests/unit/components/outline-editing.test.ts`.
- **Exigence.** FR-RED-OUTLINE : critère ajouté, les deux manques retirés du statut (reste non tenue : Annuler / Rétablir, sommaire d'un autre article).

## 6. Panneau « Blocs » : « Titre H2 » avec l'icône « H1 » (01-T12, 07 point 6)

- **Cause.** Le tracé de `heading-2` (`BlocksPanel.vue`) dessinait un « 1 » (`l2-2v12`).
- **Décision.** Tracé d'un « 2 » après le « H ».
- **Test.** `tests/unit/components/blocks-panel-icons.test.ts`.
- **Exigence.** FR-RED-CONTEXTUAL-ACTIONS : critère ajouté (statut inchangé).

## 7. Réponse simulée « Étapes bien émarrer » (F2)

- **Cause.** `mock-fixtures/cocoon-child.ts` `baseTopic` : `\b(…|d|…)\b` ; pour `\b`, « é » n'est pas une lettre, donc « d » de « démarrer » était un mot vide.
- **Décision.** Bornes Unicode (`STOP_WORDS`, lookarounds `\p{L}\p{N}`, drapeau `u`).
- **Test.** `tests/unit/services/mock-cerveau.test.ts` (dans `npm run verify`) : consigne réelle `cocoon-child-keywords`, « étapes bien démarrer ».
- **Exigence.** NFR-COST-AI-MOCK (critère existant « la réponse part de la demande » ; statut non touché, lot 1).

## 8. Robot `auto:article` (PU-06)

**(a) Cocon cible ignoré.**
- **Cause.** `phases/cerveau.ts` n'envoyait la réponse qu'à `/generate/auto-intake` ; seul `--cocoon` imposait l'emplacement.
- **Décision (orchestrateur).** Une réponse qui nomme un cocon existant (sans casse ni espaces) impose l'emplacement comme `--cocoon` ; un nom inconnu est dit et la question revient. `resolveCocoonAnswer` / `sameCocoonName` (`cocoon.ts`) ; `promptInitialInput(io, { cocoonNames, forcedCocoon, warn })` (`prompts.ts`) — question non posée avec `--cocoon` ; `imposedCocoon(ctx)` (`phases/cerveau.ts`) ; `index.ts` passe les cocons de l'arbre affiché. Un `cocoonName` de `--config` impose aussi le cocon.
- **Tests.** `tests/unit/scripts/auto-article/cocon-cible.test.ts` (dans `npm run verify`) : résolution, question reposée, phase Cerveau rejouée sans serveur.

**(b) Arrêt sur un simple 🟠.**
- **Décision (orchestrateur).** Porte dont **tous** les points sont 🟠 et humain au terminal : le robot affiche les points, demande « J’ai lu, continuer ? [o/N] » ; sur « o », `POST /articles/:id/gates/:gateId/waivers` avec `waiverDraftsFrom` (`{ rule }` par point, comme la case « J'ai lu » de `GateAlarm`), puis redemande l'étape une fois. 🔴 / ⛔, refus de l'utilisateur, run sans humain (`--config`, `--resume`) : arrêt comme avant. `GateReader` (`checks.ts`), `PhaseDeps.gateReader` (`deps.ts`), passé par `moteur-valider.ts` et `redaction.ts`.
- **Tests.** `tests/unit/scripts/auto-article/checks.test.ts` (dans `npm run verify`).

- **Exigences.** Il n'existe pas d'exigence du robot (« Plus tard », décisions du 29/09) : critères minimaux ajoutés à FR-CER-CREATION-HONNETE (cocon nommé) et FR-INFRA-VERIFIER-SHARED (porte toute 🟠), ligne du robot de FR-HN-LOCK-GATE alignée. Les trois restent actives.

## 9. `/cocoon/999999` en anglais, « Réessayer » inutile (DASH-6, 01-T13)

- **Cause.** `CocoonLandingView.vue` demandait les articles d'un cocon inconnu et affichait leur 404 anglais dans `AsyncContent`, avec « Réessayer ».
- **Décision.** Cocon absent d'une liste lue sans erreur → `notFound` : « Cocon introuvable : il n’existe pas, ou il a été supprimé. » + « ← Retour au dashboard », sans appel des articles. L'erreur de la liste des cocons s'affiche aussi (elle était muette).
- **Test.** `tests/unit/components/cocoon-landing-not-found.test.ts`.
- **Exigence.** FR-DASH-WORKFLOW-CHOICE : critère ajouté (reste active).
