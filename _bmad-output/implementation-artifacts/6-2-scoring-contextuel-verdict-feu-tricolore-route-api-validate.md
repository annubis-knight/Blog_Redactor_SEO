# Story 6.2: Scoring contextuel + Verdict feu tricolore + route API validate

Status: done

## Story

As a consultant SEO,
I want un feu tricolore GO/ORANGE/NO-GO calculé à partir de 6 KPIs (Volume, KD, CPC, PAA, Intent, Autocomplete) avec des seuils adaptés au niveau de mon article,
So that je sais immédiatement si mon mot-clé est viable sans avoir à interpréter les données brutes moi-même.

## Acceptance Criteria

1. **Given** un mot-clé Capitaine est soumis avec un niveau d'article (Pilier/Intermédiaire/Spécifique) **When** la route `POST /api/keywords/:keyword/validate` est appelée **Then** elle lance en parallèle : DataForSEO (volume, KD, CPC), Autocomplete, PAA **And** elle retourne les 6 KPIs bruts + le verdict (GO/ORANGE/NO-GO) + les seuils appliqués

2. **Given** le niveau d'article est "Pilier" **When** le scoring est calculé **Then** les seuils sont : Volume VERT >1000, KD VERT <40, CPC bonus >2€ **And** le verdict GO nécessite ≥4/6 verts, AUCUN rouge sur Volume ou KD, PAA non-rouge

3. **Given** le niveau d'article est "Spécifique" **When** le scoring est calculé **Then** les seuils sont : Volume VERT >30, KD VERT <20

4. **Given** volume=0 ET PAA=0 ET autocomplete=0 **When** le scoring est calculé **Then** le verdict est NO-GO automatique avec raison "Aucun signal détecté"

5. **Given** CPC = 0.5€ **When** le scoring CPC est calculé **Then** le KPI CPC est "neutre" (ni vert, ni rouge)

6. **Given** CPC = 3.2€ **When** le scoring CPC est calculé **Then** le KPI CPC est "bonus vert"

7. **Given** un résultat valide existe en cache pour ce mot-clé + niveau **When** la même requête est envoyée **Then** le résultat est retourné depuis le cache sans appel API externe

## Tasks / Subtasks

- [x] Task 1 : Créer les types partagés pour le scoring Capitaine (AC: #1)
  - [x] 1.1 Créer `shared/types/keyword-validate.types.ts` avec : `ArticleLevel`, `KpiColor`, `KpiResult`, `ValidateVerdict`, `ValidateResponse`, `ThresholdConfig`
  - [x] 1.2 Exporter depuis `shared/types/index.ts`

- [x] Task 2 : Créer le service de scoring `keyword-validate.service.ts` (AC: #1-#6)
  - [x] 2.1 Créer `server/services/keyword-validate.service.ts`
  - [x] 2.2 Implémenter `THRESHOLDS` : table de seuils par niveau (Pilier/Intermédiaire/Spécifique)
  - [x] 2.3 Implémenter `scoreKpi(name, rawValue, thresholds)` → `KpiResult` avec couleur vert/orange/rouge/neutre
  - [x] 2.4 Implémenter `computeVerdict(kpis: KpiResult[])` → `ValidateVerdict` avec logique GO/ORANGE/NO-GO
  - [x] 2.5 Implémenter la règle NO-GO automatique si volume=0 ET PAA=0 ET autocomplete=0
  - [x] 2.6 Implémenter la règle CPC asymétrique : >bonus = bonus vert, sinon neutre (jamais rouge)

- [x] Task 3 : Créer la route `POST /api/keywords/:keyword/validate` (AC: #1, #7)
  - [x] 3.1 Créer `server/routes/keyword-validate.routes.ts`
  - [x] 3.2 Valider les paramètres d'entrée : keyword (URL), level (body, requis)
  - [x] 3.3 Vérifier le cache avant les appels API (clé : keyword + level)
  - [x] 3.4 Lancer en parallèle : `fetchKeywordOverview` (volume, KD, CPC), `fetchAutocomplete`, `fetchPaa`
  - [x] 3.5 Construire les 6 KPIs, appliquer le scoring, retourner `{ data: ValidateResponse }`
  - [x] 3.6 Écrire en cache le résultat
  - [x] 3.7 Enregistrer la route dans `server/index.ts`

- [x] Task 4 : Écrire les tests du service de scoring (AC: #2-#6)
  - [x] 4.1 Créer `tests/unit/services/keyword-validate.test.ts`
  - [x] 4.2 Tester les seuils Pilier : Volume >1000 = vert, KD <40 = vert, CPC >2€ = bonus
  - [x] 4.3 Tester les seuils Spécifique : Volume >30 = vert, KD <20 = vert
  - [x] 4.4 Tester les seuils Intermédiaire
  - [x] 4.5 Tester la règle NO-GO automatique (volume=0 ET PAA=0 ET autocomplete=0)
  - [x] 4.6 Tester la règle CPC asymétrique (bonus vert, neutre, jamais rouge)
  - [x] 4.7 Tester le verdict GO (≥4/6 verts, pas de rouge Volume/KD, PAA non-rouge)
  - [x] 4.8 Tester le verdict ORANGE (mix sans rouge critique)
  - [x] 4.9 Tester le verdict NO-GO (rouge Volume ET KD)

- [x] Task 5 : Écrire les tests de la route (AC: #1, #7)
  - [x] 5.1 Créer `tests/unit/routes/keyword-validate.routes.test.ts`
  - [x] 5.2 Tester la validation des paramètres (keyword manquant, level manquant)
  - [x] 5.3 Tester l'appel parallèle des 3 sources
  - [x] 5.4 Tester le retour cache (pas d'appel API si cache frais)
  - [x] 5.5 Tester la structure de la réponse `{ data: ValidateResponse }`

## Dev Notes

### Architecture — Service de scoring pur (pas de side-effects)

Le service `keyword-validate.service.ts` est un module **pur** (fonctions sans side-effects) qui prend des données brutes et retourne des résultats de scoring. La route orchestre les appels API et le cache.

```typescript
// keyword-validate.service.ts — fonctions pures
export function getThresholds(level: ArticleLevel): ThresholdConfig { ... }
export function scoreKpi(name: string, rawValue: number, config: ThresholdConfig): KpiResult { ... }
export function computeVerdict(kpis: KpiResult[]): ValidateVerdict { ... }

// keyword-validate.routes.ts — orchestration
// 1. Check cache
// 2. Parallel fetch (DataForSEO, Autocomplete, PAA)
// 3. Score KPIs via service
// 4. Compute verdict via service
// 5. Write cache
// 6. Return response
```

### Types à créer — `shared/types/keyword-validate.types.ts`

```typescript
export type ArticleLevel = 'pilier' | 'intermediaire' | 'specifique'

export type KpiColor = 'green' | 'orange' | 'red' | 'neutral' | 'bonus'

export interface KpiResult {
  name: string           // 'volume' | 'kd' | 'cpc' | 'paa' | 'intent' | 'autocomplete'
  rawValue: number
  color: KpiColor
  label: string          // Ex: "1 250 recherches/mois"
  thresholds: {          // Seuils appliqués (pour tooltip frontend)
    green: number
    orange?: number
    red?: number
  }
}

export type VerdictLevel = 'GO' | 'ORANGE' | 'NO-GO'

export interface ValidateVerdict {
  level: VerdictLevel
  greenCount: number     // Nombre de KPIs verts
  totalKpis: number      // Toujours 6
  reason?: string        // Ex: "Aucun signal détecté", "KPIs faibles"
  autoNoGo: boolean      // True si NO-GO automatique (0 signaux)
}

export interface ValidateResponse {
  keyword: string
  articleLevel: ArticleLevel
  kpis: KpiResult[]
  verdict: ValidateVerdict
  fromCache: boolean
  cachedAt: string | null
}

export interface ThresholdConfig {
  volume: { green: number; orange: number }
  kd: { green: number; orange: number }
  cpc: { bonus: number }
  paa: { green: number; orange: number }
  intent: { match: string; mixed: string }
  autocomplete: { green: number; orange: number }
}
```

### Seuils par niveau — Table complète

```typescript
const THRESHOLDS: Record<ArticleLevel, ThresholdConfig> = {
  pilier: {
    volume:       { green: 1000, orange: 200 },
    kd:           { green: 40, orange: 65 },      // Inversé : < green = vert
    cpc:          { bonus: 2 },                     // Asymétrique : >2€ = bonus
    paa:          { green: 3, orange: 1 },          // Nombre de PAA pertinents
    intent:       { match: 'informational', mixed: 'mixed' },
    autocomplete: { green: 3, orange: 6 },          // Position dans suggestions (< = mieux)
  },
  intermediaire: {
    volume:       { green: 200, orange: 50 },
    kd:           { green: 30, orange: 50 },
    cpc:          { bonus: 2 },
    paa:          { green: 2, orange: 1 },
    intent:       { match: 'informational', mixed: 'mixed' },
    autocomplete: { green: 4, orange: 7 },
  },
  specifique: {
    volume:       { green: 30, orange: 5 },
    kd:           { green: 20, orange: 40 },
    cpc:          { bonus: 2 },
    paa:          { green: 1, orange: 0 },
    intent:       { match: 'informational', mixed: 'mixed' },
    autocomplete: { green: 5, orange: 8 },
  },
}
```

### Règles du verdict global

```
GO si :
  - ≥4/6 verts (bonus compte comme vert)
  - AUCUN rouge sur Volume ou KD
  - PAA non-rouge

ORANGE si :
  - Mix sans rouge critique
  - OU données insuffisantes mais quelques signaux

NO-GO si :
  - Rouge Volume ET KD
  - OU PAA rouge + Volume rouge

NO-GO automatique si :
  - volume = 0 ET paaCount = 0 ET autocompletePosition = 0
  - Raison : "Aucun signal détecté"
```

### Règle CPC asymétrique

Le CPC n'est JAMAIS rouge. C'est un bonus uniquement :
- CPC > seuil bonus (2€) → `color: 'bonus'` (compte comme vert dans le verdict)
- CPC ≤ seuil bonus → `color: 'neutral'` (ne pénalise pas, ne bonus pas)

### Dépendances existantes à réutiliser

| Service/Util | Usage | Import |
|---|---|---|
| `dataforseo.service.ts` | `fetchKeywordOverview(keyword)` → volume, KD, CPC, competition | Déjà existant |
| `autocomplete.service.ts` | `fetchAutocomplete(keyword)` → suggestions[] avec position | Déjà existant |
| `dataforseo.service.ts` | `fetchPaa(keyword)` → PaaQuestion[] | Déjà existant |
| `json-storage.ts` | `readJson` / `writeJson` pour le cache | Déjà existant |
| `logger.ts` | `log.debug/info/warn/error` | Déjà existant |

### Pattern de cache — validation

```typescript
// Clé cache : data/cache/validate/{keyword-slug}-{level}.json
// TTL : 7 jours (même que DataForSEO)
// Structure : { ...ValidateResponse, cachedAt: string }

const cacheDir = path.join('data', 'cache', 'validate')
const cacheFile = `${slugify(keyword)}-${level}.json`
```

### Pattern de route — appels parallèles

```typescript
// Pattern existant dans dataforseo.service.ts → getBrief()
const [overview, autocomplete, paa] = await Promise.all([
  fetchKeywordOverview(keyword),
  fetchAutocomplete(keyword),
  fetchPaa(keyword),
])
```

### Fichiers impactés — Liste exhaustive

| Fichier | Action | Raison |
|---|---|---|
| `shared/types/keyword-validate.types.ts` | **CRÉER** | Types partagés front/back |
| `shared/types/index.ts` | **MODIFIER** | Exporter les nouveaux types |
| `server/services/keyword-validate.service.ts` | **CRÉER** | Scoring pur (seuils, KPIs, verdict) |
| `server/routes/keyword-validate.routes.ts` | **CRÉER** | Route POST /api/keywords/:keyword/validate |
| `server/index.ts` | **MODIFIER** | Enregistrer la nouvelle route |
| `tests/unit/services/keyword-validate.test.ts` | **CRÉER** | Tests unitaires scoring |
| `tests/unit/routes/keyword-validate.routes.test.ts` | **CRÉER** | Tests route + cache |

### Composants à NE PAS TOUCHER

- `MoteurView.vue` — Le frontend consommera cette route dans Story 6.3
- `dataforseo.service.ts` — Réutiliser tel quel, ne pas modifier
- `autocomplete.service.ts` — Réutiliser tel quel
- `article-keywords.store.ts` — Pas encore impacté

### Anti-patterns à éviter

- **NE PAS** mettre la logique de scoring dans la route — le service doit être pur et testable indépendamment
- **NE PAS** créer un nouveau type `KeywordType` — réutiliser `ArticleLevel` qui correspond au niveau de l'article dans la stratégie
- **NE PAS** appeler `fetchKeywordOverview` puis `fetchPaa` séquentiellement — toujours en parallèle via `Promise.all`
- **NE PAS** utiliser `console.log` — utiliser le `log` du module logger
- **NE PAS** retourner de réponse JSON brute — toujours `{ data: result }` ou `{ error: { code, message } }`
- **NE PAS** faire du CPC un KPI rouge — il est TOUJOURS bonus ou neutre
- **NE PAS** stocker les seuils en dur dans la route — les garder dans le service pour testabilité

### Convention Intent scoring

L'intent est évalué via les données DataForSEO existantes (`fetchSearchIntentBatch`). Pour cette story, utiliser le champ `intent` de `KeywordOverview` si disponible, sinon fallback sur 'mixed'.

### Previous Story Intelligence (6.1)

- MoteurView.vue a des placeholders pour le sous-onglet Capitaine — cette story fournit l'API backend que Story 6.3 consommera côté frontend
- PHASE_CHECKS inclut déjà `capitaine_locked` — l'émission de ce check arrivera dans Story 6.5
- Le BasketStrip et TabCachePanel sont en place

### Project Structure Notes

- Le service de scoring est 100% backend (pas de composant Vue dans cette story)
- Les types partagés dans `shared/types/` sont accessibles côté front et back via le alias `@shared`
- Le cache de validation utilise un sous-dossier dédié `data/cache/validate/`

### Testing Standards

- Framework : Vitest
- Pattern de mock : `vi.mock()` pour les services externes (DataForSEO, Autocomplete)
- Tests du service : fonctions pures, pas besoin de mock (sauf pour les imports)
- Tests de la route : mock des services, test de la réponse HTTP
- Assertion sur les structures de données, les couleurs KPI, les verdicts

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 6.2 lignes 633-670]
- [Source: _bmad-output/planning-artifacts/architecture.md — Scoring contextuel Capitaine lignes 253-280]
- [Source: _bmad-output/planning-artifacts/architecture.md — Communication Patterns lignes 442-497]
- [Source: _bmad-output/planning-artifacts/architecture.md — Structure projet lignes 577-619]
- [Source: _bmad-output/planning-artifacts/architecture.md — Anti-patterns lignes 538-548]
- [Source: server/services/dataforseo.service.ts — fetchKeywordOverview, fetchPaa, computeCompositeScore]
- [Source: server/routes/keywords.routes.ts — Pattern de route Express existant]
- [Source: shared/types/index.ts — Types existants KeywordOverview, PaaQuestion]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Types partagés créés : ArticleLevel, KpiColor, KpiResult, ValidateVerdict, ValidateResponse, ThresholdConfig
- Service de scoring pur (0 side-effects) : getThresholds, scoreKpi, computeVerdict
- Seuils complets pour 3 niveaux : Pilier (vol>1000, KD<40), Intermédiaire (vol>200, KD<30), Spécifique (vol>30, KD<20)
- CPC asymétrique : >bonus = bonus, sinon neutral, jamais rouge
- NO-GO automatique : volume=0 ET PAA=0 ET autocomplete=0 → "Aucun signal détecté"
- Route POST /api/keywords/:keyword/validate avec cache 7j, clé keyword+level
- Appels parallèles : fetchKeywordOverview + fetchAutocomplete + fetchPaa via Promise.all
- Intent defaulté à 0.5 (mixed) — intégration complète dans une story future
- 50 tests service + 9 tests route = 59 tests — zéro échec
- Suite complète : 99 fichiers, 1323 tests — zéro régression

### File List

- `shared/types/keyword-validate.types.ts` — CRÉÉ (types partagés front/back)
- `shared/types/index.ts` — MODIFIÉ (export des nouveaux types)
- `server/services/keyword-validate.service.ts` — CRÉÉ (scoring pur)
- `server/routes/keyword-validate.routes.ts` — CRÉÉ (route POST validate)
- `server/index.ts` — MODIFIÉ (enregistrement route)
- `tests/unit/services/keyword-validate.test.ts` — CRÉÉ (50 tests)
- `tests/unit/routes/keyword-validate.routes.test.ts` — CRÉÉ (9 tests)
