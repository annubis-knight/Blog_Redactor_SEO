> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

---
title: 'Amélioration workflow Moteur — Capitaine par défaut + scoring PAA pondéré'
slug: 'amelioration-workflow-moteur-capitaine-scoring-paa'
created: '2026-04-04'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Vue 3 (Composition API)', 'TypeScript', 'Pinia stores', 'Vitest']
files_to_modify:
  - 'server/services/intent-scan.service.ts'
  - 'shared/types/intent.types.ts'
  - 'server/services/keyword-radar.service.ts'
  - 'server/routes/keyword-validate.routes.ts'
  - 'server/services/keyword-validate.service.ts'
  - 'src/components/intent/RadarKeywordCard.vue'
  - 'src/views/MoteurView.vue'
  - 'src/components/moteur/CaptainValidation.vue'
code_patterns:
  - 'Composables avec ref/computed/watch (Composition API)'
  - 'Watchers immédiats pour préremplir les inputs'
  - 'validationVersion counter anti-race-condition'
  - 'Carousel pattern via useRadarCarousel — handleValidate() route TOUJOURS par carousel.addEntry()'
  - 'KpiResult { name, rawValue, color, label, thresholds }'
  - 'Route validation: keyword + level en entrée, fetchPaa retourne PaaQuestion[] brutes (question/answer only)'
test_patterns:
  - 'Vitest avec describe/it, fichiers *.test.ts dans tests/unit/'
  - 'Tests unitaires pour les services backend (scoring, thresholds)'
  - 'Tests composants Vue avec mount/shallowMount'
  - 'keyword-validate.test.ts utilise un helper buildKpis() avec thresholds hardcodés'
---

## Review Notes
- Adversarial review completed
- Findings: 9 total, 8 fixed, 1 acknowledged (F9 — already handled by existing empty state)
- Resolution approach: auto-fix
- Additional fix: cache invalidation for zero-data auto NO-GO results
- F6 reverted (Vue Proxy breaks reference equality — numeric index is correct)

# Tech-Spec: Amélioration workflow Moteur — Capitaine par défaut + scoring PAA pondéré

**Created:** 2026-04-04

## Overview

### Problem Statement

Deux problèmes impactent l'expérience utilisateur du workflow Moteur :

1. **Capitaine n'est pas le point d'entrée** — Le Moteur démarre sur l'onglet Discovery alors que les onglets Discovery et Radar sont facultatifs. L'utilisateur doit naviguer manuellement vers Capitaine pour commencer la validation. De plus, la sélection d'un article n'affiche pas automatiquement le mot-clé suggéré et ne lance pas la validation GO/NO-GO, laissant l'onglet vide.

2. **Le scoring PAA ignore la pertinence** — Le KPI People Also Ask dans le Radar et le Capitaine comptabilise le nombre brut de résultats PAA sans pondérer par leur niveau de pertinence (exact, match, semi-partiel, hors-sujet). Le Capitaine est encore pire : la route de validation (`keyword-validate.routes.ts:64`) passe `paa.length` (le nombre TOTAL de PAA retournées par l'API) à `scorePaa()`, sans aucun matching de pertinence.

### Solution

1. Changer le tab par défaut à `'capitaine'`, et auto-lancer la validation via `carousel.addEntry()` avec le mot-clé suggéré dès la sélection d'un article — le verdict GO/NO-GO s'affiche immédiatement sans action manuelle.

2. Implémenter un scoring PAA pondéré par pertinence avec le barème : `none=0`, `partial+stem/semantic=0.25`, `partial+exact=0.5`, `total+stem/semantic=1.0`, `total+exact=2.0`. Ajouter le pipeline de matching (`matchResonanceDetailed` + topic words) dans la route de validation Capitaine, et appliquer la pondération dans le Radar (`computeCombinedScore`) et le Capitaine (`scorePaa`).

### Scope

**In Scope:**
- Changer le tab par défaut de `'discovery'` à `'capitaine'` dans MoteurView
- Mettre à jour `visitedTabs` initial pour matcher le nouveau tab par défaut
- Auto-lancer la validation via carousel à la sélection d'un article
- Ajouter le pipeline de matching PAA dans la route de validation Capitaine
- Accepter `articleTitle` optionnel dans la route de validation
- Pondérer le score PAA dans `computeCombinedScore()` (Radar)
- Pondérer le KPI PAA dans `scorePaa()` (Capitaine)
- Mettre à jour l'affichage KPI PAA dans les radar cards

**Out of Scope:**
- Refonte des fonctionnalités existantes des onglets
- Modification de l'ordre visuel des onglets dans la barre
- Modification des autres KPIs/scores (volume, KD, CPC, intent, autocomplete)
- Scoring sémantique (embeddings) dans la route Capitaine — on se limite au matching exact/stem pour garder la route rapide

## Context for Development

### Codebase Patterns

- **Tab system** : `activeTab = ref<Tab>()` dans MoteurView, onglets rendus via `v-show` avec `v-if="visitedTabs[tab]"` pour le lazy-mount. `visitedTabs` est initialisé avec le tab par défaut et étendu via un watcher sur `activeTab`.
- **Article selection** : `handleSelectArticle()` dans MoteurView reset l'état cross-tab, fetch keywords, load cache.
- **Carousel pattern** : `handleValidate()` (CaptainValidation:66-79) route **toujours** via `carousel.addEntry()`, même quand le carousel n'est pas encore actif. Le carousel (`useRadarCarousel.ts`) appelle directement l'API `/keywords/{keyword}/validate` (ligne 137), crée un `RadarCard` stub, et stocke le résultat dans `carousel.entries[]`. Le composable `useCapitaineValidation.validateKeyword()` n'est utilisé que par `handleSuggestedClick()` en mode manuel — **ne PAS l'utiliser pour l'auto-validation**.
- **Route validation actuelle** : `POST /keywords/:keyword/validate` (keyword-validate.routes.ts:18-92) accepte `{ level }` en body. Appelle `fetchPaa(keyword)` qui retourne `PaaQuestion[]` brutes (question + answer, SANS matching). Score PAA = `paa.length` (ligne 64) — comptage total, zéro filtrage.
- **suggestedKeywords** : vient de `strategyStore.strategy?.proposedArticles` via computed dans MoteurView (lignes 352-358), passé comme prop `string[]` à CaptainValidation.
- **PAA matching** : 3 phases (exact → stem → semantic), `matchResonanceDetailed()` retourne `{ match: ResonanceMatch, quality: 'exact' | 'stem' }`. La quality `'semantic'` n'est assignée que lors du scan Radar (embeddings). Dans la route validation Capitaine, on se limitera au matching exact/stem (pas de semantic) pour garder la route rapide.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/views/MoteurView.vue:124` | Déclaration `activeTab` — tab par défaut à changer |
| `src/views/MoteurView.vue:127` | Déclaration `visitedTabs` — initialisé `{ discovery: true }`, à changer |
| `src/views/MoteurView.vue:217-270` | `handleSelectArticle()` — flow sélection article |
| `src/views/MoteurView.vue:352-358` | `suggestedKeywordsForArticle` computed |
| `src/components/moteur/CaptainValidation.vue:22-33` | Props interface (suggestedKeywords, radarCards) |
| `src/components/moteur/CaptainValidation.vue:66-79` | `handleValidate()` — route toujours via `carousel.addEntry()` |
| `src/components/moteur/CaptainValidation.vue:82-107` | Watchers existants (préremplissage, PAS de validation auto) |
| `src/components/moteur/CaptainValidation.vue:268` | `const carousel = useRadarCarousel()` |
| `src/components/moteur/CaptainValidation.vue:388-401` | Watcher `radarCards` → `carousel.loadCards()` |
| `src/composables/useRadarCarousel.ts:119-162` | `addEntry()` — crée entry + appelle API validate |
| `src/composables/useRadarCarousel.ts:35` | `isActive` computed = `entries.length > 0` |
| `server/routes/keyword-validate.routes.ts:18-92` | Route validation — fetch PAA + score + verdict |
| `server/routes/keyword-validate.routes.ts:21` | Body destructuring — actuellement `{ level }` seulement |
| `server/routes/keyword-validate.routes.ts:47-51` | Parallel fetch (overview, autocomplete, paa) |
| `server/routes/keyword-validate.routes.ts:64` | `scoreKpi('paa', paa.length, config)` — comptage brut |
| `server/services/keyword-validate.service.ts:181-195` | `scorePaa()` — thresholds + coloration |
| `server/services/keyword-validate.service.ts:13-38` | Thresholds par niveau d'article |
| `server/services/keyword-validate.service.ts:71-129` | `computeVerdict()` — auto-NO-GO et verdict logic |
| `server/services/keyword-radar.service.ts:180-238` | `computeCombinedScore()` — scoring PAA Radar |
| `server/services/keyword-radar.service.ts:188-197` | Boucle PAA points (exact/stem/semantic × total/partial) |
| `server/services/keyword-radar.service.ts:364-375` | Construction KPIs Radar (paaMatchCount, paaTotal) |
| `server/services/intent-scan.service.ts:152-179` | `matchResonanceDetailed()` — matching PAA |
| `src/components/intent/RadarKeywordCard.vue:169-172` | Affichage KPI `paaMatchCount/paaTotal` |
| `shared/types/intent.types.ts:223-233` | Types `RadarMatchQuality`, `RadarPaaItem` |
| `tests/unit/services/keyword-validate.test.ts` | Tests existants avec `buildKpis()` helper (thresholds hardcodés) |

### Technical Decisions

- **Barème de pondération PAA** :

| ResonanceMatch | RadarMatchQuality | Points |
|----------------|-------------------|--------|
| `none` | — | 0 |
| `partial` | `stem` / `semantic` | 0.25 |
| `partial` | `exact` | 0.5 |
| `total` | `stem` / `semantic` | 1.0 |
| `total` | `exact` | 2.0 |

- **Normalisation Radar** : `paaMatchScore = Math.min(100, weightedSum * 10)` — un score pondéré de 10 points = score max de 100. Cela signifie : 5 items `total+exact` (5×2=10) = parfait ; 10 items `partial+stem` (10×0.25=2.5) = faible malgré la quantité.
- **Thresholds Capitaine ajustés** : Les seuils passent de comptage brut à score pondéré. Attention : l'ancien système comptait le nombre TOTAL de PAA (même hors-sujet). Le nouveau système filtre par pertinence, donc les seuils doivent être plus bas. Pilier ≥3.0 green / ≥1.0 orange ; Intermediaire ≥2.0 green / ≥0.5 orange ; Specifique ≥1.0 green / ≥0.25 orange.
- **Auto-validation via carousel** : Utiliser `carousel.addEntry()` (PAS `validateKeyword()` du composable) car `handleValidate()` route toujours via le carousel. La garde vérifie `carousel.entries.value.length === 0` (pas `history`).
- **Nouveau champ `paaWeightedScore`** : Ajouté à `RadarKeywordKpis` pour l'affichage pondéré sans casser `paaMatchCount` (backward compatible).
- **Matching dans la route Capitaine** : Pas de scoring sémantique (embeddings) — seulement exact/stem via `matchResonanceDetailed()`. Les topic words sont extraits du keyword (et optionnellement de `articleTitle` si fourni). Cela garde la route rapide (pas d'appel embeddings).
- **Affichage PAA radar card** : Afficher le score pondéré seul (`4.5 pts`) au lieu de `paaMatchCount/paaTotal`, car le ratio weighted/total est trompeur (le max pondéré ≠ paaTotal).
- **Changement comportemental `specifique`** : Avec le nouveau seuil `orange: 0.25`, un keyword avec 0 PAA pertinentes passe de orange à red. C'est intentionnel — 0 pertinence doit être rouge.

## Implementation Plan

### Tasks

- [x] **Task 1 : Fonction utilitaire partagée `computePaaWeightedScore`**
  - File : `server/services/intent-scan.service.ts`
  - Action : Ajouter et exporter une fonction `computePaaWeightedScore` qui prend un tableau d'items `{ match: ResonanceMatch; matchQuality?: RadarMatchQuality }` et retourne la somme pondérée selon le barème (none=0, partial+stem/semantic=0.25, partial+exact=0.5, total+stem/semantic=1.0, total+exact=2.0). Si `matchQuality` est `undefined` et `match !== 'none'`, utiliser `'stem'` comme fallback.
  - Notes : Placé dans intent-scan car c'est le service qui définit déjà `matchResonanceDetailed()` et les types de matching. Utilisé ensuite par keyword-radar et keyword-validate.

- [x] **Task 2 : Ajouter `paaWeightedScore` au type `RadarKeywordKpis`**
  - File : `shared/types/intent.types.ts`
  - Action : Ajouter le champ `paaWeightedScore: number` à l'interface `RadarKeywordKpis` (après `paaMatchCount`). Ce champ stocke le résultat de `computePaaWeightedScore()`.
  - Notes : `paaMatchCount` est conservé pour backward compatibility.

- [x] **Task 3 : Pondérer le scoring PAA dans le Radar (`computeCombinedScore`)**
  - File : `server/services/keyword-radar.service.ts`
  - Action : Dans `computeCombinedScore()` (ligne ~188-197), remplacer la boucle de points fixe (exact_total=15, stem_total=10, etc.) par un appel à `computePaaWeightedScore(paaItems)`. Normaliser : `paaMatchScore = Math.min(100, weightedSum * 10)`. Le reste de la formule (poids 30%, autres composants) reste inchangé.
  - Notes : Importer `computePaaWeightedScore` depuis `intent-scan.service`. La normalisation `×10` fait que 10 points pondérés = 100% du composant PAA.

- [x] **Task 4 : Calculer et stocker `paaWeightedScore` dans les KPIs Radar**
  - File : `server/services/keyword-radar.service.ts`
  - Action : Dans la section qui construit `RadarKeywordKpis` (ligne ~364-375), appeler `computePaaWeightedScore(paaItems)` et stocker le résultat dans `paaWeightedScore`. Conserver `paaMatchCount` tel quel.
  - Notes : Arrondir à 2 décimales avec `Math.round(score * 100) / 100`.

- [x] **Task 5 : Ajouter le pipeline de matching PAA dans la route de validation Capitaine**
  - File : `server/routes/keyword-validate.routes.ts`
  - Action :
    1. **Ligne 21** : Extraire `articleTitle` optionnel du body en plus de `level` : `const { level, articleTitle } = req.body as { level?: string; articleTitle?: string }`
    2. **Après ligne 51** (après le fetch parallèle) : Ajouter le matching PAA :
       ```typescript
       // Extract topic words from keyword (+ article title if provided)
       const topicSource = articleTitle ? `${keyword} ${articleTitle}` : keyword
       const topicWords = normalize(topicSource).split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w))

       // Match each PAA item against topic words
       const matchedPaaItems = paa.map(p => {
         const qDetail = matchResonanceDetailed(p.question, topicWords)
         const aDetail = p.answer
           ? matchResonanceDetailed(p.answer, topicWords)
           : { match: 'none' as ResonanceMatch, quality: 'stem' as const }
         const match = bestMatch(qDetail.match, aDetail.match)
         const quality: RadarMatchQuality =
           match === 'none' ? 'stem'
           : qDetail.match === aDetail.match
             ? (qDetail.quality === 'exact' || aDetail.quality === 'exact' ? 'exact' : 'stem')
             : (bestMatch(qDetail.match, aDetail.match) === qDetail.match ? qDetail.quality : aDetail.quality)
         return { match, matchQuality: match !== 'none' ? quality : undefined }
       })
       ```
    3. **Ligne 64** : Remplacer `scoreKpi('paa', paa.length, config)` par `scoreKpi('paa', computePaaWeightedScore(matchedPaaItems), config)`.
  - Notes : Importer `matchResonanceDetailed`, `normalize`, `STOP_WORDS`, `bestMatch` depuis `intent-scan.service`. Importer `computePaaWeightedScore` depuis le même service. Le matching exact/stem est synchrone et rapide — pas d'impact perf. Pas de scoring sémantique (embeddings) pour garder la route rapide. La logique de matching PAA est copiée de `keyword-radar.service.ts:306-327` ; si on veut factoriser, on peut extraire une helper `matchPaaItems(paaQuestions, topicWords)` dans intent-scan mais ce n'est pas obligatoire.

- [x] **Task 6 : Pondérer le KPI PAA du Capitaine (`scorePaa`) + ajuster thresholds**
  - File : `server/services/keyword-validate.service.ts`
  - Action :
    1. Ajuster les thresholds PAA (lignes 13-38) :
       - `pilier: { green: 3.0, orange: 1.0 }` (anciennement `{ green: 3, orange: 1 }`)
       - `intermediaire: { green: 2.0, orange: 0.5 }` (anciennement `{ green: 2, orange: 1 }`)
       - `specifique: { green: 1.0, orange: 0.25 }` (anciennement `{ green: 1, orange: 0 }`)
    2. Modifier le label dans `scorePaa()` (ligne ~189) : de `"${rawValue} PAA"` à `"${rawValue.toFixed(1)} pts"`.
  - Notes : La signature de `scorePaa(rawValue, config)` ne change pas. C'est la Task 5 qui change le `rawValue` en amont (de `paa.length` à `computePaaWeightedScore(matchedPaaItems)`). Le changement de seuil `specifique orange: 0 → 0.25` fait qu'un keyword avec 0 PAA pertinentes est maintenant red (au lieu de orange) — c'est intentionnel.

- [x] **Task 7 : Mettre à jour l'affichage KPI PAA dans les radar cards**
  - File : `src/components/intent/RadarKeywordCard.vue`
  - Action : Remplacer l'affichage `paaMatchCount/paaTotal` (ligne ~169-172) par le score pondéré formaté. Afficher `{{ card.kpis.paaWeightedScore.toFixed(1) }} pts` au lieu de `{{ card.kpis.paaMatchCount }}/{{ card.kpis.paaTotal }}`.
  - Notes : Le format `score/total` était trompeur car le score pondéré max ≠ paaTotal. Afficher juste les points est plus clair. Le tooltip de breakdown affiche déjà `paaMatchScore` (0-100) qui sera automatiquement correct après Task 3.

- [x] **Task 8 : Changer le tab par défaut à `'capitaine'` + visitedTabs**
  - File : `src/views/MoteurView.vue`
  - Action :
    1. **Ligne 124** : Changer `const activeTab = ref<Tab>('discovery')` en `const activeTab = ref<Tab>('capitaine')`.
    2. **Ligne 127** : Changer `const visitedTabs = ref<Record<string, boolean>>({ discovery: true })` en `const visitedTabs = ref<Record<string, boolean>>({ capitaine: true })`.
  - Notes : Les onglets Discovery et Radar restent visibles et cliquables. Le redirect existant (lignes 259-269) reste pertinent. Sans la modification de `visitedTabs`, le composant CaptainValidation ne serait jamais monté (rendu conditionnel `v-if="visitedTabs.capitaine"` serait falsy au chargement).

- [x] **Task 9 : Auto-validation du mot-clé suggéré à la sélection d'article**
  - File : `src/components/moteur/CaptainValidation.vue`
  - Action : Ajouter un watcher après le watcher existant sur `articleKeywordsStore.keywords?.capitaine` (après ligne ~107). Ce watcher observe `props.suggestedKeywords` et `props.selectedArticle` et lance la validation via le carousel :
    ```typescript
    watch(
      () => [props.suggestedKeywords, props.selectedArticle] as const,
      ([suggestions, article]) => {
        if (
          suggestions && suggestions.length > 0
          && article
          && !isLocked.value
          && !carousel.isActive.value
        ) {
          const kw = suggestions[0]
          keywordInput.value = kw
          carousel.addEntry(kw, articleLevel.value, article.title)
        }
      },
      { immediate: true },
    )
    ```
  - Notes :
    - **Utilise `carousel.addEntry()`** (PAS `validateKeyword()`) car `handleValidate()` route toujours via le carousel. Utiliser `validateKeyword()` causerait un split-brain entre l'état manual et carousel.
    - **Garde `!carousel.isActive.value`** (pas `history.length === 0`) car les résultats de validation sont stockés dans `carousel.entries`, pas dans `history` de `useCapitaineValidation`.
    - **Garde `!isLocked.value`** empêche la re-validation d'articles déjà validés.
    - Le carousel gère ses propres race conditions via `loadVersion` counter.

- [x] **Task 10 : Passer `articleTitle` dans l'appel API de la route carousel**
  - File : `src/composables/useRadarCarousel.ts`
  - Action : Ligne ~137-140, l'appel API `apiPost('/keywords/{keyword}/validate', { level })` doit aussi passer `articleTitle` :
    ```typescript
    const response = await apiPost<ValidateResponse>(
      `/keywords/${encodeURIComponent(keyword)}/validate`,
      { level, articleTitle },
    )
    ```
    Le paramètre `articleTitle` est déjà disponible dans `addEntry(keyword, level, articleTitle?)` (ligne 119).
  - Notes : Modification minime. Le `articleTitle` est optionnel côté route (Task 5), donc les appels existants sans `articleTitle` continuent de fonctionner.

- [x] **Task 11 : Adapter les tests existants + créer nouveaux tests**
  - Files :
    - `tests/unit/services/paa-weighted-score.test.ts` (nouveau)
    - `tests/unit/services/keyword-validate.test.ts` (adapter)
  - Action :
    1. **Nouveau fichier `paa-weighted-score.test.ts`** — Tests pour `computePaaWeightedScore()` :
       - Items vides → retourne 0
       - 3 items `total+exact` → retourne 6.0
       - Mix : 1 `total+exact` (2.0) + 2 `partial+stem` (2×0.25=0.5) + 1 `none` (0) → retourne 2.5
       - Items sans `matchQuality` (undefined) et match `total` → fallback `stem` → 1.0 par item
       - Vérifier la normalisation Radar : `Math.min(100, score * 10)`
    2. **Adapter `keyword-validate.test.ts`** :
       - Mettre à jour le helper `buildKpis()` pour utiliser les nouveaux thresholds flottants (`{ green: 3.0, orange: 1.0 }` pour pilier, etc.)
       - Adapter les tests de `scorePaa` pour utiliser des `rawValue` flottants (ex: 3.5 au lieu de 5)
       - Adapter le label attendu de `"5 PAA"` à `"3.5 pts"` (ou équivalent)
       - Vérifier que les tests de `computeVerdict()` passent avec les scores flottants
    3. **Tests pour le matching dans la route** : Vérifier que la route produit un score pondéré différent selon la pertinence des PAA par rapport au keyword/articleTitle.

### Acceptance Criteria

- [x] **AC1** : Given le workflow Moteur est ouvert, when la page se charge, then l'onglet actif est `'capitaine'` (pas `'discovery'`). Les onglets Discovery et Radar restent visibles et cliquables dans la barre de navigation. Le composant CaptainValidation est bien monté (visitedTabs correct).

- [x] **AC2** : Given un article avec un `suggestedKeyword` est sélectionné dans le panel gauche, when l'article est togglé, then le mot-clé suggéré est automatiquement rempli dans l'input ET la validation GO/NO-GO est lancée automatiquement via le carousel sans clic utilisateur. Le verdict (GO/NO-GO/ORANGE) s'affiche dans la foulée en mode carousel.

- [x] **AC3** : Given un article déjà validé (isLocked=true) est sélectionné, when l'article est togglé, then l'auto-validation ne se relance PAS (le résultat précédent est préservé).

- [x] **AC4** : Given l'utilisateur switch rapidement entre 2 articles, when le premier article lance une validation, then seul le résultat du dernier article sélectionné est affiché (pas de race condition).

- [x] **AC5** : Given un mot-clé avec 5 PAA items `total+exact` dans le Radar, when le score combiné est calculé, then le composant PAA Match Score vaut `Math.min(100, 5×2.0×10) = 100`.

- [x] **AC6** : Given un mot-clé avec 8 PAA items tous `none` (hors-sujet) dans le Radar, when le score combiné est calculé, then le composant PAA Match Score vaut 0.

- [x] **AC7** : Given un mot-clé avec 4 PAA items `partial+stem` (0.25 chacun) dans le Radar, when le score combiné est calculé, then le composant PAA Match Score vaut `Math.min(100, 4×0.25×10) = 10` — score faible malgré la quantité d'items.

- [x] **AC8** : Given un mot-clé de niveau `pilier` avec un score PAA pondéré de 3.5 dans le Capitaine, when `scorePaa()` est appelé, then le KPI est `green` (≥3.0). Given un score de 0.8, then le KPI est `orange` (≥1.0 mais <3.0). Given un score de 0.2, then le KPI est `red` (<1.0).

- [x] **AC9** : Given une radar card affichée dans le composant RadarKeywordCard, when les KPIs sont rendus, then le KPI PAA affiche le score pondéré en points (ex: `4.5 pts`) au lieu du simple comptage (ex: `3/8`).

- [x] **AC10** : Given la route `POST /keywords/:keyword/validate` est appelée avec `{ level: 'pilier', articleTitle: 'Créer un site web pour entreprises' }`, when le keyword est "création site internet" et que les PAA retournées incluent des questions sur "meilleur restaurant Paris" (hors-sujet), then ces PAA hors-sujet contribuent 0 points au score pondéré.

- [x] **AC11** : Given la route `POST /keywords/:keyword/validate` est appelée SANS `articleTitle`, when le matching PAA est effectué, then les topic words sont extraits du keyword seul et le matching fonctionne correctement (pas de crash).

## Additional Context

### Dependencies

- `matchResonanceDetailed()`, `normalize()`, `STOP_WORDS`, `bestMatch()` depuis `intent-scan.service.ts` — déjà exportés et disponibles.
- `fetchPaa()` depuis `dataforseo.service.ts` — retourne `PaaQuestion[]` avec seulement `{ question, answer }`.
- **Important** : La route de validation actuelle n'a AUCUNE awareness de topic/article. La Task 5 ajoute cette awareness. C'est la modification la plus structurante.

### Testing Strategy

- **Tests unitaires (priorité haute)** :
  - `computePaaWeightedScore()` — barème complet, edge cases (vide, undefined quality, mix)
  - `scorePaa()` — nouveaux thresholds flottants par niveau d'article
  - `computeCombinedScore()` — normalisation ×10, cap à 100
  - Matching PAA dans la route — vérifier que les PAA hors-sujet = 0 points

- **Tests existants à adapter** :
  - `keyword-validate.test.ts` : helper `buildKpis()` avec thresholds hardcodés, labels PAA, valeurs rawValue
  - Tout test qui assert sur `paa.rawValue` comme un entier

- **Tests manuels** :
  - Ouvrir le Moteur → vérifier que l'onglet Capitaine est actif par défaut et que le composant est bien monté
  - Sélectionner un article avec suggestedKeyword → vérifier que la validation se lance automatiquement en mode carousel
  - Vérifier les scores PAA dans les radar cards — les mots-clés avec beaucoup de PAA hors-sujet doivent avoir un score bas
  - Comparer avant/après sur un même mot-clé pour valider que les scores pondérés reflètent mieux la réalité

### Notes

- **Cache Radar** : Les résultats Radar existants en cache ont des scores calculés avec l'ancien barème. Ils seront recalculés au prochain scan. Les résultats cachés afficheront temporairement les anciens scores — pas de migration nécessaire, ils seront écrasés naturellement.
- **Cache Validation** : La route Capitaine a un cache TTL 7 jours (keyword-validate.routes.ts:13). Les résultats cachés auront l'ancien scoring. Considérer vider le cache validation après déploiement, ou laisser expirer naturellement.
- **Risque — Thresholds** : Les thresholds Capitaine (3.0/2.0/1.0) sont calibrés théoriquement. L'ancien système comptait le nombre TOTAL de PAA (typiquement 4-8 par keyword), donc green était quasi-automatique. Le nouveau système filtre par pertinence, rendant les verdicts plus discriminants. Si après test les verdicts semblent trop sévères, ajuster les seuils à la baisse.
- **Risque — Normalisation Radar** : Le multiplicateur ×10 est calibré pour ~5-10 PAA items. Les scores Radar vont changer par rapport à l'ancien système : l'échelle n'est pas identique. Les keywords avec seulement 2-3 PAA items auront un plafond bas (max 60 pour 3 `total+exact`), ce qui est correct car peu de PAA = moins de signaux.
- **Future** : Considérer d'ajouter un poids par profondeur (`depth`) — les PAA de niveau 1 pourraient valoir plus que les PAA de niveau 2. Hors scope pour cette itération.
- **Future** : Factoriser la logique de matching PAA (copiée de keyword-radar.service.ts) dans une helper partagée `matchPaaItems(questions, topicWords)` dans intent-scan.service.ts. Non-bloquant mais améliore la maintenabilité.
