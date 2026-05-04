---
title: 'Découpage structurel des composants Vue > 800L (vague 1) [ARCHIVED]'
slug: 'decoupage-monstres-vue-vague-1-archived'
created: '2026-05-04'
archived: '2026-05-04'
status: 'archived-superseded'
stepsCompleted: [1, 2, 3, 4]
superseded_by:
  - 'tech-spec-decoupage-vague-1-templates.md'
  - 'tech-spec-decoupage-vague-2-factorisation.md'
  - 'tech-spec-decoupage-vague-3-composables.md'
  - 'roadmap-decoupage-monstres-vue.md'
archive_reason: |
  Suite à une revue adversariale (22 findings, 2026-05-04), cette spec monolithique
  a été refondue en 3 vagues distinctes pour adresser plusieurs problèmes
  fondamentaux :
  - Finding #2 : contradiction "refactor structurel pur" vs introduction de
    composables (Blocs I et J). Les composables relèvent d'un refactor logique,
    pas structurel — séparation maintenant explicite par vague.
  - Finding #7 : ordre d'exécution avec inversions parent/enfant (BrainPhase avant
    ProposedArticleRow, RadarKeywordCard après ses 3 consommateurs).
    L'ordre par vague respecte désormais le sens producteur → consommateur.
  - Finding #11 : mélange de techniques (sous-composants Vue vs composables TS)
    sans matrice de décision. Chaque vague applique UNE technique cohérente.
  - Finding #20 : "vague 1" trompeur car embarquait les 11 monstres. La nouvelle
    structure honore le mot "vague".

  **Document conservé pour traçabilité historique.**
  Ne pas l'utiliser comme spec d'implémentation — voir les 3 nouveaux fichiers
  listés en `superseded_by`.
tech_stack:
  - 'Vue 3.5.29 (script setup + composition API)'
  - 'TypeScript 5.9.3'
  - 'Vitest 4.0.18 + @vue/test-utils'
  - 'Pinia 3.0.4'
files_to_modify:
  - 'src/components/moteur/CaptainValidation.vue (1536L → cible <1100L)'
  - 'src/components/moteur/KeywordDiscoveryTab.vue (1419L → cible <800L)'
  - 'src/views/MoteurView.vue (1087L → cible <800L)'
  - 'src/components/production/BrainPhase.vue (1066L → cible <800L)'
  - 'src/components/moteur/LexiqueExtraction.vue (1058L → cible <800L)'
  - 'src/components/intent/DouleurIntentScanner.vue (1050L → cible <800L)'
  - 'src/components/moteur/LieutenantsSelection.vue (1025L → cible <800L)'
  - 'src/components/strategy/ProposedArticleRow.vue (977L → cible <800L)'
  - 'src/views/ArticleWorkflowView.vue (970L → cible <800L)'
  - 'src/views/ArticleEditorView.vue (952L → cible <800L)'
  - 'src/components/intent/RadarKeywordCard.vue (900L → cible <800L)'
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
  - 'src/views/article-workflow/ArticleWorkflowSteps.vue'
  - 'src/views/article-editor/ArticleEditorToolbar.vue'
  - 'src/composables/moteur/useMoteurTabs.ts'
  - 'src/composables/moteur/useMoteurSoftGating.ts'
  - 'src/composables/moteur/useMoteurCrossTabState.ts'
  - 'src/composables/moteur/useLieutenantsSerp.ts'
  - 'src/composables/moteur/useLieutenantsIa.ts'
  - 'src/composables/moteur/useLieutenantsHn.ts'
  - 'src/components/moteur/lieutenants/LieutenantsResultsLayout.vue'
  - 'src/components/strategy/proposed/ProposedArticleHeader.vue'
  - 'src/components/strategy/proposed/ProposedArticleSlider.vue'
  - 'src/components/strategy/proposed/ProposedArticleActions.vue'
  - 'src/components/intent/radar-card/RadarCardScoreRing.vue'
  - 'src/components/intent/radar-card/RadarCardPaaTree.vue'
  - 'tests/unit/components/discovery-tab-architecture.test.ts'
  - 'tests/unit/components/captain-validation-architecture.test.ts'
  - 'tests/unit/components/brain-phase-architecture.test.ts'
  - 'tests/unit/components/lexique-extraction-architecture.test.ts'
  - 'tests/unit/components/douleur-scanner-architecture.test.ts'
  - 'tests/unit/components/article-workflow-architecture.test.ts'
  - 'tests/unit/components/article-editor-architecture.test.ts'
  - 'tests/unit/components/proposed-article-row-architecture.test.ts'
  - 'tests/unit/components/radar-keyword-card-architecture.test.ts'
  - 'tests/unit/components/moteur-view-architecture.test.ts'
  - 'tests/unit/composables/moteur-composables.test.ts'
out_of_scope_files: []
consumers:
  - 'src/views/MoteurView.vue (CaptainValidation, KeywordDiscoveryTab, DouleurIntentScanner, LexiqueExtraction, LieutenantsSelection)'
  - 'src/views/LaboView.vue (CaptainValidation, KeywordDiscoveryTab, DouleurIntentScanner)'
  - 'src/views/CerveauView.vue (BrainPhase)'
  - 'src/router/index.ts (ArticleWorkflowView, ArticleEditorView via lazy import)'
  - 'src/components/production/BrainPhase.vue (consomme ProposedArticleRow)'
  - 'CaptainValidation, DouleurIntentScanner, KeywordDiscoveryTab (consomment RadarKeywordCard)'
code_patterns:
  - 'Composant bimodal mode workflow / libre via prop `mode`'
  - 'Émission de checks via constantes MOTEUR_* / CERVEAU_* (shared/constants/workflow-checks.constants.ts)'
  - 'Sous-composant stateless = props in / events out, pas d''accès store direct'
  - 'data-testid pour ancres DOM stables (verrou anti-régression Sprint C-1)'
test_patterns:
  - 'Tests architecturaux DOM-position via isDescendantOf (cf. lieutenants-selection-architecture.test.ts)'
  - 'Stubs minimaux par data-testid pour vérifier la POSITION dans l''arbre, pas le contenu'
  - 'Tests de caractérisation préexistants (S2) doivent rester verts sans modification'
---

# Tech-Spec: Découpage structurel des composants Vue > 800L (vague 1)

**Created:** 2026-05-04

## Principes de refactor

Cette section énonce les principes qui guident **toutes les décisions** de cette spec.
Elle existe parce que la première version du document avait écarté 4 fichiers sur
des arguments de prudence faux (verrou de test traité comme un mur, peur de toucher
à un composant central). Les principes ci-dessous remplacent ces réflexes.

### Principe 1 — "Important pour l'utilisateur" prime sur "facile à découper"

Un composant central au workflow utilisateur (chemin Cerveau → Moteur → Rédaction)
mérite l'effort de découpage, **même s'il a un couplage difficile**. La maintenance
facile est une exigence métier, pas une option de confort. On ne sacrifie pas un
composant critique pour gagner du temps.

### Principe 2 — Un test architectural est un GPS, pas un mur

Le test `lieutenants-selection-architecture.test.ts` (verrou Sprint C-1) **n'interdit
pas de refactorer LieutenantsSelection**. Il vérifie 5 assertions DOM précises :

1. `LieutenantProposals` n'est PAS descendant de `[data-testid="ai-panel-suggestion"]`.
2. `LieutenantH2Structure` n'est PAS descendant de `[data-testid="ai-panel-suggestion"]`.
3. `LieutenantProposals` est rendu au moins une fois.
4. Le bloc `.lieutenants-header` legacy n'existe pas.
5. Le badge "level article" reste affiché quelque part dans le DOM.

Tant que ces 5 invariants sont respectés, on peut tout refactorer (extraire des
composables, des sous-composants, déplacer du CSS, ajouter de nouvelles couches).
Le test pointe la direction à éviter, il ne définit pas une zone interdite.

**Reformulation valable pour tous les tests architecturaux** :
> Un test architectural exprime un invariant nommé. Le respecter ne demande pas de
> figer le code, juste de garantir l'invariant après chaque transformation.

### Principe 3 — Les FR du PRD sont l'autorité, pas les tests

Un test architectural devrait toujours refléter une exigence fonctionnelle nommée
dans le PRD. Le verrou C-1 **devrait** s'écrire ainsi dans le PRD :

> **FR-LIEUT-1** : Les containers principaux Lieutenants (cards Lieutenants
> verrouillés, structure Hn validée) affichent les **données de l'utilisateur**.
> Ils ne doivent jamais être visuellement absorbés par une coque "Suggestions IA",
> qui est dédiée aux **propositions générées par l'IA**. Cette séparation visuelle
> garantit que l'utilisateur sait, à tout moment, si une donnée est la sienne ou une
> suggestion à valider.

Le test C-1 actuel n'est qu'**une implémentation** de FR-LIEUT-1. Il aurait pu être
écrit autrement (sélecteurs sémantiques, snapshots, e2e). Tant qu'il préserve
l'invariant fonctionnel, le refactor est libre.

**Action concrète dans cette vague 1** : la section "Exigences fonctionnelles
(no-regression UX)" ci-dessous (FR1-FR18) joue ce rôle pour tout le périmètre.
Chaque test architectural ajouté **doit pointer une FR** dans son commentaire de tête.

### Principe 4 — La rigueur n'est pas la prudence

Refuser de toucher à un fichier "par prudence" est souvent de la facilité déguisée.
La vraie prudence consiste à :

1. **Investiguer** : lire le composant en entier, identifier les sections logiques.
2. **Documenter les invariants** : écrire ce qui doit rester vrai (FR + tests).
3. **Couvrir** : tests de caractérisation S2 lancés avant ET après chaque extraction.
4. **Découper progressivement** : commits intermédiaires, règle d'arrêt anticipé.
5. **Vérifier en navigateur** : Manual UX Checklist obligatoire avant push.

Si ces 5 étapes sont respectées, on peut refactorer **n'importe quel composant** de
la vague 1 sans risque silencieux. Si on saute une étape, aucune exclusion ne sauvera
le chantier.

### Principe 5 — Le critère de découpage n'est pas une seule technique

Un composant volumineux peut être découpé de **trois façons** complémentaires :

- **Extraction template** (composant Vue lourd en markup) → sous-composants Vue.
- **Extraction script** (composant Vue lourd en logique) → composables TypeScript.
- **Extraction CSS** (composant Vue lourd en styles répétés) → composants atomiques
  réutilisables qui mutualisent le CSS.

On choisit la technique selon **où est le poids**, pas selon une règle uniforme.

---

## Overview

### Problem Statement

**Audit exhaustif** : un scan complet des composants Vue (`find src -name "*.vue"
-exec wc -l {} + | sort -rn`) révèle **11 fichiers au-dessus de 800 lignes**. Tous sont
**critiques pour l'utilisateur** (chemin Cerveau → Moteur → Rédaction) ; tous méritent
un découpage. Voici la photographie complète et la stratégie par fichier :

| Fichier | Lignes | Bloc | Stratégie |
|---|---|---|---|
| `CaptainValidation.vue` | 1536 | B | Extraction template (mode workflow + mode libre) |
| `KeywordDiscoveryTab.vue` | 1419 | A | Extraction template (3 sections) |
| `MoteurView.vue` | 1087 | I | Extraction script → 3 composables (`useMoteurTabs`, `useMoteurSoftGating`, `useMoteurCrossTabState`) |
| `BrainPhase.vue` | 1066 | C | Extraction template (étape 6) |
| `LexiqueExtraction.vue` | 1058 | D | Extraction template (3 sections + multi-keyword panel) |
| `DouleurIntentScanner.vue` | 1050 | E | Extraction template (Phase 1 inputs + Phase 3 results) |
| `LieutenantsSelection.vue` | 1025 | J | Extraction script (3 composables) **+ 1 sous-composant template** (`LieutenantsResultsLayout`). Verrou Sprint C-1 respecté **par construction** via FR-LIE-AI-FRONTIER (PRD §8.7) |
| `ProposedArticleRow.vue` | 977 | K | Extraction template + factorisation 3 sliders répétés |
| `ArticleWorkflowView.vue` | 970 | F | Extraction template (workflow steps) |
| `ArticleEditorView.vue` | 952 | G | Extraction template (toolbar TipTap) |
| `RadarKeywordCard.vue` | 900 | L | Extraction template (score ring + PAA tree récursif) |

**Onze composants** sont donc embarqués dans cette vague 1. **Aucun n'est sacrifié.**

> **Précision sur la stratégie "extraction script vs template"** :
> - Quand le poids est dans le **template** (>200L de markup avec sections logiques),
>   on extrait des **sous-composants Vue**.
> - Quand le poids est dans le **script** (>500L de logique avec sections commentées),
>   on extrait des **composables TypeScript**.
> - Le critère "important pour l'utilisateur" prime sur le critère "facile à découper".
>   Un composant central au workflow mérite l'effort, même s'il a un couplage difficile.

Le chantier était listé en hors-scope de la tech-spec `tech-spec-stabilisation-codebase.md`
(ligne 91) avec la mention « risque trop élevé sans S2 + S3 d'abord ». Les sprints S2
(tests de caractérisation) et S3 (module `shared/score/`) sont livrés (cf.
`sprint-status.yaml` lignes 248-263), donc le chantier devient éligible : on dispose enfin
du filet de sécurité pour refactorer ces composants sans risque silencieux.

Une régression Sprint C-1 (commit `890b285`, 2026-05-02) a déjà coûté du temps : un refactor
similaire avait absorbé un container principal Lieutenants dans une coque IA, cassant la
sémantique d'affichage. Le verrou anti-régression posé en sprint 1
(`tests/unit/components/lieutenants-selection-architecture.test.ts`) prouve que la
position DOM doit être testée explicitement quand on déplace des sous-composants.

### Solution

Refactor **structurel pur** : extraire des sous-composants Vue lisibles à partir de chaque
monstre, **sans changer l'API publique** (props, events, slots) du composant parent.
Chaque extraction est doublée d'un test architectural type "anti-régression Sprint C-1"
qui vérifie la position DOM des nouveaux sous-composants — pour qu'aucune fusion ou
absorption future ne casse la sémantique.

Aucun refactor logique, aucun changement de comportement, aucun changement de store
ou de composable. Les tests de caractérisation S2 doivent rester verts à l'identique.

### Scope

**In Scope (11 composants parents)** :

- **Bloc A** — `KeywordDiscoveryTab.vue` (1419 → <800)
  → 3 sous-composants : `DiscoverySourcesList`, `DiscoveryAnalysisResults`,
    `DiscoveryWordGroupsSidebar`
- **Bloc B** — `CaptainValidation.vue` (1536 → <1100, tolérance documentée)
  → 2 sous-composants : `CaptainManualMode`, `CaptainRadarList`
- **Bloc C** — `BrainPhase.vue` (1066 → <800)
  → 1 sous-composant : `BrainArticleProposalView`
- **Bloc D** — `LexiqueExtraction.vue` (1058 → <800)
  → 2 sous-composants : `LexiqueTermsList`, `LexiqueMultiKeywordPanel`
- **Bloc E** — `DouleurIntentScanner.vue` (1050 → <800)
  → 2 sous-composants : `DouleurScannerInputs`, `DouleurScannerResults`
- **Bloc F** — `ArticleWorkflowView.vue` (970 → <800)
  → 1 sous-composant : `ArticleWorkflowSteps` (à confirmer en investigation)
- **Bloc G** — `ArticleEditorView.vue` (952 → <800)
  → 1 sous-composant : `ArticleEditorToolbar` (à confirmer en investigation)
- **Bloc I** — `MoteurView.vue` (1087 → <800)
  → 3 composables TypeScript : `useMoteurTabs`, `useMoteurSoftGating`,
    `useMoteurCrossTabState`. Pas de nouveau sous-composant Vue (template déjà
    composé de sous-composants).
- **Bloc J** — `LieutenantsSelection.vue` (1025 → <800)
  → 3 composables TypeScript : `useLieutenantsSerp`, `useLieutenantsIa`,
    `useLieutenantsHn` (extraction du script de 733L).
  → 1 sous-composant Vue : `LieutenantsResultsLayout.vue` (extraction du bloc
    `<div v-if="serpResult || isLocked || lieutenantCards.length > 0" class="serp-results">`,
    lignes 786-889 actuelles).
  → Le verrou Sprint C-1 reste vert **par construction** : on respecte ses 5 invariants
    (cf. principes ci-dessous), pas en évitant le fichier.
- **Bloc K** — `ProposedArticleRow.vue` (977 → <800)
  → 3 sous-composants : `ProposedArticleHeader`, `ProposedArticleSlider` (factorisation
    du pattern slider/edit répété 3 fois pour titre/keyword/slug),
    `ProposedArticleActions`.
- **Bloc L** — `RadarKeywordCard.vue` (900 → <800)
  → 2 sous-composants : `RadarCardScoreRing` (score ring + tooltip explicatif),
    `RadarCardPaaTree` (PAA tree récursif parent/children).

Pour chaque extraction : 1 test architectural DOM-position ou contract-test composable
(pattern `lieutenants-selection-architecture.test.ts` généralisé).

**Total** : 14 nouveaux sous-composants Vue + 6 nouveaux composables TypeScript +
11 nouveaux fichiers de tests architecturaux.

**Out of Scope:**

- Refactor de la logique (`<script setup>`) interne — les composables et stores
  restent inchangés. Si du code script est déplacé dans un sous-composant, c'est uniquement
  pour respecter la règle "props in / events out".
- Changement de l'API publique des composants parents (props/events/slots).
- Modification des stores Pinia, composables, services ou routes.
- Suppression/fusion de fichiers existants (les sous-composants déjà extraits comme
  `CaptainInput`, `CaptainSidePanel`, `ArticleColumn`, etc. ne sont **pas** retouchés).
- Réécriture des tests de caractérisation (S2) — ils doivent rester verts sans patch.
- Unification des stores article (chantier d'archi indépendant, mentionné en backlog
  `sprint-status.yaml` ligne 276).
- Suppression des `fetch()` directs (codemod indépendant).

## Context for Development

### Codebase Patterns

**Pattern 1 — Sous-composant Moteur "stateless"**
Un sous-composant extrait depuis un monstre Moteur reçoit ses données via `defineProps`
et émet ses interactions via `defineEmits`. Il **ne consomme pas** directement un store
Pinia. Le store reste branché sur le composant parent qui passe les valeurs au sous-composant.
Exemples existants dans le codebase : `CaptainInput.vue`, `CaptainSidePanel.vue`,
`CaptainLockPanel.vue`, `CaptainRootsSidebar.vue`, `LieutenantProposals.vue`,
`LieutenantH2Structure.vue`, `ArticleColumn.vue`, `ProposedArticleRow.vue`.

**Pattern 2 — Composant bimodal préservé via prop `mode`**
`CaptainValidation` a une prop `mode: 'workflow' | 'libre'` — chaque sous-composant
extrait doit rester accessible aux deux modes si applicable, ou être explicitement
réservé à un seul mode (alors monté avec `v-if="mode === 'workflow'"`). Ne pas
dupliquer entre Moteur et Labo (règle CLAUDE §3 #8).

**Pattern 3 — Émission de checks workflow inchangée**
Les `emit('check-completed', MOTEUR_*)` restent dans le composant parent (sauf si tout
le bloc concerné est extrait — auquel cas le sous-composant ré-émet et le parent
re-émet). Jamais hardcoder une string (CLAUDE §3 #3).

**Pattern 4 — Test architectural "position DOM" (verrou anti-régression Sprint C-1)**
Pattern établi par `tests/unit/components/lieutenants-selection-architecture.test.ts` :
- Stubs minimaux qui rendent un placeholder par `data-testid`.
- Helper `isDescendantOf(wrapper, ancestorSelector, descendantSelector)`.
- Assertions du type "X N'EST PAS descendant de Y" pour empêcher l'absorption.
- Assertions du type "X est rendu au moins une fois" pour empêcher la suppression
  silencieuse.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/moteur/CaptainValidation.vue` (1536 L) | Monstre #1 à découper |
| `src/components/moteur/KeywordDiscoveryTab.vue` (1419 L) | Monstre #2 à découper |
| `src/components/production/BrainPhase.vue` (1066 L) | Monstre #3 à découper |
| `src/components/moteur/CaptainInput.vue` | Référence d'extraction stateless existante |
| `src/components/moteur/CaptainSidePanel.vue` | Référence d'extraction stateless existante |
| `src/components/moteur/LieutenantsSelection.vue` | Composant qui a survécu à l'extraction Sprint C-1 |
| `tests/unit/components/lieutenants-selection-architecture.test.ts` | Pattern de verrou DOM à généraliser |
| `tests/unit/components/lieutenants-selection-isolation.test.ts` | Pattern de mocks Vue Test Utils à reproduire |
| `shared/constants/workflow-checks.constants.ts` | Constantes MOTEUR_* / CERVEAU_* |
| `_bmad-output/implementation-artifacts/tech-spec-stabilisation-codebase.md` | Contexte du chantier (ligne 91) |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` (lignes 240-279) | État S2/S3 livré + backlog confirmant éligibilité |

### Technical Decisions

**Décision 1 — Inclure `BrainPhase.vue` dans le périmètre**
La tech-spec d'origine ne mentionnait que les deux composants Moteur. `BrainPhase.vue`
(1066 L) n'a pas été listé, mais :
- Il est le 3e plus gros composant Vue de l'app.
- Son étape 6 (article-proposal block, ~180 L de markup) est extractible sans risque
  (elle utilise déjà beaucoup de sous-composants : `ArticleColumn`, `ProposedArticleRow`,
  `TopicSuggestions`, `GenerationStepper`, etc.).
- Le passer sous 800 L cohère avec l'esprit du chantier de stabilisation.
**Risque** : faible, structure déjà très modulaire (les vraies briques sont déjà extraites).

**Décision 2 — Test architectural systématique par extraction**
Chaque sous-composant extrait reçoit **au moins 2 assertions** dans son test
architectural :
1. "Le sous-composant est monté quand attendu" (anti-suppression).
2. "Le sous-composant N'EST PAS descendant d'un panel IA / d'une coque visuelle"
   (anti-absorption Sprint C-1).
Cette discipline généralise le verrou de `lieutenants-selection-architecture.test.ts`
à tout le chantier. Sans elle, un futur refactor pourrait re-fusionner sans alerte.

**Décision 3 — Pas de slot ni de nommage générique**
Les sous-composants extraits ont un **nom métier explicite** (ex: `CaptainManualMode`,
`DiscoverySourcesList`, `BrainArticleProposal`), pas `CaptainSection1` ni
`CaptainContent`. Règle CLAUDE §5.1 : noms reflètent le domaine métier, pas la technique.

**Décision 4 — Découpage CSS = scoped uniquement, pas de variables partagées**
Le CSS scoped des composants parents est déplacé avec le markup correspondant. Pas de
fichier CSS partagé (.module.css ou .scss commun) introduit. Cohérent avec la
discipline projet (CSS scoped Vue uniquement).

**Décision 5 — Ordre d'exécution**
1. KeywordDiscoveryTab (4 extractions, structure la plus séparable, risque le plus bas).
2. CaptainValidation (2 extractions, risque modéré : couplage entre carousel et
   manual-mode).
3. BrainPhase (1 extraction, risque le plus bas mais découverte tardive).
Cet ordre permet d'établir la pratique sur le composant le plus simple, puis de
l'appliquer aux deux autres. Si une extraction casse les tests, on s'arrête, on isole
la cause, et on ne propage pas l'erreur sur les composants suivants.

## Investigation Findings (Step 2)

### Finding 1 — KeywordDiscoveryTab : extractions très propres

Le composable `useKeywordDiscoveryTab()` ([src/composables/keyword/useKeywordDiscoveryTab.ts](src/composables/keyword/useKeywordDiscoveryTab.ts))
expose ~30 refs/fonctions. Le composant parent ajoute du state local **purement UI** :
`seedInput`, `hasDiscovered`, `collapsed`, `expandedSections`, `cacheCheckTimer`. Les
sous-composants peuvent recevoir tout ce qu'il leur faut via props, et émettre les
interactions vers le parent.

**Découpage proposé** :
- `DiscoverySourcesList.vue` — la `<template v-for="section in sections">` (lignes 414-572)
  + le bloc `analysis-results` (lignes 522-571) pourrait être séparé. **Décision** : on
  garde `analysis-results` dans un sous-composant à part (`DiscoveryAnalysisResults.vue`)
  car son layout et son comportement (sélection, priority, summary) sont distincts.
- `DiscoveryWordGroupsSidebar.vue` — la `<aside class="discovery-sidebar">` (lignes
  587-609). 22 lignes de markup, le plus simple — extraction triviale.
- Le bloc `discovery-input` + `cache-indicator` + filtres (lignes 318-411) reste dans
  le parent (logique d'orchestration : déclenche le `discover()`, watch seedInput, etc.).
- Le `DiscoveryAiPanel` est déjà un composant existant — pas touché.

**Risque** : faible. State purement UI, événements clairement délimités.

### Finding 2 — CaptainValidation : asymétrie de couplage entre les deux modes

Lecture complète du `<script setup>` (lignes 1-1004) : **le mode workflow et le mode libre
ont des couplages très différents avec le parent**.

**Mode libre (manual-mode)** : utilise `useCapitaineValidation()` (currentResult, history,
historyIndex, rootResult, radarCard, validateKeyword, navigateHistory, reset) + `useStreaming()`
(`aiChunks`, `aiIsStreaming`, `aiError`, `aiStartStream`, `aiAbort`) + état local
(`isLocked`, `pendingUnlock`). Tout est encapsulable dans un sous-composant qui consomme
ces composables et expose une prop `mode` désactivante. **Le markup mode libre fait ~150 L
(lignes 1098-1244)**.

**Mode workflow (radar-list + side panel)** : utilise `useRadarCarousel()` + 3 watchers
de persistance (validations / roots / aiPanels), un système de cache IA streaming par mot-clé
(`carouselAiCache`, `carouselAiStreaming`, `carouselAiErrors`, `carouselAiAbortMap`),
lockedKeyword, selectedIndex, lockedIndex, modalUnlock, et un fetch SSE direct
(`launchAiStream`). **La logique pèse ~600 L de script ET le markup ne fait que ~80 L
(lignes 1019-1095)**. Tenter d'extraire toute cette logique dans un sous-composant
introduit un risque énorme (refactor logique non scope).

**Stratégie révisée pour CaptainValidation** :
- ✅ Extraire `CaptainManualMode.vue` (mode libre complet : composable + streaming + UI).
  Le parent l'instancie avec `<CaptainManualMode v-if="mode === 'libre'" ... />`.
  L'événement `check-completed`/`check-removed` est ré-émis par le sous-composant et
  re-émis par le parent (chaîne d'events). Gain : ~150 L markup + ~50 L de script
  spécifique au mode libre déménagent (composable `useCapitaineValidation` reste dans
  le sous-composant qui l'auto-consomme).
- ✅ Extraire `CaptainRadarList.vue` UI-only — **prend en props** la liste triée
  d'entrées + lockedKeyword + selectedIndex + articleLevel + articleId + painPoint, et
  émet `select`, `lock`, `unlock`, `word-toggle`, `recompute-relevance`. La logique
  watchers/streaming reste dans le parent. Gain : ~80 L markup + ~30 L (`SortToggleBar`,
  helpers UI) déménagent.
- La modale `UnlockLieutenantsModal` reste au parent (partagée entre les deux modes).

**Risque** : modéré sur `CaptainManualMode` (composable injecté + interaction avec
modale unlock), faible sur `CaptainRadarList` (UI pure).

### Finding 3 — BrainPhase : le bloc step-6 est extractible mais garde la logique drag

Lecture complète. `useArticleProposals()` est déjà extrait dans un composable. L'étape
6 utilise déjà 5+ sous-composants (`ArticleColumn`, `ProposedArticleRow`, `AddArticleMenu`,
`GenerationStepper`, `TopicSuggestions`). Ce qui reste dans BrainPhase étape 6 :
- ~180 L de markup d'orchestration (lignes 531-710)
- ~60 L de script local : drag-to-scroll (`onDragStart/Move/End`, `INTERACTIVE_SELECTOR`,
  `dragStartX`, `dragScrollLeft`, `articleSlide`, `columnsTrackRef`, `scrollToSlide`,
  `onColumnsScroll`).

**Découpage proposé** : `BrainArticleProposalView.vue` reçoit en props ce que
`useArticleProposals()` retourne (compositions, generationPhase, articleColumns, etc.) +
les props de contexte (`store.strategy?.proposedArticles`, etc.) et émet `validate`,
`regenerate-*`, `select-*`, etc. Le drag-to-scroll local et `scrollToSlide` déménagent
avec.

**Risque** : faible. Le composant a déjà été modularisé ; cette étape achève le travail.

### Finding 4 — Tests existants : hygiène hétérogène

| Fichier test | it() actifs | it.skip | Risque casse refactor |
|---|---|---|---|
| `captain-validation.test.ts` (1399 L) | 32 | 47 | Faible — les skip pointent l'ancien layout monolithique, déjà obsolète. |
| `keyword-discovery-tab.test.ts` (715 L) | 44 | 0 | Modéré — tous actifs, attention aux ancres DOM (sources sections, sidebar). |
| `brain-article-hierarchy.test.ts` (302 L) | actifs | 0 | Modéré — testIDs (`structural-warnings`) doivent survivre à l'extraction. |
| `brain-paa-cascade.test.ts` (373 L) | actifs | 0 | Faible — vise la logique du composable, pas le markup détaillé. |
| `brain-smart-add.test.ts` (524 L) | actifs | 0 | Modéré — interagit avec `AddArticleMenu`. |
| `production-phases.test.ts` (412 L) | actifs | 9 | Faible. |
| `dual-mode-props.test.ts` | actifs | 0 | Modéré — vérifie le contrat de props bimodal. |

**TestIDs critiques à préserver** (vivants dans les tests actifs, sortie de `grep`) :
`captain-empty`, `captain-error`, `captain-loading`, `captain-results`,
`radar-card-section`, `paa-list`, `thresholds-table`, `suggested-keywords`,
`history-carousel`, `radar-list-item-*`, `structural-warnings`. Aucun de ces testIDs
ne doit disparaître ou changer de position DOM relative à son ancêtre `captain-validation`,
`brain-phase`, `discovery-layout`.

### Finding 5 — Pas de cycle d'imports introduit

Les nouveaux sous-composants seront placés dans des sous-dossiers (`moteur/captain/`,
`moteur/discovery/`, `production/brain/`) pour éviter de bruiter le dossier parent.
Vérification du sens : seuls les parents importent les enfants. Aucun import enfant→parent.
`madge`/`dep-cruiser` doivent rester verts.

### Finding 6 — Pattern lieutenants-selection-architecture : généralisation directe

Le verrou `lieutenants-selection-architecture.test.ts` (232 L) est exactement le bon
gabarit. Les nouveaux tests architecturaux suivent **mot pour mot** sa structure :
- Imports + mocks (api.service, useStreaming, store, logger).
- `mountX()` helper avec stubs minimaux (templates `<div data-testid="...">`, props/emits
  déclarés exactement comme le sous-composant).
- `isDescendantOf(wrapper, ancestor, descendant)` helper.
- Au moins 3 ACs : "X est rendu", "X N'EST PAS descendant de la coque IA", "ancien bloc
  legacy a disparu" (si applicable).

## Implementation Plan

### Tasks

**Bloc 0 — Commit safety net AVANT toute modification** *(non négociable)*
- 0.1 Lancer `git status` et `git diff` pour photographier l'état initial.
- 0.2 Vérifier la branche : on est sur `main` (cf. gitStatus session). **Si la branche
  est `main` et que le repo a des modifs uncommitées (M), créer une branche de chantier
  dédiée** : `git checkout -b chore/refactor-monstres-vue-vague-1`.
  - **Important** : ne PAS commiter directement sur `main`. Le but du safety net est
    de pouvoir abandonner facilement le chantier sans polluer `main`.
- 0.3 Créer un commit qui encapsule l'état pré-refactor :
  ```bash
  git add -A
  git commit -m "chore(refactor): pre-refactor safety net (vague 1 monstres Vue)

  Snapshot avant le découpage structurel des composants Vue > 800L
  (CaptainValidation, KeywordDiscoveryTab, BrainPhase, LexiqueExtraction,
  DouleurIntentScanner, ArticleWorkflowView, ArticleEditorView).

  Ce commit sert de point de retour facile en cas de régression irréversible
  durant le refactor. Cf. tech-spec-decoupage-monstres-vue-vague-1.md AC9."
  ```
- 0.4 Pousser la branche : `git push -u origin chore/refactor-monstres-vue-vague-1`.
- 0.5 Confirmer auprès de l'utilisateur que le push est passé (afficher le SHA + le
  nom de la branche distante) avant de continuer.

**Bloc A — KeywordDiscoveryTab.vue** *(commencer ici, risque le plus bas)*
- A.1 Créer `src/components/moteur/discovery/DiscoveryWordGroupsSidebar.vue`
  - Props : `wordGroups`, `wordGroupsLoading`, `hasResults`, `activeGroupFilter`
  - Emit : `(e: 'group-click', word: string)`
  - Markup : `<aside class="discovery-sidebar">` (lignes 587-609 actuelles)
  - CSS scoped : `.discovery-sidebar`, `.sidebar-header`, `.sidebar-title`, `.group-list`,
    `.group-item`, `.sidebar-empty` (déménagement direct)
- A.2 Créer `src/components/moteur/discovery/DiscoveryAnalysisResults.vue`
  - Props : `analysisResult`, `isAllAnalysisSelected: () => boolean`,
    `isSelected: (kw: string) => boolean`, `isMultiSource: (kw: string) => boolean`,
    `sourceCountLabel: (kw: string) => string | null`
  - Emit : `(e: 'toggle-select', keyword: string)`, `(e: 'toggle-select-all')`
  - Markup : `<section v-if="analysisResult" class="analysis-results">` (lignes 522-571)
- A.3 Créer `src/components/moteur/discovery/DiscoverySourcesList.vue`
  - Props : `sections`, `relevanceFilterEnabled`, `filteredList`, `visibleItems`,
    `isCollapsed`, `isSectionExpanded`, `isSelected`, `isMultiSource`, `isRelevant`,
    `isAllSourceSelected`, `sourceCountLabel`, `formatVolume`, `hasDiscovered`,
    `VISIBLE_THRESHOLD`
  - Emits : `(e: 'toggle-collapsed', key: string)`, `(e: 'toggle-source', source: DiscoverySource)`,
    `(e: 'keyword-click', keyword: string)`, `(e: 'toggle-section-expanded', key: string)`
  - Markup : `<div class="discovery-sources">` (lignes 414-501)
- A.4 Mettre à jour `KeywordDiscoveryTab.vue` :
  - Remplacer les 3 blocs markup par `<DiscoverySourcesList ... />`,
    `<DiscoveryAnalysisResults ... />`, `<DiscoveryWordGroupsSidebar ... />`
  - Conserver state local `seedInput`, `hasDiscovered`, `collapsed`, `expandedSections`,
    `cacheCheckTimer`
  - **Wirer les events** : `@keyword-click="handleKeywordClick"`,
    `@group-click="handleGroupClick"`, etc.
  - Vérifier taille : cible **< 800 L** (de 1419 → ~600).
- A.5 Créer `tests/unit/components/discovery-tab-architecture.test.ts`
  - Pattern lieutenants-selection-architecture.test.ts.
  - 3 ACs minimaux :
    1. `DiscoverySourcesList` est rendu dans `discovery-main`, pas dans `discovery-sidebar`.
    2. `DiscoveryWordGroupsSidebar` N'EST PAS descendant de `discovery-main`.
    3. `DiscoveryAnalysisResults` est rendu sous `discovery-main`, sous `discovery-sources`.
  - Stubs minimaux : `<div data-testid="discovery-sources-list">`, etc.
- A.6 Lancer `npm run test:unit -- discovery-tab` + tests architecturaux. Tous verts.
- A.7 Lancer `npm run lint && npm run type-check`.

**Bloc B — CaptainValidation.vue** *(risque modéré, faire après A)*
- B.1 Créer `src/components/moteur/captain/CaptainManualMode.vue`
  - Props : `selectedArticle: SelectedArticle | null`, `keywordInput: string`,
    `isLocked: boolean`, `articleLevel: ArticleLevel`, `suggestedKeywords: string[]`,
    `articleId?: number | null`
  - Emits : `(e: 'update:keyword-input', value: string)`,
    `(e: 'lock-captaine')`, `(e: 'unlock-captaine')`,
    `(e: 'validated', keyword: string)`, `(e: 'send-to-lieutenants', payload)`,
    `(e: 'check-completed', name: string)`, `(e: 'check-removed', name: string)`
  - Le composable `useCapitaineValidation()` est consommé **dans le sous-composant**
    (instance unique, le parent ne l'utilise que pour le carousel).
  - Streaming `useStreaming()` consommé dans le sous-composant (state isolé du carousel).
  - Markup : `<div class="manual-mode">` (lignes 1098-1244 actuelles).
  - **À déplacer du parent vers le sous-composant** : `keywordInput` ref, `compositionWarnings`,
    `compositionAllPass`, `THRESHOLDS_TABLE`, `thresholdRows`, `thresholdCell`,
    `manualPaaQuestions`, `manualVerdictSummary`, `manualVerdictConfig`, `manualAiState`,
    `parsedMarkdown`, `aiChunks/aiIsStreaming/aiError/aiStartStream/aiAbort`,
    `handleManualAiRegenerate`, `getVerdictLabel`, `noGoFeedback`, `handleSuggestedClick`,
    `handleHistoryClick`, `chipVerdictColor`.
- B.2 Créer `src/components/moteur/captain/CaptainRadarList.vue` (UI-only)
  - Props : `entries: CarouselEntry[] (sortedEntries)`, `lockedKeyword: string | null`,
    `selectedIndex: number | null`, `lockedIndex: number`, `articleLevel: ArticleLevel`,
    `articleId: number | null`, `articlePainPoint: string | null`,
    `sortOptions`, `sortState`, `rawIndexOf: (entry) => number`
  - Emits : `(e: 'select', rawIdx: number)`, `(e: 'lock', rawIdx: number)`,
    `(e: 'unlock', rawIdx: number)`, `(e: 'word-toggle', payload: { rawIdx: number; indices: number[] })`,
    `(e: 'recompute-relevance', card)`, `(e: 'sort-change', state)`
  - Markup : `<div class="radar-list">` (lignes 1020-1077 actuelles).
- B.3 Mettre à jour `CaptainValidation.vue` :
  - Bloc workflow remplacé par `<CaptainRadarList :entries="sortedEntries" ... />`
    + le `<CaptainSidePanel>` reste là où il est.
  - Bloc libre remplacé par `<CaptainManualMode v-else ... />`.
  - **Conserver dans le parent** : tout le bloc carousel/streaming/lock-state, modale
    `UnlockLieutenantsModal`, `CaptainInput`.
  - Cible : passage de 1536 → ~800-900L. **Si > 800L, on lâche** (tolérance acceptée
    pour ne pas casser le couplage workflow). Acceptance Criterion révisé : **< 1100L**
    pour CaptainValidation, **< 800L** pour les deux autres.
- B.4 Créer `tests/unit/components/captain-validation-architecture.test.ts`
  - 4 ACs minimaux :
    1. En mode workflow, `CaptainRadarList` est rendu, `CaptainManualMode` ne l'est pas.
    2. En mode libre, `CaptainManualMode` est rendu, `CaptainRadarList` ne l'est pas.
    3. `CaptainRadarList` N'EST PAS descendant de `CaptainSidePanel` (anti-fusion).
    4. `radar-card-section` (mode libre legacy) reste dans `CaptainManualMode` —
       NE migre PAS dans le mode workflow.
- B.5 Lancer tests existants `captain-validation.test.ts` (32 actifs) → tous verts.
  Si un test casse, le **réorganiser** (extraction non assez fidèle), **pas patcher**
  le test.
- B.6 Lancer `npm run lint && npm run type-check`.

**Bloc C — BrainPhase.vue** *(risque le plus bas mais découverte tardive — faire en dernier)*
- C.1 Créer `src/components/production/brain/BrainArticleProposalView.vue`
  - Props : `articleColumns`, `groupedSpecArticles`, `compositionResults`, `articleWarnings`,
    `intermediateTitles`, `globalWarnings`, `truncationWarning`, `generationWarning`,
    `generationPhase`, `addingArticleType`, `topicsLoading`, `topicsError`,
    `proposedArticles`, `userContext`, `suggestedTopics`
  - Emits : tous les events que les sous-composants existants (`ProposedArticleRow`,
    `AddArticleMenu`, `TopicSuggestions`) émettent vers le parent : `regenerate-title`,
    `regenerate-keyword`, `regenerate-slug`, `select-keyword`, `select-title`,
    `select-slug`, `toggle-accept`, `remove-article`, `change-parent`, `edit-title`,
    `edit-keyword`, `edit-slug`, `add-empty`, `add-smart`, `add-guided`,
    `generate-articles`, `validate-articles`, `regenerate-topics`, `toggle-topic`,
    `remove-topic`, `add-topic`, `update-user-context`.
  - **À déplacer du parent vers le sous-composant** : `articleSlide`, `columnsTrackRef`,
    drag-to-scroll (`isDragging`, `dragStartX`, `dragScrollLeft`, `INTERACTIVE_SELECTOR`,
    `onDragStart`, `onDragMove`, `onDragEnd`, `scrollToSlide`, `onColumnsScroll`).
- C.2 Mettre à jour `BrainPhase.vue` :
  - Bloc step-6 (lignes 531-710) remplacé par
    `<BrainArticleProposalView v-else :article-columns="articleColumns" ... @generate-articles="generateArticleProposals" ... />`.
  - Cible : passage de 1066 → ~700L.
- C.3 Créer `tests/unit/components/brain-phase-architecture.test.ts`
  - 3 ACs minimaux :
    1. Step < 5 → `<StrategyStep>` rendu, `BrainArticleProposalView` ne l'est pas.
    2. Step === 5 → `BrainArticleProposalView` rendu, `<StrategyStep>` ne l'est pas.
    3. `BrainArticleProposalView` N'EST PAS descendant de `StrategyStep` (anti-fusion
       Sprint C-1 généralisée).
- C.4 Lancer tests existants brain (`brain-*.test.ts`, `production-phases.test.ts`).
  Tous verts.
- C.5 Lancer `npm run lint && npm run type-check`.

**Bloc D — LexiqueExtraction.vue** *(risque faible, structure CollapsableSection répétée)*
- D.1 Créer `src/components/moteur/lexique/LexiqueTermsList.vue`
  - Props : `title: string`, `terms: TfidfTerm[]`, `selectedTerms: Set<string>`,
    `isLocked: boolean`, `defaultOpen: boolean`,
    `isIaRecommended: (term: string) => boolean | null`,
    `getRecommendation: (term: string) => Recommendation | null`,
    `sortTermsByAlignment: (terms: TfidfTerm[]) => TfidfTerm[]`
  - Emit : `(e: 'toggle-term', term: string)`
  - Markup : un `<CollapsableSection>` avec la liste de termes (factorise les 3 sections
    Obligatoire/Différenciateur/Optionnel qui font ~45L chacune, soit ~135L à
    factoriser → réutilisé 3 fois = -90L net).
- D.2 Créer `src/components/moteur/lexique/LexiqueMultiKeywordPanel.vue`
  - Props : `selectedArticleId: number | null`, `customKeywordInput: string`,
    `pastExplorations: PastExploration[]`, `activeSourceKeyword: string | null`,
    `isLoading: boolean`, `isLocked: boolean`
  - Emits : `(e: 'update:custom-keyword', value: string)`,
    `(e: 'extract-custom')`,
    `(e: 'select-past', entry: PastExploration)`
  - Markup : `<div class="multi-keyword-section">` (lignes 458-488 actuelles).
- D.3 Mettre à jour `LexiqueExtraction.vue` :
  - Remplacer les 3 `<CollapsableSection>` Obligatoire/Différenciateur/Optionnel par
    `<LexiqueTermsList>` (×3 instances).
  - Remplacer le multi-keyword section par `<LexiqueMultiKeywordPanel>`.
  - Cible : 1058 → ~800 L.
- D.4 Créer `tests/unit/components/lexique-extraction-architecture.test.ts`
  - 3 ACs minimum :
    1. `LexiqueTermsList` est rendu 3 fois (Obligatoire/Différenciateur/Optionnel)
       sous `lexique-results`.
    2. `LexiqueMultiKeywordPanel` N'EST PAS descendant de `lexique-results`.
    3. `LexiqueAiPanel` reste descendant direct de `lexique-extraction`, pas absorbé.
- D.5 Lancer `npm run test:unit -- lexique` + lint + type-check. Tous verts.

**Bloc E — DouleurIntentScanner.vue** *(risque faible-modéré, structure phase-driven claire)*
- E.1 Investigation préalable : lire script + template (376L + 237L) pour confirmer le
  découpage par phase (Phase 1 inputs / Phase 2 keywords preview / Phase 3 results).
- E.2 Créer `src/components/intent/scanner/DouleurScannerInputs.vue`
  - Props : `mode: 'workflow' | 'libre'`, `inputs` (article topic / keyword / pain point),
    `cacheStatus`, `isLoading: boolean`
  - Emits : `(e: 'scan')`, `(e: 'load-cache')`, `(e: 'clear-cache')`,
    `(e: 'update:input', payload)`
  - Markup : Phase 1 (lignes 385-462) + cache indicator (lignes 429-460).
- E.3 Créer `src/components/intent/scanner/DouleurScannerResults.vue`
  - Props : `cards: RadarCard[]`, `globalScore: number | null`, `autocompleteGroups`,
    `longTailSection`, `isLocked: boolean`
  - Emits : `(e: 'select-cards', cards)`, `(e: 'lock')`, `(e: 'unlock')`
  - Markup : Phase 3 results (lignes 511-602).
- E.4 Mettre à jour `DouleurIntentScanner.vue` :
  - Remplacer les blocs phase 1 et phase 3 par les sous-composants.
  - **Conserver dans le parent** : Phase 2 (keywords tags editable, ~25L), bloc loading
    (~20L), bloc DiscoveryAiPanel (~20L). Tout le composable `useDouleurIntentScanner`
    reste au parent.
  - Cible : 1050 → ~750 L.
- E.5 Créer `tests/unit/components/douleur-scanner-architecture.test.ts`
  - 3 ACs minimum :
    1. `DouleurScannerInputs` est descendant direct de `intent-scanner`, NON descendant
       de `radar-cards`.
    2. `DouleurScannerResults` est rendu après `DouleurScannerInputs` dans l'ordre du
       DOM (assertion sur `:nth-child` ou ordre des descendants).
    3. En mode workflow, le bloc `scanner-inputs` est masqué (cf. Sprint 5 friction #7,
       commentaire ligne 378).
- E.6 Lancer `npm run test:unit -- intent-scanner` + tests existants intent + lint + type-check.

**Bloc F — ArticleWorkflowView.vue** *(risque modéré, vue router avec workflow stepper)*
- F.1 Investigation préalable : lire script + template (385L + 240L) pour identifier
  l'extraction la plus rentable. Hypothèse : le bloc multi-step de la vue (probablement
  les `<WorkflowStepN>` ou similaire ~150L) extractible en `ArticleWorkflowSteps.vue`.
- F.2 Créer `src/components/article-workflow/ArticleWorkflowSteps.vue`
  - Props/emits : à finaliser après F.1.
- F.3 Mettre à jour `ArticleWorkflowView.vue` : cible 970 → ~800 L.
- F.4 Créer `tests/unit/components/article-workflow-architecture.test.ts` (3 ACs).
- F.5 Lancer `npm run test:unit -- article-workflow` + lint + type-check.

> **NOTE** : Si l'investigation F.1 révèle que `ArticleWorkflowView.vue` n'a pas de
> bloc extractible "propre" (markup déjà très éclaté en sous-composants existants), le
> Bloc F est marqué **ABANDONNÉ** dans la rétro et la cible <800L pour ce fichier
> devient un objectif post-vague-1. Aucun refactor logique forcé.

**Bloc G — ArticleEditorView.vue** *(risque modéré, vue router éditeur TipTap)*
- G.1 Investigation préalable : lire script + template (339L + 277L). Hypothèse : la
  toolbar TipTap (~80-120L) extractible.
- G.2 Créer `src/components/article-editor/ArticleEditorToolbar.vue`
  - Props/emits : à finaliser après G.1.
- G.3 Mettre à jour `ArticleEditorView.vue` : cible 952 → ~800 L.
- G.4 Créer `tests/unit/components/article-editor-architecture.test.ts` (3 ACs).
- G.5 Lancer `npm run test:unit -- article-editor` + lint + type-check.

> **NOTE** : Même règle que Bloc F : si l'investigation G.1 révèle qu'il n'y a pas de
> bloc extractible propre, Bloc G est marqué **ABANDONNÉ** et la cible reste un
> objectif futur. Le scope est de **livrer ce qui est livrable proprement**, pas de
> forcer une extraction qui pollue l'architecture.

**Bloc I — MoteurView.vue (extraction script → composables)** *(risque modéré, refactor stratégique)*
- I.1 Investigation : relire le script (679L) en confirmant les 7 sections déjà
  commentées (`// --- Cannibalization`, `// --- Phase navigation`, `// --- Cross-tab
  state`, `// --- Soft gating`, `// --- Lieutenants props`, `// --- Tab cache entries`,
  `// --- TabLoadPrompt`).
- I.2 Créer `src/composables/moteur/useMoteurTabs.ts`
  - Encapsule : `activeTab`, `visitedTabs`, `TAB_IDS`, `TAB_LABELS`, `Tab` type,
    `nextTab`, `phases`, `isInGenererPhase`, `setActiveTab`, `navGroups`,
    `computeSmartTab`, le watcher de publication vers `useWorkflowNavStore`.
  - Reçoit en paramètre les dépendances (selectedArticle, isCaptaineLocked, etc.).
  - Retourne les refs/computeds publics consommés par le template.
- I.3 Créer `src/composables/moteur/useMoteurSoftGating.ts`
  - Encapsule : `isCaptaineLocked`, `isLieutenantsLocked`, `isLexiqueValidated`,
    `finalisationChecksInput`, `finalisationUnlocked`, `finalisationButtonTitle`,
    `isDiscoveryAllowed`.
- I.4 Créer `src/composables/moteur/useMoteurCrossTabState.ts`
  - Encapsule : `discoveryRadarKeywords`, `radarScanResult`, `radarCacheStatus`,
    `radarCardsForCaptain`, `captainRootKeywords`, `effectiveRootKeywords`,
    `selectedLieutenantsLocal`, `selectedLieutenantsForLexique`,
    `handleCardsSelected`, `handleRadarScanned`, `handleSendToRadar`,
    `handleKeywordsCleared`, `handleSendToLieutenants`,
    `handleLieutenantsUpdated`.
- I.5 Mettre à jour `MoteurView.vue` : remplacer ~400L de script par 3 appels de
  composables. Cible : 1087 → ~700 L.
- I.6 Créer `tests/unit/composables/moteur-composables.test.ts`
  - 6 ACs minimum, 2 par composable :
    - `useMoteurTabs` : AC.I.1 `nextTab` retourne le bon onglet selon `activeTab`,
      AC.I.2 `computeSmartTab(articleId)` choisit l'onglet pertinent selon les
      verrous Phase ②.
    - `useMoteurSoftGating` : AC.I.3 `finalisationUnlocked` est `true` ssi les 3
      checks Phase ② sont posés, AC.I.4 `isDiscoveryAllowed` reflète l'état
      `richCaptain`.
    - `useMoteurCrossTabState` : AC.I.5 `handleCardsSelected` met à jour
      `radarCardsForCaptain` ET `discoveryRadarKeywords`, AC.I.6
      `effectiveRootKeywords` fusionne `captainRootKeywords` et le store article.
- I.7 Créer `tests/unit/components/moteur-view-architecture.test.ts`
  - 3 ACs : (1) le breadcrumb est rendu en haut, (2) la cache-bar sticky n'est rendue
    que si un article est sélectionné, (3) chaque tab-content (`v-show`) est
    rendu/masqué selon `activeTab`.
- I.8 Lancer tests : `npm run test:unit -- moteur-view`, lint, type-check.

**Bloc J — LieutenantsSelection.vue (extraction script + 1 sous-composant template)** *(risque modéré, verrou C-1 respecté par construction)*
- J.1 Investigation : relire le composant (1025L). Le template (159L) est déjà composé
  de sous-composants ; on extrait un seul layout-bloc + on attaque le script (733L).
- J.2 Créer `src/components/moteur/lieutenants/LieutenantsResultsLayout.vue`
  - Markup : `<div v-if="serpResult || isLocked || lieutenantCards.length > 0"
    class="serp-results">` (lignes 786-889 actuelles), qui contient
    `LieutenantProposals` + `LieutenantH2Structure` + 2 `CollapsableSection` (PAA
    + word groups) + lock/unlock buttons + `LieutenantsAiPanel`.
  - **Invariant FR19** : dans ce nouveau composant, `LieutenantProposals` et
    `LieutenantH2Structure` restent au **premier niveau** du markup, **pas** wrappés
    dans `LieutenantsAiPanel`. Le test verrou C-1 doit rester vert au mot près.
- J.3 Créer `src/composables/moteur/useLieutenantsSerp.ts`
  - Encapsule : `sliderValue`, `isLoading`, `error`, `serpResult`,
    `serpResultsByKeyword`, `serpDoneCount`, `serpTotalCount`, `serpPendingKeywords`,
    `serpCurrentKeyword`, `activeSerpTab`, `analyzeSERP`, `refreshSERP`,
    `displayedCompetitors`, `activeSerpTabResult`, `canAnalyze`.
- J.4 Créer `src/composables/moteur/useLieutenantsIa.ts`
  - Encapsule : streaming IA (`useStreaming`-based), `iaIsStreaming`, `iaChunks`,
    `iaError`, `lieutenantCards`, `eliminatedCards`, `selectedCards`,
    `totalGenerated`, `currentStep`, `proposeLieutenants`, `toggleLieutenant`,
    `contentGapInsights`, `handleAssistAdd`.
- J.5 Créer `src/composables/moteur/useLieutenantsHn.ts`
  - Encapsule : `hnStructure`, `activeHnRecurrence`, `hnRecurrence`, `activeHnTab`,
    `hnSaved`, `isSavingHn`, `saveHnStructure`, conversion outline.
- J.6 Mettre à jour `LieutenantsSelection.vue` :
  - Template : remplacer le bloc `serp-results` par `<LieutenantsResultsLayout ...>`.
  - Script : remplacer ~600L par 3 appels de composables + glue (lock/unlock,
    `hasEverAnalyzed`, persistance store).
  - Cible : 1025 → ~600 L.
- J.7 Lancer **immédiatement** `tests/unit/components/lieutenants-selection-architecture.test.ts`.
  Si rouge → l'extraction a violé un invariant FR19 → réorganiser, **pas patcher
  le test**.
- J.8 Lancer tests : `npm run test:unit -- lieutenants` (`lieutenants-*.test.ts`),
  lint, type-check.

**Bloc K — ProposedArticleRow.vue (factorisation 3 sliders + actions)** *(risque modéré, factorisation lourde)*
- K.1 Investigation : confirmer que les 3 blocs slider (titre lignes 116-171,
  keyword 287-325, slug 327-364) suivent **exactement** le même pattern (label +
  edit input/badge + nav arrows + counter). Sinon paramétriser via slot.
- K.2 Créer `src/components/strategy/proposed/ProposedArticleSlider.vue`
  - Props : `label: string`, `kind: 'title' | 'keyword' | 'slug'`,
    `currentValue: string`, `currentIndex: number`, `total: number`,
    `editing: boolean`, `editValue: string`, `colorClass?: string`,
    `disabled?: boolean`.
  - Emits : `(e: 'start-edit')`, `(e: 'commit', value: string)`,
    `(e: 'cancel-edit')`, `(e: 'prev')`, `(e: 'next')`,
    `(e: 'update:edit-value', value: string)`.
  - Markup : pattern label-with-edit + input/badge + slider-nav (~30L réutilisable
    × 3 = -60L net dans le parent).
- K.3 Créer `src/components/strategy/proposed/ProposedArticleHeader.vue`
  - Props : `title: string`, `expanded: boolean`, `editingTitle: boolean`,
    `editValue: string`, `titles: string[]`, `currentTitleIndex: number`,
    `compositionResult`, `structuralWarnings`, `tooltipVisible`, `hasAnyIssue`,
    `totalWarningCount`, `accepted: boolean`.
  - Emits : événements titre (start-edit, commit-edit) + tooltip + actions header
    collapsed.
- K.4 Créer `src/components/strategy/proposed/ProposedArticleActions.vue`
  - Props : `expanded: boolean`, `accepted: boolean`, `actionsMenuOpen: boolean`,
    `parentMenuOpen: boolean`, `availableParents: string[] | undefined`.
  - Emits : `regenerate-*`, `toggle-accept`, `remove`, `change-parent`,
    `toggle-actions-menu`, `toggle-parent-menu`.
- K.5 Mettre à jour `ProposedArticleRow.vue` :
  - Template : 3 instances de `<ProposedArticleSlider>` (titre / keyword / slug) +
    `<ProposedArticleHeader>` + `<ProposedArticleActions>`.
  - Cible : 977 → ~700 L (gain principal sur la factorisation slider).
- K.6 Créer `tests/unit/components/proposed-article-row-architecture.test.ts`
  - 4 ACs : (1) `ProposedArticleSlider` est rendu 3 fois pour les 3 sliders, (2)
    chaque instance a la bonne prop `kind`, (3) le badge composition reste descendant
    direct de `proposal-header`, (4) actions menu et parent menu coexistent sans
    chevauchement.
- K.7 Lancer tests : `npm run test:unit -- brain` + tests architecturaux. Tous verts.

**Bloc L — RadarKeywordCard.vue (extraction score ring + PAA tree)** *(risque modéré, composant central multi-contextes)*
- L.1 Investigation : relire le composant. Le template (170L) a 2 zones extractibles
  évidentes : le score ring + tooltip (lignes 376-421, ~46L) et le PAA tree
  (lignes 425-479, ~55L).
- L.2 Créer `src/components/intent/radar-card/RadarCardScoreRing.vue`
  - Props : `displayedScore: number | null`, `scoreColor: string`,
    `scoreLabel: string`, `breakdownRows: BreakdownRow[]`, `hasScore: boolean`,
    `relevanceMissingReason: 'no-pain' | 'no-signals' | 'long-tail' | null`,
    `CIRCLE_RADIUS: number`, `CIRCLE_CIRCUMFERENCE: number`, `scoreDashoffset: number`.
  - Emit : aucun (composant purement présentationnel).
  - Markup : SVG score ring + tooltip avec 4 messages contextuels (FR21).
- L.3 Créer `src/components/intent/radar-card/RadarCardPaaTree.vue`
  - Props : `paaTree: PaaNode[]`, `expandedParents: Set<number>`,
    `expandedPaa: Set<number>`, `cachedPaa: boolean`,
    `itemBorderClass: (paa) => string`, `badgeClass: (paa) => string`,
    `matchLabel: (paa) => string`.
  - Emits : `(e: 'toggle-children', index: number)`, `(e: 'toggle-answer', index: number)`.
  - Markup : PAA tree récursif (FR22).
- L.4 Mettre à jour `RadarKeywordCard.vue` :
  - Template : remplacer score ring par `<RadarCardScoreRing ...>`, PAA tree par
    `<RadarCardPaaTree ...>`.
  - Cible : 900 → ~750 L.
- L.5 Créer `tests/unit/components/radar-keyword-card-architecture.test.ts`
  - 4 ACs : (1) `RadarCardScoreRing` est descendant direct de `radar-card__header`,
    (2) `RadarCardPaaTree` est descendant de `radar-card__body` (visible seulement
    si `expanded`), (3) le tooltip reste accessible au hover du score ring sans
    `@click.stop` qui propage au parent, (4) pour `displayedScore === null`,
    chaque `relevanceMissingReason` rend le bon message contextuel.
- L.6 Lancer tests : `RadarKeywordCard` est consommé par CaptainValidation,
  DouleurIntentScanner, KeywordDiscoveryTab → lancer `npm run test:unit` complet
  (pas d'option `-- xxx`) pour balayer tous les consommateurs.

**Bloc H — Validation globale**
- H.1 `npm run check:health` exécuté ; aucune nouvelle erreur ESLint/knip/madge/dep-cruiser
  vs baseline pré-refactor.
- H.2 `npm run test:unit` : tous verts (8 fichiers tests existants S2 + 11 nouveaux
  tests architecturaux + 1 test composables Moteur).
- H.3 `npm run test:browser` : tous verts.
- H.4 Tailles vérifiées :
  - `KeywordDiscoveryTab.vue` < 800 L
  - `CaptainValidation.vue` < 1100 L (tolérance, voir B.3)
  - `BrainPhase.vue` < 800 L
  - `LexiqueExtraction.vue` < 800 L
  - `DouleurIntentScanner.vue` < 800 L
  - `ArticleWorkflowView.vue` < 800 L (ou ABANDONNÉ documenté)
  - `ArticleEditorView.vue` < 800 L (ou ABANDONNÉ documenté)
  - `MoteurView.vue` < 800 L
  - `LieutenantsSelection.vue` < 800 L
  - `ProposedArticleRow.vue` < 800 L
  - `RadarKeywordCard.vue` < 800 L
- H.5 MAJ `_bmad-output/implementation-artifacts/sprint-status.yaml` (entrée Epic 17 ou
  intégration au backlog suivi).
- H.6 Auto-critique §5 du `CLAUDE.md` (grille générale + grille données partagées NON
  applicable car refactor structurel pur).
- H.7 Vérifier que **tous les tests architecturaux ajoutés ont un commentaire de tête
  qui pointe une FR du PRD** (Principe 3). Si un test n'est rattaché à aucune FR,
  soit la FR manque dans la spec, soit le test est arbitraire — corriger l'un ou
  l'autre avant le PR.

### Acceptance Criteria

**AC1 — API publique inchangée**
- Given un consumer (`MoteurView.vue`, `LaboView.vue`, `CerveauView.vue`),
- When il importe et instancie `CaptainValidation`, `KeywordDiscoveryTab` ou `BrainPhase`,
- Then les props acceptées et events émis sont **strictement identiques** au pré-refactor
  (vérifié par `dual-mode-props.test.ts` qui doit rester vert sans modification).

**AC2 — Tests S2 caractérisation préservés**
- Given les tests `captain-validation.test.ts`, `keyword-discovery-tab.test.ts`,
  `brain-*.test.ts`, `production-phases.test.ts`, `dual-mode-props.test.ts`,
- When `npm run test:unit` est exécuté,
- Then tous les `it()` actifs passent, **sans modification** de leur code.

**AC3 — Verrous architecturaux ajoutés**
- Given 3 nouveaux fichiers (`discovery-tab-architecture.test.ts`,
  `captain-validation-architecture.test.ts`, `brain-phase-architecture.test.ts`),
- When `npm run test:unit -- architecture` est exécuté,
- Then chacun contient au moins 3 ACs vérifiant la position DOM des nouveaux
  sous-composants (anti-absorption Sprint C-1).

**AC4 — Tailles cibles**
- Given les 3 fichiers parents,
- When `wc -l src/components/moteur/CaptainValidation.vue
  src/components/moteur/KeywordDiscoveryTab.vue src/components/production/BrainPhase.vue`
  est exécuté,
- Then `KeywordDiscoveryTab.vue < 800`, `BrainPhase.vue < 800`,
  `CaptainValidation.vue < 1100`.

**AC5 — Hygiène statique verte**
- Given le repo après refactor,
- When `npm run lint && npm run type-check && npm run check:dead && npm run check:cycles
  && npm run check:arch` est exécuté,
- Then tous passent. Pas de nouveau cycle d'import. Pas de nouveau fichier mort détecté
  par knip.

**AC6 — Aucun testID vivant disparu**
- Given la liste de testIDs vivants identifiée en Finding 4 (`captain-empty`,
  `captain-error`, `captain-loading`, `captain-results`, `radar-card-section`,
  `paa-list`, `thresholds-table`, `suggested-keywords`, `history-carousel`,
  `radar-list-item-*`, `structural-warnings`),
- When un sous-composant est extrait,
- Then chacun de ces testIDs reste présent dans le DOM rendu et garde sa relation
  ancestor → descendant attendue par les tests existants.

**AC7 — Comportement fonctionnel UX préservé** *(no-regression UX, exigence ajoutée)*
- Given chaque comportement listé en **Exigences fonctionnelles (FR1-FR12)** ci-dessous,
- When l'utilisateur exécute le scénario manuel correspondant en navigateur (`npm run dev`),
- Then le comportement est strictement identique au pré-refactor : même état rendu, même
  flux de clics, même persistance, même message d'erreur, même délai perçu.

**AC8 — Performance et latence inchangées**
- Given un article avec 30+ mots-clés validés (carousel CaptainValidation) ou 200+
  mots-clés découverts (KeywordDiscoveryTab),
- When la page est chargée,
- Then : (a) le `LCP` perçu reste équivalent ; (b) aucun re-render inutile (vérifier
  qu'un sous-composant ne re-render pas sur des changements de props non liés —
  utiliser `console.count` en debug si besoin pendant la dev) ; (c) pas de nouvelle
  requête réseau introduite par le refactor.

**AC9 — Commit safety net avant développement**
- Given l'état actuel du repo (branche `main`, working tree avec modifications M sur
  ~14 fichiers + dossiers untracked `docs/data-flows/`, `shared/types/branded.ts`,
  `tests/unit/coherence/`, `.data-flow-discipline.json`),
- When le dev agent démarre l'implémentation (avant toute modification de fichier),
- Then un commit "safety net" est créé sur la branche courante encapsulant l'état
  pré-refactor, ET il est poussé vers `origin` afin de garantir un point de retour
  facile (`git revert` ou `git reset --hard ORIG_HEAD`) en cas de régression
  irréversible. Le message de commit doit clairement mentionner "pre-refactor
  safety net".

**AC10 — Tolérance d'abandon partiel sur blocs F/G**
- Given que les blocs F (`ArticleWorkflowView`) et G (`ArticleEditorView`) reposent
  sur une investigation tardive (F.1, G.1),
- When l'investigation révèle qu'aucun bloc extractible "propre" n'existe (markup déjà
  éclaté, ou couplage trop fort sans refactor logique),
- Then le bloc concerné est marqué **ABANDONNÉ** dans le commentaire du PR avec
  justification écrite ; le fichier reste à sa taille actuelle ; et la cible <800L
  pour ce fichier est reportée à une vague 2 ultérieure. Cet abandon ne bloque PAS
  la livraison des autres blocs.

## Exigences fonctionnelles (no-regression UX)

> **Pourquoi cette section** : ce chantier est un refactor structurel pur. Sa **valeur
> métier = zéro nouvelle feature, mais zéro régression UX**. Cette section explicite
> les comportements UX critiques qui DOIVENT survivre intacts. Chaque FR a un scénario
> de test manuel reproductible (cf. Manual UX Checklist).

### FR1 — CaptainValidation mode workflow : sélection radar
**Comportement** : Cliquer sur un item de la radar-list le sélectionne (classe
`radar-list-item--selected`) ET met à jour le contenu du `CaptainSidePanel` (verdict
résumé, AI panel, root variants). Touches Enter/Space déclenchent la même action.

### FR2 — CaptainValidation mode workflow : verrouillage Capitaine
**Comportement** : Cliquer "Verrouiller" sur un item GO (a) verrouille immédiatement,
(b) ré-émet `check-completed: 'capitaine_locked'` au parent (`MoteurView`), (c) persiste
en DB via `articleKeywordsStore.lockCaptain()`. Si un autre mot-clé était déjà verrouillé,
c'est un transfert (`check-removed` puis `check-completed`).

### FR3 — CaptainValidation mode workflow : modale unlock-with-lieutenants
**Comportement** : Si l'utilisateur déverrouille le Capitaine alors que des lieutenants
sont verrouillés, la modale `UnlockLieutenantsModal` apparaît avec 3 choix
(Garder / Archiver / Annuler). Sans lieutenants verrouillés, déverrouillage direct.
Cette modale doit rester accessible **depuis les deux modes** (workflow et libre).

### FR4 — CaptainValidation mode libre : historique de validations
**Comportement** : Le `history-carousel` (chips d'historique) reste visible quand
`history.length > 1`. Cliquer sur un chip restaure le résultat affiché et le
keyword input. Le verdict color du chip suit `VERDICT_COLORS[verdict.level]`.

### FR5 — CaptainValidation mode libre : streaming AI Panel
**Comportement** : Quand un nouveau résultat de validation arrive (`currentResult`
change), le panel IA est ré-streamé automatiquement (via `useStreaming` + endpoint
`/api/keywords/.../ai-panel`). Le bouton "Régénérer" relance manuellement le stream
avec confirmation.

### FR6 — KeywordDiscoveryTab : sélection multi-source
**Comportement** : Un mot-clé apparu dans plusieurs sources (alphabet + IA + DataForSEO)
montre le badge `multi-badge` (×N). Le filtre par groupe de mots fonctionne sur toutes
les sources. La case "Tout" par section sélectionne uniquement les items filtrés.

### FR7 — KeywordDiscoveryTab : pré-validation Capitaine 5s
**Comportement** : Cliquer un mot-clé planifie sa pré-validation au Capitaine via
`captainTrigger.schedule(...)` avec un toast Gmail-style affichant un compte à rebours
de 5 secondes. Re-cliquer le mot-clé OU cliquer "Annuler" dans le toast annule la
planification. Le toast est rendu globalement (store), pas dans le sous-composant.

### FR8 — KeywordDiscoveryTab : cache DB-first et indicateur
**Comportement** : Au changement de seedInput (debounced 400ms), un check du cache
DB (`keyword_discoveries`, TTL 30j) est effectué. Si cache hit, l'indicateur cache
s'affiche avec date + nombre de mots-clés + flag analyse IA. Bouton "Charger" hydrate
les sources sans appel API. Bouton "Rafraîchir" purge le cache et reset le state.

### FR9 — KeywordDiscoveryTab : analyse IA finale
**Comportement** : Une fois le scoring de pertinence terminé, le bouton "Analyser les N
résultats pertinents" déclenche un appel IA qui retourne un Top-20-30 priorisé. Cette
liste s'affiche dans `analysis-results` avec priorité (high/medium/low) et raisonnement.
La case "Tout sélectionner" coche/décoche tous les items. Le résultat est re-sauvé en
cache.

### FR10 — KeywordDiscoveryTab : envoi au Radar
**Comportement** : La `discovery-bar` sticky en bas apparaît dès qu'un mot-clé est
sélectionné (`selectedCount > 0`). Cliquer "Envoyer au Radar →" émet `send-to-radar`
avec le payload `RadarKeyword[]` formaté.

### FR11 — BrainPhase étape 6 : drag-to-scroll des colonnes
**Comportement** : Les 3 colonnes (Pilier / Intermédiaire / Spécialisé) sont
horizontales, scrollables via : (a) flèches < / > qui appellent `scrollToSlide()`,
(b) drag à la souris sur la zone vide entre cards (le drag ignore les éléments
interactifs : `INTERACTIVE_SELECTOR`), (c) scroll natif. L'indicateur `articleSlide`
suit la position courante.

### FR12 — BrainPhase étape 6 : ajout d'article guidé/smart/empty
**Comportement** : Le bouton `AddArticleMenu` propose 3 actions (Empty / Smart /
Guided). Pendant un ajout, les autres `AddArticleMenu` sont disabled
(`addingArticleType !== null`). Les warnings structurels (pas de Pilier, hiérarchie
cassée) s'affichent dans `structural-warnings`.

### FR13 — LexiqueExtraction : extraction TF-IDF + IA upfront
**Comportement** : Cliquer "Extraire le Lexique" déclenche : (a) TF-IDF qui retourne
3 buckets (Obligatoire 70%+, Différenciateur 30-70%, Optionnel <30%), (b) IA upfront
en parallèle qui propose des termes recommandés/optionnels avec un raisonnement.
Les badges "IA recommandé" / "IA optionnel" apparaissent par terme.

### FR14 — LexiqueExtraction : sélection multi-niveau et compteur
**Comportement** : Cocher des termes met à jour le compteur de la `SortToggleBar` :
"N termes sélectionnés (XO / YD / ZOp)" — compteur multi-niveau Obligatoire/
Différenciateur/Optionnel. Le tri par alignement douleur réordonne les termes dans
chaque bucket.

### FR15 — LexiqueExtraction : exploration multi-keyword
**Comportement** : L'utilisateur peut taper un autre mot-clé (`customKeywordInput`)
et lancer une exploration. Les explorations passées s'affichent en chips cliquables
qui restaurent le `tfidfResult` correspondant. Le chip actif a la classe
`past-chip--active`.

### FR16 — LexiqueExtraction : verrouillage / déverrouillage Lexique
**Comportement** : Cliquer "Valider le Lexique" verrouille la sélection courante,
émet `check-completed: 'lexique_validated'` au parent (`MoteurView`), et persiste
en DB. Cliquer "Déverrouiller" annule.

### FR17 — DouleurIntentScanner : phase 1 (inputs + cache hit)
**Comportement** : L'utilisateur saisit un topic + keyword + pain point, clique "Lancer
le scan". Si un cache hit est détecté (debounced), un indicateur cache propose
"Charger" / "Rafraîchir" avant tout appel API. En mode workflow, certains champs
sont auto-remplis depuis l'article sélectionné et le bloc inputs est masqué (cf.
Sprint 5 friction #7).

### FR18 — DouleurIntentScanner : phase 3 (cards + autocomplete + long-tail)
**Comportement** : Une fois le scan terminé, les `RadarKeywordCard` s'affichent avec
checkboxes, un thermomètre global de score, une section "Autocomplete" collapsable
par défaut, et une section "Longue-traîne" séparée sous le container principal.
Cocher des cards → bouton "Envoyer la sélection" actif → émission `cards-selected`.

### FR19 — LieutenantsSelection : frontière containers principaux / panel IA
**Comportement** *(remplace le verrou C-1 implicite par une exigence nommée)* :
Les containers principaux Lieutenants — `LieutenantProposals` (cards lieutenants
verrouillés et éliminés) et `LieutenantH2Structure` (structure Hn validée) —
affichent les **données de l'utilisateur**. Ils ne doivent jamais être visuellement
ou hiérarchiquement absorbés par la coque "Suggestions IA" (`LieutenantsAiPanel`),
qui est dédiée aux **propositions générées par l'IA**. La séparation visuelle est
un contrat UX : l'utilisateur sait, à tout moment, si une donnée est la sienne ou
une suggestion à valider. Toute fusion future doit être traitée comme une
régression bloquante, peu importe son origine (refactor structurel, ajout de feature,
restyling).

### FR20 — LieutenantsSelection : analyse SERP multi-mot-clé + IA streamée
**Comportement** : Cliquer "Analyser la SERP" lance une analyse Google par mot-clé
(slider 5-20 résultats), affichée avec progression `serpDoneCount / serpTotalCount`
et un onglet par mot-clé (`activeSerpTab`). Une fois la SERP terminée pour un
mot-clé, la proposition IA des lieutenants commence à streamer (chunks accumulés).
L'utilisateur peut cocher/décocher les lieutenants proposés. Le verrouillage final
émet `check-completed: 'moteur:lieutenants_locked'`.

### FR21 — RadarKeywordCard : score ring avec tooltip explicatif
**Comportement** : Le score Pertinence affiché dans le ring (0-100 avec couleur)
est accompagné d'un tooltip au hover qui détaille les composantes du score
(breakdown lignes labellisées). Si la valeur est `null` (cas "no-pain", "no-signals"
ou "long-tail"), le ring affiche "—" et le tooltip donne **une raison contextualisée**
(différenciée selon `relevanceMissingReason`). Pas de fallback silencieux sur
combinedScore (cf. CLAUDE §3.5).

### FR22 — RadarKeywordCard : PAA tree récursif parent → children
**Comportement** : La section PAA dépliable affiche les questions Google en
arborescence : chaque parent peut avoir des enfants. Cliquer sur le chevron parent
déplie/replie ses enfants. Cliquer sur la question affiche/cache la réponse en
ligne. Les badges de match (semantic / exact / partial / off) sont colorés selon
leur type. Le pourcentage `semanticScore` est affiché s'il est défini.

### FR23 — MoteurView : navigation 6 onglets avec gating souple
**Comportement** : Les 6 onglets (Discovery, Radar, Capitaine, Lieutenants, Lexique,
Finalisation) sont accessibles via `activeTab`. La règle de gating souple :
- Discovery + Radar verrouillés si des mots-clés sont déjà validés pour l'article
  (Phase ① consommée).
- Lieutenants + Lexique nécessitent un Capitaine verrouillé (sinon `soft-gate-message`).
- Finalisation nécessite les 3 verrous Phase ② (Capitaine + Lieutenants + Lexique).
- L'onglet courant est calculé par `computeSmartTab(articleId)` au changement
  d'article (sélection automatique du prochain onglet pertinent).

### FR24 — MoteurView : cache panel sticky et TabLoadPrompt
**Comportement** : Quand un article est sélectionné, une `cache-bar` sticky en bas
affiche `TabCachePanel` (vue d'ensemble des caches `keyword_metrics` + `api_cache`
par onglet) côte à côte avec `TabLoadPrompt` (notification "Charger DB / Cache"
contextualisée à l'onglet courant). Le bouton "Vider le cache" purge `api_cache`
sans toucher aux explorations DB.

### FR25 — ProposedArticleRow : sliders titre / mot-clé / slug
**Comportement** : Quand l'article a plusieurs suggestions (`suggestedTitles`,
`suggestedKeywords`, `suggestedSlugs`), des flèches < / > permettent de naviguer.
Le compteur affiche `currentIndex / total`. Chaque champ peut être édité
inline (clic sur l'icône edit → input → blur valide → emit `edit-*`).

### FR26 — ProposedArticleRow : composition badge + tooltip
**Comportement** : Un badge en haut de chaque card indique le statut de composition
(✓ vert si `compositionResult.allPass` et pas de `structuralWarnings`, ⚠ orange
sinon avec compteur `totalWarningCount`). Hover sur le badge → tooltip affichant
les règles de composition (chaque rule passé/échoué) + les structural warnings.

### FR27 — ProposedArticleRow : actions kebab (collapsed) et bottom (expanded)
**Comportement** : En mode collapsed, le kebab menu propose : Régénérer titre /
mot-clé / slug + Rattacher à un intermédiaire (si `availableParents`). En mode
expanded, ces actions sont sur une rangée d'icônes en bas de la card. Toggle
accept (✓) et delete (×) sont accessibles dans les deux modes.

## Pre-mortem (échecs anticipés)

### Risque 1 — Tests S2 cassent à cause de la profondeur DOM
**Symptôme** : `wrapper.find('[data-testid="captain-results"]').exists()` retourne
toujours `true` mais une assertion sur un descendant échoue.
**Cause probable** : extraction trop agressive — un testID descendant a migré dans un
sous-composant stub qui ne le rend pas.
**Mitigation** : avant chaque PR, lancer le test impacté isolément (`npm run test:unit
-- captain-validation`) et lire le DOM rendu (`console.log(wrapper.html())`). Réorganiser
l'extraction si nécessaire ; **ne pas patcher le test**.

### Risque 2 — Régression de timing sur le streaming AI (mode libre)
**Symptôme** : Le bouton "Régénérer" du panel IA en mode libre ne stream plus, ou
stream deux fois.
**Cause probable** : double instance de `useStreaming()` (parent + sous-composant) ;
ou un watcher d'auto-stream du parent reste actif après extraction.
**Mitigation** : `useStreaming()` est appelé **uniquement** dans `CaptainManualMode`,
JAMAIS dans le parent en mode libre. Le watcher `currentResult → aiStartStream` doit
déménager avec.

### Risque 3 — Modale UnlockLieutenants ne s'affiche plus dans le mode workflow
**Symptôme** : Cliquer "Déverrouiller" sur un item du carousel n'ouvre plus la modale
si des lieutenants sont verrouillés.
**Cause probable** : `requestUnlock('carousel')` dépend de `lockedLieutenantCount` qui
lit le store. Si `CaptainRadarList` émet un event `unlock` mais que le parent ne l'a
pas câblé à `requestUnlock`, la modale ne s'ouvre pas.
**Mitigation** : test architectural AC explicite (`captain-validation-architecture.test.ts`) :
"L'event `unlock` du `CaptainRadarList` déclenche `pendingUnlock = 'carousel'` dans le
parent". Couplé à un test fonctionnel existant qui vérifie le rendu de la modale.

### Risque 4 — Cycles d'imports introduits par les sous-dossiers
**Symptôme** : `npm run check:cycles` (madge) ou `npm run check:arch` (dep-cruiser) signale
un cycle.
**Cause probable** : un sous-composant importe un type ou une constante depuis le parent.
**Mitigation** : tous les types partagés vivent dans `shared/types/` ; les constantes
workflow dans `shared/constants/`. Aucun import enfant→parent autorisé.

### Risque 5 — Drag-to-scroll BrainPhase casse à cause d'event handlers manquants
**Symptôme** : Le drag ne fonctionne plus sur les colonnes article.
**Cause probable** : `columnsTrackRef` n'est plus valide (le ref est dans le parent mais
le DOM est dans le sous-composant) ; ou `onDragStart` est appelé mais `el.style.scrollBehavior`
ne s'applique plus.
**Mitigation** : déménager `columnsTrackRef` + tous les handlers drag dans
`BrainArticleProposalView`. Le parent ne doit pas garder de ref vers le DOM step-6.

### Risque 6 — Performance dégradée par re-render en cascade
**Symptôme** : taper dans le keyword input fait re-render toute la radar-list.
**Cause probable** : props non mémoïsées passées à `CaptainRadarList`. Vue 3 fait du
re-render granulaire mais une fonction inline `:rawIndexOf="(e) => ..."` recrée la prop
à chaque render parent.
**Mitigation** : passer `rawIndexOf` comme `computed`-stable ou via un Map indexé. Vérifier
en dev avec `console.count('CaptainRadarList render')` avant/après.

### Risque 7 — Élargissement du périmètre = explosion du temps d'exécution
**Symptôme** : passer de 3 à 7 fichiers parents pourrait tripler le risque de régression
silencieuse, surtout sur LexiqueExtraction (interaction avec basket store + IA streaming
upfront) et DouleurIntentScanner (composable lourd avec scan progressif).
**Cause probable** : tentation d'extraire trop vite ; manque d'investigation préalable
par bloc.
**Mitigation** : (a) ordre strict A → B → C → D → E → F → G avec gate "3 niveaux verts"
entre chaque ; (b) blocs F et G ont une **étape d'investigation explicite** (F.1, G.1)
avec autorisation d'**abandon documenté** si l'extraction n'est pas propre (cf. AC10) ;
(c) commit safety net AVANT tout dev (cf. AC9), point de retour à coût zéro ;
(d) un commit intermédiaire après chaque bloc vert (pas un seul commit géant à la fin).

### Risque 8 — Régression silencieuse non couverte par les tests
**Symptôme** : tous les tests verts mais un comportement UX casse en navigateur (ex:
une transition CSS qui ne se déclenche plus parce que la classe a migré dans un sous-
composant).
**Cause probable** : les tests unitaires testent la logique et la position DOM, pas
le rendu visuel ni les transitions.
**Mitigation** : la **Manual UX Checklist** (Niveau 3 du Testing Strategy) est
**obligatoire** avant le push final. Pas de "ça doit marcher". On lance `npm run dev`,
on déroule la checklist, on coche.

## Additional Context

### Dependencies

Aucune nouvelle dépendance npm. Refactor pur sur la base existante.

### Testing Strategy (3 niveaux)

#### Niveau 1 — Tests architecturaux (3 nouveaux fichiers, 9-12 ACs total)

**Fichier** : `tests/unit/components/{discovery-tab,captain-validation,brain-phase}-architecture.test.ts`

**Pattern** : copie exacte de `lieutenants-selection-architecture.test.ts` (232 L, sprint 1).
Imports + mocks + `mountX()` helper avec stubs minimaux + `isDescendantOf()` helper.

**Couverture par fichier** :
- `discovery-tab-architecture.test.ts` (3 ACs minimum) :
  1. `DiscoverySourcesList` est descendant de `discovery-main`, PAS de `discovery-sidebar`.
  2. `DiscoveryWordGroupsSidebar` est descendant de `discovery-sidebar`, PAS de
     `discovery-main`.
  3. `DiscoveryAnalysisResults` est rendu sous `discovery-main` et N'EST PAS descendant
     d'une coque IA ou d'un panel séparé.
- `captain-validation-architecture.test.ts` (4 ACs minimum) :
  1. mode='workflow' → `CaptainRadarList` rendu, `CaptainManualMode` absent.
  2. mode='libre' → `CaptainManualMode` rendu, `CaptainRadarList` absent.
  3. `CaptainRadarList` N'EST PAS descendant de `CaptainSidePanel` (anti-fusion).
  4. `radar-card-section` (mode libre) est descendant de `CaptainManualMode`,
     PAS de `CaptainRadarList` (anti-pollution).
- `brain-phase-architecture.test.ts` (3 ACs minimum) :
  1. `currentStep < 5` → `<StrategyStep>` rendu, `BrainArticleProposalView` absent.
  2. `currentStep === 5` → `BrainArticleProposalView` rendu, `<StrategyStep>` absent.
  3. `BrainArticleProposalView` N'EST PAS descendant de `<StrategyStep>`
     (anti-fusion généralisée Sprint C-1).

#### Niveau 2 — Tests fonctionnels existants (S2 caractérisation, 6 fichiers)

**Liste exhaustive à garder verte** :
- `tests/unit/components/captain-validation.test.ts` (32 actifs)
- `tests/unit/components/keyword-discovery-tab.test.ts` (44 actifs)
- `tests/unit/components/brain-article-hierarchy.test.ts`
- `tests/unit/components/brain-paa-cascade.test.ts`
- `tests/unit/components/brain-smart-add.test.ts`
- `tests/unit/components/production-phases.test.ts`
- `tests/unit/components/dual-mode-props.test.ts`
- `tests/unit/components/lieutenants-selection-architecture.test.ts` *(verrou existant
  qui doit rester vert — ce chantier ne touche pas LieutenantsSelection mais on veut
  s'assurer qu'aucun test n'a été cassé en chaîne par un import/path Vue mal résolu)*

**Discipline** : aucun test existant n'est modifié. Si un test casse, c'est l'extraction
qui est mal faite. **Réparer l'extraction**, pas le test. Si un test devait être modifié
parce qu'une assertion porte sur un detail d'implémentation pré-refactor (ex: profondeur
DOM trop spécifique), c'est un signe que l'extraction n'a pas préservé la structure
attendue par l'utilisateur — donc il faut **ré-aligner l'extraction**, pas l'assertion.

#### Niveau 3 — Tests UI / UX manuels (Manual UX Checklist)

> Une fois les tests automatiques verts, lancer `npm run dev` et exécuter cette checklist
> en navigateur sur Chrome + Firefox (cohérent avec la cible projet : consultant solo,
> pas de support legacy IE).

**Checklist Cerveau (BrainPhase)** :
- [ ] Naviguer Cerveau → étape 6 → générer 10+ articles via "Générer avec Claude".
- [ ] Vérifier que les 3 colonnes (Pilier/Intermédiaire/Spécialisé) sont scrollables :
  - [ ] Cliquer flèches < / > → la colonne suivante s'aligne (smooth-scroll).
  - [ ] Drag à la souris dans une zone vide entre cards → scroll horizontal fluide.
  - [ ] Drag sur un bouton/lien → ne scrolle PAS (interactive selector OK).
- [ ] Cliquer "+ Ajouter un Pilier" → `AddArticleMenu` propose 3 actions ; pendant l'ajout,
  les autres "+" sont disabled.
- [ ] Cocher "Tout valider" → tous les articles passent en `accepted`.
- [ ] Vérifier qu'un article spécialisé orphelin apparaît dans "Non rattachés".
- [ ] Vérifier qu'aucun warning console (no-regression silencieuse).

**Checklist Moteur — onglet Découverte (KeywordDiscoveryTab)** :
- [ ] Saisir un seed mot-clé, cliquer "Découvrir" → les 6 sources s'affichent.
- [ ] Vérifier le badge "×N" sur un mot-clé multi-source.
- [ ] Cliquer un mot-clé → toast 5s "Pré-validation Capitaine" ; re-cliquer → annule.
- [ ] Activer/désactiver le filtre de pertinence → le compteur change.
- [ ] Lancer le seed avec un cache hit → indicateur cache visible avec date.
  - [ ] Cliquer "Charger" → sources hydratées sans appel réseau (vérifier DevTools Network).
  - [ ] Cliquer "Rafraîchir" → cache purgé, état reset.
- [ ] Cliquer "Analyser les N résultats" → `analysis-results` s'affiche avec priorité.
- [ ] Cocher 5 mots-clés → la `discovery-bar` sticky apparaît, cliquer "Envoyer au Radar →"
  émet le payload (vérifier en console / Network).
- [ ] Sidebar "Groupes de mots" → cliquer un groupe filtre l'affichage ; recliquer = reset.
- [ ] Test bimodal : depuis Labo, vérifier qu'aucun side effect du mode workflow
  (toast captain-trigger) ne se déclenche en mode libre.

**Checklist Moteur — onglet Capitaine (CaptainValidation)** :
- [ ] Mode workflow : sélectionner un article du radar dans MoteurView, ouvrir l'onglet
  Capitaine.
  - [ ] La radar-list affiche les entries triées par défaut sur "Score Pertinence".
  - [ ] Cliquer un item → sélectionné (`radar-list-item--selected`) ; le `CaptainSidePanel`
    se met à jour (verdict résumé + AI panel).
  - [ ] Touche Tab + Enter sur un item → même effet (a11y).
  - [ ] Verrouiller l'item GO → check `moteur:capitaine_locked` apparaît dans la sidebar
    workflow.
  - [ ] Avec des lieutenants verrouillés, cliquer "Déverrouiller" → modale 3 choix
    (Garder / Archiver / Annuler) ; cliquer "Garder" → unlock sans toucher les lieutenants.
  - [ ] Bouton "Régénérer IA" dans la sidepanel → re-stream visible (chunks affichés).
  - [ ] Switch entre 2 articles → la radar-list reset, pas de leak du précédent
    (ex: lockedKeyword reste null sur le nouveau).
  - [ ] Reload F5 → la radar-list est restaurée depuis la DB (pas seulement 1 stub entry).
- [ ] Mode libre : depuis Labo, taper un mot-clé, cliquer "Valider".
  - [ ] Verdict s'affiche, panel IA stream automatiquement.
  - [ ] History-carousel chips affichent les 5+ dernières validations, couleurs verdict
    correctes.
  - [ ] Bouton "Verrouiller" disabled si verdict ≠ GO.
  - [ ] Suggested keywords cliquables → re-validation en place.
  - [ ] PAA list affiche les questions associées.

**Checklist Moteur — onglet Lexique (LexiqueExtraction)** :
- [ ] Avec un Capitaine verrouillé + des Lieutenants sélectionnés, ouvrir l'onglet
  Lexique → header affiche le badge Capitaine + chips Lieutenants + level.
- [ ] Cliquer "Extraire le Lexique" → loading puis 3 sections affichées (Obligatoire
  / Différenciateur / Optionnel) avec compteurs.
- [ ] Vérifier que les badges "IA recommandé" / "IA optionnel" apparaissent par terme
  une fois l'analyse IA upfront terminée.
- [ ] Cocher 5+ termes → la barre de tri compteur affiche "5 termes sélectionnés (XO/YD/ZOp)".
- [ ] Tester le tri par alignement douleur → l'ordre dans chaque bucket change.
- [ ] Saisir un mot-clé custom → cliquer "Extraire" → nouvelle ligne dans
  "Explorations enregistrées" avec date.
- [ ] Cliquer une past-chip → restauration du tfidfResult correspondant.
- [ ] Cliquer "Valider le Lexique" → check workflow émis, badge "Lexique verrouillé"
  apparaît.
- [ ] Cliquer "Déverrouiller" → retour à l'état éditable.

**Checklist Moteur — onglet Radar (DouleurIntentScanner)** :
- [ ] Mode libre (Labo) : saisir topic + keyword + pain point → "Lancer le scan".
  - [ ] Loading visible avec progress bar.
  - [ ] Phase 3 results : cards radar avec checkboxes, thermomètre global, sections
    autocomplete (collapsée) et long-tail.
- [ ] Mode workflow (Moteur) : depuis MoteurView → onglet Radar → vérifier que les
  inputs sont masqués (Sprint 5 friction #7) et les cards s'affichent automatiquement.
- [ ] Avec un cache hit, vérifier l'indicateur cache + boutons Charger/Rafraîchir.
- [ ] Cocher 3 cards → bouton "Envoyer la sélection" actif → cliquer → `cards-selected`
  émis.
- [ ] Vérifier que le DiscoveryAiPanel bas-de-page reste fonctionnel post-refactor.

**Checklist a11y et perf** :
- [ ] DevTools Lighthouse "Accessibility" ≥ score pré-refactor.
- [ ] DevTools Performance : load complet d'un article avec 30+ keywords < pré-refactor
  + 50 ms.
- [ ] Aucun warning Vue console (`[Vue warn]`).
- [ ] Aucune erreur console JS au cours des scénarios.

#### Discipline d'exécution

L'ordre **strict** par bloc (A → B → C) est une discipline TDD : chaque bloc valide
ses 3 niveaux de tests AVANT de passer au suivant. Si un bloc échoue, on ne propage
pas l'erreur ; on isole, on corrige, on revalide.

```
Bloc 0 (Safety net)        →  git push branche dédiée OK         →  Bloc A
Bloc A (Discovery tab)     →  Niveau 1+2+3 OK  →  commit          →  Bloc B
Bloc B (Captain valid.)    →  Niveau 1+2+3 OK  →  commit          →  Bloc C
Bloc C (Brain phase)       →  Niveau 1+2+3 OK  →  commit          →  Bloc D
Bloc D (Lexique)           →  Niveau 1+2+3 OK  →  commit          →  Bloc E
Bloc E (Douleur scanner)   →  Niveau 1+2+3 OK  →  commit          →  Bloc K
Bloc K (Proposed art. row) →  Niveau 1+2+3 OK  →  commit          →  Bloc L
Bloc L (Radar keyword card)→  Niveau 1+2+3 OK  →  commit          →  Bloc J
Bloc J (Lieutenants)       →  verrou C-1 vert  →  N1+N2+N3 OK     →  Bloc I
Bloc I (Moteur view)       →  Niveau 1+2+3 OK  →  commit          →  Bloc F
Bloc F (Workflow view)     →  invest. F.1 OK ? livrer ou abandonn.→  Bloc G
Bloc G (Editor view)       →  invest. G.1 OK ? livrer ou abandonn.→  Bloc H
Bloc H                     →  check:health + test:browser + AC10  →  PR
```

**Justification de l'ordre révisé** :
- A → E : composants à découpage template direct, risque croissant.
- K → L : factorisations CSS-heavy (sliders, score ring) — bénéficient de la
  pratique acquise en A-E.
- J : LieutenantsSelection juste APRÈS L parce que J réutilise l'expérience
  acquise sur les invariants DOM (verrou C-1 ≈ FR19) — on a internalisé la
  discipline avant de toucher au composant le plus surveillé.
- I : MoteurView en avant-dernier parce que le refactor en composables touche
  beaucoup de zones du composant (gating, tabs, cross-tab state) et il est
  préférable d'arriver avec tous les sous-composants enfants déjà refactorés.
- F → G : vues router en queue, parce que ce sont les blocs avec autorisation
  d'abandon documenté (cf. AC10).

**Règle d'arrêt anticipé** : si un bloc échoue (test rouge, régression UX détectée
en checklist Niveau 3, ou invariant FR violé), on **n'avance pas au bloc suivant**.
On revient au safety net si nécessaire (`git reset --hard origin/chore/refactor-monstres-vue-vague-1`
jusqu'au dernier commit vert). Ne jamais propager une erreur sur les blocs suivants.

### Notes

- **Ordre de livraison** : KeywordDiscoveryTab → CaptainValidation → BrainPhase
  (du moins risqué au plus risqué — CaptainValidation a un couplage carousel/manual-mode
  à manipuler avec soin).
- **Verrou Sprint C-1 généralisé** : c'est l'apport principal de ce chantier au-delà
  du gain en lisibilité. Chaque future modif d'un de ces 3 composants devra justifier
  son impact sur la position DOM via les tests architecturaux.
- **Date de référence** : 2026-05-04. Sprint C-1 = commit 890b285 (2026-05-02).
- **Valeur métier réaffirmée** : ce chantier produit **0 nouvelle feature**. Sa valeur
  est entièrement dans (a) la maintenabilité, (b) la garantie de no-regression UX,
  (c) le verrouillage anti-fusion future. Toute extraction qui sacrifie un comportement
  UX pour gagner des lignes est un échec.
