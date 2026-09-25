---
name: tech-spec-onglet-structure-hn
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-09-25
synced_with:
  - _bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md (chantier C6 ; M7 soldée, T2 en partie, T5 ; découverts en documentant : M18 à M21, P6, U3, D6, T13)
  - _bmad-output/planning-artifacts/prd.md (FR-HN-TAB, FR-HN-LOCK-GATE, §8.7.bis et domaine FR-HN ; FR-LIE-HN-STRUCTURE superseded ; amendées : FR-MOT-CHECKS, FR-MOT-PHASES, FR-MOT-SOFT-GATING, FR-MOT-WORKFLOW-GATING-DUAL, FR-DASH-PROGRESS, FR-FIN-RECAP, FR-FIN-LINK-REDACTION, FR-FIN-CHECK, FR-LIE-CHECK, FR-LIE-LOCK-GATE, FR-LIE-PROPOSE-AI, FR-LIE-AI-FRONTIER, FR-LIE-CHECKBOX-LOCK-IMMEDIATE, FR-LIE-EXTRACT-HEADINGS, FR-LIE-SECTIONS-FOLDABLE, FR-RED-OUTLINE, FR-INFRA-TYPE-RULES-SSOT, FR-CER-WORD-COUNT-RECOMMEND, FR-RED-PUBLISH-GATE, FR-INFRA-VERIFIER-SHARED, FR-INFRA-GATE-WAIVER, FR-INFRA-WORKFLOW-CHECKS-CONSTANTS, FR-UI-MOTEUR-SHARED, NFR-INT-COMPLETED-CHECKS-SSOT ; précisées : FR-MOT-NO-AUTO-ACTION, FR-MOT-CHECK-RECONCILIATION)
  - _bmad-output/planning-artifacts/design-registry.md (DESIGN-HN-TAB, DESIGN-HN-LOCK-GATE ; DESIGN-LIE-HN-STRUCTURE superseded ; mises à jour : DESIGN-MOT-PHASES, DESIGN-MOT-FREE-NAV, DESIGN-MOT-SOFT-GATING, DESIGN-MOT-MODE-BIMODAL, DESIGN-MOT-CHECKS, DESIGN-MOT-CHECKS-CONSTANTS, DESIGN-MOT-CHECK-RECONCILIATION, DESIGN-MOT-WORKFLOW-GATING-DUAL, DESIGN-DASH-PROGRESS, DESIGN-LIE-EXTRACT-HEADINGS, DESIGN-LIE-PROPOSE-AI, DESIGN-LIE-SECTIONS-FOLDABLE, DESIGN-LIE-CANDIDATES-BADGES, DESIGN-LIE-CHECKBOX-COUNT, DESIGN-LIE-SLIDER-INTELLIGENT, DESIGN-LIE-CHECK, DESIGN-LIE-LOCK-GATE, DESIGN-LIE-AI-FRONTIER, DESIGN-LIE-CHECKBOX-LOCK-IMMEDIATE, DESIGN-FIN-RECAP, DESIGN-FIN-LINK-REDACTION, DESIGN-FIN-CHECK, DESIGN-RED-OUTLINE, DESIGN-RED-PUBLISH-GATE, DESIGN-INFRA-TYPE-RULES-SSOT, DESIGN-INFRA-WORKFLOW-CHECKS-CONSTANTS, DESIGN-INFRA-VERIFIER-SHARED, DESIGN-INFRA-GATE-WAIVER, DESIGN-UI-MOTEUR-SHARED, DESIGN-CER-WORD-COUNT-RECOMMEND)
  - _bmad-output/implementation-artifacts/sprint-status.yaml (qualite-seo-c6-onglet-structure-hn)
  - docs/data-flows/lieutenants.md, docs/data-flows/completed-checks.md, docs/data-flows/keywords.md, docs/moteur-data-flow.md, docs/ui-sections-guide.md, docs/ARCHITECTURE_FLOWS.md, docs/contrats-affichage-moteur.md
  - docs/prompts-reference.md (généré)
---

# Tech-spec — Onglet Structure Hn (C6)

## Contexte (cartographie du 2026-09-25)

L'onglet Lieutenants produit à la fois les lieutenants et la structure H1/H2/H3, et une seule
case valide l'étape (`lieutenantsCheckActive = lieutenant verrouillé ET structure non vide`,
`LieutenantsPanel.vue:191`). Conséquences :

| Constat | Où |
|---|---|
| La structure est produite par `propose-lieutenants` **avant** tout choix de lieutenant (M7) | `useLieutenantsIa.ts:304`, `propose-lieutenants.md` §3 |
| Aucune porte serveur ne juge la structure (`hn-lock` répond « passe ») | `gate.service.ts:284-286` |
| Le prompt de structure demande un H1 « qui n'est PAS un copier-coller du mot-clé », la publication exige le capitaine dans le H1 | `lieutenants-hn-structure.md` règle 1, `seo-validators` |
| Le prompt invite à écrire des H2 d'introduction et de conclusion, `hnToOutline` en ajoute d'office : doublons | prompt §Contexte, `outline.store.ts:22,43` |
| « Sommaire : 6 à 8 H2 » ne dit pas si l'introduction et la conclusion comptent | `describeTypeRules` |
| Tout enregistrement Lieutenants/Lexique fait sur un store sans structure l'efface (`hnStructure ?? []` côté store, route et service) | store l.221, `keywords.routes.ts:313`, `data.service.ts:702-712` |
| La récurrence des titres concurrents vit dans l'état local du panneau Lieutenants | `useLieutenantsSerp.ts:96-105` |

## Objectif

Capitaine → Lieutenants → **Structure** → Lexique. La structure naît des lieutenants **retenus**,
du contexte du cocon et de la récurrence des concurrents ; une porte serveur `hn-lock` la juge
avant de valider l'étape `moteur:hn_locked`.

## Décisions

1. **H2 de fond** : les règles du type comptent les H2 de fond, hors introduction et conclusion
   (ajoutées par le sommaire). `describeTypeRules` le dit ; le prompt de structure n'écrit plus
   d'introduction ni de conclusion ; `hnToOutline` n'en ajoute pas si la structure en a déjà.
2. **H1** : il contient le capitaine en entier (ses mots, dans un ordre naturel). Absent : ⛔ ;
   sans le capitaine : 🔴 (même niveau qu'au premier jet, C5a).
3. **Porte `hn-lock`** (`shared/verifiers/structure.ts`) :
   - ⛔ structure vide (aucun H2), H1 absent, titre vide, H3 sans H2 parent ;
   - 🔴 capitaine absent du H1 ; nombre de H2 de fond hors `h2Min..h2Max` ; plus de `localH2Max`
     H2 qui citent la ville de la zone ; pour un pilier, H2 qui recoupe un article existant du
     cocon **et** le développe (H3) — il doit le résumer et y renvoyer ;
   - 🟠 lieutenant retenu absent de tous les titres ; H2 qui recoupe un article existant (sans
     H3) ; H2 d'introduction ou de conclusion (déjà ajoutés par le sommaire) ; plus de
     `h3PerH2Max` H3 sous un H2.
4. **Étape Lieutenants** : un lieutenant verrouillé suffit (M7) ; la réconciliation au montage ne
   retire plus l'étape faute de structure.
5. **Enregistrer la structure** ≠ la valider. Valider (bouton « Valider la structure ») : la
   structure est enregistrée, le sommaire de la Rédaction écrit (`hnToOutline`), la longueur
   conseillée recalculée, puis l'étape passe par la porte.
6. **Pas d'écrasement silencieux** : `hnStructure` absent d'un enregistrement = inchangé en base.
7. **Récurrence des concurrents** : l'onglet Structure relit l'analyse SERP du capitaine (cache 7
   jours, sans coût) ; le calcul de récurrence passe dans `shared/utils/hn-structure.ts`.
8. **Articles existants** : `scripts/reconcile-hn-checks.ts` (simulation par défaut, `--apply`)
   ajoute `moteur:hn_locked` aux articles dont l'étape Lieutenants est validée et dont la structure
   passe la porte ; liste les autres. Le mode automatique produit une vraie structure (route de
   structure) et émet l'étape par la porte.

## Lots

- **L1 — noyau** : `MOTEUR_HN_LOCKED`, `verifyStructure`, `describeTypeRules` (H2 de fond),
  `hnToOutline` sans doublon, tests.
- **L2 — serveur** : porte `hn-lock` (`CHECK_GATES`, rejouée à la publication), route de structure
  (lieutenants retenus lus en base, contexte du cocon, récurrence calculée côté serveur si absente),
  `propose-lieutenants` sans structure, pas d'écrasement de `hn_structure`, tests de contrat.
- **L3 — écran** : onglets, phases, `computeSmartTab`, `StructureHnPanel.vue` (prop `mode`),
  `useStructureHn.ts`, retrait de la structure de l'onglet Lieutenants, Finalisation à 4 verrous,
  6 points de progression.
- **L4 — données** : script de réconciliation, mode automatique.
- **L5 — tests** : ~30 fichiers dépendants, `describe.skip` Lieutenants/Lexique relus, helper
  navigateur `MOTEUR_TABS` + `lockStructure`, parcours.
- **L6 — doc** : PRD, registre, épopée, sprint, `docs/`.

## Livré (2026-09-25)

Branche `feat/onglet-structure-hn`, PR à ouvrir. Exigences versées au PRD (§8.7.bis, nouveau domaine `FR-HN`) et au registre : `FR-HN-TAB` (remplace `FR-LIE-HN-STRUCTURE`, superseded), `FR-HN-LOCK-GATE`. Amendées : `FR-MOT-CHECKS` (6 étapes), `FR-MOT-PHASES` (7 onglets, premier onglet utile), `FR-MOT-SOFT-GATING` et `FR-FIN-LINK-REDACTION` (4 verrous), `FR-FIN-RECAP` (section Structure), `FR-FIN-CHECK` (6 étapes, 4 verrous), `FR-DASH-PROGRESS` (6 dots, 2 + 4), `FR-LIE-CHECK` et `FR-MOT-WORKFLOW-GATING-DUAL` (M7 : un lieutenant suffit), `FR-LIE-LOCK-GATE` (case cochée pendant la vérification reprise), `FR-LIE-PROPOSE-AI`, `FR-LIE-AI-FRONTIER`, `FR-LIE-CHECKBOX-LOCK-IMMEDIATE` (plus de structure dans l'onglet Lieutenants), `FR-LIE-EXTRACT-HEADINGS` et `FR-LIE-SECTIONS-FOLDABLE` (les titres concurrents s'affichent dans l'onglet Structure ; deux sections dépliables au lieu de trois), `FR-RED-OUTLINE` (sommaire tiré de la structure, sans doublon), `FR-INFRA-TYPE-RULES-SSOT` (H2 de fond), `FR-CER-WORD-COUNT-RECOMMEND` (longueur à la validation de la structure), `FR-RED-PUBLISH-GATE`, `FR-INFRA-VERIFIER-SHARED`, `FR-INFRA-GATE-WAIVER` (porte de la structure rejouée à la publication), `FR-INFRA-WORKFLOW-CHECKS-CONSTANTS`, `FR-UI-MOTEUR-SHARED`, `NFR-INT-COMPLETED-CHECKS-SSOT`. Précisées : `FR-MOT-NO-AUTO-ACTION` (limite M18), `FR-MOT-CHECK-RECONCILIATION` (l'onglet Structure ne réconcilie pas).

### Commits par lot

| Lot | Commit | Contenu |
|---|---|---|
| L1, L2, L3, L5 | `d24e530` feat(moteur): l'onglet Structure — la structure naît des lieutenants retenus, jugée par sa porte | **Noyau** : `MOTEUR_HN_LOCKED = 'moteur:hn_locked'` (`workflow-checks.constants.ts:25`, `MOTEUR_CHECKS` à 6) ; `verifyStructure` (`shared/verifiers/structure.ts:84-198`) ; `describeTypeRules` « H2 de fond » (`article-type-rules.ts:92`, commentaire 25) ; `structureToOutline` partagé (`shared/structure-outline.ts:11-47`, introduction et conclusion ajoutées sauf si la structure en porte déjà) ; `computeHnRecurrence` extrait (`shared/utils/hn-structure.ts:43-68`). **Serveur** : `hnGate` (`gate.service.ts:197-233`), `CHECK_GATES[MOTEUR_HN_LOCKED] = 'hn-lock'` (60), `case 'hn-lock'` (325) et `default` retiré, rejeu par `publishGate` (287) ; `getCocoonSiblings` / `describeCocoonSiblings` (`server/services/queries/cocoon-siblings.service.ts`) ; route `ai-hn-structure` : `{{cocoon_articles}}` (`keyword-ai-panel.routes.ts:142-143,152`) ; `filterLieutenants` sans `hnStructure` (180-192) ; `PUT /articles/:id/keywords` transmet `hnStructure` absent en `undefined` (`keywords.routes.ts:313-314`) ; prompts `lieutenants-hn-structure.md` (H1 avec le capitaine entier, ni introduction ni conclusion, bloc `{{#cocoon_articles}}`) et `propose-lieutenants.md` (section « Structure Hn recommandée » et champ `hnStructure` retirés) ; contrats et types sans `hnStructure` ; fixture simulée qui passe la porte. **Écran** : `TAB_IDS` à 7 (`useMoteurTabs.ts:30`), phase Valider à 4 onglets, `computeSmartTab` (135-144) ; `StructureHnPanel.vue` (prop `mode`) + `useStructureHn.ts` (en-tête `AUTHORITY:`) ; `MoteurView` monte l'onglet ; `useFinalisationGating` / `useMoteurSoftGating` / `FinalisationPanel` à 4 verrous (section Structure) ; `ProgressDots` 2 + 4 ; `LieutenantsPanel.vue` : `lieutenantsCheckActive = hasAnyLockedLieutenant` (178), `verifyLockedLieutenants` (316-337), plus de structure, de sommaire ni de longueur conseillée ; `useLieutenantsHn.ts` supprimé ; `useLieutenantsIa` sans `regenerateHnStructure` ; `LieutenantsResultsLayout` sans `LieutenantH2Structure` ; `article-keywords.store` : `saveDecisions` sans structure, `saveStructure`, fusion de la structure de la base (144-148, 215-270). **Tests** : 30 fichiers (cf. ci-dessous) |
| L4 | `9631612` feat(auto-article): le mode automatique propose et valide une vraie structure | Étape « 2bis. Structure » (`moteur-valider.ts:193-208`) : `ai-hn-structure` avec les lieutenants retenus et la récurrence, `saveThenEmit(…, MOTEUR_HN_LOCKED)` ; `decisions()` envoie `ctx.articleStructure`, plus la récurrence des concurrents (124-131) ; `AutoRunContext.articleStructure` (`types.ts`) ; sommaire = `structureToOutline` si une structure existe (`redaction.ts:115-131`) ; `collectSse` extrait (`collect-sse.ts`) ; reprise qui relit la structure (`resume.ts:46-48`) ; `skipMoteur` exige structure **et** lexique validés (`resume-plan.ts:25-27`) |
| L4 | `103c38b` chore(db): script de réconciliation des étapes Structure (simulation par défaut) | `scripts/reconcile-hn-checks.ts` + `npm run db:reconcile-hn` : articles avec `lieutenants_locked` sans `hn_locked`, structure passée à `evaluateArticleGate(id, 'hn-lock')`, étape ajoutée avec `--apply` aux seules structures qui passent. Simulation du 2026-09-25 : #1012 et #1013 retenus par la porte (le 1013 : 12 H2 de fond, H1 sans le capitaine) — rien d'écrit |
| L5 | `94c7e91` test(navigateur): l'onglet Structure dans les parcours | `tests/browser-e2e/structure.browser.test.ts` ; helper `validerStructure`, `MOTEUR_TABS` à 6 onglets, `lockLieutenants` qui n'engendre plus de structure et attend un état stable de la porte ; parcours bout-en-bout, Lieutenants, interactions (titre verrouillé qui survit à la régénération, désormais dans l'onglet Structure), onglets, navigation, finalisation alignés |

Bout-en-bout vert en mode simulé ; `npx vitest run tests/unit/architecture tests/unit/coherence` vert après la documentation.

### Tests

- Noyau : `tests/unit/shared/verifiers-structure.test.ts` (bonne structure ; ⛔ aucun H2, H1 absent, titre vide, H3 sans H2 ; 🔴 le 1013, ville trop citée, pilier qui développe un article du cocon ; 🟠 recoupement sans H3, introduction et conclusion hors du compte, lieutenant absent, trop de H3 ; spécialisé non jugé sur les recoupements ; ancien format `{ level: 'H2', title }` lu), `tests/unit/stores/outline-hn-to-outline.test.ts` (ni introduction ni conclusion ajoutées quand la structure en a), `tests/unit/services/mock-hn-structure.test.ts` (la simulation passe sans ⛔ ni 🔴), `tests/unit/coherence/completed-checks.test.ts` (6 checks, `moteur:hn_locked`).
- Serveur : `tests/contract-api/gates.contract.test.ts` (« Porte « valider la structure » » : ⛔ sans H1 refusé en 422 sans dérogation possible ; structure conforme accordée ; l'enregistrer sans structure ne l'efface plus — serveur requis), `tests/unit/routes/article-keywords.routes.test.ts` (`hnStructure` absent → `undefined`, présent → transmis), `tests/unit/routes/keyword-ai-panel.routes.test.ts`, `tests/unit/shared/contracts/lieutenants.contract.test.ts`.
- Écran : `tests/unit/composables/moteur/useStructureHn.test.ts`, `tests/unit/components/structure-hn-panel.test.ts`, `tests/unit/stores/article-keywords.store.test.ts` (bloc « structure Hn (FR-HN-TAB) »), `tests/unit/components/lieutenants-gate.test.ts` (M7 ; décisions enregistrées avant le verdict ; lieutenant ajouté ensuite, règle remplie au montage ou après ; **case cochée pendant la vérification reprise** ; étape retirée après un changement refusé), `tests/unit/components/lieutenants-selection.test.ts` et `lieutenants-selection.gaps.test.ts` (plus de section Hn dans l'onglet Lieutenants), `tests/unit/components/lieutenants-results-layout-architecture.test.ts` (AC.J.18 : `LieutenantH2Structure` ne doit plus y être rendu), `tests/unit/components/finalisation-panel.test.ts`, `tests/unit/composables/finalisation-gating.test.ts`, `tests/unit/composables/moteur/useMoteurSoftGating.test.ts`, `tests/unit/composables/moteur/useMoteurTabs.test.ts`, `tests/unit/composables/moteur-smart-tab.test.ts`, `tests/unit/components/moteur-smart-navigation.test.ts`, `tests/unit/components/moteur-check-completed.test.ts`, `tests/unit/components/progress-dots.test.ts`, `tests/unit/coherence/articles.test.ts`. Supprimé avec son composable : `tests/unit/composables/moteur/useLieutenantsHn.test.ts`.
- Mode automatique : `tests/unit/scripts/auto-article/resume-plan.test.ts`.
- Navigateur (mode simulé) : `tests/browser-e2e/structure.browser.test.ts` (① ⛔ sans H1, sans dérogation ; ② structure proposée, validée, devenue sommaire — H1 en tête, une introduction, une conclusion, un lieutenant en chapitre) et les parcours alignés par `94c7e91`.

### Écarts avec le plan

- **Récurrence des concurrents** (décision 7, L2) : pas de calcul côté serveur « si absente ». L'onglet relit la SERP du capitaine par `POST /serp/analyze` et calcule la récurrence dans le navigateur, avec la fonction partagée. « Cache 7 jours, sans coût » ne vaut que si l'analyse est récente : au-delà, l'ouverture de l'onglet déclenche une analyse payante (M18).
- **Lieutenants retenus** (L2) : la route de structure les reçoit du client (`lockedLieutenants` du store), elle ne les relit pas en base. La porte, elle, lit la base.
- **Recoupement avec le cocon** (décision 3) : le 🟠 « H2 qui recoupe un article existant (sans H3) » ne vaut, comme le 🔴, que pour un pilier ; un recoupement n'est vu que si le H2 contient **tout** le capitaine de l'autre article.
- **Validation** (décision 5) : la longueur conseillée part sans être attendue ; l'étape est demandée dès que la structure est enregistrée, même si le sommaire ne l'a pas été (M20).
- **Porte au clic** : pas de vérification silencieuse ni de bandeau comme aux Lieutenants et au Lexique ; et pas de revérification quand capitaine ou lieutenants changent après la validation (M19).
- **Tests** (L5) : le helper navigateur s'appelle `validerStructure` (pas `lockStructure`) ; les `describe.skip` Lieutenants/Lexique n'ont pas été réécrits (T2) — deux `it.skip` devenus sans objet ont été supprimés.
- **Hors plan** : `verifyLockedLieutenants` (une case cochée pendant la vérification de la porte était perdue ; une étape accordée au montage n'était plus revérifiée) ; `default` de `evaluateArticleGate` retiré ; `fetchKeywordsMerge` adopte la structure de la base.

### Découvert en chemin ou en documentant

- **La course « case cochée pendant la vérification »** (corrigée dans `d24e530`) : avec M7, l'étape Lieutenants se demande dès la **première** case. La vérification de la porte (enregistrement, puis verdict du serveur) prend un aller-retour ; une deuxième case cochée pendant ce temps changeait la signature des lieutenants, mais le watcher de signature l'ignorait (garde `transitionSettled` à faux pendant la transition) et la transition ne regardait pas ce qui avait changé. Résultat : un intermédiaire (minimum 2) restait retenu à « 1 lieutenant » avec deux cases cochées, jusqu'au changement suivant. `verifyLockedLieutenants` (`LieutenantsPanel.vue:316-337`) compare la signature avant et après le verdict et recommence tant qu'elle a bougé, en réenregistrant d'abord ; une seule vérification à la fois. Même famille : une étape déjà accordée au montage laissait `transitionSettled` à faux, et aucun changement ultérieur ne relançait la porte (ligne 380). Test : `lieutenants-gate.test.ts`, « une case cochée pendant la vérification est reprise ensuite : l'étape est accordée ». Le helper navigateur `lockLieutenants` attend désormais un état stable (le bandeau « trop peu » peut s'afficher puis s'effacer à la dernière case).
- **M18** — ouvrir l'onglet Structure (ou y arriver par `computeSmartTab`) relit la SERP du capitaine, payante au-delà de 7 jours (`StructureHnPanel.vue:104-108,115-118`) : contraire à `FR-MOT-NO-AUTO-ACTION`.
- **M19** — `moteur:hn_locked` n'est pas revérifié quand le capitaine ou les lieutenants changent après la validation ; seule la publication rejoue la porte.
- **M20** — `prepareValidation` : `void recommendWordCount` alors que le commentaire (`useStructureHn.ts:199`) annonce l'inverse ; échec du sommaire journalisé seulement (200-202) ; valider écrase un sommaire retouché.
- **M21** — `saveStructure` écrit le store avant la réponse, sans retour arrière (`article-keywords.store.ts:250`).
- **P6** — la publication rejoue `hn-lock` : un article sans structure enregistrée reçoit ⛔ `hn-empty` et ne peut plus être publié, sans dérogation possible (`gate.service.ts:287`). À trancher.
- **U3** — textes de `LieutenantH2Structure.vue` hérités de l'onglet Lieutenants (« Coche au moins un lieutenant ci-dessus », ligne 205).
- **D6** — en-têtes périmés : `lieutenants.contract.ts:20` (`useLieutenantsHn`), `AUTHORITY:` de `article-keywords.store.ts` (consommateurs), de `gate.service.ts` (lectures).
- **T13** — cliquet `itSkip` resté à 42 pour 40 `skip` réels.
- **Incohérence mineure, assumée** : `h2Min` / `h2Max` comptent les H2 de fond, `h2Floor` (alerte `seo-too-few-sections`) compte tous les H2 de l'article rédigé (`seo-validators.ts:147-149`) ; pas de fausse alerte (le plancher est sous le minimum de fond).
- **Documentation corrigée au passage** (le code fait foi) : les dots de progression ne vivent qu'en haut du Moteur (`MoteurContextRecap`), pas sur les cartes du tableau de bord ; `LieutenantsSelection.vue` (renommé au Sprint 15) et `useLieutenantsHn` retirés du registre ; `hn_structure` est JSONB et la sortie de l'IA une liste JSON, pas du markdown ; la récurrence des titres se calcule dans le navigateur, pas « côté service » ; « 13 checks » (Cerveau et Rédaction retirés en mai) remplacé.
