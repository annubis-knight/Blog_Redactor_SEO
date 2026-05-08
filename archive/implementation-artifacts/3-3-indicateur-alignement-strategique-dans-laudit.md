> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

# Story 3.3: Indicateur d'alignement stratégique dans l'Audit

Status: done

## Story

As a consultant SEO,
I want voir un indicateur d'alignement stratégique pour chaque mot-clé dans l'Audit,
so that je sais immédiatement quels mots-clés correspondent à ma stratégie de cocon.

## Acceptance Criteria

1. **Given** l'utilisateur est dans l'onglet Audit avec des données DataForSEO affichées **When** une stratégie existe pour le cocon de l'article en cours **Then** une colonne "Alignement" s'affiche dans le KeywordAuditTable **And** chaque mot-clé affiche un score/indicateur basé sur le matching textuel avec la cible et la localisation de la stratégie.

2. **Given** l'utilisateur est dans l'Audit et aucune stratégie n'existe pour le cocon **When** le tableau s'affiche **Then** la colonne "Alignement" ne s'affiche PAS (pas de colonne vide).

3. **Given** un mot-clé contient des termes qui matchent la cible de la stratégie **When** l'indicateur d'alignement est calculé **Then** le score est plus élevé (ex: badge vert ou score numérique) **And** le calcul est un matching textuel simple (pas d'appel IA).

## Tasks / Subtasks

- [x] Task 1 : Créer le composable useAlignmentScore (AC: #1, #3)
  - [x] 1.1 : Créer `src/composables/useAlignmentScore.ts`
  - [x] 1.2 : Implémenter `computeAlignmentScore(keyword: string, strategicContext: StrategyContextData): AlignmentResult`
  - [x] 1.3 : Le matching textuel compare les tokens du mot-clé aux tokens de `cible` + `douleur` + `angle` (normalisés, lower-case, accents retirés)
  - [x] 1.4 : Retourner `{ score: number (0-100), level: 'fort' | 'moyen' | 'faible' | 'aucun', matchedTerms: string[] }`
  - [x] 1.5 : Score fort (≥60) si ≥2 tokens matchent ou le mot-clé entier est contenu dans la cible ; moyen (30-59) si 1 token matche ; faible (1-29) si match partiel (sous-chaîne) ; aucun (0) sinon
- [x] Task 2 : Ajouter la colonne Alignement au KeywordAuditTable (AC: #1, #2)
  - [x] 2.1 : Ajouter une prop `strategicContext?: StrategyContextData | null` au composant `KeywordAuditTable.vue`
  - [x] 2.2 : Ajouter la colonne "Alignement" dans le header entre "Verdict" et "Mot-clé" — seulement si `strategicContext` est non-null
  - [x] 2.3 : Ajouter la cellule correspondante dans chaque ligne avec un badge coloré (vert fort, jaune moyen, gris faible/aucun)
  - [x] 2.4 : Rendre la colonne sortable (par score d'alignement)
  - [x] 2.5 : Ajouter un tooltip sur le badge montrant les termes matchés
- [x] Task 3 : Passer strategicContext depuis MoteurView (AC: #1, #2)
  - [x] 3.1 : Dans `MoteurView.vue`, passer `strategyStore.strategicContext` comme prop `strategicContext` au composant `KeywordAuditTable`
- [x] Task 4 : Tests unitaires (AC: #1-3)
  - [x] 4.1 : Test useAlignmentScore — retourne score fort quand mot-clé matche la cible
  - [x] 4.2 : Test useAlignmentScore — retourne score moyen quand 1 token matche
  - [x] 4.3 : Test useAlignmentScore — retourne aucun quand aucun match
  - [x] 4.4 : Test useAlignmentScore — normalise les accents et la casse
  - [x] 4.5 : Test rendu — colonne Alignement visible quand strategicContext fourni
  - [x] 4.6 : Test rendu — colonne Alignement absente quand strategicContext null
  - [x] 4.7 : Test rendu — badge vert pour score fort, jaune pour moyen, gris pour faible

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**INCHANGÉ :**
- `server/` — Aucune modification backend. Tout le calcul est frontend (matching textuel simple, pas d'appel IA — AC #3)
- `shared/types/keyword-audit.types.ts` — Le type `KeywordAuditResult` n'est PAS modifié
- `src/stores/keyword-audit.store.ts` — Aucun changement au store
- `src/stores/cocoon-strategy.store.ts` — Déjà prêt (Story 3.1 : `strategicContext` + `fetchContext()`)
- `shared/types/strategy.types.ts` — `StrategyContextData` existe déjà avec cible, douleur, angle, promesse, cta

**MODIFIÉ :**
- `src/components/keywords/KeywordAuditTable.vue` — Ajout prop `strategicContext`, colonne conditionnelle "Alignement", badge coloré
- `src/views/MoteurView.vue` — Passer `strategyStore.strategicContext` au composant KeywordAuditTable

**CRÉÉ :**
- `src/composables/useAlignmentScore.ts` — Logique de calcul du score d'alignement
- `tests/unit/composables/useAlignmentScore.test.ts` — Tests unitaires

### Infrastructure existante

#### StrategyContextData (Story 3.1 — disponible)
```typescript
export interface StrategyContextData {
  cocoonName: string
  siloName: string
  cible: string | null     // "PME du BTP en Île-de-France"
  douleur: string | null   // "Manque de visibilité en ligne"
  angle: string | null     // "SEO local pragmatique"
  promesse: string | null
  cta: string | null
}
```

Le `strategicContext` est déjà chargé dans `cocoon-strategy.store.ts` via `fetchContext(cocoonId)` appelé dans `MoteurView.loadData()`.

#### KeywordAuditTable.vue — État actuel

Colonnes actuelles (dans l'ordre) :
```
Statut | Verdict | Mot-clé | Type | Volume | Difficulté | CPC | Compétition | Score | Alertes | Suggestions | Actions
```

Props actuelles :
```typescript
const props = defineProps<{
  results: KeywordAuditResult[]
  redundancies: RedundancyPair[]
}>()
```

Le composant est déjà sortable (ref `sortKey` + `sortAsc`). La colonne "Alignement" doit s'ajouter au système de tri existant.

#### MoteurView.vue — Passage des données Audit

```typescript
// Ligne ~553-600 dans le template
<KeywordAuditTable
  :results="auditStore.results"
  :redundancies="auditStore.redundancies"
  @compare="openComparison"
  @delete="..."
  @status-change="..."
/>
```

Il suffit d'ajouter `:strategic-context="strategyStore.strategicContext"` ici.

### Détail d'implémentation

#### Task 1 — useAlignmentScore.ts

```typescript
import type { StrategyContextData } from '../../shared/types/index'

export interface AlignmentResult {
  score: number       // 0-100
  level: 'fort' | 'moyen' | 'faible' | 'aucun'
  matchedTerms: string[]
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter(t => t.length > 2)  // Skip short words like "de", "en", "le"
}

export function computeAlignmentScore(keyword: string, ctx: StrategyContextData): AlignmentResult {
  const kwNorm = normalize(keyword)
  const kwTokens = tokenize(keyword)

  // Build reference text from cible + douleur + angle
  const refParts = [ctx.cible, ctx.douleur, ctx.angle].filter(Boolean) as string[]
  if (refParts.length === 0) return { score: 0, level: 'aucun', matchedTerms: [] }

  const refText = normalize(refParts.join(' '))
  const refTokens = tokenize(refParts.join(' '))

  const matchedTerms: string[] = []

  // Full keyword contained in reference text
  if (refText.includes(kwNorm)) {
    return { score: 80, level: 'fort', matchedTerms: [kwNorm] }
  }

  // Token matching
  for (const token of kwTokens) {
    if (refTokens.includes(token)) {
      matchedTerms.push(token)
    }
  }

  // Partial substring matching (for remaining tokens)
  if (matchedTerms.length === 0) {
    for (const token of kwTokens) {
      if (refText.includes(token)) {
        matchedTerms.push(token)
      }
    }
  }

  // Score calculation
  const matchRatio = kwTokens.length > 0 ? matchedTerms.length / kwTokens.length : 0
  let score = Math.round(matchRatio * 100)
  score = Math.min(score, 100)

  const level = score >= 60 ? 'fort' : score >= 30 ? 'moyen' : score > 0 ? 'faible' : 'aucun'

  return { score, level, matchedTerms: [...new Set(matchedTerms)] }
}
```

#### Task 2 — Colonne Alignement dans KeywordAuditTable

**Prop ajoutée :**
```typescript
const props = defineProps<{
  results: KeywordAuditResult[]
  redundancies: RedundancyPair[]
  strategicContext?: StrategyContextData | null
}>()
```

**Colonne conditionnelle (header) :**
```html
<th v-if="props.strategicContext" @click="setSort('alignment')" class="sortable">
  Alignement <span v-if="sortKey === 'alignment'">{{ sortAsc ? '▲' : '▼' }}</span>
</th>
```

**Cellule (body) — entre Verdict et Mot-clé :**
```html
<td v-if="props.strategicContext">
  <span
    class="alignment-badge"
    :class="`alignment-${getAlignment(row.keyword).level}`"
    :title="`Termes matchés : ${getAlignment(row.keyword).matchedTerms.join(', ') || 'aucun'}`"
  >
    {{ getAlignment(row.keyword).score }}%
  </span>
</td>
```

**Styles :**
```css
.alignment-badge {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;
}
.alignment-fort { background: var(--color-success-bg); color: var(--color-success); }
.alignment-moyen { background: var(--color-warning-bg); color: var(--color-warning); }
.alignment-faible { background: var(--color-muted-bg); color: var(--color-muted); }
.alignment-aucun { background: var(--color-surface-2); color: var(--color-text-muted); }
```

**Tri :** Ajouter `'alignment'` au type des sortKeys, et dans la computed `sortedResults` gérer le cas `sortKey === 'alignment'` en utilisant `computeAlignmentScore(row.keyword, props.strategicContext!)`.

#### Task 3 — MoteurView prop pass-through

```html
<KeywordAuditTable
  :results="auditStore.results"
  :redundancies="auditStore.redundancies"
  :strategic-context="strategyStore.strategicContext"
  @compare="openComparison"
  ...
/>
```

### Enforcement Guidelines

- **Pas d'appel IA** — Le calcul d'alignement est 100% frontend, textuel (AC #3, NFR9)
- **Colonne conditionnelle** — Si `strategicContext` est null, la colonne n'apparaît PAS (AC #2)
- **Utiliser le logger** (jamais `console.log`)
- **Design system CSS vars** — Réutiliser les variables CSS existantes pour les couleurs des badges
- **Pattern existant** — Suivre le pattern du composable `useKeywordScoring.ts` pour la structure
- **Normalisation accents** — Réutiliser le même pattern normalize('NFD') utilisé partout dans le projet
- **Composition API** — Pas d'Options API

### Risques identifiés

1. **Performance tri** : `computeAlignmentScore` est appelé pour chaque ligne à chaque tri. Avec ~50 mots-clés max, c'est acceptable. Si besoin, memoize avec une computed Map<keyword, AlignmentResult>.
2. **Tokens courts ignorés** : Les tokens de ≤2 caractères ("de", "en", "le") sont filtrés. Un mot-clé comme "SEO" (3 chars) sera conservé, mais "AI" (2 chars) sera filtré. C'est acceptable pour le SEO français.
3. **Matching trop large** : Le token "site" pourrait matcher dans beaucoup de stratégies. Le score basé sur le ratio de tokens matchés atténue ce risque.
4. **No-strategy fallback** : Si aucune stratégie n'existe (`strategicContext === null`), la colonne disparaît entièrement — pas de colonne vide.

### Project Structure Notes

- Nouveau composable : `src/composables/useAlignmentScore.ts`
- Fichier modifié : `src/components/keywords/KeywordAuditTable.vue`
- Fichier modifié : `src/views/MoteurView.vue`
- Nouveau test : `tests/unit/composables/useAlignmentScore.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pattern Dual-Mode]
- [Source: shared/types/strategy.types.ts — StrategyContextData]
- [Source: src/components/keywords/KeywordAuditTable.vue — colonnes existantes]
- [Source: src/stores/cocoon-strategy.store.ts — strategicContext, fetchContext]
- [Source: src/views/MoteurView.vue — passage props Audit tab]
- [Source: _bmad-output/implementation-artifacts/3-1-contexte-strategique-collapsable-dans-le-moteur.md] — Story 3.1
- [Source: _bmad-output/implementation-artifacts/3-2-enrichissement-automatique-des-prompts-ia.md] — Story 3.2

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

1. `computeAlignmentScore` — pure function, no side effects. Uses normalize('NFD') + tokenize (>2 chars) for accent-insensitive matching.
2. Dual matching strategy: full keyword containment (score 80) OR token-by-token ratio matching.
3. Alignment computed via `computed Map<keyword, AlignmentResult>` for memoization — recalculates only when results or context change.
4. Column conditionally rendered with `v-if="props.strategicContext"` on both `<th>` and `<td>`.
5. Sortable column added to SortKey type union and sort switch.
6. 13 tests pass (5 score levels + 2 normalization + 3 edge cases + 2 rendering + 1 integration), vue-tsc PASS, vite build PASS.

### File List

- `src/composables/useAlignmentScore.ts` — NEW (computeAlignmentScore, AlignmentResult)
- `src/components/keywords/KeywordAuditTable.vue` — MODIFIED (prop strategicContext, alignment column, badge styles, sort)
- `src/views/MoteurView.vue` — MODIFIED (pass strategicContext to KeywordAuditTable)
- `tests/unit/composables/useAlignmentScore.test.ts` — NEW (13 tests)
