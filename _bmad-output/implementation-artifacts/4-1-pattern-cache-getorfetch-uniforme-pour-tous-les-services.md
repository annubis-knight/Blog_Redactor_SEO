# Story 4.1: Pattern cache getOrFetch uniforme pour tous les services

Status: done

## Story

As a consultant SEO,
I want que tous les résultats d'API externes soient cachés automatiquement,
so that je ne paie jamais deux fois pour la même requête et que l'app reste rapide.

## Acceptance Criteria

1. **Given** le pattern cache DataForSEO existant dans `dataforseo.service.ts` **When** le pattern `getOrFetch<T>()` est extrait et uniformisé **Then** une fonction utilitaire est disponible pour tous les services backend.

2. **Given** un service (Discovery, Intent, Validation, Local, Autocomplete) reçoit une requête **When** un résultat valide existe déjà en cache (fichier JSON sur disque) pour la même clé **Then** le résultat est retourné depuis le cache sans appel API externe (NFR5) **And** la réponse est retournée en < 200ms (NFR1).

3. **Given** un service reçoit une requête sans résultat en cache **When** l'appel API externe est effectué et retourne un résultat **Then** le résultat est sauvegardé sur disque (fichier JSON) via `writeJson()` (NFR6) **And** les prochaines requêtes identiques utiliseront le cache.

4. **Given** l'application est redémarrée **When** un service reçoit une requête pour une clé déjà cachée **Then** le résultat est rechargé depuis le fichier JSON sur disque **And** aucun appel API externe n'est effectué.

## Tasks / Subtasks

- [x] Task 1 : Créer l'utilitaire getOrFetch<T> dans server/utils/cache.ts (AC: #1)
  - [x]1.1 : Créer `server/utils/cache.ts` avec la fonction `getOrFetch<T>(cacheDir, key, ttlMs, fetcher): Promise<T>`
  - [x]1.2 : Implémenter la lecture du cache — `readJson<CacheEntry<T>>(path)` avec check TTL
  - [x]1.3 : Implémenter l'écriture du cache — `writeJson(path, { data, cachedAt })` (atomic write via json-storage)
  - [x]1.4 : Implémenter le type `CacheEntry<T>` = `{ data: T, cachedAt: string }`
  - [x]1.5 : Implémenter `isFresh(cachedAt: string, ttlMs: number): boolean` — compare Date.now() avec timestamp
  - [x]1.6 : Ajouter `slugify()` dans le module cache (extraire depuis dataforseo.service.ts ou réimporter)
  - [x]1.7 : Ajouter logging via `log.debug` (cache hit/miss, cache write)
- [x] Task 2 : Migrer dataforseo.service.ts vers getOrFetch (AC: #2, #3, #4)
  - [x]2.1 : Remplacer le pattern read/check/fetch/write dans `getBrief()` par un appel à `getOrFetch`
  - [x]2.2 : Conserver les 4 fetchers parallèles (SERP, PAA, related, overview) dans le callback fetcher
  - [x]2.3 : Préserver la logique `forceRefresh` comme option override
  - [x]2.4 : S'assurer que la réponse existante `{ ...entry, fromCache: boolean }` reste identique
- [x] Task 3 : Migrer les services déjà cachés vers getOrFetch (AC: #2, #3, #4)
  - [x]3.1 : `autocomplete.service.ts` — remplacer readAutocompleteCache/writeAutocompleteCache par getOrFetch
  - [x]3.2 : `community-discussions.service.ts` — remplacer readDiscussionsCache/writeDiscussionsCache par getOrFetch
  - [x]3.3 : `content-gap.service.ts` — remplacer la logique cache manuelle par getOrFetch
  - [x]3.4 : `intent.service.ts` — remplacer la logique cache intent-* par getOrFetch
  - [x]3.5 : `local-seo.service.ts` — remplacer la logique cache maps-* par getOrFetch
- [x] Task 4 : Ajouter le cache aux services sans cache (AC: #2, #3, #4)
  - [x]4.1 : `suggest.service.ts` — wraper les 4 stratégies (alphabet, questions, intents, prepositions) dans getOrFetch avec TTL court (1h)
  - [x]4.2 : `keyword-discovery.service.ts` — wraper `discoverKeywords()` dans getOrFetch si résultat complet (enriched + classified)
- [x]Task 5 : Tests unitaires (AC: #1-4)
  - [x]5.1 : Test getOrFetch — retourne le cache quand le fichier existe et est frais
  - [x]5.2 : Test getOrFetch — appelle le fetcher quand le cache est absent
  - [x]5.3 : Test getOrFetch — appelle le fetcher quand le cache est expiré (TTL dépassé)
  - [x]5.4 : Test getOrFetch — écrit le résultat sur disque après un fetch
  - [x]5.5 : Test getOrFetch — gère les erreurs de lecture gracieusement (fichier corrompu)
  - [x]5.6 : Test isFresh — retourne true quand le timestamp est dans le TTL
  - [x]5.7 : Test isFresh — retourne false quand le TTL est dépassé
  - [x]5.8 : Test d'intégration — un service migré utilise getOrFetch correctement (mock readJson/writeJson)

## Dev Notes

### Architecture — Ce qui change vs ce qui reste

**INCHANGÉ :**
- `server/utils/json-storage.ts` — readJson/writeJson restent tels quels (atomic write via .tmp + rename)
- `data/cache/` — structure de répertoires préservée
- `server/services/paa-cache.service.ts` — dual-level cache (forward + reverse index) — trop spécialisé pour getOrFetch, ne pas migrer
- `server/services/discovery-cache.service.ts` — cache workflow-level avec memory cache + disk — trop spécialisé, ne pas migrer
- `server/services/claude.service.ts` — pas de cache (chaque prompt est unique)
- `server/services/embedding.service.ts` — cache model in-memory (pas de disk cache)
- `server/services/gsc.service.ts` — OAuth token cache séparé
- Frontend — aucune modification (le cache est 100% backend)

**CRÉÉ :**
- `server/utils/cache.ts` — utilitaire `getOrFetch<T>()`, `CacheEntry<T>`, `isFresh()`
- `tests/unit/utils/cache.test.ts` — tests unitaires

**MODIFIÉ :**
- `server/services/dataforseo.service.ts` — migration vers getOrFetch
- `server/services/autocomplete.service.ts` — migration vers getOrFetch
- `server/services/community-discussions.service.ts` — migration vers getOrFetch
- `server/services/content-gap.service.ts` — migration vers getOrFetch
- `server/services/intent.service.ts` — migration vers getOrFetch
- `server/services/local-seo.service.ts` — migration vers getOrFetch
- `server/services/suggest.service.ts` — ajout cache via getOrFetch
- `server/services/keyword-discovery.service.ts` — ajout cache via getOrFetch (optionnel)

### Infrastructure existante

#### json-storage.ts (à réutiliser, pas à modifier)
```typescript
// server/utils/json-storage.ts
export async function readJson<T>(filePath: string): Promise<T>
// Reads file, parses JSON, returns typed result. Throws on missing/corrupt file.

export async function writeJson<T>(filePath: string, data: T): Promise<void>
// Atomic write via .tmp + rename. ensureDir() before write. Pretty-printed JSON.

export async function ensureDir(dirPath: string): Promise<void>
// mkdir -p equivalent
```

#### Cache DataForSEO — Pattern actuel (à extraire)
```typescript
// dataforseo.service.ts — pattern actuel à généraliser
const CACHE_DIR = join(process.cwd(), 'data', 'cache')

function getCachePath(keyword: string): string {
  return join(CACHE_DIR, `${slugify(keyword)}.json`)
}

async function readCache(keyword: string): Promise<DataForSeoCacheEntry | null> {
  try { return await readJson<DataForSeoCacheEntry>(getCachePath(keyword)) }
  catch { return null }
}

async function writeCache(data: DataForSeoCacheEntry): Promise<void> {
  await writeJson(getCachePath(data.keyword), data)
}

function isCacheFresh(cachedAt: string): boolean {
  const minHours = isDev ? 0 : DEFAULT_MIN_REFRESH_HOURS
  return Date.now() - new Date(cachedAt).getTime() < minHours * 3600_000
}
```

**getBrief() orchestrator (lines 487-540) :**
```typescript
async function getBrief(keyword: string, forceRefresh?: boolean) {
  const cached = await readCache(keyword)
  if (cached && isCacheFresh(cached.cachedAt) && !forceRefresh) {
    return { ...cached, fromCache: true }
  }
  // Fetch 4 endpoints in parallel (Promise.allSettled)
  const [serp, paa, related, overview] = await Promise.allSettled([...])
  // Build entry, write cache
  const entry = { keyword, serp, paa, related, overview, cachedAt: new Date().toISOString() }
  await writeCache(entry)
  return { ...entry, fromCache: false }
}
```

#### Autres services cachés — Patterns actuels

**autocomplete.service.ts :**
- Cache dir : `data/cache/autocomplete/`
- TTL : 24h (results), 30min (empty)
- Functions : `readAutocompleteCache()`, `writeAutocompleteCache()`
- Key : `slugify(keyword).json`

**community-discussions.service.ts :**
- Cache dir : `data/cache/discussions/`
- TTL : 48h
- Functions : `readDiscussionsCache()`, `writeDiscussionsCache()`
- Key : `slugify(keyword).json`

**intent.service.ts :**
- Cache dir : `data/cache/` (root cache dir)
- TTL : implicite (first write wins)
- Key : `intent-${slugify(keyword)}.json`

**local-seo.service.ts :**
- Cache dir : `data/cache/` (root cache dir)
- TTL : implicite (first write wins)
- Key : `maps-${slugify(keyword)}.json`

**content-gap.service.ts :**
- Cache dir : `data/cache/` (root cache dir)
- TTL : implicite (first write wins)
- Key : `content-gap-${slugify(keyword)}.json`

#### slugify — Fonction partagée (à extraire ou réimporter)
```typescript
export function slugify(keyword: string): string {
  return keyword
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
```
Actuellement définie dans `dataforseo.service.ts` (lines 61-68) et réimportée par autocomplete, community-discussions, etc. L'extraction vers `cache.ts` est recommandée si les services ne la trouvent pas déjà.

### Détail d'implémentation

#### Task 1 — server/utils/cache.ts

```typescript
import { readJson, writeJson } from './json-storage.js'
import { join } from 'node:path'
import { log } from './logger.js'

export interface CacheEntry<T> {
  data: T
  cachedAt: string  // ISO timestamp
}

export function isFresh(cachedAt: string, ttlMs: number): boolean {
  if (ttlMs <= 0) return false  // TTL 0 = always stale (dev mode override)
  return Date.now() - new Date(cachedAt).getTime() < ttlMs
}

export async function getOrFetch<T>(
  cacheDir: string,
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const filePath = join(cacheDir, `${key}.json`)

  // Try reading cache
  try {
    const entry = await readJson<CacheEntry<T>>(filePath)
    if (isFresh(entry.cachedAt, ttlMs)) {
      log.debug(`Cache HIT: ${key}`)
      return entry.data
    }
    log.debug(`Cache STALE: ${key}`)
  } catch {
    log.debug(`Cache MISS: ${key}`)
  }

  // Fetch fresh data
  const data = await fetcher()

  // Write to cache
  const entry: CacheEntry<T> = { data, cachedAt: new Date().toISOString() }
  await writeJson(filePath, entry)
  log.debug(`Cache WRITE: ${key}`)

  return data
}
```

**IMPORTANT :** Le wrapper `CacheEntry<T>` ajoute un niveau `{ data, cachedAt }` autour des données. Cela signifie que les services migrés devront adapter leur format de cache — OU on introduit un flag de compatibilité pour les anciens formats.

**Recommandation :** Migrer vers le nouveau format `{ data, cachedAt }` pour tous les services. Les anciens fichiers cache seront automatiquement invalidés (lecture échoue → cache miss → re-fetch).

#### Task 2 — Migration dataforseo.service.ts

Le service DataForSEO a un pattern complexe (4 endpoints parallèles, graceful degradation, `fromCache` flag). La migration ne doit PAS simplifier ce pattern :

```typescript
// Option A : getOrFetch wrapping the entire getBrief flow
async function getBrief(keyword: string, forceRefresh?: boolean) {
  if (forceRefresh) {
    return await fetchAndCacheBrief(keyword)
  }
  const data = await getOrFetch<DataForSeoCacheEntry>(
    CACHE_DIR, slugify(keyword), CACHE_TTL_MS,
    () => fetchAndCacheBrief(keyword),
  )
  return data
}
```

**Attention :** Le service DataForSEO stocke actuellement `{ keyword, serp, paa, relatedKeywords, keywordData, cachedAt }` à la racine (pas dans `{ data: { ... }, cachedAt }`). La migration vers `CacheEntry<T>` changera le format — les anciens fichiers cache seront des cache miss (acceptable, ils seront re-fetched).

#### Task 3 — Services déjà cachés

Pour chaque service, le pattern est similaire :

```typescript
// Avant (pattern ad-hoc)
const cached = await readDiscussionsCache(keyword)
if (cached) return cached
const result = await fetchCommunityDiscussions(keyword)
await writeDiscussionsCache(keyword, result)
return result

// Après (getOrFetch uniforme)
import { getOrFetch } from '../utils/cache.js'
const CACHE_DIR = join(process.cwd(), 'data', 'cache', 'discussions')
const TTL_48H = 48 * 3600_000

const result = await getOrFetch(
  CACHE_DIR, slugify(keyword), TTL_48H,
  () => fetchCommunityDiscussions(keyword),
)
return result
```

Les fonctions `readXxxCache()` et `writeXxxCache()` locales deviennent obsolètes et peuvent être supprimées.

#### Task 4 — Services sans cache

**suggest.service.ts :**
- Les 4 stratégies (alphabet, questions, intents, prepositions) sont indépendantes
- Chaque stratégie fait ~30 appels Google Suggest en parallèle
- Cache TTL court recommandé : 1h (les suggestions changent fréquemment)
- Wraper au niveau de `fetchAllSuggestions(keyword)` qui retourne les 4 résultats

**keyword-discovery.service.ts :**
- Le résultat complet (enriched + classified) est le candidat au cache
- Mais les sub-calls utilisent déjà le cache DataForSEO pour les batch endpoints
- Cache optionnel — TTL 24h recommandé pour le résultat complet

### Enforcement Guidelines

- Utiliser `readJson`/`writeJson` de `json-storage.ts` — jamais `fs.readFile/writeFile` directement
- Logger via `log.debug/info` — jamais `console.log`
- Le type `CacheEntry<T>` DOIT wraper les données dans `{ data, cachedAt }` — format uniforme
- `getOrFetch` ne doit PAS gérer les erreurs du fetcher — les laisser remonter au caller
- La fonction `slugify()` doit être la MÊME partout — pas de variantes
- **Ne PAS migrer** paa-cache.service.ts (dual-level index trop spécialisé)
- **Ne PAS migrer** discovery-cache.service.ts (cache mémoire + disque trop spécialisé)
- **Ne PAS migrer** claude.service.ts (chaque prompt est unique)
- **Ne PAS cacher** les appels Claude API ou embedding — pas de pattern cache applicable
- Tests dans `tests/unit/utils/cache.test.ts` — mock readJson/writeJson

### Risques identifiés

1. **Changement de format cache** : La migration vers `CacheEntry<T>` invalide les anciens fichiers cache (format incompatible). C'est acceptable — les données seront re-fetched à la prochaine requête. Documenter que la première utilisation post-migration sera plus lente.
2. **TTL inconsistants** : Chaque service a son propre TTL (24h, 48h, 1h, 0 en dev). L'utilitaire `getOrFetch` accepte `ttlMs` en paramètre — les services gardent le contrôle.
3. **suggest.service.ts rate limiting** : Google Suggest a un rate limit implicite (429). Le cache réduit la pression, mais le TTL court (1h) signifie qu'on re-fetch souvent. Prévoir un fallback graceful si 429.
4. **dataforseo.service.ts complexité** : Le service a `Promise.allSettled` pour 4 endpoints parallèles + graceful degradation. La migration vers `getOrFetch` doit préserver ce comportement.

### Project Structure Notes

- Nouveau fichier : `server/utils/cache.ts`
- Nouveau test : `tests/unit/utils/cache.test.ts`
- 7-8 services modifiés (voir liste "MODIFIÉ" ci-dessus)
- Structure `data/cache/` préservée

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — Pattern cache]
- [Source: server/utils/json-storage.ts — readJson, writeJson, ensureDir]
- [Source: server/services/dataforseo.service.ts — getBrief, readCache, writeCache, isCacheFresh, slugify]
- [Source: server/services/autocomplete.service.ts — readAutocompleteCache, writeAutocompleteCache]
- [Source: server/services/community-discussions.service.ts — readDiscussionsCache, writeDiscussionsCache]
- [Source: server/services/content-gap.service.ts — cache logic]
- [Source: server/services/intent.service.ts — cache logic]
- [Source: server/services/local-seo.service.ts — cache logic]
- [Source: server/services/suggest.service.ts — no cache, 4 strategies]
- [Source: server/services/keyword-discovery.service.ts — no own cache]
- [Source: _bmad-output/implementation-artifacts/epic-3-retro-2026-03-30.md] — Epic précédent

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- Created `server/utils/cache.ts` with `CacheEntry<T>`, `slugify`, `isFresh`, `readCached`, `writeCached`, `getOrFetch`
- Migrated dataforseo.service.ts — `readCache`/`writeCache`/`isCacheFresh` delegate to cache.ts; `slugify` re-exported
- Migrated autocomplete.service.ts — uses manual `readCached`/`isFresh`/`writeCached` for dynamic TTL (24h normal, 30min empty)
- Migrated community-discussions.service.ts — uses `getOrFetch` with try/catch for EMPTY_SIGNAL fallback
- Migrated content-gap.service.ts — uses `getOrFetch` with Infinity TTL
- Migrated intent.service.ts — `getOrFetch` for analyzeIntent/compareLocalNational, manual `readCached`/`writeCached` for validateAutocomplete (conditional caching)
- Migrated local-seo.service.ts — uses `getOrFetch` with Infinity TTL
- Added cache to suggest.service.ts — `getOrFetch` with 1h TTL for all 4 strategies
- Added cache to keyword-discovery.service.ts — `getOrFetch` with 24h TTL for discoverKeywords/discoverFromDomain
- Created tests/unit/utils/cache.test.ts — 15 tests covering slugify, isFresh, readCached/writeCached, getOrFetch
- Updated 6 test files to use CacheEntry format mocks `{ data, cachedAt }`
- All cache-related tests pass; remaining 3 failing test files are pre-existing (navigation-restructuring, production-phases, translate-pain)
- vue-tsc clean, vite build successful

### File List

- server/utils/cache.ts (created)
- tests/unit/utils/cache.test.ts (created)
- server/services/dataforseo.service.ts (modified)
- server/services/autocomplete.service.ts (modified)
- server/services/community-discussions.service.ts (modified)
- server/services/content-gap.service.ts (modified)
- server/services/intent.service.ts (modified)
- server/services/local-seo.service.ts (modified)
- server/services/suggest.service.ts (modified)
- server/services/keyword-discovery.service.ts (modified)
- tests/unit/services/dataforseo.service.test.ts (modified)
- tests/unit/services/autocomplete.service.test.ts (modified)
- tests/unit/services/community-discussions.service.test.ts (modified)
- tests/unit/services/content-gap.service.test.ts (modified)
- tests/unit/services/intent.service.test.ts (modified)
- tests/unit/services/local-seo.service.test.ts (modified)
