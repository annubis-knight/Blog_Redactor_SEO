> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

# Story 8.1: Extraction TF-IDF depuis donnees SERP + 3 niveaux + densite

Status: done

## Story

As a consultant SEO,
I want que le champ lexical soit extrait automatiquement des donnees SERP deja scrapees avec 3 niveaux de termes et la densite par page,
So that j'ai un lexique base sur la realite competitive sans requete API supplementaire.

## Acceptance Criteria

1. **Given** les Lieutenants sont verrouilles et les donnees SERP sont disponibles **When** l'utilisateur ouvre le sous-onglet Lexique **Then** l'en-tete affiche le Capitaine, les Lieutenants selectionnes et le niveau d'article

2. **Given** l'utilisateur lance l'extraction TF-IDF **When** la route `POST /api/serp/tfidf` est appelee **Then** elle utilise les contenus SERP deja scrapes (Epic 7) — AUCUNE nouvelle requete API (FR29, NFR11) **And** les termes sont classes en 3 niveaux (FR30) :
   - Obligatoire : present chez 70%+ des concurrents
   - Differenciateur : present chez 30-70%
   - Optionnel : present chez <30%
   **And** chaque terme affiche sa densite de recurrence par page (ex: x4.2/page)

3. **Given** les termes sont extraits **When** ils s'affichent dans l'interface **Then** les termes Obligatoires sont pre-coches (FR31) **And** les termes Differenciateurs et Optionnels sont decoches par defaut **And** l'utilisateur peut cocher/decocher tous les termes via checkboxes (FR31)

## Tasks / Subtasks

- [x] Task 1 : Creer le service TF-IDF backend (AC: #2)
  - [x] 1.1 Creer `server/services/tfidf.service.ts` avec fonction `extractTfidf(competitors: SerpCompetitor[]): TfidfResult`
  - [x] 1.2 Tokeniser chaque `competitor.textContent` : lowercase, supprimer ponctuation, split par espaces, filtrer stopwords francais (le, la, les, de, du, des, un, une, et, en, a, au, aux, pour, par, sur, avec, dans, qui, que, est, sont, etc.)
  - [x] 1.3 Calculer le document frequency (DF) de chaque terme : nombre de concurrents contenant le terme / nombre total de concurrents valides (sans fetchError)
  - [x] 1.4 Calculer la densite par page : occurrences totales du terme / nombre de concurrents valides (arrondi a 1 decimale)
  - [x] 1.5 Classifier les termes en 3 niveaux selon le DF : `obligatoire` (>= 0.7), `differenciateur` (>= 0.3 et < 0.7), `optionnel` (< 0.3)
  - [x] 1.6 Filtrer les termes de 1-2 caracteres et les termes numeriques purs
  - [x] 1.7 Trier chaque niveau par densite decroissante
  - [x] 1.8 Limiter a ~50 termes par niveau pour eviter la surcharge UI

- [x] Task 2 : Ajouter la route POST /api/serp/tfidf (AC: #2)
  - [x] 2.1 Ajouter la route dans `server/routes/serp-analysis.routes.ts` (fichier existant)
  - [x] 2.2 Body : `{ keyword: string }` — le keyword sert de cle de cache pour retrouver les donnees SERP deja scrapees
  - [x] 2.3 Charger les donnees SERP depuis le cache (meme cache que `/api/serp/analyze`) — ZERO nouvelle requete API
  - [x] 2.4 Si cache absent → retourner 404 avec message "Lancez d'abord l'analyse SERP dans l'onglet Lieutenants"
  - [x] 2.5 Appeler `extractTfidf(cachedResult.competitors)` et retourner le resultat
  - [x] 2.6 Definir le type de retour `TfidfResult` dans `shared/types/serp-analysis.types.ts`

- [x] Task 3 : Creer le composant LexiqueExtraction.vue (AC: #1, #3)
  - [x] 3.1 Creer `src/components/moteur/LexiqueExtraction.vue`
  - [x] 3.2 Props : `selectedArticle`, `captainKeyword`, `articleLevel`, `selectedLieutenants: string[]`, `isLieutenantsLocked: boolean`, `initialLocked?: boolean`, `cocoonSlug?: string`
  - [x] 3.3 Emits : `check-completed(check: string)`, `check-removed(check: string)`
  - [x] 3.4 En-tete : badge Capitaine + badges Lieutenants selectionnes + badge niveau article
  - [x] 3.5 Bouton "Extraire le Lexique" qui appelle `apiPost('/serp/tfidf', { keyword })` — desactive si pas de Lieutenants verrouilles
  - [x] 3.6 Affichage des resultats en 3 sections CollapsableSection : "Obligatoire", "Differenciateur", "Optionnel"
  - [x] 3.7 Chaque section affiche la liste de termes avec : checkbox, texte du terme, densite (ex: x4.2/page), pourcentage de concurrents
  - [x] 3.8 Les termes Obligatoires sont pre-coches au chargement, les autres decoches
  - [x] 3.9 Compteur de termes selectionnes (total et par niveau)
  - [x] 3.10 State : `tfidfResult`, `isLoading`, `error`, `selectedTerms: Set<string>`

- [x] Task 4 : Integrer dans MoteurView.vue (AC: #1)
  - [x] 4.1 Importer LexiqueExtraction et remplacer le placeholder du sous-onglet Lexique
  - [x] 4.2 Passer les props : `selectedArticle`, `captainKeyword`, `articleLevel`, `selectedLieutenants`, `isLieutenantsLocked`, `cocoonSlug`
  - [x] 4.3 Conserver le soft-gate existant (`v-if="!isLieutenantsLocked"` avec message)
  - [x] 4.4 Ajouter `@check-completed="emitCheckCompleted"` et `@check-removed="handleCheckRemoved"`
  - [x] 4.5 Creer un computed `selectedLieutenantsForLexique` pour transmettre les lieutenants selectionnes (depuis articleKeywordsStore ou serpLoaded event)

- [x] Task 5 : Ecrire les tests (AC: #1-#3)
  - [x] 5.1 Tests service TF-IDF : tokenisation, stopwords filtrés, DF calcule, classification 3 niveaux (70%/30%), densite/page, tri par densite, filtrage termes courts, limite par niveau
  - [x] 5.2 Tests route : 404 si pas de cache, retour TF-IDF valide, validation body
  - [x] 5.3 Tests composant : en-tete avec capitaine/lieutenants/niveau, bouton extract desactive si pas verrouille, affichage 3 sections, termes obligatoires pre-coches, toggle checkbox, compteur selection, etat loading/error

## Dev Notes

### Architecture — Service TF-IDF (nouveau fichier)

Le service effectue une analyse TF-IDF simplifiee sur les `textContent` des concurrents SERP deja scrapes :

```typescript
// server/services/tfidf.service.ts

export interface TfidfTerm {
  term: string
  level: 'obligatoire' | 'differenciateur' | 'optionnel'
  documentFrequency: number   // ex: 0.75 (75% des concurrents)
  density: number             // ex: 4.2 (occurrences moyennes par page)
  competitorCount: number     // nombre de concurrents contenant le terme
  totalCompetitors: number    // nombre total de concurrents valides
}

export interface TfidfResult {
  keyword: string
  totalCompetitors: number
  obligatoire: TfidfTerm[]
  differenciateur: TfidfTerm[]
  optionnel: TfidfTerm[]
}

const FRENCH_STOPWORDS = new Set([
  'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'a', 'au', 'aux',
  'pour', 'par', 'sur', 'avec', 'dans', 'qui', 'que', 'est', 'sont', 'ce', 'cette',
  'ces', 'il', 'elle', 'ils', 'elles', 'nous', 'vous', 'on', 'se', 'ne', 'pas',
  'plus', 'ou', 'mais', 'si', 'son', 'sa', 'ses', 'leur', 'leurs', 'mon', 'ma',
  'mes', 'ton', 'ta', 'tes', 'notre', 'votre', 'tout', 'tous', 'toute', 'toutes',
  'autre', 'autres', 'meme', 'aussi', 'bien', 'fait', 'faire', 'peut', 'comme',
  'etre', 'avoir', 'entre', 'dont', 'tres', 'puis', 'sans', 'chez', 'vers',
])

export function extractTfidf(competitors: SerpCompetitor[]): TfidfResult {
  const valid = competitors.filter(c => !c.fetchError && c.textContent.length > 0)
  const total = valid.length
  if (total === 0) return { keyword: '', totalCompetitors: 0, obligatoire: [], differenciateur: [], optionnel: [] }

  // Tokenize each document
  const docs = valid.map(c => tokenize(c.textContent))

  // Compute document frequency and density for each term
  const termStats = new Map<string, { docCount: number; totalOccurrences: number }>()

  for (const tokens of docs) {
    const termCounts = new Map<string, number>()
    for (const t of tokens) {
      termCounts.set(t, (termCounts.get(t) ?? 0) + 1)
    }
    for (const [term, count] of termCounts) {
      const existing = termStats.get(term)
      if (existing) {
        existing.docCount++
        existing.totalOccurrences += count
      } else {
        termStats.set(term, { docCount: 1, totalOccurrences: count })
      }
    }
  }

  // Classify and build result
  const allTerms: TfidfTerm[] = []
  for (const [term, stats] of termStats) {
    const df = stats.docCount / total
    const density = Math.round(stats.totalOccurrences / total * 10) / 10
    allTerms.push({
      term,
      level: df >= 0.7 ? 'obligatoire' : df >= 0.3 ? 'differenciateur' : 'optionnel',
      documentFrequency: Math.round(df * 100) / 100,
      density,
      competitorCount: stats.docCount,
      totalCompetitors: total,
    })
  }

  // Sort by density descending, limit per level
  const byLevel = (level: TfidfTerm['level']) =>
    allTerms.filter(t => t.level === level).sort((a, b) => b.density - a.density).slice(0, 50)

  return {
    keyword: '',  // Set by caller
    totalCompetitors: total,
    obligatoire: byLevel('obligatoire'),
    differenciateur: byLevel('differenciateur'),
    optionnel: byLevel('optionnel'),
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zàâäéèêëïîôùûüÿçœæ\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !FRENCH_STOPWORDS.has(t) && !/^\d+$/.test(t))
}
```

### Architecture — Route TF-IDF (etendre serp-analysis.routes.ts)

```typescript
// Ajouter dans server/routes/serp-analysis.routes.ts

import { extractTfidf } from '../services/tfidf.service.js'
import { readCached } from '../utils/serp-cache.js'  // Reutiliser le meme cache

router.post('/serp/tfidf', async (req, res) => {
  const { keyword } = req.body

  if (!keyword) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword is required' } })
    return
  }

  // Load SERP data from cache — ZERO new API call (FR29, NFR11)
  const cached = await readCached(CACHE_DIR, slugify(keyword))
  if (!cached) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Lancez d\'abord l\'analyse SERP dans l\'onglet Lieutenants' } })
    return
  }

  const result = extractTfidf(cached.data.competitors)
  result.keyword = keyword

  res.json({ data: result })
})
```

**IMPORTANT** : Identifier le mecanisme exact de lecture du cache SERP dans `serp-analysis.service.ts`. Le service utilise `readCached<SerpAnalysisResult>(CACHE_DIR, cacheKey)` et `isFresh(cached.cachedAt, CACHE_TTL_MS)`. Il faut reutiliser le meme `CACHE_DIR` et la meme fonction `slugify` pour lire les donnees.

### Architecture — Composant LexiqueExtraction.vue

```html
<!-- En-tete contextuel -->
<div class="lexique-header">
  <div class="captain-badge">🎖️ {{ captainKeyword }}</div>
  <div class="lieutenants-badges">
    <span v-for="lt in selectedLieutenants" :key="lt" class="lt-badge">{{ lt }}</span>
  </div>
  <span class="level-badge">{{ articleLevel }}</span>
</div>

<!-- Bouton extraction -->
<button class="btn-extract" :disabled="!isLieutenantsLocked || isLoading" @click="extractTfidf">
  {{ isLoading ? 'Extraction en cours...' : 'Extraire le Lexique' }}
</button>

<!-- 3 sections de resultats -->
<CollapsableSection v-if="tfidfResult" title="Obligatoire (70%+)" :default-open="true">
  <div class="term-list">
    <div v-for="term in tfidfResult.obligatoire" :key="term.term" class="term-row">
      <input type="checkbox" :checked="selectedTerms.has(term.term)" @change="toggleTerm(term.term)" />
      <span class="term-text">{{ term.term }}</span>
      <span class="term-density">×{{ term.density }}/page</span>
      <span class="term-percent">{{ Math.round(term.documentFrequency * 100) }}%</span>
    </div>
  </div>
</CollapsableSection>
<!-- Idem pour Differenciateur et Optionnel -->
```

### Architecture — Integration MoteurView

Le placeholder Lexique actuel (lignes 546-556) sera remplace par :
```html
<div v-if="activeTab === 'lexique'" class="tab-content">
  <div v-if="!isLieutenantsLocked" class="soft-gate-message">
    <p>Verrouillez d'abord les Lieutenants pour debloquer les actions Lexique.</p>
  </div>
  <LexiqueExtraction
    :selected-article="selectedArticle"
    :captain-keyword="captainKeyword"
    :article-level="articleLevelForLieutenants"
    :selected-lieutenants="selectedLieutenantsForLexique"
    :is-lieutenants-locked="isLieutenantsLocked"
    :cocoon-slug="cocoonSlug"
    @check-completed="emitCheckCompleted"
    @check-removed="handleCheckRemoved"
  />
</div>
```

`selectedLieutenantsForLexique` sera un computed dans MoteurView qui recupere les lieutenants depuis `articleKeywordsStore.keywords?.lieutenants ?? []` ou depuis un ref local si le store n'est pas encore rempli.

### Architecture — Donnees SERP heritees (cascade NFR11)

Le flux de donnees est :
1. `LieutenantsSelection` appelle `POST /api/serp/analyze` → scrape les concurrents + extrait `textContent`
2. Les resultats sont caches en JSON sur disque (7 jours TTL)
3. `LexiqueExtraction` appelle `POST /api/serp/tfidf` avec le meme `keyword`
4. La route lit le cache (meme `CACHE_DIR` + meme `slugify`) → extrait les `competitors[].textContent`
5. Le service TF-IDF tokenise + calcule DF + densite → retourne 3 niveaux

**AUCUNE nouvelle requete DataForSEO ou scraping HTTP** — tout vient du cache.

### Architecture — Types partages

Ajouter dans `shared/types/serp-analysis.types.ts` :
```typescript
export interface TfidfTerm {
  term: string
  level: 'obligatoire' | 'differenciateur' | 'optionnel'
  documentFrequency: number
  density: number
  competitorCount: number
  totalCompetitors: number
}

export interface TfidfResult {
  keyword: string
  totalCompetitors: number
  obligatoire: TfidfTerm[]
  differenciateur: TfidfTerm[]
  optionnel: TfidfTerm[]
}
```

### Fichiers impactes

| Fichier | Action | Raison |
|---|---|---|
| `server/services/tfidf.service.ts` | **CREER** | Service TF-IDF : tokenisation + DF + densite + 3 niveaux |
| `server/routes/serp-analysis.routes.ts` | **MODIFIER** | Ajouter route `POST /serp/tfidf` |
| `shared/types/serp-analysis.types.ts` | **MODIFIER** | Ajouter `TfidfTerm` et `TfidfResult` |
| `src/components/moteur/LexiqueExtraction.vue` | **CREER** | Sous-onglet Lexique : en-tete + extraction + 3 sections + checkboxes |
| `src/views/MoteurView.vue` | **MODIFIER** | Remplacer placeholder Lexique par LexiqueExtraction |
| `tests/unit/services/tfidf.test.ts` | **CREER** | Tests service TF-IDF |
| `tests/unit/routes/serp-analysis.routes.test.ts` | **MODIFIER** | Tests route /serp/tfidf |
| `tests/unit/components/lexique-extraction.test.ts` | **CREER** | Tests composant LexiqueExtraction |

### Anti-patterns a eviter

- **NE PAS** faire de nouvelle requete API DataForSEO ou scraping HTTP — tout doit venir du cache SERP existant (NFR11)
- **NE PAS** creer un nouveau fichier de route — etendre `serp-analysis.routes.ts` existant
- **NE PAS** implementer le panel IA lexical dans cette story — c'est Story 8.2
- **NE PAS** implementer le bouton "Valider le Lexique" / ecriture ArticleKeywords — c'est Story 8.2
- **NE PAS** utiliser une librairie TF-IDF externe — l'algorithme est simple (DF + densite) et n'a pas besoin de IDF complexe
- **NE PAS** oublier de filtrer les concurrents avec `fetchError` (textContent vide)
- **NE PAS** oublier les stopwords francais — le corpus est en francais
- **NE PAS** retourner des milliers de termes — limiter a ~50 par niveau
- **NE PAS** pre-cocher les termes Differenciateur ou Optionnel — seuls les Obligatoires sont pre-coches

### Testing Standards

- **Framework** : Vitest + Vue Test Utils
- **Service TF-IDF** : tester tokenisation (accents, ponctuation), stopwords filtrés, calcul DF correct, seuils 70%/30%, densite/page, tri, filtrage termes courts, limite 50 par niveau
- **Route** : tester 400 si keyword manquant, 404 si cache absent, reponse valide avec 3 niveaux
- **Composant** : tester en-tete (capitaine + lieutenants + niveau), bouton desactive si pas verrouille, 3 sections CollapsableSection, checkboxes pre-cochees pour obligatoire, toggle selection, compteur, loading/error states
- **Mock** : mocker `apiPost` pour le composant, mocker le cache pour la route
- **NODE_OPTIONS** : `--max-old-space-size=4096` requis pour la suite complete

### Project Structure Notes

- `server/services/tfidf.service.ts` — nouveau service (pattern identique a `serp-analysis.service.ts`)
- `server/routes/serp-analysis.routes.ts` — route existante a etendre
- `server/services/serp-analysis.service.ts` — contient `extractTextContent()`, `CACHE_DIR`, `slugify()` — a importer pour la route TF-IDF
- `shared/types/serp-analysis.types.ts` — types partages a etendre
- `src/components/moteur/LexiqueExtraction.vue` — nouveau composant (pattern identique a `LieutenantsSelection.vue`)
- `src/components/shared/CollapsableSection.vue` — composant reutilisable pour les 3 sections
- `src/views/MoteurView.vue` — parent, remplacement du placeholder Lexique
- `src/stores/article-keywords.store.ts` — PAS modifie dans cette story (Story 8.2)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 8.1 Extraction TF-IDF]
- [Source: _bmad-output/planning-artifacts/prd.md — FR29 TF-IDF extraction, FR30 3 niveaux, FR31 checkboxes]
- [Source: _bmad-output/planning-artifacts/architecture.md — Cascade SERP Lieutenants→Lexique, NFR11]
- [Source: server/services/serp-analysis.service.ts — extractTextContent(), analyzeSerpCompetitors(), cache pattern]
- [Source: shared/types/serp-analysis.types.ts — SerpCompetitor.textContent]
- [Source: src/components/moteur/LieutenantsSelection.vue — Pattern composant Moteur avec CollapsableSection]
- [Source: _bmad-output/implementation-artifacts/7-4-panel-ia-structure-hn-lock-lieutenants.md — Learnings lock/unlock, useStreaming]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- All 5 tasks implemented: TF-IDF service, route, component, MoteurView integration, tests
- 109 test files, 1589 tests — all green (+56 new tests)
- ZERO new API calls — TF-IDF reads from existing SERP cache (NFR11)
- French stopwords filtering, 3-level classification (70%/30%), density per page
- Pre-check obligatoire terms, toggle all via checkboxes, selection counter

### File List

- server/services/tfidf.service.ts (CREATED)
- server/routes/serp-analysis.routes.ts (MODIFIED — added POST /serp/tfidf)
- shared/types/serp-analysis.types.ts (MODIFIED — added TfidfTerm, TfidfResult)
- src/components/moteur/LexiqueExtraction.vue (CREATED)
- src/views/MoteurView.vue (MODIFIED — replaced Lexique placeholder, added import + computed)
- tests/unit/services/tfidf.test.ts (CREATED — 15 tests)
- tests/unit/routes/serp-tfidf.routes.test.ts (CREATED — 9 tests)
- tests/unit/components/lexique-extraction.test.ts (CREATED — 32 tests)
- server/services/serp-analysis.service.ts (MODIFIED — exported CACHE_DIR for DRY reuse)
