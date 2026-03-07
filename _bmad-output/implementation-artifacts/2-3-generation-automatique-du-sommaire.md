# Story 2.3: Génération Automatique du Sommaire

Status: done

## Story

As a Arnau (utilisateur),
I want générer automatiquement un sommaire structuré (H1/H2/H3) basé sur le brief SEO,
so that j'obtienne une structure d'article optimisée SEO/GEO en quelques secondes.

## Acceptance Criteria

1. **AC1 — Génération Claude SSE** : Le système génère un sommaire H1/H2/H3 via Claude API (SSE streaming) quand l'utilisateur clique sur "Générer le sommaire" — FR10.

2. **AC2 — PAA dans le sommaire** : Le sommaire intègre des suggestions H2/H3 basées sur les PAA DataForSEO — FR10.

3. **AC3 — Blocs Propulsite** : Le sommaire inclut les emplacements des blocs pédagogiques Propulsite (content-valeur, content-reminder, sommaire cliquable) — FR13.

4. **AC4 — Prompt externalisé** : Le prompt de génération est lu depuis `server/prompts/generate-outline.md` — NFR14.

5. **AC5 — Performance** : La génération complète en moins de 10 secondes — NFR1.

6. **AC6 — Streaming visuel** : Un indicateur de streaming affiche la progression pendant la génération.

7. **AC7 — Erreur et retry** : En cas d'erreur Claude API, un message d'erreur s'affiche avec bouton retry — NFR9.

## Tasks / Subtasks

- [x] **Task 1 : Créer les types `OutlineSection` et `Outline`** (AC: #1, #3)
  - [x] Ajouter `shared/types/outline.types.ts` avec `OutlineSection` (id, level, title, annotation) et `Outline` (sections[])
  - [x] Exporter depuis `shared/types/index.ts`

- [x] **Task 2 : Créer le service Claude `claude.service.ts`** (AC: #1, #5)
  - [x] Créer `server/services/claude.service.ts`
  - [x] Instancier le SDK `@anthropic-ai/sdk` avec `process.env.ANTHROPIC_API_KEY`
  - [x] Implémenter `streamChatCompletion(systemPrompt: string, userPrompt: string): AsyncIterable<string>` utilisant `client.messages.stream()`
  - [x] Modèle lu depuis `process.env.CLAUDE_MODEL` (défaut: `claude-sonnet-4-6`)
  - [x] Tests unitaires avec mock du SDK

- [x] **Task 3 : Créer le prompt `generate-outline.md`** (AC: #2, #3, #4)
  - [x] Créer `server/prompts/generate-outline.md`
  - [x] Le prompt prend en paramètre : titre article, type article, mot-clé pilier, mots-clés secondaires, PAA, cocoon name, theme
  - [x] Le prompt produit un JSON structuré `{ sections: OutlineSection[] }` avec H1/H2/H3
  - [x] Le prompt inclut les consignes pour les blocs Propulsite : sommaire cliquable en H1, content-valeur après intro, content-reminder avant conclusion
  - [x] Le prompt demande d'intégrer les PAA comme H2/H3 formulés en questions
  - [x] Implémenter `loadPrompt(name: string, variables: Record<string, string>): string` dans un utilitaire `server/utils/prompt-loader.ts`

- [x] **Task 4 : Créer la route SSE `POST /api/generate/outline`** (AC: #1, #6, #7)
  - [x] Créer `server/routes/generate.routes.ts`
  - [x] Endpoint `POST /api/generate/outline` : body `{ slug, keyword, keywords, paa, articleType, articleTitle, cocoonName, theme }`
  - [x] Configurer les headers SSE : `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
  - [x] Streamer les events : `event: chunk\ndata: { content: string }\n\n` pendant la génération
  - [x] Envoyer `event: done\ndata: { outline: Outline }\n\n` quand terminé (parse le JSON final)
  - [x] Envoyer `event: error\ndata: { code, message }\n\n` en cas d'erreur
  - [x] Enregistrer la route dans `server/index.ts`

- [x] **Task 5 : Créer le composable `useStreaming.ts`** (AC: #1, #6)
  - [x] Créer `src/composables/useStreaming.ts`
  - [x] Expose : `startStream(url: string, body: unknown): { chunks: Ref<string>, isStreaming: Ref<boolean>, error: Ref<string | null>, result: Ref<T | null> }`
  - [x] Utilise `fetch()` avec mode streaming (pas EventSource — on POST avec body)
  - [x] Parse les events SSE manuellement depuis le ReadableStream
  - [x] Gère l'event `chunk` (accumule le texte), `done` (parse le résultat final), `error`
  - [x] Expose `abort()` pour annuler le stream
  - [x] Tests unitaires

- [x] **Task 6 : Créer le store `outline.store.ts`** (AC: #1, #6, #7)
  - [x] Créer `src/stores/outline.store.ts` en mode Pinia setup
  - [x] State : `outline: ref<Outline | null>`, `streamedText: ref<string>`, `isGenerating: ref<boolean>`, `error: ref<string | null>`
  - [x] Action `generateOutline(briefData: BriefData)` : construit le body, appelle `useStreaming`, met à jour le state progressivement
  - [x] Action `resetOutline()` pour permettre la régénération
  - [x] Tests unitaires

- [x] **Task 7 : Créer le composant `OutlineDisplay.vue`** (AC: #1, #3, #6)
  - [x] Créer `src/components/outline/OutlineDisplay.vue`
  - [x] Props : `outline: Outline | null`, `streamedText: string`, `isGenerating: boolean`
  - [x] Pendant la génération : affiche le texte streamé brut dans un bloc pré-formaté avec animation de curseur
  - [x] Après la génération : affiche l'outline structuré (H1/H2/H3 indentés avec icônes) avec annotations Propulsite
  - [x] Utilise les CSS variables du design system

- [x] **Task 8 : Créer le composant `OutlineActions.vue`** (AC: #1, #7)
  - [x] Créer `src/components/outline/OutlineActions.vue`
  - [x] Props : `isGenerating: boolean`, `hasOutline: boolean`, `hasBriefData: boolean`
  - [x] Bouton "Générer le sommaire" : émit `generate` (visible quand pas d'outline et brief dispo)
  - [x] Bouton "Régénérer" : émit `regenerate` (visible quand outline existe)
  - [x] Bouton désactivé pendant la génération, avec texte "Génération en cours..."
  - [x] Utilise les CSS variables du design system

- [x] **Task 9 : Intégrer dans `ArticleWorkflowView.vue`** (AC: #1-#7)
  - [x] Importer le store `outline` et les composants `OutlineDisplay`, `OutlineActions`
  - [x] Ajouter une section "Sommaire" après le brief (ContentRecommendation)
  - [x] `OutlineActions` déclenche `outlineStore.generateOutline(briefStore.briefData)`
  - [x] `OutlineDisplay` affiche l'état courant du store outline
  - [x] ErrorMessage avec retry si `outlineStore.error`

- [x] **Task 10 : Tests et validation** (AC: tous)
  - [x] Tests du `claude.service.ts` (mock SDK)
  - [x] Tests du `outline.store.ts` (mock useStreaming)
  - [x] Tests du composable `useStreaming.ts` (mock fetch)
  - [x] Tests du `prompt-loader.ts`
  - [x] `npx vitest run` — 128 tests passent
  - [x] `npx vue-tsc --build` — type-check clean

## Dev Notes

### Backend — Claude Service [Source: architecture.md, NFR17]

L'architecture prévoit `server/services/claude.service.ts`. C'est le premier service Claude du projet.

**SDK Anthropic (v0.78.0)** — déjà installé dans `package.json` :

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function* streamChatCompletion(
  systemPrompt: string,
  userPrompt: string,
): AsyncGenerator<string> {
  const stream = client.messages.stream({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}
```

**IMPORTANT — Import SDK** : L'import est `import Anthropic from '@anthropic-ai/sdk'`. Le SDK utilise un default export.

### Backend — SSE Streaming Pattern [Source: architecture.md]

Le format SSE défini dans l'architecture :

```typescript
// Route SSE pattern
router.post('/generate/outline', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  try {
    let fullContent = ''
    for await (const chunk of streamChatCompletion(systemPrompt, userPrompt)) {
      fullContent += chunk
      res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`)
    }

    // Parse le JSON final du sommaire
    const outline = parseOutlineFromText(fullContent)
    res.write(`event: done\ndata: ${JSON.stringify({ outline })}\n\n`)
    res.end()
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ code: 'CLAUDE_API_ERROR', message: err.message })}\n\n`)
    res.end()
  }
})
```

**Types SSE existants** dans `shared/types/api.types.ts` :
```typescript
export interface SseChunkEvent { content: string }
export interface SseDoneEvent { metadata: Record<string, unknown> }
export interface SseErrorEvent { code: string; message: string }
```

### Backend — Prompt Externalisé [Source: NFR14]

Le prompt `server/prompts/generate-outline.md` est un fichier Markdown avec des variables `{{variable}}` remplacées au runtime.

**Utilitaire `prompt-loader.ts`** :
```typescript
import { readFile } from 'fs/promises'
import { join } from 'path'

const PROMPTS_DIR = join(process.cwd(), 'server', 'prompts')

export async function loadPrompt(name: string, variables: Record<string, string> = {}): Promise<string> {
  const content = await readFile(join(PROMPTS_DIR, `${name}.md`), 'utf-8')
  return Object.entries(variables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    content,
  )
}
```

### Frontend — Composable `useStreaming` [Source: architecture.md]

**IMPORTANT** : On ne peut PAS utiliser `EventSource` pour les POST requests. On utilise `fetch()` avec `ReadableStream` :

```typescript
export function useStreaming<T>() {
  const chunks = ref('')
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  const result = ref<T | null>(null)
  let abortController: AbortController | null = null

  async function startStream(url: string, body: unknown) {
    abortController = new AbortController()
    isStreaming.value = true
    error.value = null
    chunks.value = ''
    result.value = null

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abortController.signal,
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      // Parse SSE events from buffer...
    }
  }

  function abort() {
    abortController?.abort()
    isStreaming.value = false
  }

  return { chunks, isStreaming, error, result, startStream, abort }
}
```

### Frontend — Outline Types

**Nouveau fichier `shared/types/outline.types.ts`** :
```typescript
export interface OutlineSection {
  id: string
  level: 1 | 2 | 3
  title: string
  annotation?: 'content-valeur' | 'content-reminder' | 'sommaire-cliquable' | 'answer-capsule' | null
}

export interface Outline {
  sections: OutlineSection[]
}
```

**Note** : Le champ `ArticleContent.outline` dans `article.types.ts` est `string | null`. Le sommaire sera sérialisé en JSON string pour la persistance (Story 2.4). Pour l'instant (Story 2.3), le sommaire n'est PAS persisté — il est uniquement en mémoire dans le store.

### Frontend — Outline Store

Pattern identique à `brief.store.ts` (Pinia setup mode) :

```typescript
export const useOutlineStore = defineStore('outline', () => {
  const outline = ref<Outline | null>(null)
  const streamedText = ref('')
  const isGenerating = ref(false)
  const error = ref<string | null>(null)

  async function generateOutline(briefData: BriefData) {
    // Appelle useStreaming avec POST /api/generate/outline
    // Met à jour streamedText pendant le streaming
    // Quand done → parse outline, met à jour outline.value
  }

  function resetOutline() {
    outline.value = null
    streamedText.value = ''
    error.value = null
  }

  return { outline, streamedText, isGenerating, error, generateOutline, resetOutline }
})
```

### Frontend — Composants Outline [Source: architecture.md]

Composants prévus dans `src/components/outline/` :
- `OutlineDisplay.vue` — affiche le sommaire (structuré ou texte brut pendant streaming)
- `OutlineActions.vue` — boutons générer / régénérer

**OutlineDisplay** pendant le streaming :
- Affiche le texte brut reçu en temps réel (JSON progressif)
- Animation de curseur clignotant à la fin du texte

**OutlineDisplay** après génération :
- Affiche les sections hiérarchiquement (H1 → H2 → H3) avec indentation
- Les annotations Propulsite sont affichées en badge à côté du titre (ex: "[content-valeur]")
- Icônes différentes par niveau (H1 = étoile, H2 = cercle, H3 = point)

### Intégration dans ArticleWorkflowView [Source: src/views/ArticleWorkflowView.vue]

L'état actuel de la vue affiche déjà les 4 composants brief. Il faut ajouter la section outline APRÈS `ContentRecommendation` :

```vue
<!-- Existing brief components -->
<ContentRecommendation ... />

<!-- NEW: Outline section -->
<section class="outline-section">
  <OutlineActions
    :is-generating="outlineStore.isGenerating"
    :has-outline="!!outlineStore.outline"
    :has-brief-data="!!briefStore.briefData"
    @generate="outlineStore.generateOutline(briefStore.briefData!)"
    @regenerate="outlineStore.generateOutline(briefStore.briefData!)"
  />

  <ErrorMessage
    v-if="outlineStore.error && !outlineStore.isGenerating"
    :message="outlineStore.error"
    @retry="outlineStore.generateOutline(briefStore.briefData!)"
  />

  <OutlineDisplay
    :outline="outlineStore.outline"
    :streamed-text="outlineStore.streamedText"
    :is-generating="outlineStore.isGenerating"
  />
</section>
```

### Existing Patterns [Source: codebase analysis]

**Vue Component Pattern :**
- `<script setup lang="ts">` — Composition API
- Props via `defineProps<{...}>()`
- Emits via `defineEmits<{...}>()`
- CSS scoped with `var(--color-*)` variables

**Pinia Store Pattern (setup mode) :**
- `ref()` for state, `computed()` for getters, `async function` for actions
- `isLoading`, `error` (string | null) pattern in every store
- `try/catch/finally` with `isLoading` toggle

**API Service Pattern :**
- `apiGet<T>` et `apiPost<T>` dans `src/services/api.service.ts`
- Format: `fetch('/api' + path)` → check `res.ok` → return `json.data as T`
- **Note** : pour SSE, on n'utilise PAS `apiPost` — on utilise `fetch()` directement dans `useStreaming`

**Server Route Registration** dans `server/index.ts` :
```typescript
import cocoonRoutes from './routes/cocoons.routes.js'
import keywordRoutes from './routes/keywords.routes.js'
import articlesRoutes from './routes/articles.routes.js'
import dataforseoRoutes from './routes/dataforseo.routes.js'

app.use('/api', cocoonRoutes)
app.use('/api', keywordRoutes)
app.use('/api', articlesRoutes)
app.use('/api/dataforseo', dataforseoRoutes)
// ADD: app.use('/api', generateRoutes)
```

**CSS Variables [Source: src/assets/styles/variables.css] :**
```css
--color-primary: #2563eb;
--color-secondary: #64748b;
--color-success: #16a34a;
--color-warning: #d97706;
--color-error: #dc2626;
--color-background: #ffffff;
--color-surface: #f8fafc;
--color-text: #1e293b;
--color-text-muted: #64748b;
--color-border: #e2e8f0;
```

**Environment Variables** (`.env.example`) :
```
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-6
```

### Previous Story Intelligence (2.2)

**Learnings from Story 2.2 code review :**
- BriefData type should compose existing types (`Article & { cocoonName }`, `Keyword[]`) — avoid inline duplication
- CSS class names should NOT contain accented characters — use normalized names
- Function parameters should use typed unions (`ArticleType`) instead of `string`
- Labels in DataForSeoPanel must match the actual data field (was "Difficulté" for competition data)
- All 108 existing tests pass — don't break them

**Files modified in Story 2.2 that may be touched again :**
- `src/views/ArticleWorkflowView.vue` — will be modified to add outline section
- `shared/types/index.ts` — will be modified to export outline types

### Dependencies

- **Depends on** : Story 2.1 (DataForSEO service) — DONE
- **Depends on** : Story 2.2 (Brief SEO display, BriefData type) — DONE
- **Consumed by** : Story 2.4 (Édition et validation du sommaire)

### Zod Import

**IMPORTANT** : Zod imports use `'zod/v4'` NOT `'zod'` in this project.

### Anti-patterns

- PAS de clé API Claude côté frontend — tout passe par le proxy Express
- PAS de `EventSource` pour les POST requests — utiliser `fetch()` avec `ReadableStream`
- PAS de prompts hardcodés — lire depuis `server/prompts/`
- PAS de `any` TypeScript — typer toutes les props et returns
- PAS de styles hardcodés — utiliser CSS variables
- PAS de logique métier dans les composants — garder dans le store ou le composable

### File List (expected)

- `shared/types/outline.types.ts` — CREATE
- `shared/types/index.ts` — MODIFY (export outline types)
- `server/services/claude.service.ts` — CREATE
- `server/utils/prompt-loader.ts` — CREATE
- `server/prompts/generate-outline.md` — CREATE
- `server/routes/generate.routes.ts` — CREATE
- `server/index.ts` — MODIFY (register generate routes)
- `src/composables/useStreaming.ts` — CREATE
- `src/stores/outline.store.ts` — CREATE
- `src/components/outline/OutlineDisplay.vue` — CREATE
- `src/components/outline/OutlineActions.vue` — CREATE
- `src/views/ArticleWorkflowView.vue` — MODIFY (add outline section)
- `tests/unit/services/claude.service.test.ts` — CREATE
- `tests/unit/composables/useStreaming.test.ts` — CREATE
- `tests/unit/stores/outline.store.test.ts` — CREATE
- `tests/unit/utils/prompt-loader.test.ts` — CREATE

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
