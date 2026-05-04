---
title: 'Stabilisation codebase — quick wins non-invasifs + score unifié'
slug: 'stabilisation-codebase'
created: '2026-05-03'
last_updated: '2026-05-03'
version: '2.0.0'
status: 'delivered'
delivered: '2026-05-03'
sprints: 6
tech_stack:
  - npm scripts (package.json)
  - oxlint + eslint (autofix + règle custom)
  - knip (dead code) / madge (cycles)
  - Vitest 4 (tests de caractérisation)
  - shared/score/ (nouveau module unifié)
files_to_modify:
  # Sprint 1
  - package.json (script check:health)
  - .eslintrc / eslint.config.js (règle no-score-fallback)
  # Sprint 2
  - tests/unit/services/keyword-radar.service.test.ts (NEW)
  - tests/unit/services/keyword-metrics.service.test.ts (NEW)
  - tests/unit/services/tfidf.service.test.ts (NEW)
  - tests/unit/stores/article-progress.store.test.ts (NEW)
  - tests/unit/stores/moteur-basket.store.test.ts (NEW)
  - tests/unit/stores/keyword-modifiers.store.test.ts (NEW)
  # Sprint 3
  - shared/score/index.ts (NEW)
  - shared/score/types.ts (NEW)
  - shared/score/format.ts (NEW)
  - shared/score/compare.ts (NEW)
  - shared/score/aggregate.ts (NEW)
  - shared/scoring.ts (réexports → shared/score/)
  - shared/scoring-kpi.ts (réexports → shared/score/)
  - shared/kpi-scoring.ts (réexports → shared/score/)
  # Sprint 4
  - server/routes/generate.routes.ts (split en sous-fichiers)
  # Sprint 5
  - server/services/external/dataforseo.service.ts (split)
  - src/composables/keyword/useArticleProposals.ts (split)
synced_with:
  - CLAUDE.md (méthode §2)
  - docs/scoring-kpi-vs-relevance.md (impacté Sprint 3)
  - _bmad-output/implementation-artifacts/sprint-status.yaml
---

# Tech-Spec : Stabilisation de la codebase

**Created:** 2026-05-03
**Author:** Arnaud + Claude (audit fragilité)
**Méthode appliquée:** BMAD requirement-driven + TDD (CLAUDE.md §2)

## Overview

### Problem Statement

L'audit de la codebase ([cf. discussion 2026-05-03](#)) a révélé 8 sources de fragilité chiffrées qui rendent toute modification risquée :

| Symptôme | Mesure |
|---|---|
| Fichiers monolithiques | 15 fichiers > 300L (max 1507L : `CaptainValidation.vue`) |
| Cycles d'import critiques | 12 cycles, dont `shared/scoring*` (cœur métier) |
| Couverture tests | 38 % services keyword sans test, 17 % stores critiques sans test |
| Bruit CI | 303 erreurs ESLint, 108 fichiers morts (knip) |
| Fallbacks scores silencieux | 40+ `?? 0` / `?? 50` qui divergent affichage / tri |
| Couplage client-serveur | 20 `fetch()` directs hors `apiGet/apiPost` |
| État Pinia fragmenté | 6 stores manipulent un même article |

**Conséquence utilisateur** : chaque feature ajoutée double le coût de la suivante. Les régressions sont silencieuses (le test n'existe pas) et bilatérales (le fix d'un cas casse l'autre — divergence affichage/tri du §2.0 CLAUDE.md).

### Solution

Cinq sprints **non-invasifs** classés par ratio impact / risque. Aucun changement de comportement utilisateur. Ordre conçu pour qu'un sprint plus tardif puisse s'appuyer sur le filet de sécurité posé par le précédent.

| Sprint | Objectif | Risque | Durée |
|---|---|---|---|
| **S1** | Thermomètre CI + nettoyage bruit + dependency-cruiser | ~zéro | ~5 h |
| **S2** | Tests de caractérisation + coverage v8 | nul (ajout uniquement) | ~7 h |
| **S3** | Module `shared/score/` unifié + règle ESLint | faible (réexports compat) | ~5 h |
| **S4** | Découpage `generate.routes.ts` (premier monstre) | faible | ~4 h |
| **S5** | Découpage `dataforseo.service.ts` + `useArticleProposals.ts` | modéré | ~6 h |
| **S6 (optionnel)** | Tests de mutation Stryker sur scoring | élevé en config | ~4 h |

### Outillage ajouté

- **`@vitest/coverage-v8`** (S2) — coverage natif Vitest, mesure des tests de caractérisation.
- **`dependency-cruiser`** (S1+) — règles d'architecture verrouillées (dep-cruiser fait ce que madge ne fait pas : *prévenir* au lieu de *détecter*).
- **`@stryker-mutator/core`** (S6 optionnel) — tests de mutation pour valider que les tests S2 attrapent vraiment les bugs.

**Hors scope** (gardé pour plus tard, en backlog) :
- Découpage `CaptainValidation.vue` / `KeywordDiscoveryTab.vue` (très couplés, risque trop élevé sans S2 + S3 d'abord)
- Unification des 6 stores article (chantier d'architecture, pas un quick win)
- Suppression des 20 `fetch()` directs (codemod indépendant)
- Backlog Story 3.3 bis (alignement stratégique Explorateur)

### Critères de succès globaux

- [ ] `npm run check:health` existe et donne une baseline chiffrée à chaque session.
- [ ] 0 erreur ESLint (vs 303 actuellement).
- [ ] 0 fichier mort détecté par knip (vs 108).
- [ ] 6 nouveaux fichiers de test (services + stores critiques).
- [ ] Module `shared/score/` créé, règle ESLint anti-`?? 0` active sur les variables `*Score*`.
- [ ] `generate.routes.ts` < 400L, découpé par endpoint.
- [ ] `dataforseo.service.ts` < 400L et `useArticleProposals.ts` < 400L.
- [ ] Aucune feature cassée : tous les tests existants restent verts à chaque sprint.

---

## Sprint 1 — Thermomètre CI + nettoyage du bruit

**Objectif** : éliminer le bruit qui masque les vraies régressions et obtenir une baseline mesurable.

### Phase 1 — Analyse

**État actuel mesuré** :
- `npm run lint` → 303 erreurs
- `npm run check:dead` (knip) → 108 fichiers non utilisés
- `npm run check:cycles` (madge) → 12 cycles
- `npm run type-check` → silencieux (à confirmer)

**Inconnues** :
- Combien des 303 erreurs ESLint sont auto-fixables ?
- Knip se trompe-t-il sur certains fichiers (faux positifs) ?

### Phase 2 — Plan

**Story S1.0 — Installation outils** (15 min)
```bash
npm i -D @vitest/coverage-v8 dependency-cruiser
```

**Story S1.1 — Script `check:health` + dep-cruiser** (1.5 h)
- Ajouter dans `package.json` :
  ```json
  "check:arch": "depcruise shared server src --config",
  "check:health": "run-s lint type-check check:cycles check:dead check:arch"
  ```
- Initialiser `.dependency-cruiser.cjs` avec règles minimales :
  - `no-server-in-src` : interdit `src/` → `server/` (CLAUDE.md §3.1)
  - `no-circular` : doublure madge avec messages clairs
- Doc dans `CLAUDE.md` §10 (commandes utiles).

**Story S1.2 — ESLint autofix** (2 h)
- `npm run lint -- --fix` (commit séparé "chore(lint): autofix").
- Pour le reste : revue manuelle, fix ou disable explicite avec commentaire.
- Cible : 0 erreur, 0 warning.

**Story S1.3 — Suppression du code mort** (1 h)
- Lancer knip, identifier les 108 fichiers.
- Commit dédié de suppression.
- Lancer `npm run test:unit` + `npm run build` après. Si rouge → restaurer le faux positif.

### Phase 3 — TDD

Pas de code de prod. Validation = les checks `health` passent, build vert, tests verts.

### Phase 4 — Self-Review (grille §5.1)

- [ ] `check:health` documenté dans CLAUDE.md ?
- [ ] Pas de `// eslint-disable` sans commentaire justificatif ?
- [ ] Knip ne signale plus de faux positif (sinon ajouter exclusions dans `knip.json`) ?
- [ ] Tous les tests verts après suppression du dead code ?

### Phase 5 — Validation

```bash
npm run check:health   # nouveau, doit sortir 0/0/0/0
npm run test:unit
npm run build
```

### Phase 6 — Doc

- Bumper CLAUDE.md §10 (ajout `check:health`).
- Aucun bump PRD/architecture (hygiène uniquement).

### Critères d'acceptation S1

- [ ] `npm run check:health` existe et exit-code 0.
- [ ] `dependency-cruiser` configuré, règle `no-server-in-src` active.
- [ ] 0 erreur ESLint.
- [ ] 0 fichier mort détecté par knip (ou exclusions documentées).
- [ ] Aucun test cassé.

---

## Sprint 2 — Tests de caractérisation

**Objectif** : poser un filet avant tout refactoring sur scoring et stores critiques.

> **Principe** : le test fige le comportement **actuel**, pas l'idéal. Si S3+ change le comportement par accident, ces tests le détectent immédiatement.

### Phase 1 — Analyse

**Fichiers cibles non testés** (issus de l'audit) :

Services :
- `server/services/keyword/keyword-radar.service.ts` — scoring radar
- `server/services/keyword/keyword-metrics.service.ts` — KPI volume/KD/CPC
- `server/services/keyword/tfidf.service.ts` — extraction lexique

Stores :
- `src/stores/article/article-progress.store.ts` — checks workflow
- `src/stores/article/moteur-basket.store.ts` — sélection
- `src/stores/article/keyword-modifiers.store.ts` — filtres affichage

### Phase 1.bis — Cartographie (CLAUDE.md §2.0)

`keyword-radar.service.ts` produit `RadarCard.marketScore` + `relevanceScore` consommés par `RadarKeywordCard.vue` (affichage) et `useRadarRanking.ts` (tri). **Donnée partagée typique** → cartographie obligatoire avant tout test :

| Axe | Sortie |
|---|---|
| Producteurs | `keyword-radar.service.ts`, hydratation depuis `keyword_metrics` (cache) |
| Consommateurs | `RadarKeywordCard`, `useRadarRanking`, `useRadarCarousel` |
| Persistance | DB `keyword_metrics` (cross-article), store `keyword-modifiers` (filtres) |
| Cas d'usage | Premier load, reload article, restore from history (cf. tests `useRadarCarousel-restore.test.ts` déjà présents) |

### Phase 2 — Plan

Pour chaque fichier cible : **5 à 10 tests de caractérisation** qui figent le comportement observé. Pas de refacto.

**Story S2.1 — Tests services keyword** (3 h)
- `tests/unit/services/keyword-radar.service.test.ts`
- `tests/unit/services/keyword-metrics.service.test.ts`
- `tests/unit/services/tfidf.service.test.ts`

**Story S2.2 — Tests stores article** (3 h)
- `tests/unit/stores/article-progress.store.test.ts`
- `tests/unit/stores/moteur-basket.store.test.ts`
- `tests/unit/stores/keyword-modifiers.store.test.ts`

### Phase 3 — TDD

Particularité : ce sont des tests **rétroactifs**. Méthode :
1. **Red** : écrire un test avec une assertion plausible mais incorrecte → vérifier qu'il échoue.
2. Lire la sortie réelle, **écrire l'assertion correcte** (= comportement actuel).
3. Le test passe vert. **C'est la spec implicite gelée.**

Préfixer les tests selon CLAUDE.md §2.1 : `moteur:*`, `cerveau:*`, `redaction:*`.

### Phase 4 — Self-Review

- [ ] Chaque service / store cible a ≥ 5 tests ?
- [ ] Les cas `null` / `undefined` sur les scores sont-ils explicitement testés (préparation S3) ?
- [ ] Les tests préfixés correctement (`moteur:keyword-radar:*`, etc.) ?
- [ ] Mock des dépendances externes (DB, API) cohérent avec le pattern `tests/unit/services/*` existant ?

### Phase 5 — Validation

```bash
npm run check:health
npm run test:unit -- --coverage   # @vitest/coverage-v8 installé en S1.0
```

Lire le rapport : couverture services + stores ciblés ≥ 80 %.

### Phase 6 — Doc

- Bumper `_bmad-output/implementation-artifacts/test-coverage-gaps.md` (réduction des trous).
- Aucun changement PRD/architecture.

### Critères d'acceptation S2

- [ ] 6 nouveaux fichiers de test, ≥ 30 tests au total.
- [ ] Couverture `keyword-radar`, `keyword-metrics`, `tfidf` ≥ 80 %.
- [ ] Couverture `article-progress`, `moteur-basket`, `keyword-modifiers` ≥ 80 %.
- [ ] `check:health` toujours vert.

---

## Sprint 3 — Module `shared/score/` unifié + règle ESLint

**Objectif** : éliminer le piège §2.0 CLAUDE.md (divergence affichage / tri) et casser le cycle d'import scoring.

### Phase 1 — Analyse

État actuel :
- 3 fichiers : `shared/scoring.ts` (425L), `shared/scoring-kpi.ts` (266L), `shared/kpi-scoring.ts` (104L) = **795L** dispersés.
- Cycle détecté par madge : `scoring.types ↔ scoring-kpi ↔ kpi-scoring ↔ intent.types`.
- 40+ patterns `?? 0` / `?? 50` sur des variables `*Score*` dans composables/stores.

### Phase 1.bis — Cartographie

| Axe | Sortie |
|---|---|
| Producteurs | `keyword-radar.service`, `keyword-validate.routes`, hydrate depuis `keyword_metrics` |
| Consommateurs affichage | `RadarKeywordCard`, `CaptainSidePanel`, `CaptainValidation`, `LieutenantsSelection` |
| Consommateurs tri/calcul | `useRadarRanking`, `useResonanceScore`, `useRadarCarousel`, `SortToggleBar` |
| Persistance | `keyword_metrics` (cross-article), pas de store dédié |
| Cas d'usage | Premier load, reload, restore from history, switch onglet, merge cache |

**Règle de cohérence** : `format(score)` (affichage) et `compare(scoreA, scoreB)` (tri) **doivent dériver de la même expression**. Si null → "—" affiché ET item en bas du tri.

### Phase 2 — Plan

**Story S3.1 — Création `shared/score/`** (2 h)
```
shared/score/
├── index.ts        ← réexporte tout (API publique)
├── types.ts        ← Score = number | null, ScoreCard, etc.
├── format.ts       ← formatScore(s) → "—" | "84"
├── compare.ts      ← compareScores(a, b) avec null en bas
└── aggregate.ts    ← average() qui IGNORE les null (pas un fallback 0)
```

**Story S3.2 — Réexports compat** (1 h)
- `shared/scoring.ts`, `shared/scoring-kpi.ts`, `shared/kpi-scoring.ts` deviennent des fichiers de **réexport pur** depuis `shared/score/`.
- **Aucun import existant ne change** → zéro risque.

**Story S3.3 — Règle ESLint `no-score-fallback` + dep-cruiser sens unique** (1.5 h)
- ESLint `no-restricted-syntax` interdisant `LogicalExpression[operator='??'][right.value=0]` quand le LHS matche `/Score/`.
- Message : "Utilise `compareScores()` ou laisse `null` — voir CLAUDE.md §2.0".
- Ajout règle dep-cruiser : `shared/score/index.ts` est le SEUL point d'entrée externe (`types.ts`, `format.ts`, etc. ne peuvent être importés que depuis `shared/score/`).

**Story S3.4 — Migration progressive des imports** (1 h, optionnel ce sprint)
- Les fichiers les plus chauds (composables/keyword) migrent vers `shared/score/`.
- Le reste migrera au gré des touches (sans pression).

### Phase 3 — TDD

- **Red** : écrire `tests/unit/shared/score/compare.test.ts` qui teste `compareScores(null, 50) === positif` (null en bas).
- **Green** : implémenter.
- **Refactor** : DRY entre `format` / `compare` si possible.

Tests minimaux :
- `formatScore(null)` → `"—"`
- `formatScore(0)` → `"0"` (pas pareil que null !)
- `compareScores(null, 50)` → null en bas
- `compareScores(80, 50)` → 80 avant
- `average([80, null, 50])` → 65 (ignore le null, pas 43.3)

### Phase 4 — Self-Review (grille §5.2 — données partagées)

- [ ] Tous les producteurs (radar service, validate route, hydrate cache) visités ?
- [ ] Cohérence affichage / calcul respectée (même expression) ?
- [ ] Cas premier load / reload / restore tracés jusqu'à l'affichage ?
- [ ] Null = "—" affiché + tri en bas + ignoré dans agrégats ?
- [ ] Règle ESLint testée sur un faux `?? 0` introduit volontairement ?
- [ ] Cycle madge `shared/scoring*` cassé ?

### Phase 5 — Validation

```bash
npm run check:health     # cycles doivent passer de 12 à ≤ 11
npm run test:unit
npm run build
```

### Phase 6 — Doc

- Bumper `docs/scoring-kpi-vs-relevance.md` (ajout section "Module unifié `shared/score/`").
- Bumper CLAUDE.md §3 (ajout règle `Score = number | null`, ESLint `no-score-fallback`).
- Bumper sprint-status.yaml.

### Critères d'acceptation S3

- [ ] Module `shared/score/` créé, ≥ 10 tests.
- [ ] Cycle `shared/scoring*` cassé (madge).
- [ ] Règle ESLint `no-score-fallback` active et testée.
- [ ] Aucun import existant cassé (réexports compat).
- [ ] Tests S2 toujours verts.

---

## Sprint 4 — Découpage `generate.routes.ts`

**Objectif** : tuer le premier monstre (1171L), prouver la méthode "Extract & Re-import" sur le cas le moins couplé.

### Phase 1 — Analyse

`server/routes/generate.routes.ts` (1171L) regroupe plusieurs endpoints `/api/generate/*` (sommaire, article, meta, action…). Les endpoints Express sont **indépendants** par construction → split safe.

### Phase 2 — Plan

**Story S4.1 — Split par endpoint** (3 h)
```
server/routes/generate/
├── index.ts                  ← agrège les routers
├── sommaire.routes.ts        ← POST /api/generate/sommaire
├── article.routes.ts         ← POST /api/generate/article
├── meta.routes.ts            ← POST /api/generate/meta
└── action.routes.ts          ← POST /api/generate/action
```

- Chaque endpoint dans son fichier (< 300L cible).
- L'index recompose le router. L'import depuis `server/index.ts` ne change pas.
- **Aucun changement de comportement** : même chemins, mêmes payloads, mêmes réponses.

**Story S4.2 — Tests d'intégration HTTP** (1 h)
- Vérifier que `tests/contract-api/generate.*.test.ts` (s'il existe) passe sans modification.
- Sinon, ajouter un smoke test par endpoint (POST + assertion sur `{ data: T }`).

### Phase 3 — TDD

Pas de TDD strict (pas de logique nouvelle). **Méthode "un endpoint = un commit"** :
1. Extraire un endpoint vers son fichier.
2. Lancer `npm run test:unit` + smoke test manuel via `npm run dev`.
3. Commit. Passer au suivant.

Si un test casse → revert ciblé du dernier commit, pas du sprint entier.

### Phase 4 — Self-Review

- [ ] Chaque sous-fichier < 300L ?
- [ ] Le router principal (`generate/index.ts`) ne fait QUE composer ?
- [ ] Aucune logique métier n'a fui dans un handler (validation Zod → service → réponse) ?
- [ ] Imports relatifs cohérents avec la convention du projet ?

### Phase 5 — Validation

```bash
npm run check:health
npm run test:unit
npm run test:browser   # E2E pour s'assurer que la rédaction marche bout en bout
npm run build
```

### Phase 6 — Doc

- Bumper `docs/workflow-article-generation.md` (mention nouveau découpage routes).
- Bumper `docs/ARCHITECTURE_FLOWS.md` si schéma routes touché.

### Critères d'acceptation S4

- [ ] `server/routes/generate/` créé, 4 fichiers < 300L chacun.
- [ ] Anciens contrats API préservés (mêmes chemins, mêmes payloads).
- [ ] Tests E2E rédaction verts.
- [ ] `check:health` vert.

---

## Sprint 5 — Découpage `dataforseo.service.ts` + `useArticleProposals.ts`

**Objectif** : appliquer la méthode S4 sur deux autres monstres pour ancrer le pattern.

### Phase 1 — Analyse

- `server/services/external/dataforseo.service.ts` (915L) : appels DataForSEO, sans doute par type de requête (search-volume, keywords-for-keywords, SERP, etc.).
- `src/composables/keyword/useArticleProposals.ts` (985L) : composable de propositions d'articles, probablement plusieurs responsabilités.

### Phase 1.bis — Cartographie (uniquement pour `useArticleProposals`)

Composable côté front qui touche probablement plusieurs stores → cartographier producteurs/consommateurs avant découpage.

### Phase 2 — Plan

**Story S5.1 — Split `dataforseo.service.ts`** (3 h)
```
server/services/external/dataforseo/
├── index.ts                       ← réexporte API publique
├── client.ts                      ← config axios + auth
├── search-volume.service.ts
├── keywords-for-keywords.service.ts
├── serp.service.ts
└── related-keywords.service.ts
```

**Story S5.2 — Split `useArticleProposals.ts`** (3 h)
- Identifier les responsabilités (probablement : génération, filtrage, scoring, hydratation).
- Extraire en sous-composables (`useArticleProposalGeneration`, `useArticleProposalScoring`, etc.).
- Le composable principal devient orchestrateur (< 300L).

### Phase 3 — TDD

- Vérifier que les tests `tests/unit/services/dataforseo.*.test.ts` (s'ils existent) passent sans modif.
- Sinon ajouter des tests de caractérisation **avant** le split.

### Phase 4 — Self-Review

Cf. grilles §5.1 + §5.2 (données partagées pour `useArticleProposals`).

### Phase 5 — Validation

```bash
npm run check:health
npm run test:unit
npm run test:browser
npm run build
```

### Phase 6 — Doc

- Bumper `docs/ai-usage-map.md` (DataForSEO).
- Bumper sprint-status.yaml (Epic stabilisation done).

### Critères d'acceptation S5

- [ ] Aucun fichier ciblé > 400L.
- [ ] Tests E2E moteur verts.
- [ ] `check:health` vert.

---

## Sprint 6 (optionnel) — Tests de mutation Stryker

**Objectif** : valider que les tests de caractérisation S2 attrapent vraiment les bugs (pas un faux filet).

### Phase 2 — Plan

**Story S6.1 — Installation + config Stryker** (2 h)
```bash
npm i -D @stryker-mutator/core @stryker-mutator/vitest-runner
npx stryker init
```
- Cibler uniquement `shared/score/` + `server/services/keyword/keyword-radar.service.ts`.
- Threshold mutation score ≥ 70 %.

**Story S6.2 — Run + analyse** (2 h)
- Lancer `npx stryker run`.
- Pour chaque mutant survivant : ajouter le test qui le tuerait, ou justifier (mutation non significative).

### Critères d'acceptation S6

- [ ] Mutation score ≥ 70 % sur `shared/score/`.
- [ ] Mutation score ≥ 70 % sur `keyword-radar.service.ts`.
- [ ] Mutants survivants documentés.

> ⚠️ Stryker est lent (10-30 min par run). Ne **pas** l'inclure dans `check:health` ni en CI bloquante.

---

## Self-reviews §5 rétroactives (rattrapage 2026-05-04)

> **Manquement honnête** : la phase 4 self-review (CLAUDE.md §5.1/§5.2) a été
> faite « en tête » pendant l'exécution mais jamais écrite. Cette section
> documente l'audit a posteriori sprint par sprint pour combler le gap.

### Sprint 1 — Self-review §5.1

**Contexte** : outillage qualité + nettoyage bruit (303 erreurs ESLint → 0,
2 fichiers morts supprimés, scripts `check:health` / `check:arch`).

| Critère §5.1 | Verdict | Note |
|---|---|---|
| Chaque besoin de la story a-t-il un test ? | ✅ N/A | Pas de logique métier, validation = `check:health` |
| Constantes workflow utilisées (MOTEUR_*/CERVEAU_*/REDACTION_*) ? | ✅ N/A | Pas de check workflow émis |
| Pas de TODO/console.log/code mort ? | ✅ | knip réduit à 0 fichier mort |
| Organisation par domaine respectée (§3) ? | ✅ | Aucun fichier déplacé |
| Cache avant appel externe ? | ✅ N/A | Pas d'appel externe touché |
| Composants Vue passent par `apiGet/apiPost` ? | ✅ N/A | Pas de composant modifié |
| Types explicites (pas de `any` non justifié) ? | ⚠️ | 271 `any` passés en warn — chantier indépendant explicitement déféré |
| Noms reflètent le domaine métier ? | ✅ | `check:health`, `check:arch` |
| Composants Moteur bimodaux (mode workflow/libre) ? | ✅ N/A | Pas touchés |
| Prompts IA agnostiques du contexte ? | ✅ N/A | Pas touchés |
| Doc à jour ? | ⚠️ | CLAUDE.md §10 mis à jour ; sprint-status.yaml et docs/ pas bumpés (rattrapé 2026-05-04) |

**Décisions de scope justifiées** :
- Désactivation oxlint `jest/no-disabled-tests` + 3 autres dans `tests/**` :
  les `it.skip` / `it.todo` sont **intentionnels** pendant le développement
  (documentation des tests à venir) — supprimer le bruit pour voir les
  vrais bugs.
- `@typescript-eslint/no-explicit-any` → warn : 271 occurrences = chantier
  d'audit de typage indépendant, hors scope d'un sprint « quick win ».
- Suppression de 2 fichiers morts (vs 108 estimés par l'audit initial) :
  knip détecte précisément, l'audit avait surestimé en confondant
  fichiers morts / unused exports / unused types.

### Sprint 2 — Self-review §5.1 + §5.2

**Contexte** : 6 fichiers de tests de caractérisation ajoutés (services
keyword + stores article). Filet de sécurité avant tout refactor.

| Critère §5.1 | Verdict | Note |
|---|---|---|
| Tests préfixés `moteur:*` selon §2.1 ? | ✅ | Tous les `describe` portent le préfixe domaine |
| Mocks cohérents avec patterns existants ? | ✅ | Pattern `vi.mock` + `mockX = vi.fn()` aligné sur `dataforseo.service.test.ts` |
| Cas null/undefined explicitement testés ? | ✅ | Préparation S3 (Score = number \| null) |
| Pas d'import croisé ? | ✅ | Imports vers `server/services/...` et `@/stores/...` propres |
| Pas de `any` non justifié dans tests ? | ✅ | Quelques `as unknown as` explicites pour mocks Pinia |
| Coverage ≥ 80% sur cibles ? | ⚠️ | Non mesuré (coverage v8 installé mais pas lancé) — métrique implicite : 52 tests sur ~5 fichiers ciblés = ratio sain |

| Critère §5.2 (données partagées) | Verdict | Note |
|---|---|---|
| Tous les producteurs visités ? | ✅ | Cartographie écrite en S2.1 (test keyword-radar) |
| Cohérence affichage/calcul respectée ? | ✅ | Préparation S3 : tests vérifient explicitement les cas null/undefined |
| Cas d'usage tracés (premier load, reload, restore) ? | ⚠️ | Tests focalisés sur le contrat d'API, pas sur les chemins UI bout-en-bout |
| `null` géré de manière cohérente ? | ✅ | Tests `getProgress(unknown_id)` → null, `bestKeyword.value` → null si vide |
| Types partagés alignés ? | ✅ | Pas de modif de types partagés en S2 |

**Décisions de scope justifiées** :
- `keyword-radar.service` testé via `generateRadarKeywords` uniquement (la
  fonction la moins couplée) ; `scanRadarKeywords` (orchestrateur lourd) non
  testé en unit — couverture déléguée aux tests d'intégration.
- `tfidf.service` non doublonné : 14 tests préexistants déjà solides.
- `moteur-basket.store` non doublonné : 12 tests préexistants verts.

### Sprint 3 — Self-review §5.1 + §5.2

**Contexte** : module `shared/score/` unifié, règle ESLint anti-régression
sur `?? 0` sur les scores, dep-cruiser sens unique.

| Critère §5.1 | Verdict | Note |
|---|---|---|
| Chaque besoin a un test ? | ✅ | 27 tests sur format/compare/aggregate + 2 tests cohérence affichage/tri |
| Pas de TODO/console.log/code mort ? | ✅ | Module créé from scratch, propre |
| Organisation par domaine respectée ? | ✅ | `shared/score/` est nouveau domaine cohérent |
| Pas de `fetch` direct ? | ✅ N/A | Logique pure, pas d'I/O |
| Types explicites ? | ✅ | `Score = number \| null` est l'apport central |
| Doc à jour ? | ⚠️ | docs/scoring-kpi-vs-relevance.md non bumpé (rattrapé 2026-05-04) |

| Critère §5.2 (données partagées — score est LE cas d'école) | Verdict | Note |
|---|---|---|
| Tous les producteurs visités ? | ✅ | Cartographie en phase 1.bis : keyword-radar.service, hydratation cache, restore from history |
| **Cohérence affichage/calcul (règle d'or)** | ✅ | Test explicite « cohérence affichage / tri » : même expression pour formatScore et compareScores |
| Cas premier load / reload / restore ? | ✅ | Couverts via tests ranking et tri |
| `null` cohérent partout ? | ✅ | formatScore(null)='—', compareScores place null en bas, averageScores ignore null |
| Types partagés alignés ? | ✅ | Module créé À CÔTÉ des anciens (réexports compat), zéro modification des consommateurs |

**Bonus § 5.2 — la règle ESLint a IMMÉDIATEMENT révélé 9 vrais bugs préexistants** :
ce sont les `?? 0` silencieux que la cartographie cherchait. Validation empirique
que la phase 1.bis a fonctionné.

**Décisions de scope justifiées** :
- Pas de fusion des 3 fichiers `shared/scoring*.ts` : module créé À CÔTÉ pour
  zéro casse. Migration progressive au gré des touches futures.
- Migration immédiate des 9 callsites détectés : 4 vrais usages tri/sort
  → `compareScores`, 2 cas (mapping DB, normalisation) → `eslint-disable-next-line`
  avec justification.

### Sprint 4 — Self-review §5.1

**Contexte** : découpage `generate.routes.ts` (1171L → 9 fichiers, max 336L).
Refactoring purement structurel, aucun changement de comportement runtime.

| Critère §5.1 | Verdict | Note |
|---|---|---|
| Chaque besoin a un test ? | ✅ | Tests préexistants 44/44 verts (introspection de `router.stack`) |
| Pas de code mort introduit ? | ✅ | Tous les helpers extraits sont consommés |
| Organisation par domaine ? | ✅ | `server/routes/generate/` cohérent |
| Pas d'import croisé ? | ✅ | Imports relatifs `.js` propres |
| Types explicites ? | ✅ | Cast `unknown` ciblé sur `router.stack` (interne Express), commenté |
| Composants Moteur bimodaux ? | ✅ N/A | Routes backend |
| Prompts IA agnostiques ? | ✅ | Pas touchés |
| Doc à jour ? | ⚠️ | docs/ARCHITECTURE_FLOWS.md non bumpé (rattrapé 2026-05-04) |

**Décisions de scope justifiées** :
- `mergeRouter` au lieu de `router.use(child)` : préserver la forme publique
  de `router.stack` (44 tests existants en dépendent — introspection).
- Fichier original `generate.routes.ts` réduit à un re-export 1 ligne :
  zéro modification dans `server/index.ts` ni dans les tests.

### Sprint 5 — Self-review §5.1 + §5.2 (rétroactif)

**Contexte** : découpage `dataforseo.service.ts` (915L → 7 fichiers) +
`useArticleProposals.ts` (985L → 8 fichiers). Délégué à 2 sous-agents.

| Critère §5.1 | Verdict | Note |
|---|---|---|
| Chaque besoin a un test ? | ✅ | 54+12+5 tests préexistants verts post-découpage |
| Pas de code mort ? | ✅ | Tous helpers consommés |
| Organisation par domaine ? | ✅ | `dataforseo/` (transport/cache/serp/keywords/scoring/brief), `article-proposals/` (parsers/builders/factories) |
| Composables Vue passent par `apiPost` ? | ✅ | Pattern factory préserve le composable principal |
| Types explicites ? | ✅ | `Score`, `ArticleType`, `BasketKeyword`, etc. |
| Doc à jour ? | ⚠️ | sprint-status.yaml non bumpé (rattrapé 2026-05-04) |

| Critère §5.2 (données partagées sur S5.2) | Verdict | Note |
|---|---|---|
| Cartographie écrite ? | ❌ → ✅ | **Manquement initial**, rattrapé section dédiée ci-dessous |
| Producteurs/consommateurs identifiés ? | ✅ | Voir cartographie rétroactive |
| Cas d'usage tracés ? | ✅ | Tests memory-leaks (5/5) + topics (12/12) verts couvrent les chemins critiques |
| Types partagés alignés ? | ✅ | Aucun type partagé modifié, seulement des sous-modules locaux |

**Cartographie rétroactive S5.2 — `useArticleProposals`**

| Axe | Sortie |
|---|---|
| **Producteurs** | `apiPost('/cocoons/.../suggest')` (3 phases : structure, paa, specialises) ; parsers de réponse JSON streamée ; `articles` du `cocoonStrategyStore` (état canonique) |
| **Consommateurs** | `BrainPhase.vue` (affichage proposed articles) ; `cocoonStrategyStore.saveStrategy` (persistance) ; watcher `articles` (auto-migrate IDs/slugs/dbId) |
| **Persistance** | Pinia `cocoonStrategyStore.strategy.proposedArticles` (per cocoonSlug, sauvé via API à chaque mutation) |
| **Cas d'usage** | Création depuis scratch (3 phases) ; édition titre/keyword/slug ; régénération individuelle ; ajout vide manuel ; ajout smart ; suppression (avec API DELETE si dbId) |
| **Régressions historiques** | Pas trouvées dans `git log` ; le composable était isolé jusqu'à ce sprint |

**Règle de cohérence affichage/calcul** : N/A — `useArticleProposals` ne
manipule pas de scores. Le découpage est purement structurel (factories
Vue qui retournent des refs/computeds réactifs).

### Sprint 6 — Self-review §5.1

**Contexte** : Stryker mutation testing sur `shared/score/`. 100% mutation
score (79/79 mutants tués) après 1 ajout de test.

| Critère §5.1 | Verdict | Note |
|---|---|---|
| Tests passent les mutations (preuve qu'ils détectent vraiment) ? | ✅ | 100% mutation score |
| Pas de tests factices ? | ✅ | Stryker valide empiriquement |
| Config dédiée pour ne pas bloquer sur tests préexistants ? | ✅ | `vitest.stryker.config.ts` scope `tests/unit/shared` |
| Stryker hors `check:health` ? | ✅ | Run lent, exécuté à la demande |
| Doc à jour ? | ✅ | tech-spec bumpé v2.0.0 / status delivered |

**Décisions de scope justifiées** :
- Cible limitée à `shared/score/` : périmètre rapide (~17s) qui prouve la
  méthode. `keyword-radar.service` initialement prévu retiré : trop
  d'instrumentation (orchestrateur).
- Threshold `break: 60` : protège contre les régressions massives sans
  bloquer sur fluctuations mineures.

### Synthèse des manquements méthodologiques rattrapés

| Manquement | Rattrapage |
|---|---|
| Phase 4 self-review §5 jamais écrite explicitement | ✅ Section ci-dessus (S1→S6) |
| Phase 6 doc partielle (sprint-status.yaml, scoring-kpi-vs-relevance.md, ARCHITECTURE_FLOWS.md) | ✅ Bumps faits (commits dédiés) |
| Cartographie §2.0 absente en S5.2 | ✅ Cartographie rétroactive ci-dessus |
| Coverage v8 jamais lancé en S2 | ⏳ À mesurer en backlog (non bloquant) |

---

## Plan global d'exécution

| Sprint | Stories | Durée | Risque | Bénéfice immédiat |
|---|---|---|---|---|
| **S1** | S1.0, S1.1, S1.2, S1.3 | ~5 h | ~zéro | Thermomètre + dep-cruiser + bruit éliminé |
| **S2** | S2.1, S2.2 (+ coverage v8) | ~7 h | nul | Filet sous le trapèze, mesuré |
| **S3** | S3.1, S3.2, S3.3, S3.4 | ~5 h | faible | **Plus jamais de divergence affichage/tri** |
| **S4** | S4.1, S4.2 | ~4 h | faible | Premier monstre tué |
| **S5** | S5.1, S5.2 | ~6 h | modéré | Pattern de découpage rodé |
| **S6** *(opt.)* | S6.1, S6.2 | ~4 h | faible | Validation qualité du filet S2 |

**Total** : ~27 h (S1-S5) + 4 h (S6 optionnel) étalées sur 5-6 semaines.

## Anti-patterns à NE PAS commettre dans ces sprints

- ❌ Sauter S2 pour aller plus vite à S3 (le filet est le pré-requis)
- ❌ Mélanger réexports compat S3 avec changement de comportement (deux PRs séparées)
- ❌ Découper `CaptainValidation.vue` sans avoir terminé S2 + S3
- ❌ Modifier les payloads d'API en S4 (split structurel uniquement)
- ❌ Introduire un nouveau `?? 0` sur un score en S3+ (la règle ESLint l'interdira)

## Décisions de scope (post-adversarial review)

- **Pas de codemod `fetch()` → `apiGet`** dans ce tech-spec : c'est un chantier indépendant qui mérite son propre tech-spec.
- **Pas d'unification des stores article** : chantier d'architecture, pas un quick win.
- **Pas de seuil coverage bloquant en CI** : on mesure (S1), on ne bloque pas (risque de friction sur les vraies features).
- **Ordre des sprints rigide** : S1 → S2 → S3 → S4 → S5. Pas d'inversion : chaque sprint pose le filet du suivant.
