---
title: 'Vague 1 — Extractions template pures (5 composants Moteur/Cerveau)'
slug: 'decoupage-vague-1-templates'
created: '2026-05-04'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
parent_roadmap: 'roadmap-decoupage-monstres-vue.md'
tech_stack:
  - 'Vue 3.5.29 (script setup + composition API)'
  - 'TypeScript 5.9.3'
  - 'Vitest 4.0.18 + @vue/test-utils'
  - 'Pinia 3.0.4'
files_to_modify:
  - 'src/components/moteur/KeywordDiscoveryTab.vue (1419L → cible <800L)'
  - 'src/components/moteur/CaptainValidation.vue (1536L → cible documentée selon couplage)'
  - 'src/components/production/BrainPhase.vue (1066L → cible <800L)'
  - 'src/components/moteur/LexiqueExtraction.vue (1058L → cible <800L)'
  - 'src/components/intent/DouleurIntentScanner.vue (1050L → cible <800L)'
files_to_create:
  - 'src/components/moteur/discovery/DiscoverySourcesList.vue'
  - 'src/components/moteur/discovery/DiscoveryAnalysisResults.vue'
  - 'src/components/moteur/discovery/DiscoveryWordGroupsSidebar.vue'
  - 'src/components/moteur/captain/CaptainManualMode.vue'
  - 'src/components/moteur/captain/CaptainRadarList.vue'
  - 'src/components/production/brain/BrainArticleProposalView.vue'
  - 'src/components/moteur/lexique/LexiqueTermsList.vue'
  - 'src/components/moteur/lexique/LexiqueMultiKeywordPanel.vue'
  - 'src/components/intent/scanner/DouleurScannerInputs.vue'
  - 'src/components/intent/scanner/DouleurScannerResults.vue'
  - 'tests/unit/components/discovery-tab-architecture.test.ts'
  - 'tests/unit/components/captain-validation-architecture.test.ts'
  - 'tests/unit/components/brain-phase-architecture.test.ts'
  - 'tests/unit/components/lexique-extraction-architecture.test.ts'
  - 'tests/unit/components/douleur-scanner-architecture.test.ts'
---

# Tech-Spec Vague 1 — Extractions template pures

**Created:** 2026-05-04
**Roadmap parent:** [roadmap-decoupage-monstres-vue.md](roadmap-decoupage-monstres-vue.md)

## Définition de la Vague 1

**Caractéristique unique** : extraire des sous-composants Vue **stateless**
(props in / events out) à partir du `<template>` de 5 composants parents,
**sans déplacer une seule ligne de logique du `<script setup>`**. Les composables,
stores, watchers, computeds restent au parent. Seul le markup déménage.

C'est le **vrai** "refactor structurel pur" — par opposition aux Vagues 2
(factorisation CSS) et 3 (extraction de logique en composables) qui sont des
chantiers de nature différente.

## Périmètre

5 composants critiques du chemin Cerveau → Moteur :

| Bloc | Fichier | Lignes | Cible | Risque | Sous-composants |
|---|---|---|---|---|---|
| A | `KeywordDiscoveryTab.vue` | 1419 | <800 | Faible | 3 |
| B | `CaptainValidation.vue` | 1536 | voir B.0 | Modéré | 2 |
| C | `BrainPhase.vue` | 1066 | <800 | Faible | 1 |
| D | `LexiqueExtraction.vue` | 1058 | <800 | Faible | 2 |
| E | `DouleurIntentScanner.vue` | 1050 | <800 | Faible-Modéré | 2 |

**10 sous-composants Vue + 5 tests architecturaux** au total.

## Hors périmètre Vague 1 (renvois explicites)

- **MoteurView.vue, LieutenantsSelection.vue** : extraction de logique en
  composables → **Vague 3**.
- **ProposedArticleRow.vue, RadarKeywordCard.vue** : factorisation CSS-heavy
  avec composants atomiques → **Vague 2**.
- **ArticleWorkflowView.vue, ArticleEditorView.vue** : reportés en **Vague 4**
  (cf. roadmap §"Pourquoi reporter").
- **Refactor logique** dans les 5 fichiers de la Vague 1 : interdit. Si un
  refactor logique est tentant pour aller plus loin, c'est un signal **stop**.
  Ouvrir une story séparée.

## Cible quantitative — méthode honnête

*Adresse Finding #1 (estimations de gain de lignes structurellement fausses)
et #4 (seuil 800L non justifié).*

### Pourquoi 800 lignes

Le seuil 800 lignes correspond à **environ 2 écrans de revue diff** sur un
écran 14" en mode side-by-side. C'est un compromis entre :
- maintenabilité (un dev doit pouvoir prendre le composant en main en <30 min) ;
- pragmatisme (Vue exige du verbeux : props/emits/imports/balises script-template-style).

### Comptage net réaliste

Extraire un sous-composant **réduit** le parent de :
```
gain_net = lignes_markup_déménagées - balise_du_sous-composant
```

Où `balise_du_sous-composant` ≈ 5-15 lignes (`<MonSousComposant :prop1="..."
@event="..." />`). Donc une extraction de 100 lignes de markup = ~85-95 lignes
nettes gagnées dans le parent.

**Conséquence** : pour passer 1419 → <800, il faut extraire ~700 lignes brutes,
soit **~600-650 lignes nettes**. Les 3 sous-composants du Bloc A doivent donc
totaliser ce volume — vérifier au comptage.

### Cible CaptainValidation — méthode dérivée du couplage *(adresse Finding #3)*

CaptainValidation a deux modes (workflow + libre) avec un couplage script
massif (carousel + 3 watchers persist + streaming par mot-clé + lockedKeyword
state). En Vague 1 (template-only), on ne peut PAS toucher à ce couplage.

**Méthode** : avant de fixer la cible, **mesurer** lors de l'investigation B.0 :
1. Compter les lignes du `<script setup>` qui restent au parent (irréductibles
   en Vague 1).
2. Compter les lignes du `<style scoped>` qui restent au parent (CSS partagé).
3. Estimer les balises résiduelles du `<template>` qui orchestrent les 2 modes.

```
cible_B = script_irréductible + style_partagé + orchestration_template + buffer 5%
```

**Cette cible est calculée au début du Bloc B, pas inventée.** Si elle dépasse
800L, c'est un constat documenté, pas un échec. La Vague 3 reviendra sur le
sujet pour attaquer le script si nécessaire.

## Tasks

### Bloc 0 — Safety net Git *(non négociable)*

- 0.1 `git status` + `git diff` : photographier l'état initial.
- 0.2 Créer une branche dédiée :
  `git checkout -b chore/decoupage-vague-1-templates`.
- 0.3 Commit pré-refactor encapsulant l'état :
  ```bash
  git add -A
  git commit -m "chore(refactor): pre-refactor safety net — vague 1 templates

  Snapshot avant l'extraction template des 5 composants Moteur/Cerveau.
  Cf. tech-spec-decoupage-vague-1-templates.md."
  ```
- 0.4 Push : `git push -u origin chore/decoupage-vague-1-templates`.
- 0.5 **Si le push échoue** *(adresse Finding #22)* : tag local
  `pre-refactor-vague-1-template`, alerter l'utilisateur, et ne pas continuer
  tant que la situation auth n'est pas clarifiée.

### Bloc A — KeywordDiscoveryTab.vue *(commencer ici, risque le plus bas)*

- A.1 Lire le composable `useKeywordDiscoveryTab.ts` pour confirmer l'API
  des refs/fonctions exposées.
- A.2 Inventaire des `data-testid` actifs dans
  `tests/unit/components/keyword-discovery-tab.test.ts` (44 it() actifs) :
  les noter, ils restent invariants.
- A.3 Créer `src/components/moteur/discovery/DiscoveryWordGroupsSidebar.vue`
  - Props : `wordGroups`, `wordGroupsLoading`, `hasResults`, `activeGroupFilter`
  - Emit : `(e: 'group-click', word: string)`
  - Markup : `<aside class="discovery-sidebar">` (lignes 587-609 actuelles)
  - Style : `.discovery-sidebar`, `.sidebar-header`, `.sidebar-title`,
    `.group-list`, `.group-item`, `.sidebar-empty` déménagent en scoped
- A.4 Créer `src/components/moteur/discovery/DiscoveryAnalysisResults.vue`
  - Props : `analysisResult`, `isAllAnalysisSelected`, `isSelected`,
    `isMultiSource`, `sourceCountLabel`
  - Emits : `(e: 'toggle-select', keyword: string)`, `(e: 'toggle-select-all')`
  - Markup : `<section v-if="analysisResult" class="analysis-results">`
    (lignes 522-571)
- A.5 Créer `src/components/moteur/discovery/DiscoverySourcesList.vue`
  - Props : `sections`, `relevanceFilterEnabled`, `filteredList`,
    `visibleItems`, `isCollapsed`, `isSectionExpanded`, `isSelected`,
    `isMultiSource`, `isRelevant`, `isAllSourceSelected`, `sourceCountLabel`,
    `formatVolume`, `hasDiscovered`, `VISIBLE_THRESHOLD`
  - Emits : `(e: 'toggle-collapsed', key)`, `(e: 'toggle-source', source)`,
    `(e: 'keyword-click', keyword)`, `(e: 'toggle-section-expanded', key)`
  - Markup : `<div class="discovery-sources">` (lignes 414-501)
- A.6 Mettre à jour `KeywordDiscoveryTab.vue` :
  - Remplacer les 3 blocs markup par les sous-composants.
  - State local `seedInput`, `hasDiscovered`, `collapsed`, `expandedSections`,
    `cacheCheckTimer` reste au parent.
  - **Vérifier la cible** : `wc -l` doit montrer <800L.
- A.7 Créer `tests/unit/components/discovery-tab-architecture.test.ts`
  Pattern `lieutenants-selection-architecture.test.ts`. **Commentaire de tête
  pointe une FR PRD** (FR-DIS-* selon `cible`).
  - AC.A.1 `DiscoverySourcesList` est descendant de `discovery-main`,
    pas de `discovery-sidebar`.
  - AC.A.2 `DiscoveryWordGroupsSidebar` est descendant de `discovery-sidebar`,
    pas de `discovery-main`.
  - AC.A.3 `DiscoveryAnalysisResults` est descendant de `discovery-main`,
    pas absorbé par `DiscoveryAiPanel`.
- A.8 Lancer `npm run test:unit -- discovery-tab` (incluant le test
  architectural). Tous verts.
- A.9 Lancer `npm run lint && npm run type-check`.
- A.10 Manual UX Checklist Bloc A (voir Testing Strategy Niveau 3).
- A.11 Commit : `chore(refactor): split KeywordDiscoveryTab into 3 sub-components`.

### Bloc B — CaptainValidation.vue *(risque modéré)*

- B.0 **Investigation préalable** *(adresse Finding #3)* :
  - Compter `<script setup>` (lignes 1-1004 actuelles) : ~1000L. Combien
    déménageront en Vague 3 ? **0** en Vague 1.
  - Compter `<style scoped>` partagé entre modes : à mesurer (~250L estimé).
  - Estimer orchestration template (`<template>` racine + dispatch
    workflow/libre) : ~30L.
  - **Cible Vague 1 dérivée** :
    `1000 + 250 + 30 + buffer 5% ≈ 1340L`.
  - **Conséquence** : la cible <800L n'est PAS atteignable en Vague 1.
    Cible documentée : **<1350L** (vs 1536L initial). Le passage <800L
    est un objectif Vague 3.
- B.1 Créer `src/components/moteur/captain/CaptainManualMode.vue`
  - Props : `selectedArticle`, `keywordInput`, `isLocked`, `articleLevel`,
    `suggestedKeywords`, `articleId`
  - Emits : `update:keyword-input`, `lock-captaine`, `unlock-captaine`,
    `validated`, `send-to-lieutenants`, `check-completed`, `check-removed`
  - **Vague 1 contrainte** : le composable `useCapitaineValidation()` reste
    consommé **par le parent**, pas dans le sous-composant. Le parent passe
    `currentResult`, `history`, `radarCard` etc. en props.
  - Markup : `<div class="manual-mode">` (lignes 1098-1244 actuelles).
  - **Pas** de déménagement de logique : `manualPaaQuestions`,
    `manualVerdictSummary`, etc. restent calculés au parent et passent en
    props. *(Adresse Finding #2 : pas de refactor logique en Vague 1.)*
- B.2 Créer `src/components/moteur/captain/CaptainRadarList.vue`
  - Props : `entries: CarouselEntry[]`, `lockedKeyword`, `selectedIndex`,
    `lockedIndex`, `articleLevel`, `articleId`, `articlePainPoint`,
    `sortOptions`, `sortState`, `rawIndexOf`
  - Emits : `select`, `lock`, `unlock`, `word-toggle`, `recompute-relevance`,
    `sort-change`
  - Markup : `<div class="radar-list">` (lignes 1020-1077).
- B.3 Mettre à jour `CaptainValidation.vue` :
  - Mode workflow → `<CaptainRadarList ... />`.
  - Mode libre → `<CaptainManualMode ... />`.
  - Tout le carousel/streaming/watchers persistance reste au parent.
  - Cible : 1536 → <1350L (cf. B.0).
- B.4 Créer `tests/unit/components/captain-validation-architecture.test.ts`
  - AC.B.1 Mode workflow → `CaptainRadarList` rendu, `CaptainManualMode` absent.
  - AC.B.2 Mode libre → `CaptainManualMode` rendu, `CaptainRadarList` absent.
  - AC.B.3 `CaptainRadarList` n'est PAS descendant de `CaptainSidePanel`.
  - AC.B.4 `radar-card-section` (testID critique) reste descendant de
    `CaptainManualMode`, jamais migré.
- B.5 Lancer **immédiatement** `tests/unit/components/captain-validation.test.ts`
  (32 actifs). Tous verts.
- B.6 Lancer architecture test + lint + type-check.
- B.7 Manual UX Checklist Bloc B (workflow + libre).
- B.8 Commit : `chore(refactor): split CaptainValidation into mode-specific sub-components`.

### Bloc C — BrainPhase.vue *(risque faible)*

- C.1 Investigation : confirmer que `useArticleProposals()` est déjà extrait
  comme composable (oui, ligne 17). Le drag-to-scroll local est ce qui doit
  déménager avec le sous-composant.
- C.2 Créer `src/components/production/brain/BrainArticleProposalView.vue`
  - Props : `articleColumns`, `groupedSpecArticles`, `compositionResults`,
    `articleWarnings`, `intermediateTitles`, `globalWarnings`,
    `truncationWarning`, `generationWarning`, `generationPhase`,
    `addingArticleType`, `topicsLoading`, `topicsError`, `proposedArticles`,
    `userContext`, `suggestedTopics`
  - Emits : tous les events des sous-composants enfants existants
    (`ArticleColumn`, `ProposedArticleRow`, `AddArticleMenu`,
    `TopicSuggestions`) re-émis au parent BrainPhase.
  - **Vague 1 contrainte** : `useArticleProposals()` reste consommé au parent.
  - **Déménage avec le sous-composant** : `articleSlide`, `columnsTrackRef`,
    drag-to-scroll (`isDragging`, `dragStartX`, `dragScrollLeft`,
    `INTERACTIVE_SELECTOR`, `onDragStart`, `onDragMove`, `onDragEnd`,
    `scrollToSlide`, `onColumnsScroll`).
- C.3 Mettre à jour `BrainPhase.vue` :
  - Bloc step-6 (lignes 531-710) → `<BrainArticleProposalView ... />`.
  - Cible : 1066 → ~700L.
- C.4 Créer `tests/unit/components/brain-phase-architecture.test.ts`
  - AC.C.1 `currentStep < 5` → `<StrategyStep>` rendu, `BrainArticleProposalView`
    absent.
  - AC.C.2 `currentStep === 5` → `BrainArticleProposalView` rendu,
    `<StrategyStep>` absent.
  - AC.C.3 `BrainArticleProposalView` n'est PAS descendant de `<StrategyStep>`.
- C.5 Lancer tests existants brain (`brain-*.test.ts`,
  `production-phases.test.ts`). Tous verts.
- C.6 Lint + type-check + Manual UX Checklist Bloc C.
- C.7 Commit : `chore(refactor): split BrainPhase step-6 into sub-component`.

### Bloc D — LexiqueExtraction.vue *(risque faible)*

- D.1 Créer `src/components/moteur/lexique/LexiqueTermsList.vue`
  - Props : `title`, `terms`, `selectedTerms`, `isLocked`, `defaultOpen`,
    `isIaRecommended`, `getRecommendation`, `sortTermsByAlignment`
  - Emit : `(e: 'toggle-term', term: string)`
  - Markup : un `<CollapsableSection>` avec liste de termes (factorise les 3
    sections Obligatoire/Différenciateur/Optionnel, ~45L chacune × 3 = ~135L
    réutilisé 3 fois).
- D.2 Créer `src/components/moteur/lexique/LexiqueMultiKeywordPanel.vue`
  - Props : `selectedArticleId`, `customKeywordInput`, `pastExplorations`,
    `activeSourceKeyword`, `isLoading`, `isLocked`
  - Emits : `update:custom-keyword`, `extract-custom`, `select-past`
  - Markup : `<div class="multi-keyword-section">` (lignes 458-488).
- D.3 Mettre à jour `LexiqueExtraction.vue` :
  - 3 instances de `<LexiqueTermsList>`.
  - 1 instance de `<LexiqueMultiKeywordPanel>`.
  - Cible : 1058 → ~800L.
- D.4 Créer `tests/unit/components/lexique-extraction-architecture.test.ts`
  - AC.D.1 `LexiqueTermsList` rendu 3 fois sous `lexique-results`.
  - AC.D.2 `LexiqueMultiKeywordPanel` n'est PAS descendant de `lexique-results`.
  - AC.D.3 `LexiqueAiPanel` reste descendant direct de `lexique-extraction`.
- D.5 Lancer tests existants Lexique + lint + type-check.
- D.6 Manual UX Checklist Bloc D.
- D.7 Commit : `chore(refactor): factorize LexiqueExtraction terms list and multi-keyword panel`.

### Bloc E — DouleurIntentScanner.vue *(risque faible-modéré)*

- E.1 Investigation : confirmer le découpage par phase (Phase 1 inputs / Phase
  2 keywords preview / Phase 3 results) en lisant template (lignes 376-613).
- E.2 Créer `src/components/intent/scanner/DouleurScannerInputs.vue`
  - Props : `mode`, `inputs`, `cacheStatus`, `isLoading`
  - Emits : `scan`, `load-cache`, `clear-cache`, `update:input`
  - Markup : Phase 1 (lignes 385-462) + cache indicator.
- E.3 Créer `src/components/intent/scanner/DouleurScannerResults.vue`
  - Props : `cards`, `globalScore`, `autocompleteGroups`, `longTailSection`,
    `isLocked`
  - Emits : `select-cards`, `lock`, `unlock`
  - Markup : Phase 3 results (lignes 511-602).
- E.4 Mettre à jour `DouleurIntentScanner.vue` :
  - Phase 1 et Phase 3 → sous-composants.
  - Conserver au parent : Phase 2 (~25L), bloc loading (~20L), DiscoveryAiPanel.
  - Composable `useDouleurIntentScanner` reste au parent.
  - Cible : 1050 → ~750L.
- E.5 Créer `tests/unit/components/douleur-scanner-architecture.test.ts`
  - AC.E.1 `DouleurScannerInputs` est descendant direct de `intent-scanner`,
    PAS de `radar-cards`.
  - AC.E.2 `DouleurScannerResults` est rendu après `DouleurScannerInputs`
    dans l'ordre du DOM.
  - AC.E.3 En mode workflow, `scanner-inputs` est masqué (Sprint 5
    friction #7).
- E.6 Lancer `npm run test:unit -- intent-scanner` + lint + type-check.
- E.7 Manual UX Checklist Bloc E.
- E.8 Commit : `chore(refactor): split DouleurIntentScanner phases`.

### Bloc Final — Validation Vague 1 + PR

- Z.1 `npm run check:health` : aucune nouvelle erreur ESLint/knip/madge/dep-cruiser.
- Z.2 `npm run test:unit` : tous verts (tests S2 existants + 5 nouveaux tests
  architecturaux).
- Z.3 `npm run test:browser` : tous verts.
- Z.4 Vérifier les 5 cibles de lignes :
  - `KeywordDiscoveryTab.vue` < 800L
  - `CaptainValidation.vue` < 1350L *(cible dérivée B.0)*
  - `BrainPhase.vue` < 800L
  - `LexiqueExtraction.vue` < 800L
  - `DouleurIntentScanner.vue` < 800L
- Z.5 Vérifier Finding #19 *(types partagés)* : `npm run check:cycles` (madge)
  + `npm run check:arch` (dep-cruiser) verts. Aucun cycle d'import introduit.
- Z.6 Vérifier que **chaque test architectural a un commentaire de tête
  pointant une FR PRD**. Si une FR est manquante, l'ajouter au PRD dans le
  même PR (commit atomique). *(Adresse Finding #9.)*
- Z.7 Manual UX Checklist complète (Niveau 3) — voir Testing Strategy.
- Z.8 Mettre à jour `_bmad-output/implementation-artifacts/sprint-status.yaml`
  avec entrée pour Vague 1.
- Z.9 Pusher la branche, ouvrir le PR avec :
  - Titre : `chore(refactor): vague 1 — extractions template (5 composants)`
  - Body : référence à la roadmap, liste des 10 sous-composants créés, AC review.

## Acceptance Criteria

**AC1 — API publique inchangée**
- Given un consumer (`MoteurView.vue`, `LaboView.vue`, `CerveauView.vue`),
- When il importe et instancie l'un des 5 composants parents,
- Then les props et events sont strictement identiques au pré-refactor.
  Vérifié par `dual-mode-props.test.ts` qui doit rester vert sans modif.

**AC2 — Tests S2 caractérisation préservés**
- Given les tests `captain-validation.test.ts` (32 actifs),
  `keyword-discovery-tab.test.ts` (44 actifs), `brain-*.test.ts`,
  `production-phases.test.ts`, `dual-mode-props.test.ts`,
- When `npm run test:unit` est exécuté,
- Then tous les `it()` actifs passent.
- **Exception documentée autorisée** *(adresse Finding #10)* : si une
  assertion d'un test S2 porte sur une profondeur DOM trop spécifique qui
  n'est PAS un invariant fonctionnel (ex: `wrapper.findAll('div')[3]`),
  l'assertion peut être ré-écrite pour cibler un sélecteur sémantique
  (`[data-testid="..."]`). Toute modification d'un test S2 DOIT être notée
  dans le PR avec justification écrite et review humaine.

**AC3 — Verrous architecturaux ajoutés**
- Given 5 nouveaux fichiers `*-architecture.test.ts`,
- When `npm run test:unit -- architecture` est exécuté,
- Then chacun contient au moins 3 ACs DOM-position, et chacun a en commentaire
  de tête une référence à une FR PRD (FR-DIS, FR-CAP, FR-CER, FR-LEX, FR-RAD).

**AC4 — Tailles cibles Vague 1**
- KeywordDiscoveryTab < 800L
- CaptainValidation < 1350L (cible dérivée B.0)
- BrainPhase < 800L
- LexiqueExtraction < 800L
- DouleurIntentScanner < 800L

**AC5 — Hygiène statique verte**
- `npm run lint && npm run type-check && npm run check:dead && npm run check:cycles && npm run check:arch` : tous verts.

**AC6 — Aucun testID critique disparu**
- Liste des testIDs vivants à préserver (audit Vague 1) : `captain-empty`,
  `captain-error`, `captain-loading`, `captain-results`, `radar-card-section`,
  `paa-list`, `thresholds-table`, `suggested-keywords`, `history-carousel`,
  `radar-list-item-*`, `structural-warnings`, `lexique-results`,
  `lexique-sort-bar`, `btn-extract`, `lexique-lock`, `lock-btn`, `unlock-btn`.
- Chacun doit rester rendu et garder sa relation ancestor/descendant attendue.

**AC7 — Aucun cycle d'import introduit**
- `madge` et `dep-cruiser` verts. Si un type partagé doit être déplacé en
  `shared/types/` pour éviter un cycle, le faire dans le commit dédié.

**AC8 — Atomicité PR + PRD** *(adresse Finding #9)*
- Given que la Vague 1 ne modifie PAS le PRD (toutes les FR existent déjà),
- When le PR est mergé,
- Then aucun fichier PRD ne doit avoir été touché par cette vague. Si une
  modification du PRD se révèle nécessaire en cours de chantier, elle est
  intégrée au PR de la Vague 1 ou la vague est mise en pause.

**AC9 — Refactor structurel pur (zéro logique déplacée)**
- Given le diff complet de la PR Vague 1,
- When on lance un audit script (`git diff main..HEAD -- '*.vue' '*.ts'`),
- Then aucune ligne de logique (computed, watch, function, ref) n'a quitté
  un fichier `<script setup>` parent vers un autre fichier `<script setup>`,
  composable ou store. Seul du markup a déménagé.
- **Vérification simple** : le diff montre du `+` markup dans les nouveaux
  sous-composants et du `-` markup dans les parents, mais pas de `+/-` script
  croisé. Si du script déménage, c'est qu'on déborde sur la Vague 3 — refuser
  le diff.

## Testing Strategy (3 niveaux)

### Niveau 1 — Tests architecturaux (5 nouveaux fichiers)

Pattern `lieutenants-selection-architecture.test.ts`. Chaque fichier ouvre
avec un commentaire de tête référençant la FR PRD couverte.

### Niveau 2 — Tests S2 fonctionnels (préexistants)

Liste des fichiers à laisser verts :
- `captain-validation.test.ts`, `keyword-discovery-tab.test.ts`,
  `brain-article-hierarchy.test.ts`, `brain-paa-cascade.test.ts`,
  `brain-smart-add.test.ts`, `production-phases.test.ts`,
  `dual-mode-props.test.ts`, `lieutenants-selection-architecture.test.ts`
  (verrou C-1 indirect — la Vague 1 ne touche pas LieutenantsSelection).

**Exception modification** : voir AC2.

### Niveau 3 — Manual UX Checklist Vague 1

Lancer `npm run dev`, puis cocher dans l'ordre :

**Bloc A (Discovery)** :
- [ ] Saisir seed → "Découvrir" → 6 sources s'affichent.
- [ ] Filtre pertinence on/off → compteur change.
- [ ] Mot-clé multi-source → badge `×N`.
- [ ] Cliquer mot-clé → toast 5s pré-validation Capitaine ; re-cliquer = annule.
- [ ] Cache hit → indicateur visible avec date/count ; "Charger" hydrate.
- [ ] Sidebar groupes de mots cliquable → filtre actif.
- [ ] Cocher 5 mots-clés → discovery-bar sticky → "Envoyer au Radar" émet.

**Bloc B (Captain workflow + libre)** :
- [ ] Mode workflow : radar-list affiche les entries triées.
- [ ] Cliquer item → sélectionné + sidepanel à jour.
- [ ] Verrouiller GO → check sidebar workflow apparaît.
- [ ] Avec lieutenants verrouillés, déverrouiller → modale 3 choix.
- [ ] Switch article → reset propre.
- [ ] Reload F5 → restoration depuis DB OK (pas 1/N stub).
- [ ] Mode libre : valider → verdict + IA stream.
- [ ] History chips couleurs verdict correctes.
- [ ] PAA list affichée.

**Bloc C (Brain step-6)** :
- [ ] Générer 10+ articles via Claude.
- [ ] 3 colonnes scrollables : flèches + drag souris + scroll natif.
- [ ] Drag sur bouton/lien NE scrolle PAS.
- [ ] AddArticleMenu disable les autres pendant un ajout.
- [ ] Tout valider → tous accepted.
- [ ] Article spécialisé orphelin → "Non rattachés".

**Bloc D (Lexique)** :
- [ ] Capitaine verrouillé → header badges visibles.
- [ ] Extraire Lexique → 3 sections + compteurs.
- [ ] Badges IA recommandé/optionnel après IA upfront.
- [ ] Cocher 5 termes → compteur multi-niveau (XO/YD/ZOp).
- [ ] Tri alignement douleur → ordre change.
- [ ] Multi-keyword : extraire custom → exploration enregistrée.
- [ ] Past-chip → restauration tfidfResult.
- [ ] Valider Lexique → check workflow + badge verrouillé.

**Bloc E (Scanner Radar)** :
- [ ] Mode libre (Labo) : scan complet → 3 phases visibles.
- [ ] Mode workflow (Moteur) : inputs masqués, cards auto-affichées.
- [ ] Cache hit → indicateur + Charger/Rafraîchir.
- [ ] Cocher cards → bouton sélection actif → émission cards-selected.
- [ ] DiscoveryAiPanel bas-de-page fonctionnel.

**a11y et perf** :
- [ ] Lighthouse Accessibility ≥ pré-refactor.
- [ ] DevTools Performance : load article 30+ keywords < pré-refactor + 50ms.
- [ ] Aucun warning Vue console.
- [ ] Aucune erreur console JS.

## Pre-mortem Vague 1

### Risque 1.1 — Tests S2 cassent par profondeur DOM trop spécifique
**Symptôme** : `wrapper.findAll('div')[3]` ne retourne plus le bon élément.
**Mitigation** : autorisation AC2 d'ajuster l'assertion en sélecteur sémantique
avec justification PR.

### Risque 1.2 — Sous-composant introduit un cycle d'import
**Symptôme** : `madge` ou `dep-cruiser` rouge.
**Mitigation** : audit pré-refactor des types/constantes utilisés (Step 2 de
chaque bloc). Si un type est défini localement dans le parent, le déplacer
dans `shared/types/` AVANT l'extraction.

### Risque 1.3 — Régression cross-mode (workflow vs libre)
**Symptôme** : `dual-mode-props.test.ts` casse, ou un comportement workflow
fuit en mode libre.
**Mitigation** : Bloc B utilise `v-if="mode === 'libre'"` et
`v-if="mode === 'workflow'"` strictement disjoints. AC.B.1 et AC.B.2 vérifient.

### Risque 1.4 — Concurrence Git (branche longue durée)
**Symptôme** : conflits de merge sur les 5 fichiers parents quand `main` bouge.
**Mitigation** : `git rebase main` à chaque début de bloc. Si conflit lourd,
arrêt anticipé et discussion humaine.

### Risque 1.5 — Performance dégradée (re-render cascade)
**Symptôme** : taper dans un input fait re-render toute la radar-list.
**Mitigation** : préférer des props mémoïsées (computed, Map indexé) plutôt
que des fonctions inline. Vérification opportuniste avec Vue Devtools si une
lenteur est perçue en checklist Niveau 3.

### Risque 1.6 — `defineExpose` cassé silencieusement
**Symptôme** : un parent appelle `radarRef.value.mergeFromRadarSource(...)` et
ça plante après refactor.
**Mitigation** : `grep -rn "defineExpose" src/components/{moteur,intent,production}/`
AVANT le refactor pour identifier les composants qui exposent une API. Aucun
des 5 fichiers Vague 1 ne doit perdre son `defineExpose`. Vérifier dans le PR.

## Notes

- Cette vague est volontairement la plus simple. Si elle dérape sur des
  surprises (couplages cachés, cycles d'imports massifs), c'est un signe que
  la Vague 3 (composables) sera très lourde. **Surveiller les signaux faibles
  pendant la Vague 1.**
- Estimation T-shirt size : **L (3-5 jours plein temps)**.
- À la livraison, ouvrir une rétro courte (5 lignes max) sur ce qui a surpris.
  Ces notes guident les Vagues 2 et 3.
