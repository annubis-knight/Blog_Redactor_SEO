> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

---
title: 'Réintégration du painPoint dans les décisions du workflow Moteur'
slug: 'reintegration-painpoint-workflow-moteur'
created: '2026-04-24'
status: 'planned'
stepsCompleted: []
tech_stack: ['Vue 3 (Composition API)', 'TypeScript', 'Express', 'Claude Haiku (tool_use)', 'Embeddings (OpenAI text-embedding-3-small)', 'Vitest']
files_to_modify:
  - 'server/routes/keywords.routes.ts'
  - 'server/services/keyword/keyword-radar.service.ts'
  - 'server/services/intent/intent-scan.service.ts'
  - 'shared/scoring.ts'
  - 'shared/types/intent.types.ts'
  - 'src/components/intent/RadarKeywordCard.vue'
  - 'src/components/intent/RadarCarousel.vue'
  - 'src/composables/keyword/useRadarCarousel.ts'
code_patterns:
  - 'Composition API (ref/computed/watch)'
  - 'Prompt loader via loadPrompt() + {{placeholders}}'
  - 'classifyWithTool() avec tool_use Claude pour JSON strict'
  - 'computeCombinedScore() — single source of truth client+serveur'
  - 'Embeddings via computeSemanticScores() / embedding.service.ts'
  - 'RadarPaaItem { match: ResonanceMatch, matchQuality: RadarMatchQuality }'
test_patterns:
  - 'Vitest describe/it, tests/unit/'
  - 'Fixtures mock pour classifyWithTool (server/services/external/mock-fixtures/)'
  - 'Snapshot des score breakdowns pour non-régression'
---

# Tech-Spec: Réintégration du painPoint dans les décisions du workflow Moteur

**Created:** 2026-04-24

## Overview

### Problem Statement

Le `painPoint` d'un article — pourtant collecté et validé explicitement au Step 2 de la stratégie Brain-First — n'influence le workflow Moteur que **à l'entrée de la génération Radar** (prompt `intent-keywords.md`). Dès que le système quitte le monde des prompts pour entrer dans la mécanique de scoring/filtrage, la douleur disparaît totalement :

1. **Filtre de pertinence Discovery (`/keywords/relevance-score`)** — Le painPoint est envoyé dans `articleContext` mais noyé dans un bloc `contextLines` générique. Les règles du prompt parlent uniquement de "sujet", "secteur" et "intention" : Claude n'a aucune instruction explicite pour rejeter un keyword hors-douleur. Résultat : sur un article avec seed "site web" + painPoint "mon site ne convertit plus", le filtre conserve "créer site web gratuit" alors que la personne qui vit cette douleur ne le tapera jamais.

2. **Analyse IA Discovery (`/keywords/analyze-discovery`)** — Le painPoint est bien mis en avant (`painPointBlock`) mais utilisé comme **critère de priorisation** (`priority: high|medium|low`) plutôt que comme **critère d'inclusion**. Un keyword hors-douleur ressort en "low" au lieu d'être écarté.

3. **Scoring combiné Radar (`computeCombinedScore`)** — Les 5 composantes (PAA 30% / resonance 15% / opportunity 25% / intent 15% / CPC 15%) ignorent totalement la douleur. Un keyword peut scorer 90+ sans y répondre.

4. **Tags PAA (`matchResonanceDetailed`)** — Les tags `total|partial|none` × `exact|stem|semantic` sont calculés purement par matching lexical sur les `topicWords` du titre. Une PAA peut être taguée `total+exact` sans répondre à la douleur (ex: titre "Refonte site web" + painPoint "site ne convertit plus" → la PAA "Combien coûte une refonte de site web ?" matche exact mais est hors-douleur).

5. **UI Radar** — Rien ne signale visuellement à l'utilisateur qu'un keyword, même bien scoré, est hors-douleur.

### Solution

Réintégrer le `painPoint` comme signal de décision à 5 endroits clés du workflow, de façon additive (pas de régression pour les articles sans painPoint) :

1. **QW1** — Filtre Discovery : promouvoir le painPoint en critère éliminatoire explicite dans le prompt `classify_relevance` (sortir du `contextLines` générique, bloc dédié + règle de rejet).
2. **QW2** — Analyse IA Discovery : ajouter une instruction explicite "ne pas inclure même en `low` un keyword qu'une personne vivant cette douleur ne taperait pas".
3. **QW3** — Scoring combiné Radar : ajouter une 6ème composante `painAlignmentScore` basée sur embedding cosineSim entre painPoint et (keyword + reasoning). Repondération : PAA 25% / resonance 15% / opportunity 20% / intent 10% / CPC 10% / **painAlignment 20%**. **Pas de migration DB** — le breakdown est calculé en mémoire.
4. **QW4** — UI Radar : cards avec `painAlignmentScore` bas sont **grisées** (opacité réduite) mais restent actives/cliquables. Signal visuel passif, zéro élément ajouté à la card. Tri par défaut inchangé, mais le tri "alignement douleur" est disponible.
5. **QW5** — Tags PAA : ajouter une dimension `painAlignment: 'aligned' | 'partial' | 'off'` sur chaque `RadarPaaItem`, indépendante du `topicMatch` lexical. Le `paaWeightedScore` combine les deux (pondération 50/50 titre/douleur). La couleur/tag UI reflète le combiné.

### Scope

**In Scope:**
- QW1 : refonte prompt `classify_relevance` dans `keywords.routes.ts` (route `/keywords/relevance-score`)
- QW2 : durcissement prompt `curate_keywords` dans `keywords.routes.ts` (route `/keywords/analyze-discovery`)
- QW3 : ajout `painAlignmentScore` dans `shared/scoring.ts`, propagation via `RadarKeywordKpis`, calcul embedding dans `keyword-radar.service.ts`
- QW4 : prop `painAlignmentScore` sur `RadarKeywordCard`, classe CSS `radar-card--off-pain` avec opacité réduite, tri optionnel dans le carousel
- QW5 : nouveau champ `painAlignment` sur `RadarPaaItem`, fonction `computePainAlignmentForPaa()` dans `intent-scan.service.ts`, pondération 50/50 dans `computePaaWeightedScore`
- Tests unitaires pour `computeCombinedScore` (breakdown numérique stable)
- Fallback gracieux si `painPoint` absent (valeur neutre = comportement actuel)

**Out of Scope:**
- Migration DB (choix explicite de l'Option A — breakdown en mémoire)
- Guard-rail UI "painPoint manquant" (QW6 skippé)
- Exploitation structurée du `reasoning` avec un champ `painRelation` (QW7 reporté)
- Matrice de couverture douleurs↔articles au niveau cocon (hors scope, feature produit à part)
- Re-scoring rétroactif des anciennes explorations Radar cachées
- Pain validation multi-sources (DouleurIntentScanner) — déjà existant

## Context for Development

### Codebase Patterns

- **Prompt loader** : `loadPrompt('name', { placeholders })` charge `server/prompts/{name}.md` et substitue `{{var}}`. Fichiers `.md` avec frontmatter optionnel.
- **classifyWithTool** : wrapper Claude avec `tool_use` forçant JSON strict selon `input_schema`. Retourne `{ result, usage }`. Défini dans `server/services/external/ai-provider.service.ts`.
- **computeCombinedScore** : source of truth dans `shared/scoring.ts`, importée identiquement côté serveur (radar) ET client (affichage). **Toute modification de pondération impacte les deux côtés simultanément**, aucune migration nécessaire mais invalider les caches UI au déploiement.
- **Embeddings** : `computeSemanticScores(pairs)` dans `server/services/external/embedding.service.ts` prend des paires `{id, text1, text2}` et retourne un cosineSim [0,1]. Déjà utilisé pour upgrader les matches PAA `none→partial→total` (voir `intent-scan.service.ts:596-600`). Coût faible (~$0.0001/1k tokens).
- **RadarPaaItem structure** : `{ text, match: 'total'|'partial'|'none', matchQuality: 'exact'|'stem'|'semantic' }` — on ajoute `painAlignment: 'aligned'|'partial'|'off'` (pas de sous-champ quality pour l'instant).
- **Single-source update pattern** : modifier `shared/scoring.ts` UNE fois et TypeScript flag les call-sites. Ne pas dupliquer la formule.
- **Fallback pattern** : dans les prompts Claude, si un placeholder est absent le template le rend vide. Côté code : vérifier `painPoint?.trim()` avant d'ajouter la règle au prompt, et neutraliser `painAlignmentScore` à 50 (valeur neutre) si painPoint absent pour ne pas pénaliser.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `server/routes/keywords.routes.ts:615-715` | Route `/keywords/relevance-score` — QW1 à refondre ici (prompt systemPrompt strict + non-strict) |
| `server/routes/keywords.routes.ts:717-820` | Route `/keywords/analyze-discovery` — QW2 (durcir painPointBlock) |
| `server/services/keyword/keyword-radar.service.ts:205-382` | `scanRadarKeywords()` — QW3 point d'injection du `painAlignmentScore` (embedding painPoint vs keyword+reasoning) |
| `server/services/keyword/keyword-radar.service.ts:329-351` | Construction `RadarKeywordKpis` — ajouter champ `painAlignmentScore` |
| `shared/scoring.ts:22-60` | `computeCombinedScore` — QW3 ajouter la 6ème composante + repondérer |
| `shared/types/intent.types.ts` | `RadarKeywordKpis`, `RadarCombinedScoreBreakdown`, `RadarPaaItem` — ajouter les nouveaux champs |
| `server/services/intent/intent-scan.service.ts:153-180` | `matchResonanceDetailed()` — QW5 dimension lexicale inchangée, on ajoute une fonction sœur `matchPainAlignment()` |
| `server/services/intent/intent-scan.service.ts:186-210` | `computePaaWeightedScore()` — QW5 pondération 50/50 titre/douleur |
| `server/services/intent/intent-scan.service.ts:580-610` | Upgrade sémantique PAA via embeddings — pattern à réutiliser pour le painAlignment |
| `src/components/intent/RadarKeywordCard.vue` | QW4 — ajouter classe `radar-card--off-pain` conditionnelle, opacité réduite (comme `.source-item--irrelevant` dans `KeywordDiscoveryTab.vue:979-986`) |
| `src/composables/keyword/useRadarCarousel.ts` | QW4 — option de tri "alignement douleur" |
| `server/services/external/embedding.service.ts` | API `computeSemanticScores(pairs)` déjà en place |
| `server/services/external/ai-provider.service.ts` | `classifyWithTool` — pattern pour QW1/QW2 |

### Current vs Target behavior

| Situation | Avant | Après |
| --------- | ----- | ----- |
| Seed "site web", painPoint "ne convertit pas", keyword "créer site web gratuit" | Gardé par relevance-score | Rejeté par relevance-score (hors-douleur explicite) |
| Analyse IA Discovery, keyword hors-douleur mais bien scoré volume | Sortirait en `priority: low` | Pas sélectionné du tout |
| Radar keyword bien scoré PAA/volume mais hors-douleur | Combined score ~85, affiché en tête | Combined score ~65, card grisée dans la liste |
| PAA "Combien coûte une refonte ?" sur article "ne convertit plus" | Tag `total+exact` | Tag combiné `off-pain` + pondération réduite dans paaWeightedScore |
| Article sans painPoint (legacy ou création manuelle) | Workflow actuel | Identique (painAlignmentScore = 50 neutre, pas de règle de rejet ajoutée au prompt) |

## Implementation Steps

### Step 1 — QW1 + QW2 : filtres Discovery (sans embedding, uniquement prompt)

1. **`server/routes/keywords.routes.ts:615-715`** (`/keywords/relevance-score`) :
   - Extraire `articleContext.painPoint` hors de `contextLines`. Créer une variable dédiée `painPointDirective`.
   - Si `painPoint` non-vide, injecter dans les deux systemPrompts (strict + non-strict) un bloc :
     ```
     POINT DE DOULEUR DE L'ARTICLE : "{{painPoint}}"
     Un mot-clé doit être rejeté s'il ne peut raisonnablement PAS être tapé par une personne qui vit cette douleur. Un keyword peut être "sur le même sujet" que le seed tout en étant complètement inadapté à la douleur — dans ce cas, rejette-le.
     ```
   - Ajouter un exemple aux "Rejette systématiquement" du strict prompt.
   - Logger : inclure `painPoint` dans le log d'appel (tronqué à 80 chars).

2. **`server/routes/keywords.routes.ts:717-820`** (`/keywords/analyze-discovery`) :
   - Modifier `painPointBlock` pour imposer l'exclusion (pas juste la priorisation) :
     ```
     POINT DE DOULEUR CLIENT (critère d'inclusion/exclusion) :
     "{{painPoint}}"
     Règle stricte : ne sélectionne PAS un mot-clé (même pas en "low") si une personne vivant cette douleur n'a aucune raison de le taper. La priorité "high" reste réservée aux keywords qui captent ou répondent directement à la douleur.
     ```

3. **Tests** :
   - Ajouter 2 tests dans `tests/unit/routes/keywords.routes.test.ts` (ou créer) avec fixture mock de `classifyWithTool` vérifiant que le prompt contient bien le bloc `POINT DE DOULEUR` quand painPoint est fourni, et NE le contient PAS quand painPoint est absent.

**Acceptance:**
- Avec painPoint fourni, les 2 prompts contiennent un bloc dédié explicite.
- Sans painPoint, les prompts sont identiques au comportement actuel (zéro régression).
- Logs backend exposent le painPoint tronqué pour traçabilité.

---

### Step 2 — QW3 : painAlignmentScore dans le scoring combiné Radar

1. **`shared/types/intent.types.ts`** :
   - Ajouter `painAlignmentScore?: number` dans `RadarKeywordKpis` (optional pour backward-compat avec caches persistés).
   - Ajouter `painAlignmentScore: number` dans `RadarCombinedScoreBreakdown`.

2. **`shared/scoring.ts`** :
   - Étendre `CombinedScoreInput` avec `painAlignmentScore?: number`.
   - Dans `computeCombinedScore()` : si `painAlignmentScore` fourni, composante = valeur telle quelle (déjà en 0-100). Sinon neutre = 50.
   - **Nouvelle pondération** :
     ```
     total = paaMatchScore * 0.25
           + resonanceBonus * 0.15
           + opportunityScore * 0.20
           + intentValueScore * 0.10
           + cpcScore * 0.10
           + painAlignmentScore * 0.20
     ```
   - Ajouter `painAlignmentScore` dans l'objet retourné.

3. **`server/services/keyword/keyword-radar.service.ts:205-382`** (`scanRadarKeywords`) :
   - Avant la boucle de scoring, si `painPoint?.trim()` : calculer UN SEUL embedding du painPoint (via `computeSemanticScores` ou directement via le cache d'embeddings).
   - Pour chaque keyword scanné : calculer `cosineSim(embedding(painPoint), embedding(keyword + ' ' + reasoning))` → normaliser `* 100` → `painAlignmentScore`.
   - **Batch** : utiliser `computeSemanticScores` avec une liste de paires `{id: keyword, text1: painPoint, text2: keyword+reasoning}` pour un seul appel API.
   - Si painPoint absent OU embedding échoue : ne pas passer `painAlignmentScore` → `computeCombinedScore` prend la valeur neutre 50.
   - Injecter dans `kpis` puis appeler `computeCombinedScore(kpis)` comme actuellement.

4. **Tests** :
   - `tests/unit/shared/scoring.test.ts` : vérifier que le breakdown contient `painAlignmentScore`, que la pondération 25/15/20/10/10/20 = 100, que sans `painAlignmentScore` fourni le score reste dans ±5 points du comportement actuel (grâce au neutre 50).
   - Snapshot test pour le breakdown d'un keyword de référence.

**Acceptance:**
- Un keyword aligné (cosineSim > 0.7) voit son `combinedScore` monter de ~10-15 pts.
- Un keyword hors-douleur (cosineSim < 0.3) voit son `combinedScore` descendre de ~10-15 pts.
- Sans painPoint : scores globalement stables (± marge de repondération des 5 autres composantes).
- Breakdown expose `painAlignmentScore` pour debug UI.

---

### Step 3 — QW4 : UI Radar card grisée si hors-douleur

1. **`src/components/intent/RadarKeywordCard.vue`** :
   - Récupérer `painAlignmentScore` via le breakdown déjà propagé.
   - Ajouter une computed `isOffPain = computed(() => painAlignmentScore < 35)` (seuil à confirmer après test manuel).
   - Classe conditionnelle `:class="{ 'radar-card--off-pain': isOffPain }"` sur le wrapper.
   - CSS : `.radar-card--off-pain { opacity: 0.55; }` + transition douce. Pas d'`inactive`, pas de `pointer-events: none`.
   - **Pas de tooltip ni badge.** Le grisage parle de lui-même (cohérent avec `source-item--irrelevant` dans Discovery).

2. **`src/composables/keyword/useRadarCarousel.ts`** :
   - Ajouter une option de tri `'painAlignment'` parmi les tris existants (tri desc par `painAlignmentScore`).
   - Ne PAS en faire le tri par défaut (garder l'ordre actuel par combinedScore — qui intègre déjà le painAlignment à 20%).

3. **Tests** :
   - Snapshot component test pour la classe `radar-card--off-pain` appliquée au seuil.

**Acceptance:**
- Cards avec `painAlignmentScore < 35` sont visuellement grisées mais cliquables.
- Option de tri "alignement douleur" disponible dans le carousel.
- Sans painPoint : toutes les cards ont `painAlignmentScore = 50` → aucune n'est grisée.

---

### Step 4 — QW5 : dimension `painAlignment` sur les PAA

1. **`shared/types/intent.types.ts`** :
   - Ajouter `painAlignment?: 'aligned' | 'partial' | 'off'` sur `RadarPaaItem`.

2. **`server/services/intent/intent-scan.service.ts`** :
   - Créer `matchPainAlignment(paaText: string, painPointEmbedding: number[], paaEmbedding: number[]): 'aligned' | 'partial' | 'off'` :
     - cosineSim >= 0.6 → `aligned`
     - 0.35 <= sim < 0.6 → `partial`
     - sim < 0.35 → `off`
   - Dans le flow de scan (là où les PAA sont déjà upgradées par embedding, lignes ~580-610) : réutiliser les embeddings déjà calculés pour annoter `painAlignment` sur chaque item.
   - **`computePaaWeightedScore` (lignes 186-210)** :
     - Conserver le barème actuel comme composante `topicWeight`.
     - Ajouter une composante `painWeight` avec un barème symétrique : `aligned=2.0, partial=0.5, off=0`.
     - Score final PAA = `0.5 * topicWeight + 0.5 * painWeight`.
     - Fallback si `painAlignment` absent (article sans painPoint ou embedding non calculé) : `painWeight = topicWeight` (le score reste équivalent au comportement actuel).

3. **UI** (optionnel, léger) :
   - Dans la section PAA de la RadarKeywordCard, utiliser la couleur de tag pour refléter le combiné topic×pain. Exemple : `total+exact` + `off` → couleur warning au lieu de vert.

4. **Tests** :
   - `tests/unit/services/intent-scan.test.ts` : un PAA `total+exact` + `off` doit donner un score combiné intermédiaire (pas le max).
   - Vérifier fallback sans painPoint.

**Acceptance:**
- Chaque `RadarPaaItem` porte `painAlignment` quand painPoint disponible.
- Le `paaWeightedScore` pénalise les PAA `total+exact+off` vs précédemment.
- Sans painPoint : scoring PAA inchangé.

---

### Step 5 — QA manuel + vérification non-régression

1. Prendre un article de référence avec painPoint fort (ex: *"Refonte site web"* + *"mon site ne convertit plus"*).
2. Lancer Discovery → vérifier que des keywords type "créer site web gratuit" sont bien écartés (ou gardés selon QW1).
3. Lancer Radar → observer :
   - Le breakdown de scoring (devtools / log).
   - Les cards grisées (QW4).
   - Les tags PAA avec nouvelle dimension (QW5).
4. Prendre un article SANS painPoint → vérifier que le comportement est équivalent à avant (pas de cards grisées, scoring stable).

## Risks and Mitigations

| Risque | Mitigation |
| ------ | ---------- |
| Embedding painPoint coûteux à chaque scan Radar | 1 seul embedding par scan (pas par keyword). Cache via le service embedding existant. |
| Repondération QW3 déstabilise des scores historiques affichés en cache | Breakdown en mémoire (pas persisté en DB). Rescan = recalcul. Documenter dans le changelog. |
| Seuil `isOffPain < 35` mal calibré → trop/pas assez grisé | Valeur ajustable, QA manuel sur 3-4 articles représentatifs avant merge. |
| Cosine sim embedding vs painPoint peut être bruité (painPoints courts) | Si painPoint < 10 caractères, skip le painAlignmentScore (fallback neutre 50). |
| Prompts QW1/QW2 trop stricts → Claude rejette trop de keywords | Ajouter un sanity check "filteringSuspect" (déjà existant : `useRelevanceScoring.ts:191-197` vérifie le ratio). Étendre pour détecter l'inverse : si rejet > 80%, warning UI. |
| Régression silencieuse pour articles legacy sans painPoint | Tests explicites couvrent le chemin sans painPoint. Fallback = comportement actuel. |

## Review Notes

_À compléter après revue._
