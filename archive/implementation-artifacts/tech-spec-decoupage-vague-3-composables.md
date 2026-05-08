---
title: 'Vague 3 — Composables + refactor logique scopé (MoteurView + LieutenantsSelection)'
slug: 'decoupage-vague-3-composables'
created: '2026-05-04'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
parent_roadmap: 'roadmap-decoupage-monstres-vue.md'
prerequisite: 'tech-spec-decoupage-vague-1-templates.md ET tech-spec-decoupage-vague-2-factorisation.md (toutes deux livrées et stables)'
tech_stack:
  - 'Vue 3.5.29 (composition API)'
  - 'TypeScript 5.9.3'
  - 'Vitest 4.0.18 + @vue/test-utils'
  - 'Pinia 3.0.4'
files_to_modify:
  - 'src/views/MoteurView.vue (1087L → cible <800L)'
  - 'src/components/moteur/LieutenantsSelection.vue (1025L → cible <800L)'
files_to_create:
  - 'src/composables/moteur/useMoteurTabs.ts'
  - 'src/composables/moteur/useMoteurSoftGating.ts'
  - 'src/composables/moteur/useMoteurCrossTabState.ts'
  - 'src/composables/moteur/useLieutenantsSerp.ts'
  - 'src/composables/moteur/useLieutenantsIa.ts'
  - 'src/composables/moteur/useLieutenantsHn.ts'
  - 'src/components/moteur/lieutenants/LieutenantsResultsLayout.vue'
  - 'tests/unit/composables/useMoteurTabs.test.ts'
  - 'tests/unit/composables/useMoteurSoftGating.test.ts'
  - 'tests/unit/composables/useMoteurCrossTabState.test.ts'
  - 'tests/unit/composables/useLieutenantsSerp.test.ts'
  - 'tests/unit/composables/useLieutenantsIa.test.ts'
  - 'tests/unit/composables/useLieutenantsHn.test.ts'
  - 'tests/unit/components/lieutenants-results-layout-architecture.test.ts'
prd_modifications:
  - 'PRD §8.7 : ajout FR-LIE-AI-FRONTIER (formalise verrou C-1)'
---

# Tech-Spec Vague 3 — Composables + refactor logique scopé

**Created:** 2026-05-04
**Roadmap parent:** [roadmap-decoupage-monstres-vue.md](roadmap-decoupage-monstres-vue.md)
**Pré-requis :** Vagues 1 et 2 livrées et stables.

## Définition de la Vague 3

**Caractéristique unique** : c'est un **refactor logique scopé**. On déplace
de la logique (refs, computeds, watchers, fonctions) du `<script setup>` d'un
composant Vue vers des **composables TypeScript** isolés. C'est la nature
même du chantier — on assume cette réalité, on ne la cache pas derrière
"refactor structurel pur".

*Adresse Finding #2 (contradiction "structurel pur" vs composables)* : la
Vague 1 était structurel pur ; la Vague 3 est explicitement un refactor
logique. Les deux sont légitimes, mais ils ont des risques différents et
exigent des grilles de tests différentes.

## Différences clés vs Vagues 1 et 2

| Aspect | Vague 1 | Vague 2 | Vague 3 |
|---|---|---|---|
| Nature | Structurel pur | Factorisation CSS | Refactor logique |
| Code déplacé | Markup | Markup + CSS | Logique TS |
| Tests à ajouter | Architectural DOM | Architectural + visuel | Composable isolé + architectural |
| Risque principal | Régression DOM | Régression visuelle | Régression comportementale |
| Investigation | Légère | Légère | Lourde (Step 2 indispensable) |

## Périmètre

| Bloc | Fichier | Lignes | Cible | Risque |
|---|---|---|---|---|
| I | `MoteurView.vue` | 1087 | <800 | Élevé |
| J | `LieutenantsSelection.vue` | 1025 | <800 | Élevé (FR-LIE-AI-FRONTIER) |

**6 composables TypeScript + 1 sous-composant Vue + 7 tests** au total.

## Hors périmètre Vague 3

- **Refactor de stores Pinia** : interdit. Les composables consomment les
  stores existants ; ils ne créent pas de nouveau store et ne fusionnent pas
  les stores existants.
- **Modification de l'API publique** des 2 composants parents : interdit.
  Les props/emits/slots restent identiques.
- **Promotion d'un composable en composable transverse** (utilisé par autre
  chose que MoteurView ou LieutenantsSelection) : décision séparée, hors-scope.

## Pourquoi Vague 3 en dernier

**Adresse Finding #7** : MoteurView consomme 5 composants enfants déjà
refactorés en Vague 1 (CaptainValidation, KeywordDiscoveryTab,
DouleurIntentScanner, LexiqueExtraction, BrainPhase) et 1 enfant
Vague 2 indirect (RadarKeywordCard). LieutenantsSelection consomme
LieutenantSerpAnalysis, LieutenantProposals, LieutenantH2Structure,
LieutenantsAiPanel — non touchés par Vagues 1 et 2 mais leur stabilité
dépend du verrou Sprint C-1.

Refactorer ces 2 orchestrateurs en dernier garantit que toutes les briques
enfants sont stables au moment où on touche aux orchestrateurs.

## Pourquoi un sous-composant Vue dans Bloc J

Bien que la Vague 3 soit principalement composables, le Bloc J extrait aussi
**un sous-composant Vue** : `LieutenantsResultsLayout.vue`. C'est cohérent
avec le périmètre parce que :
- Le bloc `<div v-if="serpResult || isLocked || lieutenantCards.length > 0"
  class="serp-results">` (lignes 786-889) est un **groupement logique** qui
  inclut `LieutenantProposals` + `LieutenantH2Structure` + 2 CollapsableSection
  + lock buttons + LieutenantsAiPanel.
- L'isoler dans un sous-composant rend **visible** l'invariant
  FR-LIE-AI-FRONTIER : un seul fichier où la frontière containers principaux
  ↔ panel IA est physiquement testable.

C'est un mélange de techniques, mais **assumé et justifié**. Le critère
n'est pas "vague pure" mais "découpage qui sert la maintenabilité".

## Tasks

### Bloc 0 — Safety net Git

- 0.1 Vérifier Vagues 1 et 2 mergées sur `main`, tests verts depuis 24h
  minimum.
- 0.2 `git checkout main && git pull`.
- 0.3 Créer la branche : `git checkout -b chore/decoupage-vague-3-composables`.
- 0.4 Commit pré-refactor :
  ```bash
  git commit --allow-empty -m "chore(refactor): pre-refactor safety net — vague 3 composables

  Snapshot avant l'extraction de 6 composables et 1 sous-composant
  layout sur MoteurView et LieutenantsSelection.
  Cf. tech-spec-decoupage-vague-3-composables.md."
  ```
- 0.5 Push : `git push -u origin chore/decoupage-vague-3-composables`.
  Si échec auth, idem Vagues précédentes : tag local + alerte.

### Bloc PRD — FR-LIE-AI-FRONTIER

**Première étape de la Vague 3, AVANT toute modification de code.**

*Adresse Finding #9 (atomicité PRD)*.

- PRD.1 Ouvrir `_bmad-output/planning-artifacts/prd.md` §8.7 (FR-LIE).
- PRD.2 Vérifier que `FR-LIE-AI-FRONTIER` y est. Si non, l'ajouter :
  > **FR-LIE-AI-FRONTIER** — Frontière sémantique données utilisateur ↔
  > suggestions IA. Les containers principaux Lieutenants
  > (`LieutenantProposals`, `LieutenantH2Structure`) affichent les données
  > de l'utilisateur et ne doivent jamais être visuellement ou
  > hiérarchiquement absorbés par la coque "Suggestions IA"
  > (`LieutenantsAiPanel`). Toute fusion future est une régression bloquante.
  > Test verrou : `tests/unit/components/lieutenants-selection-architecture.test.ts`.
  > Source : `src/components/moteur/LieutenantsSelection.vue:735-890`.
- PRD.3 Bumper `lastUpdated` du PRD à la date courante.
- PRD.4 Compléter `updateReason` avec mention du delta Vague 3.
- PRD.5 Commit dédié : `docs(prd): formalize FR-LIE-AI-FRONTIER for vague 3`.
  Cet ajout vit dans la **même branche** que la Vague 3 — atomicité garantie
  au merge.

### Bloc I — MoteurView.vue *(extraction script → 3 composables)*

- I.1 **Investigation préalable approfondie** *(Step 2 indispensable)* :
  - Lire le `<script setup>` (679L) en confirmant les 7 sections déjà
    commentées : Cannibalization / Phase navigation / Cross-tab state /
    Soft gating / Lieutenants props / Tab cache entries / TabLoadPrompt /
    Data loading.
  - Cartographier les **dépendances entre sections** : ex,
    `useMoteurTabs.computeSmartTab()` lit `useMoteurSoftGating.isCaptaineLocked`.
    Documenter le graphe.
  - Identifier les state qui restent au composant parent (ex: `selectedArticle`
    parce qu'il est central et utilisé par tous) vs ceux qui partent dans
    chaque composable.
  - **Sortie** : un mini-diagramme texte dans le PR du Bloc I, qui montre
    qui dépend de quoi.
- I.2 Créer `src/composables/moteur/useMoteurTabs.ts`
  ```typescript
  export function useMoteurTabs(deps: {
    selectedArticle: Ref<SelectedArticle | null>
    isCaptaineLocked: Ref<boolean>
    isLieutenantsLocked: Ref<boolean>
    isLexiqueValidated: Ref<boolean>
    isDiscoveryAllowed: Ref<boolean>
    workflowNavStore: ReturnType<typeof useWorkflowNavStore>
  }) {
    // Encapsule : activeTab, visitedTabs, TAB_IDS, TAB_LABELS, Tab type,
    // nextTab, phases, isInGenererPhase, setActiveTab, navGroups,
    // computeSmartTab, watcher de publication vers workflowNavStore.
    return { activeTab, visitedTabs, nextTab, phases, isInGenererPhase,
             setActiveTab, computeSmartTab, /* ... */ }
  }
  ```
- I.3 Créer `src/composables/moteur/useMoteurSoftGating.ts`
  ```typescript
  export function useMoteurSoftGating(deps: {
    selectedArticle: Ref<SelectedArticle | null>
    articleKeywordsStore: ReturnType<typeof useArticleKeywordsStore>
    articleProgressStore: ReturnType<typeof useArticleProgressStore>
  }) {
    // Encapsule : isCaptaineLocked, isLieutenantsLocked, isLexiqueValidated,
    // finalisationChecksInput, finalisationUnlocked, finalisationButtonTitle,
    // isDiscoveryAllowed.
    return { isCaptaineLocked, isLieutenantsLocked, isLexiqueValidated,
             finalisationUnlocked, finalisationButtonTitle, isDiscoveryAllowed }
  }
  ```
- I.4 Créer `src/composables/moteur/useMoteurCrossTabState.ts`
  ```typescript
  export function useMoteurCrossTabState(deps: {
    selectedArticle: Ref<SelectedArticle | null>
    articleKeywordsStore: ReturnType<typeof useArticleKeywordsStore>
  }) {
    // Encapsule : discoveryRadarKeywords, radarScanResult, radarCacheStatus,
    // radarCardsForCaptain, captainRootKeywords, effectiveRootKeywords,
    // selectedLieutenantsLocal, selectedLieutenantsForLexique,
    // handleCardsSelected, handleRadarScanned, handleSendToRadar,
    // handleKeywordsCleared, handleSendToLieutenants, handleLieutenantsUpdated.
    return { /* refs + handlers */ }
  }
  ```
- I.5 Mettre à jour `MoteurView.vue` :
  - Remplacer ~400L de script par 3 appels de composables.
  - Le composable `useMoteurSoftGating` est appelé **en premier** (ses refs
    sont dépendances de `useMoteurTabs`).
  - Les autres state restent au parent : `selectedArticle`, `cocoonId`,
    `cocoonName`, `breadcrumbItems`, `clearExternalCacheForArticle`.
  - Cible : 1087 → ~700L.
- I.6 Tests composables isolés *(adresse Finding #18 perf non mesurable —
  ici on a des tests automatisés vrais)* :
  - `useMoteurTabs.test.ts` :
    - AC.I.1 `nextTab` retourne le bon onglet selon `activeTab` et les flags
      de gating.
    - AC.I.2 `computeSmartTab(articleId)` choisit l'onglet pertinent (le plus
      avancé non bloqué).
    - AC.I.3 Le watcher publie bien dans `workflowNavStore`.
  - `useMoteurSoftGating.test.ts` :
    - AC.I.4 `finalisationUnlocked` est `true` ssi les 3 checks Phase ②
      sont posés.
    - AC.I.5 `isDiscoveryAllowed` reflète l'état `richCaptain` du store.
    - AC.I.6 `finalisationButtonTitle` énumère les checks manquants.
  - `useMoteurCrossTabState.test.ts` :
    - AC.I.7 `handleCardsSelected` met à jour `radarCardsForCaptain` ET
      `discoveryRadarKeywords`.
    - AC.I.8 `effectiveRootKeywords` fusionne `captainRootKeywords` et le
      store.
    - AC.I.9 `handleSendToLieutenants` propage le payload sans perte.
- I.7 Lancer tests composables + tests existants
  (`captain-validation.test.ts`, `keyword-discovery-tab.test.ts`, `dual-mode-props.test.ts`).
  Tous verts.
- I.8 Lint + type-check + check:cycles + check:arch.
- I.9 Manual UX Checklist Bloc I (toute la navigation Moteur 6 onglets).
- I.10 Commit : `chore(refactor): extract MoteurView logic into 3 composables`.

### Bloc J — LieutenantsSelection.vue *(extraction script + 1 sous-composant template)*

- J.1 **Investigation préalable approfondie** :
  - Lire le composant complet (1025L) : 159L template + 733L script + 132L
    style.
  - Confirmer que les 5 invariants du verrou Sprint C-1 sont **bien
    compris** :
    1. `LieutenantProposals` n'est PAS descendant de
       `[data-testid="ai-panel-suggestion"]`.
    2. `LieutenantH2Structure` n'est PAS descendant de
       `[data-testid="ai-panel-suggestion"]`.
    3. `LieutenantProposals` est rendu au moins une fois.
    4. Le bloc `.lieutenants-header` legacy n'existe pas.
    5. Le badge "level article" reste affiché quelque part.
  - Cartographier les sections script : SERP State / SERP analyze / IA
    streaming / Lieutenants cards / HN structure / Content gap / Lock state
    / Persistence watchers.
- J.2 Créer `src/components/moteur/lieutenants/LieutenantsResultsLayout.vue`
  - Markup : `<div v-if="serpResult || isLocked || lieutenantCards.length > 0"
    class="serp-results">` (lignes 786-889 actuelles), incluant
    `LieutenantProposals` + `LieutenantH2Structure` + 2 `CollapsableSection`
    (PAA + word groups) + lock/unlock buttons + `LieutenantsAiPanel`.
  - Props : tous les bindings actuellement passés aux 4 sous-composants
    enfants.
  - Emits : tous les events actuellement remontés au parent.
  - **Invariant FR-LIE-AI-FRONTIER** : `LieutenantProposals` et
    `LieutenantH2Structure` sont **descendants directs** du div
    `.serp-results`, **pas** de `LieutenantsAiPanel`. Ordre du markup respecté.
- J.3 Créer `src/composables/moteur/useLieutenantsSerp.ts`
  - Encapsule : `sliderValue`, `isLoading`, `error`, `serpResult`,
    `serpResultsByKeyword`, `serpDoneCount`, `serpTotalCount`,
    `serpPendingKeywords`, `serpCurrentKeyword`, `activeSerpTab`,
    `analyzeSERP`, `refreshSERP`, `displayedCompetitors`,
    `activeSerpTabResult`, `canAnalyze`.
- J.4 Créer `src/composables/moteur/useLieutenantsIa.ts`
  - Encapsule : streaming IA via `useStreaming`, `iaIsStreaming`, `iaChunks`,
    `iaError`, `lieutenantCards`, `eliminatedCards`, `selectedCards`,
    `totalGenerated`, `currentStep`, `proposeLieutenants`, `toggleLieutenant`,
    `contentGapInsights`, `handleAssistAdd`.
- J.5 Créer `src/composables/moteur/useLieutenantsHn.ts`
  - Encapsule : `hnStructure`, `activeHnRecurrence`, `hnRecurrence`,
    `activeHnTab`, `hnSaved`, `isSavingHn`, `saveHnStructure`, conversion
    outline.
- J.6 Mettre à jour `LieutenantsSelection.vue` :
  - Template : remplacer le bloc `serp-results` par
    `<LieutenantsResultsLayout ... />`.
  - Script : remplacer ~600L par 3 appels de composables + glue
    (lock/unlock workflow, `hasEverAnalyzed`, persistance store).
  - Cible : 1025 → ~600L.
- J.7 **Lancer immédiatement** `tests/unit/components/lieutenants-selection-architecture.test.ts`
  (verrou Sprint C-1).
  - **Si rouge** → l'extraction a violé un invariant FR-LIE-AI-FRONTIER →
    réorganiser la structure de `LieutenantsResultsLayout`, **pas** patcher
    le test. Si on découvre que le test est arbitraire (cas d'exception
    AC2), justification écrite.
- J.8 Tests composables isolés :
  - `useLieutenantsSerp.test.ts` :
    - AC.J.1 `analyzeSERP` met à jour `serpDoneCount`/`serpTotalCount`
      progressivement.
    - AC.J.2 `refreshSERP` purge le cache et relance.
    - AC.J.3 `displayedCompetitors` est dérivé de `serpResultsByKeyword[activeSerpTab]`.
  - `useLieutenantsIa.test.ts` :
    - AC.J.4 `proposeLieutenants` lance le streaming et accumule `iaChunks`.
    - AC.J.5 `toggleLieutenant` met à jour `selectedCards` (Set).
    - AC.J.6 `contentGapInsights` est mis à jour quand l'IA termine.
  - `useLieutenantsHn.test.ts` :
    - AC.J.7 `saveHnStructure` persiste via API et flag `hnSaved=true`.
    - AC.J.8 `activeHnRecurrence` dérive de `hnStructure`.
- J.9 Test architectural sous-composant :
  - `lieutenants-results-layout-architecture.test.ts` :
    - Commentaire de tête : référence FR-LIE-AI-FRONTIER (PRD §8.7).
    - AC.J.9 `LieutenantProposals` est descendant direct de
      `LieutenantsResultsLayout`, PAS de `LieutenantsAiPanel`.
    - AC.J.10 `LieutenantH2Structure` est descendant direct de
      `LieutenantsResultsLayout`, PAS de `LieutenantsAiPanel`.
    - AC.J.11 Ces tests **doublent** le verrou Sprint C-1 mais à un niveau
      plus fin (sous-composant isolé).
- J.10 Lancer tests : `npm run test:unit -- lieutenants` + le verrou C-1.
  Tous verts.
- J.11 Lint + type-check + check:cycles + check:arch.
- J.12 Manual UX Checklist Bloc J (workflow Lieutenants complet).
- J.13 Commit : `chore(refactor): extract LieutenantsSelection logic into composables + layout sub-component`.

### Bloc Final — Validation Vague 3 + PR

- Z.1 `npm run check:health` : vert.
- Z.2 `npm run test:unit` : tous verts (incluant les 6 composables tests + 1
  architectural).
- Z.3 `npm run test:browser` : vert.
- Z.4 Vérifier les 2 cibles de lignes :
  - `MoteurView.vue` < 800L
  - `LieutenantsSelection.vue` < 800L
- Z.5 Vérifier que `tests/unit/components/lieutenants-selection-architecture.test.ts`
  (verrou Sprint C-1) reste **vert sans modification**. Si modification, justifier dans le PR.
- Z.6 Vérifier que `FR-LIE-AI-FRONTIER` est bien dans le PRD (commit Bloc PRD).
- Z.7 Manual UX Checklist Niveau 3 complète.
- Z.8 Vérifier `CaptainValidation.vue` : depuis la Vague 1, sa cible était
  <1350L. **Cette vague 3 ne touche PAS CaptainValidation**. Sa taille reste
  inchangée. Documenter cet état (cible <800L pour CaptainValidation reste
  un objectif Vague 4 ou ultérieur).
- Z.9 MAJ `sprint-status.yaml`.
- Z.10 PR :
  - Titre : `chore(refactor): vague 3 — composables MoteurView + LieutenantsSelection`
  - Body : référence roadmap, liste des 6 composables + 1 sous-composant,
    cite FR-LIE-AI-FRONTIER (PRD §8.7), AC review.

## Acceptance Criteria

**AC1 — API publique inchangée**
- Given un consumer (router pour MoteurView, MoteurView pour
  LieutenantsSelection),
- When il importe et instancie l'un des 2 composants parents,
- Then les props et events sont strictement identiques au pré-refactor.

**AC2 — Tests S2 + Vagues 1 et 2 préservés**
- Tous les tests existants restent verts.
- Exception modification : voir AC2 Vague 1.

**AC3 — Tests composables isolés**
- 6 nouveaux fichiers `tests/unit/composables/use*.test.ts`, chacun avec
  ≥3 ACs métier (pas DOM-position).
- Chaque composable est testé **indépendamment** du composant parent
  (mocks des stores, refs simulées en input).

**AC4 — Verrou Sprint C-1 respecté par construction** *(critique)*
- Given `tests/unit/components/lieutenants-selection-architecture.test.ts`
  (verrou existant 5 invariants FR-LIE-AI-FRONTIER),
- When la Vague 3 est livrée,
- Then ce test reste vert **sans modification**. Si il échoue à un moment,
  arrêt anticipé Bloc J : réorganiser l'extraction, pas le test.
- Vérification additionnelle : `lieutenants-results-layout-architecture.test.ts`
  ajoute une couche de protection au niveau du sous-composant.

**AC5 — Tailles cibles Vague 3**
- MoteurView < 800L
- LieutenantsSelection < 800L

**AC6 — Hygiène statique verte**
- lint + type-check + check:dead + check:cycles + check:arch verts.

**AC7 — Atomicité PR + PRD** *(adresse Finding #9)*
- Given que la Vague 3 modifie le PRD (ajout `FR-LIE-AI-FRONTIER`),
- When le PR est mergé,
- Then les modifications PRD et code sont dans la **même branche** et donc
  le **même merge**. Le PR n'est mergé que si les deux passent ensemble.

**AC8 — Refactor logique scopé (pas de migration de stores)**
- Given le diff complet de la PR Vague 3,
- When on lance un audit (`git diff main..HEAD -- 'src/stores/**'`),
- Then **aucun fichier store n'a été modifié** au-delà d'imports. Les
  composables consomment les stores existants tels quels.

**AC9 — Composables testables indépendamment du composant parent**
- Given `useMoteurTabs`, `useMoteurSoftGating`, `useMoteurCrossTabState`,
  `useLieutenantsSerp`, `useLieutenantsIa`, `useLieutenantsHn`,
- When chacun est testé en isolation (sans monter `MoteurView` ni
  `LieutenantsSelection`),
- Then chaque test passe en mockant uniquement les dépendances directes
  (refs en input, stores).
- C'est le critère qui distingue un **vrai composable** d'un fragment de
  code délocalisé : un vrai composable est testable seul.

## Testing Strategy (3 niveaux)

### Niveau 1 — Tests architecturaux + composables isolés

- 1 fichier `lieutenants-results-layout-architecture.test.ts` (DOM-position,
  référence FR-LIE-AI-FRONTIER).
- 6 fichiers `tests/unit/composables/use*.test.ts` (logique isolée).

### Niveau 2 — Tests S2 + verrou C-1 + tests composants existants

À garder verts :
- `lieutenants-selection-architecture.test.ts` (verrou Sprint C-1).
- Tests Vagues 1 et 2 (déjà mergés).
- Tests S2 existants utilisés par MoteurView (ex: tests routing,
  workflow gating).

### Niveau 3 — Manual UX Checklist Vague 3

**Bloc I (MoteurView)** :
- [ ] Naviguer vers Moteur depuis Cocoon → article-gate visible si pas
  d'article sélectionné.
- [ ] Sélectionner un article → onglet courant calculé automatiquement
  (computeSmartTab) selon les verrous.
- [ ] Naviguer entre les 6 onglets → state préservé (visitedTabs).
- [ ] Cache panel sticky : visible uniquement si article sélectionné.
- [ ] TabLoadPrompt affiché contextuellement par onglet.
- [ ] Bouton "Vider le cache" purge api_cache, pas explorations DB.
- [ ] Lock banner Phase ① visible si validations existantes.
- [ ] Soft-gate Lexique si Capitaine non verrouillé.
- [ ] Bouton "Continuer vers la Rédaction" disabled si Phase ②
  incomplète, tooltip liste les manquants.
- [ ] Switch d'article → reset propre (pas de fuite cross-article).

**Bloc J (LieutenantsSelection)** :
- [ ] Capitaine verrouillé + ouvrir Lieutenants → soft-gate-message disparu
  (`hasEverAnalyzed=false` au premier coup).
- [ ] Cliquer "Analyser la SERP" → progression `serpDoneCount/serpTotalCount`
  visible, tabs par mot-clé.
- [ ] IA streaming : chunks accumulés, `LieutenantProposals` cards
  apparaissent.
- [ ] **FR-LIE-AI-FRONTIER (critique)** : vérifier visuellement que les
  cards Lieutenants et la structure Hn s'affichent **AVANT** la coque
  "Suggestions IA Lieutenants" dans le DOM (ordre vertical haut → bas).
- [ ] Cocher 5 lieutenants → compteur recommandé selon level.
- [ ] Verrouiller Lieutenants → check `moteur:lieutenants_locked` émis.
- [ ] KeywordAssistPanel : ajouter un keyword depuis basket → apparaît dans
  `lieutenantCards`.
- [ ] Switch d'article → state Lieutenants reset propre.
- [ ] Hn structure : section dépliable, save-hn fonctionne.

**a11y et perf** :
- [ ] Lighthouse Accessibility ≥ pré-Vague-3.
- [ ] Aucun warning Vue console.
- [ ] **Performance check spécifique** : taper dans un input keyword ne fait
  pas re-render toute la radar-list. Vue Devtools onglet Components → vérifier
  qu'un seul sous-composant re-render à la fois.

## Pre-mortem Vague 3

### Risque 3.1 — Composable mal scopé (devient un god-object)
**Symptôme** : `useMoteurTabs` finit par contenir aussi du gating et du
cross-tab state parce que les dépendances étaient floues.
**Mitigation** : Step 2 (I.1) produit un mini-diagramme texte des dépendances
AVANT d'extraire. Si une fonction touche >2 sections, elle reste au parent
ou un 4ème composable est nécessaire (pas un god-object).

### Risque 3.2 — Verrou Sprint C-1 cassé silencieusement par réorganisation DOM
**Symptôme** : `LieutenantsResultsLayout` est mal structuré et un test
verrou casse.
**Mitigation** : test J.7 lancé **immédiatement** après extraction.
Réorganiser l'extraction, jamais le test verrou.

### Risque 3.3 — Composable accède aux stores de manière indirecte
**Symptôme** : `useMoteurCrossTabState` fait `useArticleKeywordsStore()` à
l'intérieur, le rendant non-testable indépendamment.
**Mitigation** : règle stricte — **dépendances injectées en paramètres**,
pas appelées en interne. Le test isolé est le critère de validation.

### Risque 3.4 — Watcher dupliqué (parent + composable)
**Symptôme** : un `watch(activeTab, ...)` reste au parent ET est aussi dans
`useMoteurTabs`. Double exécution = double publication vers `workflowNavStore`.
**Mitigation** : audit `git diff` final — chaque watcher déménagé n'apparaît
QUE dans le composable, plus au parent.

### Risque 3.5 — Régression de timing sur SERP analyze multi-keyword
**Symptôme** : `analyzeSERP` lance 4 mots-clés en série mais après refactor
ils partent en parallèle (ou inversement).
**Mitigation** : test composable `useLieutenantsSerp.test.ts` AC.J.1 vérifie
la progression séquentielle. Manual UX checklist confirme visuellement.

### Risque 3.6 — Cycle d'import composable → store → composant
**Symptôme** : `useMoteurSoftGating.ts` importe un type depuis
`MoteurView.vue` (cycle).
**Mitigation** : tous les types passent par `shared/types/`. Aucun import
depuis un fichier `.vue`. `check:cycles` vert.

### Risque 3.7 — Concurrence Git très probable (long-running branch)
**Symptôme** : la Vague 3 est la plus longue et `main` aura bougé pendant
les Vagues 1 et 2.
**Mitigation** : `git rebase main` au début de chaque bloc. Si conflits >
20 lignes, arrêt et discussion humaine.

### Risque 3.8 — Concurrence avec d'autres chantiers Moteur
**Symptôme** : pendant qu'on refactore MoteurView, quelqu'un ajoute un 7e
onglet ou modifie `useTabLoadPrompt`.
**Mitigation** : annoncer la Vague 3 comme exclusive pendant sa durée.
Aucun autre PR sur MoteurView ou LieutenantsSelection en parallèle.

### Risque 3.9 — Régression cross-mode (workflow vs libre via LaboView)
**Symptôme** : `MoteurView` consomme `CaptainValidation` en mode workflow.
`LaboView` le consomme en mode libre. Si un changement de gating affecte
l'export d'un type ou d'une fonction utilisé par les deux, Labo casse.
**Mitigation** : grep cross-fichiers `LaboView.vue` pour les imports
partagés. Tester Labo en checklist Niveau 3.

## Notes

- Estimation T-shirt size : **L (3-4 jours plein temps)**. C'est la vague
  la plus risquée et la plus longue. Marge de buffer recommandée.
- À la livraison, ouvrir un post-mortem complet (1 page) qui résume les
  surprises rencontrées dans les 3 vagues. Ce document sera la base pour
  décider si la Vague 4 (ArticleWorkflowView, ArticleEditorView) est
  attaquée immédiatement ou reportée.
- **Indicateur de succès final** : si après Vague 3 mergée, on peut prendre
  un fichier au hasard parmi les 9 refactorés et un dev nouveau le comprend
  en <30 min, le chantier a réussi sa promesse de maintenabilité.
