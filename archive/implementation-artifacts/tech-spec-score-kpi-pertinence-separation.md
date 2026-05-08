---
title: 'Séparation Score KPI / Score Pertinence — onglets Radar vs Capitaine'
slug: 'score-kpi-pertinence-separation'
created: '2026-04-28'
delivered: '2026-04-28'
status: 'delivered'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Vue 3.5 (RadarKeywordCard, CaptainSidePanel, CaptainValidation)
  - Pinia 3
  - Express 5 (keyword-validate.routes, intent-scan.routes)
  - shared/scoring.ts + shared/scoring-kpi.ts (logique pure)
  - Vitest 4
files_to_modify:
  - shared/scoring-kpi.ts (ajustement poids)
  - shared/scoring.ts (nouvelle computeRelevanceScore)
  - shared/types/scoring.types.ts (NEW)
  - shared/types/keyword-validate.types.ts (extension)
  - shared/types/intent.types.ts (extension RadarCard)
  - server/routes/keyword-validate.routes.ts
  - server/services/keyword/keyword-radar.service.ts
  - src/components/intent/RadarKeywordCard.vue (cleanup displayMode relevance)
  - src/components/moteur/CaptainSidePanel.vue (KPIs lecture seule)
  - src/components/moteur/CaptainLockPanel.vue (retirer canLock)
  - src/components/moteur/CaptainValidation.vue (retirer can-lock)
  - src/composables/ui/useResizablePanel.ts (max dynamique)
  - tests/unit/shared/scoring.test.ts (nouveaux cas)
  - docs/scoring-kpi-vs-relevance.md (NEW)
  - docs/moteur-data-flow.md (mise à jour)
code_patterns:
  - "shared/scoring*.ts : logique pure, importée client + serveur"
  - "displayMode déjà existant sur RadarKeywordCard ('kpi' | 'relevance')"
  - "Verdict purement informatif post-spec"
  - "Champs additifs uniquement, pas de suppression"
test_patterns:
  - "tests/unit/shared/*.test.ts pour scoring"
  - "tests/unit/components/*.test.ts pour Vue"
---

# Tech-Spec V1: Séparation Score KPI / Score Pertinence

**Created:** 2026-04-28
**Adversarial review:** appliquée — voir section "Décisions de scope" en fin de doc.

## Overview

### Problem Statement

Dans l'app Blog Redactor SEO :

1. Un seul `combinedScore` est exposé partout, calculé via `computeCombinedScore()` ([shared/scoring.ts:55](shared/scoring.ts#L55)) à deux modes implicites (« pertinence article » avec signaux douleur, ou « fallback » sans). L'utilisateur ne sait jamais ce qu'il regarde.
2. Un autre score `computeKpiScore()` ([shared/scoring-kpi.ts:48](shared/scoring-kpi.ts#L48)) coexiste, mais avec des poids historiques (Volume 30 / KD 25 / CPC 15 / Intent 15 / PAA 10 / AC 5) qui ne reflètent plus la stratégie SEO retenue.
3. Le composant `RadarKeywordCard.vue` a déjà une prop `displayMode: 'kpi' | 'relevance'`, mais le mode `'relevance'` lit `combinedScore` (mélange marché + douleur). Le score de pertinence pur n'existe pas en tant que tel.
4. Le verdict de validation conditionne le bouton « Valider Capitaine » via `:can-lock="effectiveVerdict === 'GO'"`, alors que le verdict est censé être informatif.
5. Le side-panel Capitaine est limité à 480px de largeur — l'utilisateur souhaite pouvoir l'étendre quasiment à pleine largeur.

### Solution

- **Aligner `computeKpiScore` sur les poids validés** : Volume 30 / KD 20 / Intent 15 / PAA 10 / AC 10 / CPC 10 (= 95%, plafonné à 100). Ce score devient le **score KPI/Marché** affiché dans l'onglet Radar.
- **Créer une nouvelle fonction `computeRelevanceScore`** dans `shared/scoring.ts` : Pain align 30 / PAA×douleur 25 / AC×douleur 15 / Racines 20 / Intent×douleur 10. Score affiché dans l'onglet Capitaine.
- **Étendre `ValidateResponse`** avec `marketScore` (toujours présent) et `relevanceScore` (présent si données douleur disponibles via cache, sinon `null`).
- **Étendre `RadarCard`** avec `marketScore` + `relevanceScore` calculés côté serveur.
- **Retirer `can-lock`** : verdict redevient purement informatif.
- **Side-panel** : max-width dynamique = `window.innerWidth - 320`.
- **Section KPIs marché** ajoutée au `CaptainSidePanel` en mode relevance (lecture seule, sans bouton).
- **Le composant `RadarKeywordCard` exploite le nouveau `relevanceScore`** quand `displayMode === 'relevance'` au lieu de retomber sur `combinedScore`.

### Scope

**In Scope:**

1. Ajustement des poids `WEIGHTS` dans [shared/scoring-kpi.ts:19-26](shared/scoring-kpi.ts#L19) — pas de changement d'API.
2. Nouvelle fonction `computeRelevanceScore()` dans `shared/scoring.ts` (pure, addition).
3. Nouveau fichier `shared/types/scoring.types.ts` avec `MarketScoreResult`, `RelevanceScoreResult`, `ScoreVerdict`.
4. Extension `ValidateResponse` avec `marketScore?: MarketScoreResult` et `relevanceScore?: RelevanceScoreResult | null`.
5. Extension `RadarCard` avec `marketScore?: MarketScoreResult` et `relevanceScore?: RelevanceScoreResult | null`.
6. Backend `/validate` enrichit la réponse :
   - `marketScore` toujours présent (calculé via `computeKpiScore`)
   - `relevanceScore` calculé si `paaPainAlignmentAvg` etc. présents dans la card cache, sinon `null`
7. Backend `/radar/scan` enrichit chaque RadarCard avec `marketScore` + `relevanceScore`.
8. Frontend `RadarKeywordCard.vue` : en mode `'relevance'`, lit `card.relevanceScore` (fallback `combinedScore` si null pour rétro-compat).
9. Frontend `CaptainSidePanel.vue` : ajout section « KPIs marché » lecture seule (Volume / KD / CPC / Intent / PAA count / AC count) avec valeurs de `card.kpis`.
10. Frontend `useResizablePanel.ts` : `PANEL_MAX_WIDTH` devient une fonction dynamique `Math.max(PANEL_MIN_WIDTH, window.innerWidth - 320)`.
11. Frontend `CaptainLockPanel.vue` : suppression de la prop `canLock` et du `:disabled`.
12. Frontend `CaptainValidation.vue` : retrait du passage `:can-lock="..."`.
13. Tests unitaires shared/scoring : nouveaux cas pour `computeRelevanceScore` + ajustement tests `computeKpiScore` (poids changent → assertions changent).
14. Test composant : retrait du gating verdict (NOGO doit pouvoir lock).
15. Test useResizablePanel : largeur étendue.
16. Documentation : `docs/scoring-kpi-vs-relevance.md` + maj `docs/moteur-data-flow.md` + maj table CLAUDE.md.
17. Rétrospective courte dans `_bmad-output/implementation-artifacts/`.

**Out of Scope:**

- Renommage `useRadarCarousel` → `useCaptainValidationQueue` (story future, cosmétique).
- Suppression `computeCombinedScore` (rétro-compatibilité, story future).
- Renommage endpoint `/radar/scan` → `/radar/explore`.
- Calcul à la volée des alignements douleur dans `/validate` (nécessite appels Claude/HuggingFace, hors scope V1).
- Persistance `relevanceScore` en DB.
- Quadrant 2D KPI×Pertinence.
- Verdict combiné cross-onglets.
- Suppression définitive du gating `can-lock` ailleurs (search global terminé : c'est le seul endroit).

## Context for Development

### Codebase Patterns

**Scoring partagé client/serveur** : Tout fichier `shared/scoring*.ts` est importé en parallèle par le frontend Vue ([RadarKeywordCard.vue:6](src/components/intent/RadarKeywordCard.vue#L6) `import { computeKpiScore } from '@shared/scoring-kpi.js'`) et par le backend Express. Doit rester **pure**, sans I/O ni dépendance Vue.

**displayMode existant** : `RadarKeywordCard.vue` ([src/components/intent/RadarKeywordCard.vue:17](src/components/intent/RadarKeywordCard.vue#L17)) accepte déjà `displayMode: 'kpi' | 'relevance'` (défaut `'kpi'`). On **n'introduit pas** de nouveau nom — on s'aligne dessus.

**Cache cross-article `keyword_metrics`** : seules les métriques bruts y vivent. Les alignements douleur sont **per-article** et stockés dans `radar_explorations.scan_result.cards[].kpis.painAlignmentScore` etc.

**API wrapper** : `apiPost<T>('/path', body)` retourne `T` (pas `{ data: T }` côté front, le wrapper unwrap déjà — voir [src/services/api.service.ts](src/services/api.service.ts)).

**Verdict workflow** : émission via constantes `MOTEUR_*` ([shared/constants/workflow-checks.constants.ts](shared/constants/workflow-checks.constants.ts)). Le verdict ne doit **plus** conditionner ces émissions.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| [shared/scoring-kpi.ts](shared/scoring-kpi.ts) | `computeKpiScore` à ajuster (poids) |
| [shared/scoring.ts](shared/scoring.ts) | Ajout de `computeRelevanceScore` |
| [shared/types/keyword-validate.types.ts](shared/types/keyword-validate.types.ts) | `ValidateResponse` à étendre |
| [shared/types/intent.types.ts](shared/types/intent.types.ts) | `RadarCard` à étendre |
| [server/routes/keyword-validate.routes.ts](server/routes/keyword-validate.routes.ts) | Enrichir réponse |
| [server/services/keyword/keyword-radar.service.ts](server/services/keyword/keyword-radar.service.ts) | Enrichir cards |
| [src/components/intent/RadarKeywordCard.vue](src/components/intent/RadarKeywordCard.vue) | Lecture des nouveaux scores |
| [src/components/moteur/CaptainSidePanel.vue](src/components/moteur/CaptainSidePanel.vue) | Section KPIs lecture seule |
| [src/components/moteur/CaptainLockPanel.vue](src/components/moteur/CaptainLockPanel.vue) | Retirer `canLock` |
| [src/components/moteur/CaptainValidation.vue](src/components/moteur/CaptainValidation.vue) | Retirer `:can-lock` |
| [src/composables/ui/useResizablePanel.ts](src/composables/ui/useResizablePanel.ts) | Max-width dynamique |
| [tests/unit/shared/scoring.test.ts](tests/unit/shared/scoring.test.ts) | Tests à étendre |

### Technical Decisions

**TD-1 — Pondération `computeKpiScore` (ajustement)**

Avant : `Volume 30 / KD 25 / CPC 15 / Intent 15 / PAA 10 / AC 5` (= 100%).

Après : `Volume 30 / KD 20 / Intent 15 / PAA 10 / AC 10 / CPC 10` (= 95%, plafonné à 100).

Le mapping interne (couleur → score 0/50/100 puis pondération) reste inchangé.

**TD-2 — `computeRelevanceScore` (nouveau)**

Signature :
```ts
export interface RelevanceScoreInput {
  painAlignmentScore?: number             // 0-100, neutre 50 si absent
  paaPainAlignmentAvg?: number            // 0-100
  autocompletePainAlignmentAvg?: number   // 0-100
  rootsAverageScore?: number              // 0-100
  intentTypes?: RadarIntentType[]
  painType?: 'commercial' | 'informational' | 'transactional' | 'navigational'
}

export interface RelevanceScoreBreakdown {
  painKeyword: { weight: number; normalized: number; contribution: number }
  paaPain:     { weight: number; normalized: number; contribution: number }
  acPain:      { weight: number; normalized: number; contribution: number }
  roots:       { weight: number; normalized: number; contribution: number }
  intentPain:  { weight: number; normalized: number; contribution: number }
}

export interface RelevanceScoreResult {
  total: number                            // 0-100
  verdict: ScoreVerdict                    // 'GO' | 'ORANGE' | 'NOGO'
  breakdown: RelevanceScoreBreakdown
  rootsContext: {
    rootsAverageScore: number | null
    fallbackApplied: boolean
  }
}
```

Algo :
- Poids cibles : Pain 30 / PAA×D 25 / AC×D 15 / Racines 20 / IntentPain 10.
- Si `rootsAverageScore` est `null` (keyword < 3 mots ou pas de racines validées) : redistribution proportionnelle des 20% sur les 4 autres → Pain 37.5 / PAA×D 31.25 / AC×D 18.75 / IntentPain 12.5.
- Composantes manquantes (paaPain, acPain) → neutralisées à 50 (zone neutre, ni booster ni pénalisant).
- `intentPain` : si `painType` absent → 50 neutre. Sinon mapping simple :
  - Commercial→commercial: 100, Commercial→transactional: 80, Commercial→informational: 30, Commercial→navigational: 20
  - Informational→informational: 100, Informational→commercial: 50, etc.
- Verdict : ≥70 → GO ; 40-69 → ORANGE ; <40 → NOGO.

**TD-3 — `MarketScoreResult` réutilise `KpiScoreBreakdown` existant**

Pas de duplication. Dans `scoring.types.ts` :
```ts
export type MarketScoreResult = KpiScoreBreakdown & { verdict: ScoreVerdict }
export type ScoreVerdict = 'GO' | 'ORANGE' | 'NOGO'
```

Le `verdict` est calculé via un helper `verdictFromScore(total) -> ScoreVerdict` (≥70/40-69/<40).

**TD-4 — Backend `/validate` opportuniste**

L'endpoint actuel calcule déjà tous les KPI de base (volume, KD, CPC, intent, PAA, AC). Il **n'a pas** painPoint ni paaPainAlignmentAvg en cache `keyword_metrics`. Donc :
- `marketScore` : **toujours calculé** (via `computeKpiScore` enrichi).
- `relevanceScore` : V1 = recherche dans la table `radar_explorations` la card la plus récente pour ce keyword + cet articleId, en extrait les signaux douleur. Si présent → calcule `relevanceScore`. Sinon → `null`.
- Pas d'appel IA supplémentaire.

**TD-5 — Backend `/radar/scan` enrichit cards**

Après la boucle qui crée les cards ([keyword-radar.service.ts:392-415](server/services/keyword/keyword-radar.service.ts#L392)), chaque card reçoit :
```ts
card.marketScore = computeKpiScore(card.kpis, articleLevel) avec verdict
card.relevanceScore = computeRelevanceScore({
  painAlignmentScore: card.kpis.painAlignmentScore,
  paaPainAlignmentAvg: card.kpis.paaPainAlignmentAvg ?? null,  // déjà calculé pour combinedScore
  autocompletePainAlignmentAvg: card.kpis.autocompletePainAlignmentAvg ?? null,
  rootsAverageScore: null,                                      // racines non disponibles ici
  intentTypes: card.kpis.intentTypes,
})
```

**TD-6 — Frontend `RadarKeywordCard.vue`**

[src/components/intent/RadarKeywordCard.vue:120-160](src/components/intent/RadarKeywordCard.vue#L120) — adapter le computed `currentScore` :
```ts
const currentScore = computed(() => {
  if (props.displayMode === 'kpi') {
    return props.card.marketScore?.total ?? kpiBreakdown.value?.total ?? 0
  }
  // displayMode === 'relevance'
  return props.card.relevanceScore?.total ?? props.card.combinedScore ?? 0
})
```

Idem pour `currentBreakdown`. Le label change : `'Score KPI'` / `'Score pertinence'` (déjà en place).

**TD-7 — `CaptainSidePanel`**

Ajouter une section visible quand l'entry courante a des `kpis` :
```html
<section class="side-panel-kpis">
  <h4>KPIs marché</h4>
  <ul>
    <li>Volume : {{ kpis.searchVolume }} rech/m</li>
    <li>KD : {{ kpis.difficulty }}</li>
    <li>CPC : {{ kpis.cpc.toFixed(2) }} €</li>
    <li>Intent : {{ kpis.intentTypes.join(', ') }}</li>
    <li>PAA : {{ kpis.paaTotal }} questions</li>
    <li>Autocomplete : {{ kpis.autocompleteMatchCount }} matches</li>
  </ul>
</section>
```

Pas d'interaction. Affiché uniquement si `entry?.card.kpis` existe.

**TD-8 — `useResizablePanel`**

```ts
const PANEL_MIN_WIDTH = 240
const PANEL_DEFAULT_WIDTH = 300
const VIEWPORT_MARGIN = 320  // garde 320px visibilité minimum

function getMaxWidth() {
  if (typeof window === 'undefined') return 1600
  return Math.max(PANEL_MIN_WIDTH, window.innerWidth - VIEWPORT_MARGIN)
}

const panelMaxWidth = ref(getMaxWidth())
useEventListener(window, 'resize', () => { panelMaxWidth.value = getMaxWidth() })

const panelWidth = computed(() =>
  Math.max(PANEL_MIN_WIDTH, Math.min(panelMaxWidth.value, storedWidth.value))
)

// onPointerMove : remplace PANEL_MAX_WIDTH par panelMaxWidth.value
```

**TD-9 — `CaptainLockPanel` suppression `canLock`**

Suppression de :
- prop `canLock` (3 lignes)
- `:disabled="!canLock"` sur le bouton (1 ligne)
- styles `.lock-btn:disabled` retirés (utilisateurs ne pourront plus déclencher cet état)

Et dans `CaptainValidation.vue:1257` : retrait de `:can-lock="effectiveVerdict === 'GO'"`. Le badge couleur du verdict reste visible ailleurs dans la carte.

**TD-10 — Rétro-compat `combinedScore`**

Aucun champ supprimé. `RadarCard.combinedScore` continue d'exister, calculé exactement comme avant. Les consommateurs (carousel, sidebar racines, sort) ne changent pas.

## Implementation Plan

### Phase 1 — Types partagés (no-runtime)

1. Créer [shared/types/scoring.types.ts](shared/types/scoring.types.ts) :
   - `ScoreVerdict = 'GO' | 'ORANGE' | 'NOGO'`
   - `MarketScoreResult` (alias `KpiScoreBreakdown` + `verdict`)
   - `RelevanceScoreInput`, `RelevanceScoreBreakdown`, `RelevanceScoreResult`
   - export `verdictFromScore(total: number): ScoreVerdict`

2. [shared/types/keyword-validate.types.ts](shared/types/keyword-validate.types.ts) — ajouter à `ValidateResponse` :
   ```ts
   marketScore?: MarketScoreResult
   relevanceScore?: RelevanceScoreResult | null
   ```

3. [shared/types/intent.types.ts](shared/types/intent.types.ts) — ajouter à `RadarCard` :
   ```ts
   marketScore?: MarketScoreResult
   relevanceScore?: RelevanceScoreResult | null
   ```

### Phase 2 — Logique scoring pure

4. [shared/scoring-kpi.ts:19-26](shared/scoring-kpi.ts#L19) — ajuster `WEIGHTS` :
   ```ts
   const WEIGHTS = {
     volume:       0.30,
     kd:           0.20,
     intent:       0.15,
     paa:          0.10,
     autocomplete: 0.10,
     cpc:          0.10,
   } as const
   ```
   Ajouter retour `verdict` via helper.

5. [shared/scoring.ts](shared/scoring.ts) — ajouter en bas du fichier :
   - Fonction pure `computeRelevanceScore(input: RelevanceScoreInput): RelevanceScoreResult`
   - Helper interne `computeIntentPainAlignment(intentTypes, painType?): number` (mapping table)
   - **Ne pas toucher** `computeCombinedScore` existant.

6. Re-exporter `verdictFromScore` depuis `shared/scoring.ts` aussi pour usage commun.

### Phase 3 — Backend

7. [server/services/keyword/keyword-validate.service.ts](server/services/keyword/keyword-validate.service.ts) ou [server/routes/keyword-validate.routes.ts](server/routes/keyword-validate.routes.ts) :
   - Après calcul du verdict, calculer `marketScore` :
     - Construire `RadarKeywordKpis` à partir des KPI bruts
     - `marketScore = computeKpiScore(kpis, articleLevel)` + `verdict`
   - Si `articleId` fourni : tenter de récupérer la dernière card radar persistée (table `radar_explorations`) pour ce keyword + article
     - Si trouvée et contient `painAlignmentScore` → calculer `relevanceScore`
     - Sinon → `relevanceScore: null`
   - Ajouter les deux à la réponse.

8. [server/services/keyword/keyword-radar.service.ts](server/services/keyword/keyword-radar.service.ts) — dans la boucle de création des cards (lignes 392-415) :
   - Calculer `marketScore` pour chaque card
   - Calculer `relevanceScore` si painPoint disponible
   - Affecter à la card

### Phase 4 — Frontend composants

9. [src/components/intent/RadarKeywordCard.vue](src/components/intent/RadarKeywordCard.vue) :
   - Adapter `currentScore` (computed) selon `displayMode` pour lire les nouveaux champs en priorité.
   - Adapter `currentBreakdown` (computed) pour exposer le bon breakdown selon mode.
   - Garder fallback sur `kpiBreakdown.value` (computed local) et `combinedScore` (rétro-compat).

10. [src/components/moteur/CaptainSidePanel.vue](src/components/moteur/CaptainSidePanel.vue) :
    - Ajouter section `<section class="side-panel-kpis">` après le header, avec liste lecture seule des KPIs marché.
    - Affichage conditionnel : `v-if="entry?.card?.kpis"`.

11. [src/composables/ui/useResizablePanel.ts](src/composables/ui/useResizablePanel.ts) :
    - Remplacer `PANEL_MAX_WIDTH = 480` par fonction dynamique.
    - Listener `resize` → recalcul.
    - Mettre à jour `onPointerMove` pour borner par `panelMaxWidth.value`.
    - **Conserver l'export `PANEL_MAX_WIDTH`** (constante de fallback) pour ne pas casser les tests existants.

12. [src/components/moteur/CaptainLockPanel.vue](src/components/moteur/CaptainLockPanel.vue) :
    - Retirer prop `canLock`
    - Retirer `:disabled="!canLock"`
    - Retirer styles `.lock-btn:disabled`

13. [src/components/moteur/CaptainValidation.vue:1257](src/components/moteur/CaptainValidation.vue#L1257) :
    - Retirer attribut `:can-lock="effectiveVerdict === 'GO'"`

### Phase 5 — Tests

14. [tests/unit/shared/scoring.test.ts](tests/unit/shared/scoring.test.ts) :
    - Nouveaux tests : `computeRelevanceScore` happy path, fallback racines, intent pain mapping, edge cases zéro/null.
    - Adapter tests `computeKpiScore` aux nouveaux poids (Volume 30 / KD 20 / Intent 15 / PAA 10 / AC 10 / CPC 10).
    - Garder tests `computeCombinedScore` (intacts).

15. [tests/unit/composables/useResizablePanel.test.ts](tests/unit/composables/useResizablePanel.te) (le fichier existe déjà à compléter) :
    - Test : largeur peut atteindre `viewport - 320`
    - Mock `window.innerWidth = 1920` → max attendu 1600

16. [tests/unit/components/captain-validation.test.ts](tests/unit/components/captain-validation.test.ts) :
    - Test : verdict NOGO → bouton lock cliquable (régression `can-lock`)

### Phase 6 — Documentation

17. [docs/scoring-kpi-vs-relevance.md](docs/scoring-kpi-vs-relevance.md) **NEW** :
    - Définitions des deux scores, intention SEO de chacun.
    - Tableaux de pondération.
    - Schéma : où chacun est calculé, où chacun est affiché.
    - Exemple « agence référencement naturel paris » avec les deux scores commentés.

18. [docs/moteur-data-flow.md](docs/moteur-data-flow.md) :
    - Section « Scoring » : refléter les deux scores complémentaires.

19. [CLAUDE.md](CLAUDE.md) :
    - Ajouter ligne dans la table des sources de vérité pour `docs/scoring-kpi-vs-relevance.md`.

20. `_bmad-output/implementation-artifacts/retro-score-kpi-pertinence-separation.md` **NEW** : court résumé livraison.

### Acceptance Criteria

**AC-1** : `computeKpiScore({ volume:1500, kd:30, cpc:2.5, intent:'commercial', paa:5, ac:3 }, 'pilier')` → total ∈ [70, 95], `verdict='GO'`.

**AC-2** : `computeRelevanceScore({ painAlignmentScore:85, paaPainAlignmentAvg:75, autocompletePainAlignmentAvg:60, rootsAverageScore:70, intentTypes:['commercial'], painType:'commercial' })` → total ≥ 70, `verdict='GO'`, `rootsContext.fallbackApplied=false`.

**AC-3** : `computeRelevanceScore({ painAlignmentScore:80, paaPainAlignmentAvg:70, autocompletePainAlignmentAvg:60, intentTypes:['informational'] })` (pas de roots) → poids redistribués, total calculé sur 100% des autres composantes, `rootsContext.fallbackApplied=true`.

**AC-4** : `POST /keywords/foo/validate` (sans articleId) → réponse contient `marketScore` non-null, `relevanceScore=null`, anciens champs (`verdict`, `kpis`, `paaQuestions`) intacts.

**AC-5** : `POST /keywords/foo/validate` avec articleId d'un article ayant des données radar persistées → `relevanceScore` non-null avec breakdown complet.

**AC-6** : `RadarKeywordCard` en `displayMode='kpi'` avec `marketScore.total=72` → la jauge affiche 72.

**AC-7** : `RadarKeywordCard` en `displayMode='relevance'` avec `relevanceScore.total=80` → la jauge affiche 80.

**AC-8** : `useResizablePanel` avec `window.innerWidth=1920` → `panelMaxWidth=1600`. Drag peut atteindre 1600.

**AC-9** : Capitaine NO-GO sélectionné → bouton "Valider ce Capitaine" cliquable (pas disabled). Lock fonctionne, `MOTEUR_CAPITAINE_LOCKED` émis.

**AC-10** : `CaptainSidePanel` en mode pertinence avec entry → section "KPIs marché" visible avec valeurs lecture seule.

**AC-11** : `combinedScore` continue d'être présent dans `RadarCard`. Carousel / sidebar racines triant par `combinedScore` continuent de fonctionner.

**AC-12** : `npm run type-check && npm run lint && npm run build` → 0 erreur.

**AC-13** : `npm run test:unit -- shared/scoring` → tous tests passent (nouveaux + adaptés).

## Additional Context

### Dependencies

Aucune nouvelle dépendance npm.

### Testing Strategy

- **Unit pure** : `computeKpiScore` (poids ajustés), `computeRelevanceScore` (≥6 cas), `computeIntentPainAlignment` (mappings).
- **Composant** : RadarKeywordCard rendu en deux modes, CaptainLockPanel sans canLock, useResizablePanel avec viewport mock.
- **Manuel** : `npm run dev`, naviguer Radar (vérifier affichage marketScore) puis Capitaine (relevance + KPIs side-panel + drag side-panel grand format).

### Notes

**Risques** :

- **R1** Changement des poids `computeKpiScore` casse les tests existants. **Mitigation** : adapter les tests dans la même phase, vérifier que les fixtures de tests reflètent la nouvelle réalité.
- **R2** Le calcul opportuniste de `relevanceScore` dans `/validate` peut renvoyer `null` plus souvent qu'attendu si `radar_explorations` n'a pas été pré-rempli. **Mitigation** : documenter le comportement, l'UI gère gracieusement le cas `null`.
- **R3** L'UI Capitaine peut afficher l'ancien `combinedScore` à la place du nouveau `relevanceScore` si ce dernier est `null`. **Mitigation** : c'est intentionnel (rétro-compat), documenté dans TD-6.

**Décisions de scope (issues de l'adversarial review)** :

- Le renommage `useRadarCarousel` est **reporté** (cosmétique, gros risque).
- Le calcul à la volée des alignements douleur dans `/validate` est **reporté** (coûteux, V1 lit cache).
- `computeMarketScore` n'existe pas comme fonction séparée : c'est `computeKpiScore` ajusté.
- La prop sur RadarKeywordCard reste `displayMode` (pas `variant`) pour aligner sur l'existant.
