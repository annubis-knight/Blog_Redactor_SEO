> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

# Story 6.5: Panel IA expert SEO streaming + Lock/unlock Capitaine

Status: done

## Story

As a consultant SEO,
I want un panel IA expert qui s'auto-génère en streaming avec des conseils contextuels, et pouvoir verrouiller/déverrouiller mon Capitaine,
So that j'ai un avis complémentaire avant de décider, et je peux changer d'avis après verrouillage.

## Acceptance Criteria

1. **Given** les KPIs du mot-clé sont disponibles **When** le sous-onglet Capitaine s'affiche **Then** le panel IA se charge automatiquement en streaming SSE via `POST /api/keywords/:keyword/ai-panel` (FR17) **And** le premier token apparaît en < 2s (NFR2)

2. **Given** le panel IA est affiché **When** l'utilisateur regarde le contenu **Then** le panel est dépliable et ne modifie JAMAIS le feu tricolore (FR17) **And** le contenu est un avis d'expert SEO contextuel (pas un résumé des KPIs)

3. **Given** l'utilisateur est satisfait du mot-clé Capitaine **When** il clique sur "Valider ce Capitaine" **Then** le Capitaine est verrouillé (cadenas visible) (FR20) **And** le sous-onglet Lieutenants est débloqué pour les actions **And** l'événement `check-completed` est émis avec `capitaine_locked`

4. **Given** le Capitaine est verrouillé **When** l'utilisateur clique sur le cadenas (unlock) **Then** le Capitaine est déverrouillé (FR20) **And** le sous-onglet Lieutenants repasse en gating souple (consultation uniquement)

## Tasks / Subtasks

- [x] Task 1 : Créer la route backend `POST /api/keywords/:keyword/ai-panel` SSE (AC: #1)
  - [x] 1.1 Créer `server/routes/keyword-ai-panel.routes.ts` avec route POST SSE
  - [x] 1.2 Créer le prompt `server/prompts/capitaine-ai-panel.md` (expert SEO contextuel)
  - [x] 1.3 Utiliser le pattern SSE existant : `streamChatCompletion` + `consumeStream` + `res.write('event: chunk\n...')`
  - [x] 1.4 Recevoir `{ level, kpis, verdict }` dans le body pour contexte
  - [x] 1.5 Enregistrer la route dans `server/index.ts`

- [x] Task 2 : Ajouter le panel IA dans CaptainValidation.vue (AC: #1, #2)
  - [x] 2.1 Utiliser le composable existant `useStreaming<T>()` pour consommer le flux SSE
  - [x] 2.2 Auto-déclencher le streaming quand `currentResult` change (watcher)
  - [x] 2.3 Afficher le panel dépliable (v-if toggle) avec le contenu en streaming
  - [x] 2.4 Le panel ne modifie JAMAIS le verdict — lecture seule, complément d'information

- [x] Task 3 : Implémenter le lock/unlock du Capitaine (AC: #3, #4)
  - [x] 3.1 Ajouter un bouton "Valider ce Capitaine" dans CaptainValidation.vue
  - [x] 3.2 Ajouter un state `isLocked` local + cadenas visible
  - [x] 3.3 Émettre `emit('check-completed', 'capitaine_locked')` au verrouillage
  - [x] 3.4 Wirer `@check-completed` et `@check-removed` dans MoteurView.vue
  - [x] 3.5 Le unlock retire le check via `removeCheck` (backend route + store method ajoutés)
  - [x] 3.6 Quand locked=true, le sous-onglet Lieutenants est débloqué (isCaptaineLocked computed existant dans MoteurView)

- [x] Task 4 : Écrire les tests (AC: #1-#4)
  - [x] 4.1 Tests route backend : 8 tests (SSE headers, prompt, chunks, done event, error handling)
  - [x] 4.2 Tests composant AI panel : 7 tests (panel visible, streaming trigger, content display, toggle, read-only verdict)
  - [x] 4.3 Tests lock/unlock : 9 tests (lock btn, disabled when not GO, emit check-completed, locked state, unlock, emit check-removed)

## Dev Notes

### Architecture Pattern — SSE Streaming

Le projet utilise un pattern SSE établi pour les appels Claude API :

**Backend (route):**
```typescript
import { streamChatCompletion, USAGE_SENTINEL } from '../services/claude.service.js'
import type { ApiUsage } from '../services/claude.service.js'
import { loadPrompt } from '../utils/prompt-loader.js'

// consumeStream helper (copier depuis generate.routes.ts lignes 12-27)
async function consumeStream(gen, onChunk) { ... }

// Dans le handler de route :
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
})
const { fullContent, usage } = await consumeStream(
  streamChatCompletion(systemPrompt, userPrompt),
  (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
)
res.write(`event: done\ndata: ${JSON.stringify({ metadata: { ... }, usage })}\n\n`)
res.end()
```

**Frontend (composable):**
```typescript
import { useStreaming } from '@/composables/useStreaming'

const { chunks, isStreaming, error, startStream, abort } = useStreaming()

// URL complète requise (fetch POST, pas EventSource) :
startStream('/api/keywords/seo/ai-panel', { level: 'pilier', kpis: [...], verdict: {...} })
// chunks.value se met à jour à chaque event: chunk
```

Le composable `useStreaming` (src/composables/useStreaming.ts) gère tout : fetch POST → ReadableStream → parse SSE events. **NE PAS réinventer — utiliser directement.**

### Architecture Pattern — check-completed

L'architecture définit 5 checks. Le check `capitaine_locked` se déclenche quand l'utilisateur verrouille le Capitaine :

```typescript
// Dans CaptainValidation.vue :
const emit = defineEmits<{
  (e: 'validated', keyword: string): void     // déjà défini
  (e: 'check-completed', checkName: string): void  // à ajouter
}>()

// Au clic "Valider ce Capitaine" :
emit('check-completed', 'capitaine_locked')
```

```html
<!-- Dans MoteurView.vue, wirer l'event : -->
<CaptainValidation
  :selected-article="selectedArticle"
  mode="workflow"
  @check-completed="onCheckCompleted"
/>
```

Le handler `onCheckCompleted` doit appeler `articleProgressStore.addCheck(slug, checkName)`. Vérifier si ce handler existe déjà dans MoteurView.vue — les composants Discovery et Radar l'utilisent déjà.

### Gating souple Lieutenants — Computed existant

Le computed `isCaptaineLocked` existe DÉJÀ dans MoteurView.vue (ligne ~290) :
```typescript
const isCaptaineLocked = computed(() => {
  const slug = selectedArticle.value?.slug
  if (!slug) return false
  return articleProgressStore.getProgress(slug)?.completedChecks?.includes('capitaine_locked') ?? false
})
```

Ce computed est déjà utilisé pour le gating souple du sous-onglet Lieutenants. **NE PAS le recréer.**

### Prompt IA — Directives expert SEO

Le prompt doit produire un avis d'expert SEO contextuel, PAS un résumé des KPIs. Contenu attendu :
- Analyse du potentiel du mot-clé dans le contexte business
- Recommandations d'angles éditoriaux
- Risques et opportunités SEO
- Suggestions d'optimisation (maillage, sémantique)

Variables disponibles pour le prompt : `{{keyword}}`, `{{level}}`, `{{verdict}}`, `{{kpis_summary}}`, `{{strategy_context}}`

### Unlock — Retrait du check

Pour l'unlock, il faut retirer `capitaine_locked` des `completedChecks`. Vérifier si `article-progress.store.ts` a une méthode `removeCheck`. Si non, en créer une (pattern symétrique de `addCheck`) ou passer par `saveProgress` avec le check filtré.

### Fichiers impactés

| Fichier | Action | Raison |
|---|---|---|
| `server/routes/keyword-ai-panel.routes.ts` | **CRÉER** | Route POST SSE /api/keywords/:keyword/ai-panel |
| `server/prompts/capitaine-ai-panel.md` | **CRÉER** | Prompt expert SEO contextuel |
| `server/index.ts` | **MODIFIER** | Ajouter import + app.use('/api', aiPanelRoutes) |
| `src/components/moteur/CaptainValidation.vue` | **MODIFIER** | Panel IA dépliable + bouton lock/unlock |
| `src/views/MoteurView.vue` | **MODIFIER** | Wirer @check-completed sur CaptainValidation |
| `src/stores/article-progress.store.ts` | **MODIFIER** (si removeCheck n'existe pas) | Ajouter removeCheck pour unlock |
| `tests/unit/routes/keyword-ai-panel.routes.test.ts` | **CRÉER** | Tests route SSE |
| `tests/unit/components/captain-validation.test.ts` | **MODIFIER** | Tests panel IA + lock/unlock |

### Anti-patterns à éviter

- **NE PAS** réinventer le streaming — utiliser `useStreaming` existant + `streamChatCompletion` backend
- **NE PAS** faire toucher le verdict par le panel IA — l'IA conseille, ne juge JAMAIS
- **NE PAS** recréer le computed `isCaptaineLocked` — il existe déjà dans MoteurView
- **NE PAS** utiliser `EventSource` pour le POST — `useStreaming` utilise fetch() avec ReadableStream (EventSource ne supporte que GET)
- **NE PAS** déclencher l'IA panel au chargement du composant — uniquement quand `currentResult` change et est non-null
- **NE PAS** cacher/supprimer le panel IA quand l'utilisateur force GO — le panel reste affiché

### Testing Standards

- Framework : Vitest + Vue Test Utils
- Tests route SSE : mocker `streamChatCompletion` avec un générateur async, vérifier les headers `text/event-stream`, les events chunk/done
- Tests composant : mocker `useStreaming`, vérifier le panel dépliable, le contenu streaming, le cadenas lock/unlock, l'emit check-completed
- Pattern de montage : `mount(Component, { props, global: { plugins: [pinia] } })`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 6.5 lignes 727-755]
- [Source: _bmad-output/planning-artifacts/architecture.md — SSE format lignes 433-440]
- [Source: _bmad-output/planning-artifacts/architecture.md — API endpoint /ai-panel ligne 216]
- [Source: _bmad-output/planning-artifacts/architecture.md — check-completed pattern lignes 476-495]
- [Source: _bmad-output/planning-artifacts/architecture.md — Panel IA constraint ligne 546]
- [Source: server/services/claude.service.ts — streamChatCompletion + USAGE_SENTINEL]
- [Source: src/composables/useStreaming.ts — useStreaming composable complet]
- [Source: server/routes/generate.routes.ts — consumeStream + SSE route pattern lignes 12-149]
- [Source: server/utils/prompt-loader.ts — loadPrompt avec variables + strategy context]
- [Source: src/views/MoteurView.vue — isCaptaineLocked computed ligne ~290]
- [Source: src/stores/article-progress.store.ts — addCheck pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: Created SSE route `keyword-ai-panel.routes.ts` with `consumeStream` pattern, prompt `capitaine-ai-panel.md`, registered in `server/index.ts`. 8 route tests pass.
- Task 2: Added AI panel in CaptainValidation.vue using `useStreaming` composable. Auto-triggers on `currentResult` change via watcher. Collapsible panel with toggle. Panel is strictly read-only — never modifies verdict.
- Task 3: Added lock/unlock with `isLocked` ref, "Valider ce Capitaine" button (disabled when verdict !== GO), emit `check-completed`/`check-removed`. Created `removeCheck` backend service + route (`POST /progress/uncheck`) + store method. MoteurView wired with `@check-completed` and `@check-removed`.
- Task 4: 46 tests total (8 route + 38 component). Full suite: 102 files, 1390 tests — all green.

### File List

- `server/routes/keyword-ai-panel.routes.ts` — CREATED (SSE route)
- `server/prompts/capitaine-ai-panel.md` — CREATED (expert SEO prompt)
- `server/index.ts` — MODIFIED (added route import + registration)
- `server/services/article-progress.service.ts` — MODIFIED (added `removeCheck`)
- `server/routes/article-progress.routes.ts` — MODIFIED (added `/progress/uncheck` route + `removeCheck` import)
- `src/components/moteur/CaptainValidation.vue` — MODIFIED (AI panel + lock/unlock)
- `src/views/MoteurView.vue` — MODIFIED (wired @check-completed + @check-removed + handleCheckRemoved)
- `src/stores/article-progress.store.ts` — MODIFIED (added `removeCheck` method)
- `tests/unit/routes/keyword-ai-panel.routes.test.ts` — CREATED (8 tests)
- `tests/unit/components/captain-validation.test.ts` — MODIFIED (38 tests, +16 new)
