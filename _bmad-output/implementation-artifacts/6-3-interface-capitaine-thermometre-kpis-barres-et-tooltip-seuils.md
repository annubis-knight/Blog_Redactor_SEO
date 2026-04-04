# Story 6.3: Interface Capitaine — Thermomètre, KPIs, barres et tooltip seuils

Status: done

## Story

As a consultant SEO,
I want voir le thermomètre avec le feu tricolore, chaque KPI avec une barre de progression colorée (vert/orange/rouge), et les seuils appliqués au survol,
So that je comprends visuellement pourquoi le verdict est tel qu'il est et je peux vérifier les seuils.

## Acceptance Criteria

1. **Given** un mot-clé a été validé et les KPIs sont disponibles **When** le sous-onglet Capitaine s'affiche **Then** le thermomètre affiche le score global et le feu tricolore GO/ORANGE/NO-GO **And** chaque KPI (Volume, KD, CPC, PAA, Intent, Autocomplete) est affiché avec une barre de progression colorée

2. **Given** l'utilisateur survole un KPI **When** le tooltip s'affiche **Then** il montre les seuils appliqués pour le niveau d'article courant (ex: "Volume — Pilier : VERT >1000, ORANGE 200-999, ROUGE <200")

3. **Given** les KPIs bruts sont disponibles **When** l'interface s'affiche **Then** les valeurs numériques brutes sont TOUJOURS visibles à côté des barres **And** le verdict ne masque jamais les données sources

4. **Given** le verdict est NO-GO **When** l'interface affiche le feedback **Then** une catégorie explicative est affichée avec explication

5. **Given** aucun mot-clé n'a encore été validé **When** le sous-onglet Capitaine s'affiche **Then** un état vide invite l'utilisateur à entrer un mot-clé

6. **Given** la validation est en cours (appel API) **When** l'interface attend la réponse **Then** un état de chargement est affiché

## Tasks / Subtasks

- [x] Task 1 : Créer le composable `useKeywordScoring` (AC: #1, #5, #6)
  - [x]1.1 Créer `src/composables/useKeywordScoring.ts`
  - [x]1.2 Implémenter `validateKeyword(keyword, level)` qui appelle `POST /api/keywords/:keyword/validate`
  - [x]1.3 Exposer : `result` (ref), `isLoading` (ref), `error` (ref), `validateKeyword` (fn)

- [x] Task 2 : Créer le composant `CaptainValidation.vue` (AC: #1-#6)
  - [x]2.1 Créer `src/components/moteur/CaptainValidation.vue`
  - [x]2.2 Afficher le verdict feu tricolore (GO/ORANGE/NO-GO) avec couleur et icône
  - [x]2.3 Afficher 6 barres KPI colorées (vert/orange/rouge) avec valeur brute
  - [x]2.4 Implémenter les tooltips avec seuils appliqués au survol
  - [x]2.5 Afficher le feedback NO-GO avec catégorie explicative
  - [x]2.6 Afficher état vide quand aucun résultat
  - [x]2.7 Afficher état de chargement pendant l'appel API

- [x] Task 3 : Intégrer CaptainValidation dans MoteurView (AC: #1)
  - [x]3.1 Remplacer le placeholder capitaine par le composant CaptainValidation
  - [x]3.2 Passer les props nécessaires (selectedArticle, mode)

- [x] Task 4 : Écrire les tests (AC: #1-#6)
  - [x]4.1 Créer `tests/unit/composables/useKeywordScoring.test.ts`
  - [x]4.2 Créer `tests/unit/components/captain-validation.test.ts`
  - [x]4.3 Tester l'état vide, le chargement, les KPIs, le verdict, les tooltips
  - [x]4.4 Tester le feedback NO-GO

## Dev Notes

### Architecture — Composable + Composant

Le composable `useKeywordScoring` encapsule l'appel API et l'état réactif.
Le composant `CaptainValidation.vue` est purement UI — il reçoit le résultat via props ou utilise le composable.

```typescript
// useKeywordScoring.ts
import { ref } from 'vue'
import { apiPost } from '@/services/api.service'
import type { ValidateResponse } from '@shared/types'

export function useKeywordScoring() {
  const result = ref<ValidateResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function validateKeyword(keyword: string, level: ArticleLevel) {
    isLoading.value = true
    error.value = null
    try {
      result.value = await apiPost<ValidateResponse>(
        `/keywords/${encodeURIComponent(keyword)}/validate`,
        { level },
      )
    } catch (err) {
      error.value = (err as Error).message
    } finally {
      isLoading.value = false
    }
  }

  return { result, isLoading, error, validateKeyword }
}
```

### Verdict feu tricolore — Mapping couleurs

```typescript
const VERDICT_COLORS: Record<VerdictLevel, string> = {
  'GO': '#22c55e',      // green-500
  'ORANGE': '#f59e0b',  // amber-500
  'NO-GO': '#ef4444',   // red-500
}

const VERDICT_ICONS: Record<VerdictLevel, string> = {
  'GO': '✅',
  'ORANGE': '⚠️',
  'NO-GO': '❌',
}
```

### KPI Bar — Structure HTML/CSS

Chaque KPI est affiché comme une barre avec zones colorées et tooltip :

```html
<div class="kpi-row" @mouseenter="showTooltip = name">
  <span class="kpi-name">Volume</span>
  <span class="kpi-value">1 250</span>
  <div class="kpi-bar">
    <div class="kpi-bar-fill" :style="{ width: barWidth, background: barColor }" />
  </div>
  <div v-if="showTooltip === name" class="kpi-tooltip">
    Volume — Pilier : VERT >1000, ORANGE 200-999, ROUGE <200
  </div>
</div>
```

### NO-GO Feedback Categories

```typescript
function getNoGoCategory(verdict: ValidateVerdict, kpis: KpiResult[]): string {
  if (verdict.autoNoGo) return 'Aucun signal détecté — ce mot-clé n\'existe pas dans les données'
  const volume = kpis.find(k => k.name === 'volume')
  const kd = kpis.find(k => k.name === 'kd')
  if (volume?.color === 'red' && kd?.color === 'red') return 'KPIs faibles — volume et difficulté défavorables'
  const paa = kpis.find(k => k.name === 'paa')
  if (paa?.color === 'red' && volume?.color === 'red') return 'Hors sujet — pas de PAA ni de volume'
  return 'KPIs insuffisants'
}
```

### Props du composant CaptainValidation

```typescript
interface Props {
  selectedArticle: SelectedArticle | null
  mode?: 'workflow' | 'libre'  // dual-mode pour Labo
}
```

En mode `workflow`, le niveau d'article est déterminé par `selectedArticle.type` (pilier/intermediaire/specifique).
En mode `libre`, le niveau par défaut est `intermediaire`.

### Dépendances existantes à réutiliser

| Service/Composant | Usage | Import |
|---|---|---|
| `api.service.ts` | `apiPost` pour appeler la route validate | `@/services/api.service` |
| `ValidateResponse` | Type de la réponse API | `@shared/types` |
| `ConfidenceBar.vue` | Barre de progression (déjà utilisée dans RadarThermometer) | `@/components/intent/ConfidenceBar.vue` |

### Fichiers impactés — Liste exhaustive

| Fichier | Action | Raison |
|---|---|---|
| `src/composables/useKeywordScoring.ts` | **CRÉER** | Composable appel API + état réactif |
| `src/components/moteur/CaptainValidation.vue` | **CRÉER** | Composant UI thermomètre + KPIs + verdict |
| `src/views/MoteurView.vue` | **MODIFIER** | Remplacer placeholder par CaptainValidation |
| `tests/unit/composables/useKeywordScoring.test.ts` | **CRÉER** | Tests composable |
| `tests/unit/components/captain-validation.test.ts` | **CRÉER** | Tests composant |

### Composants à NE PAS TOUCHER

- `RadarThermometer.vue` — ne sera PAS utilisé directement (le thermomètre du Capitaine a un design différent basé sur le verdict, pas sur le score radar)
- `keyword-validate.service.ts` — backend, ne pas modifier
- `keyword-validate.routes.ts` — backend, ne pas modifier
- `MoteurPhaseNavigation.vue` — navigation inchangée

### Anti-patterns à éviter

- **NE PAS** mettre la logique d'appel API dans le composant — utiliser le composable
- **NE PAS** masquer les valeurs brutes derrière le verdict — FR35 : "KPIs bruts toujours visibles"
- **NE PAS** créer un nouveau store Pinia — un composable suffit pour cette story
- **NE PAS** utiliser `console.log` — utiliser le `log` du module logger

### Testing Standards

- Framework : Vitest + Vue Test Utils
- Pattern de mock : `vi.mock()` pour api.service
- Tests du composable : mock apiPost, test des états (loading, result, error)
- Tests du composant : mount avec props, vérifier DOM (verdict, KPIs, tooltip, empty state)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 6.3 lignes 671-697]
- [Source: _bmad-output/planning-artifacts/architecture.md — CaptainValidation boundary lignes 799-808]
- [Source: src/services/api.service.ts — apiPost pattern]
- [Source: shared/types/keyword-validate.types.ts — ValidateResponse, KpiResult, ValidateVerdict]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Composable `useCapitaineValidation` créé (nom différent de `useKeywordScoring` existant qui sert à l'audit)
- Mapping `articleTypeToLevel` : Pilier→pilier, Intermédiaire→intermediaire, Spécialisé→specifique
- CaptainValidation.vue : verdict banner, 6 KPI bars colorées, tooltips hover, feedback NO-GO, empty/loading/error states
- Auto-validation via watch sur le keyword de l'article sélectionné
- Intégration MoteurView : placeholder remplacé par composant réel
- 8 tests composable + 15 tests composant = 23 tests — zéro échec
- Suite complète : 101 fichiers, 1346 tests — zéro régression

### File List

- `src/composables/useCapitaineValidation.ts` — CRÉÉ (composable validation API)
- `src/components/moteur/CaptainValidation.vue` — CRÉÉ (UI thermomètre + KPIs + verdict)
- `src/views/MoteurView.vue` — MODIFIÉ (import + remplacement placeholder)
- `tests/unit/composables/useCapitaineValidation.test.ts` — CRÉÉ (8 tests)
- `tests/unit/components/captain-validation.test.ts` — CRÉÉ (15 tests)
