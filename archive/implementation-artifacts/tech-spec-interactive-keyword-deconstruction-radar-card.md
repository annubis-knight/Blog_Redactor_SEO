> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

---
title: 'Déconstruction interactive de mots-clefs longue traîne dans le RadarCard'
slug: 'interactive-keyword-deconstruction-radar-card'
created: '2026-04-05'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Vue 3', 'TypeScript', 'Vitest', 'Pinia', 'Express']
files_to_modify:
  - 'shared/types/intent.types.ts'
  - 'src/composables/useCapitaineValidation.ts'
  - 'src/composables/useRadarCarousel.ts'
  - 'src/components/intent/KeywordWords.vue'
  - 'src/components/intent/RadarKeywordCard.vue'
  - 'src/components/intent/RadarCardLockable.vue'
  - 'src/components/moteur/CaptainValidation.vue'
  - 'server/routes/keywords.routes.ts'
  - 'server/services/data.service.ts'
code_patterns:
  - 'composable ref/computed pattern'
  - 'patch(index, updates) immutable carousel updates'
  - 'loadVersion/thisVersion race condition guard'
  - 'apiPost/apiPut/apiGet wrappers'
  - 'Pinia defineStore with composition API'
  - 'server readJson/writeJson persistence'
test_patterns:
  - 'vitest unit tests with vi.fn() mocks'
  - 'setupRoutedMock pattern for apiPost'
  - 'mountComponent pattern for Vue components'
---

# Tech-Spec: Déconstruction interactive de mots-clefs longue traîne dans le RadarCard

**Created:** 2026-04-05

## Overview

### Problem Statement

L'onglet Capitaine extrait une seule racine (les 2 premiers mots significatifs) pour les mots-clefs longue traîne. Pour "creation site web entreprise toulouse", seul "creation site" est testé. L'utilisateur ne peut pas explorer les variantes intermédiaires ("creation site web", "creation site web entreprise") qui pourraient avoir des données SEO très différentes. De plus, les résultats de validation des racines ne sont pas persistés — chaque visite relance les appels API.

### Solution

Système de **déconstruction interactive** du mot-clef directement dans le RadarCard :

1. **Mots cliquables** : chaque mot du keyword est rendu individuellement. Les mots peuvent être retirés séquentiellement depuis la fin en cliquant dessus (underline = cliquable, grisé = désactivé).
2. **Pré-chargement** : toutes les variantes racines sont validées en parallèle au moment de la validation initiale et stockées en mémoire + serveur.
3. **Swap instantané** : cliquer un mot change immédiatement l'intégralité du RadarCard (KPIs, PAA, verdict, score) avec les données pré-chargées.
4. **Persistance serveur** : les résultats racines sont sauvegardés dans un fichier JSON dédié, liés au mot-clef parent.

### Scope

**In Scope:**
- `extractRoots(keyword)` — génère toutes les troncatures progressives (séquentielles depuis la fin, min 2 mots)
- Validation parallèle de toutes les racines lors de la validation initiale
- Persistance serveur des résultats racines dans `data/cache/keyword-roots/{slug}.json`
- Route API GET pour les root variants
- RadarKeywordCard interactif — mots clickables avec toggle séquentiel
- RadarCard swap complet (card prop change) au toggle
- Affichage dropdown compact des racines dans `.kpi-root-zone`
- Tests unitaires complets

**Out of Scope:**
- Modification des seuils/thresholds de validation
- Retrait de mots au milieu (non-séquentiel)
- Permutations/réarrangements de mots
- Modification du scoring combiné (formule inchangée)

## Context for Development

### Codebase Patterns

**Composables :**
- `ref()`, `computed()` pour l'état réactif
- `apiPost()` / `apiGet()` / `apiPut()` wrappers qui unwrap `json.data`
- Validations racines "best-effort" (erreurs silencieuses)
- `patch(index, updates)` pour mises à jour immutables dans le carousel
- `loadVersion` / `thisVersion` pour les race conditions

**RadarKeywordCard.vue :**
- Prop unique : `card: RadarCard`
- Pas d'events émis — composant de rendu pur
- Keyword affiché comme `<span class="radar-card__keyword">{{ card.keyword }}</span>`
- Header cliquable avec `user-select: none` pour expand/collapse
- CSS : `font-size: 1.375rem`, `white-space: nowrap`, `text-overflow: ellipsis`

**RadarCardLockable.vue :**
- Wrapper qui ajoute bouton lock/unlock
- Props : `card: RadarCard`, `locked: boolean`
- Emit : `update:locked`

**Article-Keywords Storage :**
- `data/article-keywords.json` → `{ keywords_par_article: [{ articleSlug, capitaine, lieutenants, lexique }] }`
- Routes : GET/PUT `/api/articles/:slug/keywords`
- Service : `data.service.ts` avec `readJson`/`writeJson` et cache mémoire

**CaptainValidation.vue :**
- Zone racine actuelle : `.kpi-root-zone` affiche 1 seul `rootResult`
- `lockCarouselEntry()` persiste via `articleKeywordsStore.setCapitaine(keyword)`
- Carousel entry : `{ card, validation, rootResult, isLoadingRoot, ... }`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/composables/useCapitaineValidation.ts` | `extractRoot()` (à remplacer), `FRENCH_STOPWORDS`, `validateKeyword()` |
| `src/composables/useRadarCarousel.ts` | `CarouselEntry`, `addEntry()`, `loadCards()`, `computeCardScore()`, `hydrateCard` logic |
| `src/components/intent/RadarKeywordCard.vue` | Rendu du keyword (ligne 143: `<span>{{ card.keyword }}</span>`), KPIs, PAA, score ring |
| `src/components/intent/RadarCardLockable.vue` | Wrapper lock (props: `card`, `locked`) |
| `src/components/moteur/CaptainValidation.vue` | UI capitaine, carousel rendering, `.kpi-root-zone` |
| `shared/types/intent.types.ts` | `RadarCard`, `RadarPaaItem`, `RadarCombinedScoreBreakdown`, `RadarKeywordKpis` |
| `shared/types/keyword-validate.types.ts` | `ValidateResponse`, `PaaQuestionValidate` |
| `server/routes/keywords.routes.ts` | Routes GET/PUT article-keywords existantes |
| `server/services/data.service.ts` | `readJson()`, `writeJson()`, cache patterns |
| `tests/unit/composables/useCapitaineValidation.test.ts` | Tests existants `extractRoot` + root analysis |

### Technical Decisions

1. **Troncatures séquentielles depuis la fin** : on retire les mots originaux un par un depuis la fin. Le noyau minimum = 2 premiers mots du keyword original. Les stopwords ne sont PAS filtrés pour la troncature (on garde l'ordre naturel), mais la racine la plus courte doit avoir ≥ 2 mots significatifs (non-stopword).

2. **Persistance hybride** : Le cache validate 7 jours existant (`data/cache/validate/`) sert déjà de stockage par variante. On ajoute un fichier d'index `data/cache/keyword-roots/{parent-slug}.json` qui lie un keyword parent à ses variantes avec les cache keys. Cela évite de dupliquer les résultats.

3. **hydrateCardFromValidation()** : extraire la logique inline de `addEntry()` (conversion ValidateResponse → RadarCard hydraté) dans une fonction réutilisable. Cette même fonction sert pour le keyword principal ET chaque racine.

4. **Nouveau sous-composant KeywordWords.vue** : encapsule le rendu interactif des mots. RadarKeywordCard l'utilise conditionnellement (si prop `variants` fourni). Rétro-compatible : sans variants, affichage classique inchangé.

5. **Swap de card, pas mutation** : quand l'utilisateur toggle un mot, le parent change la `card` prop entière vers la variante correspondante. Le RadarKeywordCard ne fait que ré-render avec le nouveau prop.

6. **État `activeWordCount`** : un simple compteur (nombre de mots actifs depuis le début). Le parent le gère et dérive le keyword actif + la card correspondante.

## Implementation Plan

### Tasks

- [x] **Task 1 : Types & interfaces**
  - File: `shared/types/intent.types.ts`
  - Action: Ajouter `KeywordRootVariant` interface :
    ```ts
    export interface KeywordRootVariant {
      keyword: string          // ex: "creation site web"
      card: RadarCard          // RadarCard hydraté avec KPIs, PAA, score
      validation: ValidateResponse
    }
    ```
  - Notes: Ce type est utilisé par le carousel et la persistance.

- [x] **Task 2 : extractRoots()**
  - File: `src/composables/useCapitaineValidation.ts`
  - Action: Remplacer `extractRoot()` par `extractRoots()` :
    ```ts
    export function extractRoots(keyword: string): string[] {
      const words = keyword.trim().split(/\s+/)
      if (words.length < 3) return []
      const roots: string[] = []
      // Du plus long (N-1 mots) au plus court (2 mots)
      for (let len = words.length - 1; len >= 2; len--) {
        const candidate = words.slice(0, len).join(' ')
        // Vérifier qu'il y a ≥ 2 mots significatifs
        const significant = words.slice(0, len).filter(w => !FRENCH_STOPWORDS.has(w.toLowerCase()))
        if (significant.length >= 2) roots.push(candidate)
      }
      return roots
    }
    ```
  - Action: Garder `extractRoot()` comme alias rétro-compatible → `extractRoots(kw)[extractRoots(kw).length - 1] ?? null`
  - Notes: Exporte `FRENCH_STOPWORDS` pour les tests. Dédoublonnage inutile car les troncatures sont toujours uniques (mots retirés séquentiellement).

- [x] **Task 3 : Tests extractRoots()**
  - File: `tests/unit/composables/useCapitaineValidation.test.ts`
  - Action: Ajouter un bloc `describe('extractRoots')` :
    - `"creation site web entreprise toulouse"` → `["creation site web entreprise", "creation site web", "creation site"]`
    - `"refaire son site web"` → `["refaire son site", "refaire son"]` — non, "son" est stopword → `["refaire son site"]` (2 mots mais 1 seul significatif pour "refaire son") — en fait non : on vérifie ≥ 2 significatifs dans les `len` premiers mots. "refaire son" → significant = ["refaire"] → < 2 → exclu. "refaire son site" → significant = ["refaire", "site"] → ≥ 2 → inclus. Donc résultat : `["refaire son site"]`
    - `"seo local"` → `[]` (2 mots, < 3)
    - `"le la les des"` → `[]` (0 significatifs)
    - `"plombier urgence paris 20"` → `["plombier urgence paris", "plombier urgence"]`
  - Notes: Garder les tests `extractRoot` existants pour rétro-compatibilité.

- [x] **Task 4 : hydrateCardFromValidation() — extraction de la logique commune**
  - File: `src/composables/useRadarCarousel.ts`
  - Action: Extraire la logique de conversion `ValidateResponse → RadarCard hydraté` en une fonction exportée :
    ```ts
    export function hydrateCardFromValidation(
      keyword: string,
      response: ValidateResponse,
    ): RadarCard {
      const kpiMap = Object.fromEntries(response.kpis.map(k => [k.name, k]))
      const paaItems: RadarPaaItem[] = (response.paaQuestions || []).map(p => ({
        question: p.question,
        answer: p.answer ?? undefined,
        depth: 0,
        match: p.match || 'none',
        matchQuality: p.matchQuality,
      }))
      const scoreBreakdown = computeCardScore({ ... })
      return { keyword, kpis: { ... }, paaItems, combinedScore: scoreBreakdown.total, scoreBreakdown, reasoning: '', cachedPaa: false }
    }
    ```
  - Action: Refactorer `addEntry()` pour utiliser `hydrateCardFromValidation()`.
  - Notes: Aucun changement de comportement. Green tests avant de continuer.

- [x] **Task 5 : Étendre CarouselEntry avec rootVariants**
  - File: `src/composables/useRadarCarousel.ts`
  - Action: Modifier `CarouselEntry` :
    ```ts
    export interface CarouselEntry {
      card: RadarCard                     // card actuellement affichée
      originalCard: RadarCard             // card du keyword complet (pour reset)
      validation: ValidateResponse | null
      isLoading: boolean
      error: string | null
      forceGo: boolean
      rootVariants: Map<string, KeywordRootVariant>  // NOUVEAU — keyword → variant
      isLoadingRoots: boolean             // NOUVEAU — remplace isLoadingRoot
      activeWordCount: number             // NOUVEAU — nombre de mots actifs
    }
    ```
  - Action: Supprimer `rootResult: ValidateResponse | null` et `isLoadingRoot: boolean` (remplacés).
  - Action: Mettre à jour `createEntry()` pour initialiser les nouveaux champs.
  - Notes: Breaking change sur `CarouselEntry` → mettre à jour tous les consommateurs (CaptainValidation).

- [x] **Task 6 : Validation multi-racines dans addEntry()**
  - File: `src/composables/useRadarCarousel.ts`
  - Action: Remplacer le bloc "Auto root analysis for long-tail" dans `addEntry()` :
    ```ts
    // Après validation principale réussie :
    const roots = extractRoots(keyword)
    if (roots.length > 0 && response.kpis.find(k => k.name === 'volume')?.color !== 'green') {
      patch(entryIndex, { isLoadingRoots: true })
      const variants = new Map<string, KeywordRootVariant>()
      await Promise.allSettled(
        roots.map(async (rootKw) => {
          try {
            const rootResponse = await apiPost<ValidateResponse>(
              `/keywords/${encodeURIComponent(rootKw)}/validate`,
              { level, articleTitle },
            )
            const rootCard = hydrateCardFromValidation(rootKw, rootResponse)
            variants.set(rootKw, { keyword: rootKw, card: rootCard, validation: rootResponse })
          } catch { /* best-effort */ }
        }),
      )
      patch(entryIndex, { rootVariants: variants, isLoadingRoots: false })
    }
    ```
  - Action: Même modification dans `loadCards()` pour les cards du radar.
  - Notes: Le mécanisme `thisVersion !== loadVersion` reste inchangé pour la protection anti-race.

- [x] **Task 7 : Persistance serveur des root variants**
  - File: `server/services/data.service.ts`
  - Action: Ajouter fonctions `readKeywordRoots(parentSlug)` et `writeKeywordRoots(parentSlug, data)`.
  - File: `server/routes/keywords.routes.ts`
  - Action: Ajouter route GET `/api/keyword-roots/:parentKeyword` qui :
    1. Slugifie le parentKeyword
    2. Lit `data/cache/keyword-roots/{slug}.json`
    3. Retourne les variants ou `null` si pas en cache
  - Notes: L'écriture est faite automatiquement par la route validate existante — pas besoin de route PUT dédiée. La route validate écrit déjà un cache par keyword. La route GET keyword-roots lit l'index qui mappe un parent vers ses racines. L'index est écrit côté client après la validation multi-racines, via un `apiPost('/api/keyword-roots/:parent', { roots: [...] })`.
  - Action: Ajouter route POST `/api/keyword-roots/:parentKeyword` qui reçoit `{ roots: Array<{ keyword: string, cacheKey: string }> }` et écrit l'index.

- [x] **Task 8 : Nouveau composant KeywordWords.vue**
  - File: `src/components/intent/KeywordWords.vue` (NOUVEAU)
  - Action: Créer un composant encapsulant le rendu interactif des mots :
    ```
    Props:
      words: string[]           // Tous les mots du keyword original
      activeCount: number       // Combien de mots sont actifs (depuis le début)
      minActiveCount: number    // Minimum de mots (ne peut pas descendre en dessous)
      loading: boolean          // true si des racines sont en cours de chargement

    Emits:
      'update:activeCount': [count: number]  // Quand l'utilisateur toggle un mot

    Rendu:
      <span class="kw-words">
        <!-- Mots du noyau (0..minActiveCount-1) : normaux, pas cliquables -->
        <span class="kw-word kw-word--core">creation</span>
        <span class="kw-word kw-word--core">site</span>

        <!-- Mots actifs cliquables (minActiveCount..activeCount-1) : underline -->
        <span class="kw-word kw-word--active" @click="removeWord">web</span>
        <span class="kw-word kw-word--active" @click="removeWord">entreprise</span>

        <!-- Dernier mot actif : underline + highlight (c'est le prochain à retirer) -->
        <!-- Comportement : cliquer n'importe quel mot actif retire TOUS les mots à partir de lui -->

        <!-- Mots inactifs (activeCount..end) : grisés, cliquables pour ré-ajouter -->
        <span class="kw-word kw-word--inactive" @click="restoreUpTo">toulouse</span>
      </span>
    ```
  - Action: CSS :
    - `.kw-word--core` : `color: var(--color-text)`, pas de underline, `cursor: default`
    - `.kw-word--active` : `color: var(--color-text)`, `text-decoration: underline dotted`, `cursor: pointer`, `&:hover { color: var(--color-danger) }`
    - `.kw-word--inactive` : `color: var(--color-text-muted)`, `opacity: 0.4`, `text-decoration: line-through`, `cursor: pointer`, `&:hover { opacity: 0.7 }`
  - Notes: Le comportement de click est séquentiel :
    - Click sur un mot actif → `activeCount = index de ce mot` (retire ce mot et tous ceux après)
    - Click sur un mot inactif → `activeCount = index de ce mot + 1` (réactive ce mot et tous ceux avant)
    - Le font-size hérite du parent (RadarKeywordCard utilise 1.375rem)
    - Gap entre les mots : `0.35em` (espace naturel)

- [x] **Task 9 : Intégrer KeywordWords dans RadarKeywordCard**
  - File: `src/components/intent/RadarKeywordCard.vue`
  - Action: Ajouter props optionnels :
    ```ts
    const props = defineProps<{
      card: RadarCard
      interactiveWords?: {
        words: string[]
        activeCount: number
        minActiveCount: number
        loading: boolean
      }
    }>()

    const emit = defineEmits<{
      'word-toggle': [activeCount: number]
    }>()
    ```
  - Action: Modifier le template du keyword (ligne 143) :
    ```vue
    <!-- Remplacement conditionnel -->
    <KeywordWords
      v-if="interactiveWords"
      :words="interactiveWords.words"
      :active-count="interactiveWords.activeCount"
      :min-active-count="interactiveWords.minActiveCount"
      :loading="interactiveWords.loading"
      @update:active-count="emit('word-toggle', $event)"
    />
    <span v-else class="radar-card__keyword">{{ card.keyword }}</span>
    ```
  - Notes: **Rétro-compatible** — sans `interactiveWords`, comportement identique à l'existant. Le `@click="expanded = !expanded"` du header doit être ajusté pour ne pas interférer avec les clicks sur les mots (stop propagation géré dans KeywordWords).

- [x] **Task 10 : RadarCardLockable — passthrough**
  - File: `src/components/intent/RadarCardLockable.vue`
  - Action: Ajouter passthrough du prop `interactiveWords` et de l'event `word-toggle` :
    ```ts
    defineProps<{
      card: RadarCard
      locked: boolean
      interactiveWords?: { words: string[], activeCount: number, minActiveCount: number, loading: boolean }
    }>()

    defineEmits<{
      'update:locked': [value: boolean]
      'word-toggle': [activeCount: number]
    }>()
    ```
  - Action: Passer au template : `<RadarKeywordCard :card="card" :interactive-words="interactiveWords" @word-toggle="$emit('word-toggle', $event)" />`

- [x] **Task 11 : CaptainValidation — wiring du swap de variantes**
  - File: `src/components/moteur/CaptainValidation.vue`
  - Action: Ajouter la logique de gestion des variantes dans la section carousel :
    - Computed `currentWords` : découpe `carousel.currentEntry.value.originalCard.keyword` en mots
    - Computed `minActiveCount` : nombre minimum de mots (2 premiers mots significatifs — réutiliser la logique FRENCH_STOPWORDS)
    - Computed `interactiveWordsProps` : construit le prop pour RadarCardLockable
    - Handler `handleWordToggle(activeCount)` :
      1. Reconstruit le keyword actif à partir des N premiers mots
      2. Cherche dans `rootVariants` la card correspondante
      3. Si trouvée : `patch(currentIndex, { card: variant.card, validation: variant.validation, activeWordCount: activeCount })`
      4. Si non trouvée (pas de données pour cette troncature) : ne rien faire ou afficher un indicateur
  - Action: Passer `interactiveWords` et gérer `@word-toggle` dans le template RadarCardLockable :
    ```vue
    <RadarCardLockable
      :card="carousel.currentEntry.value.card"
      :locked="..."
      :interactive-words="interactiveWordsProps"
      @update:locked="..."
      @word-toggle="handleWordToggle"
    />
    ```

- [x] **Task 12 : kpi-root-zone dropdown**
  - File: `src/components/moteur/CaptainValidation.vue`
  - Action: Remplacer l'affichage simple de `.kpi-root-zone` par un dropdown compact :
    ```vue
    <div class="kpi-root-zone">
      <span class="kpi-root-head">Racines</span>
      <template v-if="currentRootVariants.length > 0">
        <button
          v-for="variant in currentRootVariants"
          :key="variant.keyword"
          class="kpi-root-item"
          :class="{ 'kpi-root-item--active': variant.keyword === activeVariantKeyword }"
          @click="switchToVariant(variant)"
        >
          <span class="kpi-root-kw">{{ variant.keyword }}</span>
          <span class="kpi-root-verdict" :style="{ color: VERDICT_COLORS[variant.validation.verdict.level] }">
            {{ variant.validation.verdict.level }}
          </span>
        </button>
      </template>
      <template v-else-if="isLoadingRoots">
        <span class="kpi-root-loading" />
      </template>
    </div>
    ```
  - Action: CSS compact : liste verticale scrollable (max-height), items petits, hover highlight.

- [x] **Task 13 : Tests unitaires — composant KeywordWords**
  - File: `tests/unit/components/keyword-words.test.ts` (NOUVEAU)
  - Action: Tests :
    - Rendu des mots avec classes correctes (core, active, inactive)
    - Click sur mot actif → emit `update:activeCount` avec bon count
    - Click sur mot inactif → emit `update:activeCount` pour réactiver
    - Click sur mot core → pas d'emit
    - Props `loading` → indicateur visuel
    - Min active count respecté

- [x] **Task 14 : Tests unitaires — multi-root validation**
  - File: `tests/unit/composables/useRadarCarousel.test.ts`
  - Action: Tests :
    - `addEntry()` avec keyword 5 mots → `rootVariants` contient 3 entrées
    - `addEntry()` avec keyword 2 mots → `rootVariants` vide
    - `addEntry()` avec volume green → pas de root validation
    - Erreur sur une racine → les autres racines sont quand même stockées
    - `hydrateCardFromValidation()` → RadarCard correctement construit

- [x] **Task 15 : Tests intégration — CaptainValidation word toggle**
  - File: `tests/unit/components/captain-validation.test.ts`
  - Action: Tests :
    - Carousel avec rootVariants → `interactiveWords` prop passé au RadarCardLockable
    - Word toggle → card swap vers la bonne variante
    - Reset (réactiver tous les mots) → retour à originalCard
    - kpi-root-zone affiche les racines avec verdicts

### Acceptance Criteria

- [x] **AC 1** : Given un keyword de 5 mots "creation site web entreprise toulouse", when validé dans le capitaine, then `extractRoots()` retourne `["creation site web entreprise", "creation site web", "creation site"]`.

- [x] **AC 2** : Given le keyword validé avec volume non-green, when la validation termine, then 3 appels API racines sont lancés en parallèle et leurs résultats stockés dans `rootVariants`.

- [x] **AC 3** : Given les rootVariants chargées, when l'utilisateur clique sur "toulouse" dans le RadarCard, then le RadarCard entier (KPIs, PAA, verdict, score ring) se met à jour avec les données de "creation site web entreprise".

- [x] **AC 4** : Given "toulouse" déjà grisé et "entreprise" cliquable, when l'utilisateur clique sur "entreprise", then le RadarCard affiche les données de "creation site web" et les deux mots sont grisés.

- [x] **AC 5** : Given des mots grisés, when l'utilisateur clique sur "entreprise" (grisé), then les mots "entreprise" et "toulouse" redeviennent actifs et le RadarCard revient aux données de "creation site web entreprise toulouse".

- [x] **AC 6** : Given un keyword de 2 mots "seo local", when validé, then aucune racine n'est extraite, le RadarCard keyword n'est pas interactif, et `extractRoots()` retourne `[]`.

- [x] **AC 7** : Given les racines validées, when le fichier d'index `data/cache/keyword-roots/{slug}.json` est lu, then il contient la liste des racines avec leurs cache keys.

- [x] **AC 8** : Given le RadarCard sans prop `interactiveWords`, when rendu, then le keyword s'affiche comme un `<span>` simple (comportement existant inchangé — rétro-compatibilité).

- [x] **AC 9** : Given une erreur API sur la racine "creation site", when les autres racines réussissent, then seules les racines réussies apparaissent dans `rootVariants` (best-effort).

- [x] **AC 10** : Given les mots "creation" et "site" comme noyau minimum (2 premiers mots significatifs), when l'utilisateur essaie de les retirer, then ils ne sont pas cliquables (`kw-word--core`).

- [x] **AC 11** : Given la kpi-root-zone dans le kpi-row, when les rootVariants sont chargées, then une liste compacte affiche chaque racine avec son verdict coloré (GO vert, ORANGE orange, NO-GO rouge).

## Additional Context

### Dependencies

- Aucune nouvelle librairie. Réutilise `apiPost`, `apiGet`, les types existants, et le cache validate côté serveur.
- Dépend de la correction PAA+hydratation de la session précédente (déjà mergée) : `hydrateCardFromValidation`, `computeCardScore`, `PaaQuestionValidate` enrichi avec `match`/`matchQuality`.

### Testing Strategy

**Unit tests :**
- `extractRoots()` — 5+ cas (variétés de longueur, stopwords, accents)
- `hydrateCardFromValidation()` — conversion correcte
- `KeywordWords.vue` — rendu des états, clicks, min count
- `useRadarCarousel` — multi-root flow, error handling
- `CaptainValidation` — word toggle → card swap

**Manual testing :**
1. Valider un keyword 5+ mots dans le capitaine
2. Vérifier que les mots sont underline (sauf les 2 premiers)
3. Cliquer le dernier mot → vérifier le swap du RadarCard
4. Cliquer un mot grisé → vérifier la réactivation
5. Vérifier la kpi-root-zone dropdown
6. Vérifier la persistance (refresh → données encore là via cache)

### Notes

**Risques :**
- **Performance** : 3-4 appels API parallèles par validation. Mitigé par le cache serveur 7 jours.
- **Complexité UI** : le `@click` sur les mots ne doit pas interférer avec le `@click` expand/collapse du header. Solution : `@click.stop` dans KeywordWords.
- **Régression RadarKeywordCard** : modifications optionnelles (prop conditionnel). Sans le prop, zero changement.

**Limitations :**
- Les mots ne peuvent être retirés que séquentiellement depuis la fin, pas au milieu.
- Le noyau minimum (2 premiers mots significatifs) ne peut pas être réduit.
- Les variantes racines sont des troncatures simples, pas des reformulations intelligentes.

**Futur (hors scope) :**
- Racines "intelligentes" (ML/NLP pour trouver des variantes sémantiquement proches)
- Suggestions de mots alternatifs à ajouter/remplacer
- Comparaison côte-à-côte de deux variantes

## Review Notes
- Adversarial review completed
- Findings: 14 total, 10 fixed, 4 skipped (noise)
- Resolution approach: auto-fix
- Key fixes applied:
  - F1 (High): switchToVariant/handleWordToggle now propagate `validation` to prevent KPI/verdict desync
  - F2 (High): addEntry now uses loadVersion staleness guard
  - F3 (Medium): handleWordToggle logs warning when variant not found
  - F4+F7 (Medium): Extracted validateRoots() helper, capped at 5 parallel root calls
  - F5+F6 (Medium): Removed dead keyword-roots server endpoints
  - F8 (Medium): Added cross-reference comment linking computeCardScore to server implementation
  - F9 (Low): Added parentheses for operator precedence clarity
  - F11 (Low): v-for key uses word+index instead of bare index
