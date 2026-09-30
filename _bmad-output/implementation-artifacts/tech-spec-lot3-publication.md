---
title: Lot 3 — portes de qualité, publication et export (recette du 2026-09-30)
type: tech-spec
status: done
version: 1.0.0
last_updated: 2026-09-30
synced_with:
  - spec/requirements.md (FR-INFRA-GATE-WAIVER, FR-RED-PUBLISH-GATE, FR-RED-EXPORT-HTML, FR-RED-ENRICH-PASSES, FR-RED-EDITOR-TIPTAP, FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE, FR-CER-CHILD-FROM-PILLAR-H2)
  - spec/13-redaction.md
  - spec/16-infrastructure.md
  - spec/recette/07-redaction.md
  - spec/recette/09-regles-transverses.md
  - spec/18-recette-manuelle.md
  - spec/parcours/
  - design/17-redaction.md
  - design/20-infrastructure.md
  - design/data-flows/gate-waivers.md
---

# Tech-spec — Lot 3 : portes de qualité, publication et export

Défauts trouvés par la recette complète du 2026-09-30 (journal, `recette-2026-09-30/00-express.md` étapes 3 et 10, `07-redaction.md`, `09-regles-transverses.md` INFRA-14 et INFRA-19, `99-phase-finale.md` CER-25). Décision de l'orchestrateur pour le point 1 : **une dérogation vaut pour le point qu'elle couvre et les données de ce point ; elle tombe seulement si ce point a changé.**

## 1. Dérogations redemandées (express 10 b, INFRA-19)

- **Constat.** Les trois 🔴 « Paragraphe répété » dérogés au premier jet revenaient en 🔴 à la publication (`draft-repeated-paragraph:*` → `repeated-paragraph:*`), sans être réaffichés en 🟠. Un mot changé redemandait toutes les raisons 🔴 de la publication. Le serveur acceptait une dérogation sur le seul nom du point, pour les données du moment.
- **Cause.** Une seule empreinte (`gate_waivers.input_hash`) couvrait toute une porte ; `publishGate` ne lisait pas les dérogations du premier jet ; `WaiverDraft` ne portait que `rule`.
- **Décision.** Chaque point porte son empreinte (`GateIssue.fingerprint`, `pointFingerprint`) : portes du texte = nature du point (`textPointKind`, qui ramène les règles du premier jet à leur nom de publication), message, extrait ; portes du Moteur = empreinte de la porte + règle (le choix jugé). `evaluateGate` couvre par empreinte de point ; clause de compatibilité pour les dérogations d'avant (même règle + même empreinte de porte). L'alarme renvoie l'empreinte lue ; `saveGateWaivers` refuse une réponse à un point changé (« Ce point a changé depuis que vous l’avez lu… ») et enregistre `input_hash` = empreinte du point. `publishGate` passe les dérogations `draft` à `verifyPublish` (`withDraftWaivers` → 🟠 `waiver-reconfirm:draft:*`).
- **Migration.** Aucune : schéma inchangé ; les anciennes lignes restent lues (clause de compatibilité) ; l'empreinte de la porte capitaine garde sa forme exacte (nombre brut de suggestions). Une dérogation de publication d'avant le 2026-09-30 est redemandée une fois à la première retouche du texte.
- **Fichiers.** `shared/verifiers/gate.ts`, `shared/verifiers/publish.ts`, `server/services/gates/gate.service.ts`, `server/routes/gates.routes.ts`, `tests/helpers/gates.ts`.
- **Tests.** `verifiers-gate.test.ts`, `verifiers-publish.test.ts`, `gate.service.test.ts` (nouveau, dans `verify`), `coherence/gate-waivers.test.ts` (nouveau), `gates.contract.test.ts` (CI : empreinte périmée refusée, mot changé ailleurs, dérogation du premier jet reprise).
- **Exigence.** FR-INFRA-GATE-WAIVER → **active** ; FR-RED-PUBLISH-GATE (critère 🟠 ajouté).

## 2. ⛔ « Bloc coupé » à tort (express 10 a, RED-22, CER-25)

- **Constat.** Les cellules d'un tableau accepté et le résumé simulé (fini en plein mot) donnaient ⛔ à la publication ; la vérification des propositions les avait laissés accepter.
- **Cause.** `trimTruncatedBlocks` jugeait le `<p>` de chaque cellule comme un paragraphe ; la fixture `summary` coupait à 170 mots ; `verifyEnrichment` ne jugeait « coupée » que sur l'arrêt du modèle.
- **Décision.** Une cellule est un libellé (même règle qu'un `<li>`). Réponse simulée en phrases entières, sans le texte des tableaux, renvoi dans le dernier paragraphe (plus de 🔴 « Paragraphe répété » d'un chapitre à l'autre). `verifyEnrichment` ajoute `publishBlockers` : tout ⛔ de `validateArticleContent` apporté par la proposition (`enrich-truncated-block`…).
- **Fichiers.** `shared/content-repair.ts`, `shared/verifiers/enrichment.ts`, `server/services/external/mock-fixtures/enrichment.ts`.
- **Tests.** `content-repair.test.ts`, `verifiers-enrichment.test.ts`, `enrichment.service.test.ts` (cinq résumés simulés, aucun ⛔ ni 🔴, aucun paragraphe répété).
- **Exigence.** FR-RED-ENRICH-PASSES (critère « coupée » aligné), FR-RED-PUBLISH-GATE (cellule ≠ bloc coupé).

## 3. Export : liens internes, H1, image du gabarit (FR-RED-EXPORT-HTML)

- **Constat.** Le fichier perdait les liens `#article-<id>`, son H1 était `articles.titre`, et le gabarit contenait `<img src="/svg/NomIcone=outStr_Arrow.svg" alt="Image absolute">`.
- **Cause.** L'écran téléchargeait l'aperçu (`GET /preview`, construit sans `linkSlugById`) ; le H1 venait du titre.
- **Décision.** `buildArticlePage` (service) construit aperçu et fichier : H1 = `publishedTitle` (même expression que la porte), liens résolus vers les articles rédigés, `target` / `rel` retirés (`rewriteInternalLinks`), messages d'erreur en français ; image du bandeau retirée.
- **Fichiers.** `server/services/article/export.service.ts`, `server/routes/export.routes.ts`, `shared/internal-links.ts`, `shared/verifiers/publish.ts` (`publishedTitle`).
- **Tests.** `export-article-page.test.ts` (nouveau, dans `verify`), `internal-links.test.ts`.
- **Exigence.** FR-RED-EXPORT-HTML → **active**.

## 4. Aperçu non rechargé (RED-23)

- **Décision.** Après la porte, `ArticlePreviewView.handleExport` demande `POST /export/:id` et télécharge cette page ; l'aperçu se recharge ensuite. Échec après publication : « Article publié, mais le fichier n’a pas pu être produit : … ».
- **Test.** `tests/unit/views/ArticlePreviewView.test.ts` (nouveau).
- **Exigence.** FR-RED-EXPORT-HTML.

## 5. Liens de l'éditeur (express 9, RED-18)

- **Constat.** Liens internes enregistrés en `nofollow` + `target="_blank"`, onglet parasite au clic, avertissement « Duplicate extension names found: ['link'] ».
- **Cause.** Link déclaré deux fois (StarterKit l'embarque) ; sa règle `a[href]` prenait aussi `a.internal-link`.
- **Décision.** `createEditorExtensions` : `StarterKit.configure({ link: false })`, `PageLink` (`a[href]:not(.internal-link)`, `openOnClick: false`).
- **Fichiers.** `src/components/editor/tiptap/editor-extensions.ts` (nouveau), `ArticleEditor.vue`.
- **Test.** `editor-extensions.test.ts` (rouge vérifié avec l'ancienne liste).
- **Exigence.** FR-RED-EDITOR-TIPTAP (critère ajouté ; le statut reste « non tenue » pour ses autres manques, lot 2).

## 6. Cartes d'enrichissement (RED-18, CER-25)

- **Décision.** `targetsFor` : Exemples / Tableaux / Images sans le chapitre « Introduction » (`INTRO_TITLE`, la règle `isIntro` de l'éditeur) ; Résumer seulement si `childSectionWords` > 250 (la mesure de la porte). `accept` compare `comparable` (sans `target`, `rel`, `style`, `colgroup`…) : un réaffichage de l'éditeur n'est plus « chapitre modifié depuis » ; un `href` changé l'est toujours.
- **Fichiers.** `src/stores/article/enrichment.store.ts`, `src/components/panels/EnrichmentPanel.vue` (message « Rien à résumer… »), `shared/verifiers/publish.ts` (`childSectionWords`).
- **Tests.** `enrichment.store.test.ts`, `enrichment-panel.test.ts`.
- **Exigences.** FR-RED-ENRICH-PASSES, FR-CER-CHILD-FROM-PILLAR-H2.

## 7. Phrase anglaise courte (RED-22)

- **Décision.** `detectNonFrenchSentences` : en plus de la règle existante, 5 mots et plus, un mot-outil anglais non ambigu (« an » exclu), aucun mot-outil français ni accent.
- **Test.** `text-quality.test.ts` (dont quatre phrases françaises sans accent qui ne doivent pas sortir).
- **Exigence.** FR-RED-PUBLISH-GATE.

## 8. « Google ne suggère pas » (express 3, CAP-10)

- **Décision.** `captainGate` juge `autocompletePosition` = KPI `autocomplete` de `captainKpisFromMetricsRow` (`captainAutocompletePosition`), la valeur affichée par le panneau ; `CaptainGateInput.autocompleteCount` renommé `autocompletePosition`. L'empreinte garde sa forme.
- **Test.** `gate.service.test.ts`, `verifiers-captain.test.ts`.
- **Exigence.** FR-CAP-LOCK-GATE (critère ajouté).

## 9. « À la place : » des lieutenants (INFRA-14)

- **Décision.** `unselectedLieutenants` : propositions `lieutenant_explorations` au statut `suggested`, les mieux notées d'abord, hors lieutenants retenus ; hors empreinte.
- **Test.** `gate.service.test.ts`.
- **Exigence.** FR-LIE-LOCK-GATE (critère ajouté).

## 10. Textes des alarmes (03-T4, express 3 et 10 c)

- **Décision.** Introduction accordée (« Lisez-le » / « Lisez-les », une case par 🟠, une raison par 🔴) ; réaffichage en clair (`reconfirmMessage` : point, raison ou « Vous l’aviez lu »), sans identifiant interne ni « .. ».
- **Tests.** `GateAlarm.test.ts`, `verifiers-publish.test.ts`.
- **Exigence.** FR-INFRA-GATE-WAIVER, FR-RED-PUBLISH-GATE.
