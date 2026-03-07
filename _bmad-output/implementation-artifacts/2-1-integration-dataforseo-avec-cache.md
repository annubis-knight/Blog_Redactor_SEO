# Story 2.1: Intégration DataForSEO avec Cache

Status: done

## Story

As a développeur,
I want un service backend qui interroge l'API DataForSEO et cache les résultats par mot-clé,
so that les données SEO soient disponibles pour le brief sans appels redondants.

## Acceptance Criteria

1. **AC1 — Endpoint Brief** : L'API `POST /api/dataforseo/brief` accepte un body `{ keyword: string }` (mot-clé pilier) et retourne les données SEO agrégées des 4 endpoints DataForSEO — FR7.

2. **AC2 — SERP Regular** : Le service interroge `POST /v3/serp/google/organic/live/regular` et retourne les 10 premiers résultats organiques (title, url, description, position) — FR7.

3. **AC3 — People Also Ask** : Le service interroge `POST /v3/serp/google/organic/live/advanced` et extrait les éléments de type `people_also_ask` (questions + réponses) — FR7.

4. **AC4 — Related Keywords** : Le service interroge `POST /v3/dataforseo_labs/google/related_keywords/live` et retourne les mots-clés sémantiques associés avec volumes et difficulté — FR7.

5. **AC5 — Keyword Data** : Le service interroge `POST /v3/dataforseo_labs/google/keyword_overview/live` et retourne volume de recherche, difficulté, CPC du mot-clé pilier — FR7.

6. **AC6 — Cache fichier** : Les résultats sont cachés dans `data/cache/{keyword-slug}.json` avec un timestamp `cachedAt` (ISO 8601). Un appel ultérieur avec le même mot-clé retourne les données du cache sans appel API — FR9.

7. **AC7 — Rate limiting** : Le rate limiting DataForSEO est géré avec retry et backoff exponentiel (max 3 retries, délais 1s → 2s → 4s) — NFR16.

8. **AC8 — Erreur API** : En cas d'erreur DataForSEO, une réponse `{ error: { code: 'DATAFORSEO_ERROR', message } }` est retournée avec status HTTP 502 — NFR9.

9. **AC9 — Sécurité** : Les clés DataForSEO (login/password) sont lues depuis `process.env.DATAFORSEO_LOGIN` et `process.env.DATAFORSEO_PASSWORD`, jamais exposées au frontend — NFR11.

10. **AC10 — Invalidation cache** : Un paramètre optionnel `{ keyword, forceRefresh?: true }` dans le body permet d'ignorer le cache et de relancer les appels API.

## Tasks / Subtasks

- [x] **Task 1 : Créer les types DataForSEO** (AC: #1-#5)
  - [x]Créer `shared/types/dataforseo.types.ts` avec les interfaces pour les réponses DataForSEO :
    - `DataForSeoBriefResult` : type agrégé retourné par l'endpoint
    - `SerpResult` : `{ position: number; title: string; url: string; description: string; domain: string }`
    - `PaaQuestion` : `{ question: string; answer: string | null }`
    - `RelatedKeyword` : `{ keyword: string; searchVolume: number; competition: number; cpc: number }`
    - `KeywordOverview` : `{ searchVolume: number; difficulty: number; cpc: number; competition: number; monthlySearches: number[] }`
    - `DataForSeoCacheEntry` : `{ keyword: string; serp: SerpResult[]; paa: PaaQuestion[]; relatedKeywords: RelatedKeyword[]; keywordData: KeywordOverview; cachedAt: string }`
  - [x]Exporter depuis `shared/types/index.ts`

- [x] **Task 2 : Créer le schema Zod du request body** (AC: #1, #10)
  - [x]Ajouter dans `shared/schemas/dataforseo.schema.ts` :
    - `briefRequestSchema` : `z.object({ keyword: z.string().min(1), forceRefresh: z.boolean().optional() })`
  - [x]Exporter depuis `shared/schemas/index.ts` (créer si nécessaire)

- [x] **Task 3 : Créer le service `dataforseo.service.ts`** (AC: #1-#7, #9)
  - [x]Créer `server/services/dataforseo.service.ts` avec :
    - Constante `DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3'`
    - Helper `getAuthHeader()` : lit login/password depuis `process.env`, retourne `Authorization: Basic {base64}` — utiliser `Buffer.from(...).toString('base64')`
    - Helper `fetchDataForSeo<T>(endpoint: string, body: unknown[])` : wrapper fetch avec auth, retry/backoff, parsing réponse
    - `fetchSerp(keyword: string, locationCode: number, languageCode: string)` : appelle SERP Regular, extrait les résultats organiques (top 10)
    - `fetchPaa(keyword: string, locationCode: number, languageCode: string)` : appelle SERP Advanced, filtre les `people_also_ask` items
    - `fetchRelatedKeywords(keyword: string, locationCode: number, languageCode: string)` : appelle Related Keywords, extrait les items
    - `fetchKeywordOverview(keyword: string, locationCode: number, languageCode: string)` : appelle Keyword Overview, extrait les données
    - `getBrief(keyword: string, forceRefresh?: boolean)` : orchestre les 4 appels en parallèle, retourne `DataForSeoCacheEntry`
  - [x]Paramètres par défaut : `locationCode: 2250` (France), `languageCode: 'fr'`

- [x] **Task 4 : Implémenter le cache fichier** (AC: #6, #10)
  - [x]Dans `dataforseo.service.ts` :
    - Helper `getCachePath(keyword: string)` : convertit le mot-clé en slug (lowercase, espaces → tirets, caractères spéciaux supprimés), retourne `data/cache/{slug}.json`
    - `readCache(keyword: string)` : lit le fichier cache avec `readJson`, retourne `DataForSeoCacheEntry | null`
    - `writeCache(data: DataForSeoCacheEntry)` : écrit dans le fichier cache avec `writeJson` + `ensureDir`
    - Dans `getBrief()` : vérifier le cache AVANT les appels API (sauf si `forceRefresh`)

- [x] **Task 5 : Implémenter le retry avec backoff exponentiel** (AC: #7)
  - [x]Dans le helper `fetchDataForSeo` :
    - Max 3 retries
    - Délais : 1000ms, 2000ms, 4000ms (backoff × 2)
    - Retry uniquement sur HTTP 429 (rate limit) et 503 (service unavailable)
    - Throw sur toutes les autres erreurs HTTP
    - Utiliser `setTimeout` via une Promise pour les délais

- [x] **Task 6 : Créer la route `POST /api/dataforseo/brief`** (AC: #1, #8, #10)
  - [x]Créer `server/routes/dataforseo.routes.ts` :
    - `POST /brief` : valide le body avec `briefRequestSchema`, appelle `getBrief(keyword, forceRefresh)`, retourne `{ data: DataForSeoCacheEntry }`
    - En cas d'erreur DataForSEO : retourne HTTP 502 avec `{ error: { code: 'DATAFORSEO_ERROR', message } }`
    - En cas d'erreur de validation : retourne HTTP 400 avec `{ error: { code: 'VALIDATION_ERROR', message } }`
  - [x]Enregistrer la route dans `server/index.ts` : `app.use('/api/dataforseo', dataforseoRoutes)`

- [x] **Task 7 : Tests unitaires** (AC: tous)
  - [x]Créer `tests/unit/services/dataforseo.service.test.ts` :
    - Mock global `fetch` (pattern existant : `vi.stubGlobal('fetch', mockFetch)`)
    - Mock `readJson` et `writeJson` de `json-storage`
    - Test `getBrief` retourne les données agrégées des 4 endpoints
    - Test cache hit : `readJson` retourne des données → pas d'appel fetch
    - Test cache miss : `readJson` retourne null → appels fetch effectués → `writeJson` appelé
    - Test `forceRefresh: true` : ignore le cache → appels fetch malgré cache existant
    - Test retry sur HTTP 429 : vérifie que fetch est appelé plusieurs fois
    - Test erreur DataForSEO : vérifie que l'erreur est propagée avec le bon format
    - Test `getAuthHeader` : vérifie le format Basic Auth base64
    - Test extraction des résultats SERP (top 10 organiques)
    - Test extraction des PAA (questions + réponses)

- [x] **Task 8 : Vérification intégration** (AC: tous)
  - [x]Tous les tests passent (`npx vitest run`)
  - [x]Type-check clean (`npx vue-tsc --build`)
  - [x]L'endpoint POST `/api/dataforseo/brief` est enregistré et accessible
  - [x]Les variables d'environnement sont documentées dans `.env.example` (déjà fait)

## Dev Notes

### Architecture Backend — Patterns établis par Epic 1 [Source: server/]

**Routes Express — Pattern obligatoire [Source: cocoons.routes.ts] :**
```typescript
import { Router } from 'express'
const router = Router()

router.post('/brief', async (req, res) => {
  try {
    // Validate body with Zod
    const parsed = briefRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    }

    const result = await getBrief(parsed.data.keyword, parsed.data.forceRefresh)
    res.json({ data: result })
  } catch (err) {
    console.error('[POST /api/dataforseo/brief]', err)
    res.status(502).json({ error: { code: 'DATAFORSEO_ERROR', message: err instanceof Error ? err.message : 'Erreur DataForSEO' } })
  }
})

export default router
```

**Enregistrement route dans server/index.ts [Source: server/index.ts] :**
```typescript
// Existing routes
import cocoonRoutes from './routes/cocoons.routes.js'
import keywordRoutes from './routes/keywords.routes.js'
// Add new route
import dataforseoRoutes from './routes/dataforseo.routes.js'

app.use('/api/cocoons', cocoonRoutes)
app.use('/api/keywords', keywordRoutes)
app.use('/api/dataforseo', dataforseoRoutes) // NEW
```

**JSON Storage utils [Source: server/utils/json-storage.ts] :**
```typescript
import { readJson, writeJson, ensureDir } from '../utils/json-storage.js'
// readJson<T>(filePath) → T (throws if file not found)
// writeJson<T>(filePath, data) → void (atomic write via .tmp + rename)
// ensureDir(dirPath) → void (recursive mkdir)
```

**IMPORTANT: `readJson` throws** if file doesn't exist. Wrap in try/catch pour le cache read:
```typescript
async function readCache(keyword: string): Promise<DataForSeoCacheEntry | null> {
  try {
    return await readJson<DataForSeoCacheEntry>(getCachePath(keyword))
  } catch {
    return null
  }
}
```

### DataForSEO API — Spécifications techniques [Source: web research]

**Authentification : Basic HTTP Auth**
```typescript
const login = process.env.DATAFORSEO_LOGIN
const password = process.env.DATAFORSEO_PASSWORD
const auth = Buffer.from(`${login}:${password}`).toString('base64')
// Header: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' }
```

**Base URL :** `https://api.dataforseo.com/v3`

**4 Endpoints requis :**

| Endpoint | Path | Description |
|----------|------|-------------|
| SERP Regular | `/serp/google/organic/live/regular` | Top 10 résultats organiques Google |
| SERP Advanced (PAA) | `/serp/google/organic/live/advanced` | Résultats SERP + People Also Ask |
| Related Keywords | `/dataforseo_labs/google/related_keywords/live` | Mots-clés sémantiques associés |
| Keyword Overview | `/dataforseo_labs/google/keyword_overview/live` | Volume, difficulté, CPC |

**Format requête (tous les endpoints) :**
```json
[{
  "keyword": "refonte site web pme",
  "location_code": 2250,
  "language_code": "fr"
}]
```
Note : Le body est toujours un **tableau** de tâches, même pour une seule requête.

**Format réponse DataForSEO :**
```json
{
  "status_code": 20000,
  "tasks": [{
    "status_code": 20000,
    "result": [{ "items": [...] }]
  }]
}
```
- `status_code: 20000` = succès
- Les données sont dans `tasks[0].result[0].items`

**SERP Regular — Extraction résultats :**
Les items contiennent différents types (`organic`, `featured_snippet`, `people_also_ask`, etc.). Pour SERP Regular, filtrer `type === 'organic'` et prendre les 10 premiers.
```typescript
items.filter(item => item.type === 'organic').slice(0, 10)
```

**SERP Advanced — Extraction PAA :**
Filtrer les items de type `people_also_ask`:
```typescript
items.filter(item => item.type === 'people_also_ask')
```
Chaque item PAA a : `title` (la question) et optionnellement un `expanded_element` avec la réponse.

**Related Keywords — Extraction :**
Les items sont dans `tasks[0].result[0].items` directement. Chaque item contient `keyword_data` avec `search_volume`, `competition`, `cpc`.

**Keyword Overview — Extraction :**
Requête avec tableau `keywords` (pas `keyword`). Un seul mot-clé suffit :
```json
[{ "keywords": ["refonte site web pme"], "location_code": 2250, "language_code": "fr" }]
```

**Rate Limiting :**
- 2000 requêtes/minute max
- 30 requêtes simultanées max
- HTTP 429 si dépassé → retry avec backoff

### Cache Strategy [Source: architecture.md]

**Fichier cache par mot-clé :**
```
data/cache/
├── .gitkeep
├── refonte-site-web-pme.json
├── seo-local-pme.json
└── ...
```

**Structure du fichier cache :**
```typescript
{
  keyword: "refonte site web pme",
  serp: SerpResult[],
  paa: PaaQuestion[],
  relatedKeywords: RelatedKeyword[],
  keywordData: KeywordOverview,
  cachedAt: "2026-03-06T14:30:00.000Z"  // ISO 8601
}
```

**Durée cache : illimitée** (données SEO peu volatiles). L'invalidation se fait manuellement via `forceRefresh: true` dans le body de la requête.

**Slugification pour le nom de fichier :**
```typescript
function slugify(keyword: string): string {
  return keyword
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // Remove accents
    .replace(/[^a-z0-9]+/g, '-')                       // Non-alphanum → hyphen
    .replace(/^-|-$/g, '')                              // Trim hyphens
}
```

### Tests — Patterns établis [Source: tests/unit/services/]

**Pattern de mock fetch :**
```typescript
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
```

**Pattern de mock modules :**
```typescript
vi.mock('../../../server/utils/json-storage', () => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
  ensureDir: vi.fn(),
}))
import { readJson, writeJson, ensureDir } from '../../../server/utils/json-storage'
const mockReadJson = vi.mocked(readJson)
const mockWriteJson = vi.mocked(writeJson)
const mockEnsureDir = vi.mocked(ensureDir)
```

**Pattern de test existant [Source: api.service.test.ts] :**
- `beforeEach(() => { mockFetch.mockReset() })`
- Mock la réponse: `mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) })`
- Assert les appels: `expect(mockFetch).toHaveBeenCalledWith(url, options)`

### Environnement et Variables [Source: .env.example]

Les variables DataForSEO sont **déjà documentées** dans `.env.example` :
```
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_password
```

**IMPORTANT :** Ne pas ajouter de `.env` au git. Le fichier `.gitignore` l'exclut déjà.

### Localisation France [Source: PRD context]

L'application est pour un utilisateur français (Arnau). Les requêtes DataForSEO doivent utiliser :
- `location_code: 2250` (France)
- `language_code: 'fr'` (Français)

Ces valeurs doivent être en constantes dans le service, pas hardcodées dans chaque appel.

### Node.js built-in fetch [Source: package.json]

Le projet utilise Node 20 LTS+ qui inclut `fetch` nativement. **Pas besoin d'installer une lib HTTP** (pas d'axios, got, etc.). Utiliser `globalThis.fetch` directement dans le service.

### Anti-patterns à éviter [Source: architecture.md]

- **PAS** d'appels DataForSEO depuis le frontend — tout passe par le proxy Express
- **PAS** de clés API exposées dans le code — toujours `process.env`
- **PAS** de `any` TypeScript — typer toutes les réponses
- **PAS** de retry infini — max 3 tentatives avec backoff borné
- **PAS** de cache en mémoire pour DataForSEO — utiliser le cache fichier (persistence entre redémarrages)

### Dépendances entre stories

- **Story 2.1 (cette story)** → Pas de dépendance sur d'autres stories de l'Epic 2. C'est un service backend autonome.
- **Story 2.2** (Affichage du Brief SEO) → Dépend de 2.1 pour les données
- **Story 2.3** (Génération Sommaire) → Utilise les PAA de 2.1 pour enrichir le sommaire
- **Story 5.2** (NLP Terms) → Utilise les Related Keywords de 2.1

### Project Structure Notes

- Service backend dans `server/services/dataforseo.service.ts`
- Route dans `server/routes/dataforseo.routes.ts`
- Types dans `shared/types/dataforseo.types.ts`
- Schema dans `shared/schemas/dataforseo.schema.ts`
- Cache dans `data/cache/` (dossier déjà existant avec `.gitkeep`)
- Test dans `tests/unit/services/dataforseo.service.test.ts`

### References

- [Source: architecture.md#API Endpoints] — POST /api/dataforseo/brief
- [Source: architecture.md#Data Architecture] — Cache DataForSEO strategy
- [Source: architecture.md#Infrastructure] — Variables d'environnement
- [Source: architecture.md#Enforcement Guidelines] — Anti-patterns
- [Source: epics.md#Story 2.1] — Acceptance criteria originaux
- [Source: prd.md#FR7, FR9] — Enrichissement DataForSEO, cache
- [Source: prd.md#NFR9, NFR11, NFR16] — Error handling, sécurité, rate limiting
- [Source: DataForSEO API docs] — Endpoints v3, authentication Basic Auth, rate limits

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
