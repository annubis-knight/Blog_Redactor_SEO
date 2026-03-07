# Story 3.1: Service Claude API avec Streaming SSE

Status: done

## Story

As a développeur,
I want un service backend Claude API robuste avec streaming SSE pour la génération d'articles,
so that les générations de contenu IA soient streamées en temps réel à l'utilisateur.

## Acceptance Criteria

1. **AC1 — Endpoint article** : `POST /api/generate/article` accepte un outline validé, les données du brief, et streame le contenu généré via SSE — FR14.

2. **AC2 — System prompt Propulsite** : Le system prompt est chargé depuis `server/prompts/system-propulsite.md` et définit le ton Propulsite (vouvoiement, exemples PME, données chiffrées, conclusion actionnable) — NFR14.

3. **AC3 — Prompt article externalisé** : Le prompt de génération d'article est chargé depuis `server/prompts/generate-article.md` avec les variables de contexte — NFR14.

4. **AC4 — SSE streaming** : Le contenu est streamé au frontend via les events SSE `chunk`, `done`, `error` — NFR17.

5. **AC5 — useStreaming consomme le flux** : Le composable `useStreaming` côté frontend consomme le flux SSE et met à jour le store `editor` progressivement.

6. **AC6 — Modèle configurable** : Le modèle Claude est configurable via la variable d'environnement `CLAUDE_MODEL`.

7. **AC7 — Gestion d'erreurs** : En cas d'erreur Claude API, un event SSE `error` est envoyé avec code et message.

## Tasks / Subtasks

- [x] **Task 1 : Créer le system prompt `server/prompts/system-propulsite.md`** (AC: #2)
  - [x] Rédiger le system prompt définissant le ton Propulsite
  - [x] Consignes : vouvoiement, exemples grandes marques → PME, données chiffrées, conclusion actionnable
  - [x] Intégrer les directives answer capsule (20-25 mots), statistiques sourcées, H2/H3 en questions
  - [x] Ce prompt est utilisable par toutes les générations (outline, article, actions)

- [x] **Task 2 : Créer le prompt `server/prompts/generate-article.md`** (AC: #3)
  - [x] Template avec variables `{{outline}}`, `{{keyword}}`, `{{secondaryKeywords}}`, `{{articleType}}`, `{{articleTitle}}`, `{{cocoonName}}`, `{{theme}}`
  - [x] Consignes pour respecter FR14-FR20 : intégration mots-clés, answer capsules, statistiques, questions H2/H3
  - [x] Format de sortie : HTML structuré avec les blocs Propulsite

- [x] **Task 3 : Ajouter `generateArticleRequestSchema` dans `shared/schemas/generate.schema.ts`** (AC: #1)
  - [x] Modifier `shared/schemas/generate.schema.ts`
  - [x] Schema : slug, outline (JSON string), keyword, keywords, paa, articleType, articleTitle, cocoonName, theme
  - [x] IMPORTANT : `import { z } from 'zod/v4'` (pas `'zod'`)

- [x] **Task 4 : Ajouter `max_tokens` paramétrable dans `claude.service.ts`** (AC: #1, #6)
  - [x] Modifier `server/services/claude.service.ts`
  - [x] Ajouter un paramètre optionnel `maxTokens` à `streamChatCompletion` (défaut: 4096)
  - [x] L'article generation utilisera 16384 tokens (articles longs de 2500+ mots)

- [x] **Task 5 : Ajouter la route `POST /api/generate/article` dans `generate.routes.ts`** (AC: #1, #2, #3, #4, #7)
  - [x] Modifier `server/routes/generate.routes.ts`
  - [x] Valider le body avec `generateArticleRequestSchema`
  - [x] Charger `system-propulsite.md` comme system prompt (via `loadPrompt`)
  - [x] Charger `generate-article.md` comme user prompt (via `loadPrompt` avec variables)
  - [x] Streamer les chunks via SSE (même pattern que outline)
  - [x] Envoyer `event: done` avec `{ content: fullContent }` (HTML brut, pas JSON à parser)
  - [x] Gestion d'erreurs : `res.headersSent` check avant JSON vs SSE error

- [x] **Task 6 : Créer le store `editor.store.ts`** (AC: #5)
  - [x] Créer `src/stores/editor.store.ts`
  - [x] State : `content`, `streamedText`, `isGenerating`, `error`, `metaTitle`, `metaDescription`
  - [x] Action `generateArticle(briefData, outline)` — appelle `POST /api/generate/article` via `useStreaming`
  - [x] Utilise les callbacks `onChunk`, `onDone`, `onError` du composable `useStreaming`
  - [x] Action `resetEditor()` — remet à zéro l'état

- [x] **Task 7 : Tests et validation** (AC: tous)
  - [x] Tests de la route `POST /api/generate/article` (mock claude.service + prompt-loader) — 4 tests
  - [x] Tests du `editor.store.ts` (mock useStreaming) — 6 tests
  - [x] Tests de `streamChatCompletion` avec paramètre maxTokens — 2 tests
  - [x] `npx vitest run` — 159 tests passent
  - [x] `npx vue-tsc --build` — type-check clean

## Dev Notes

### Architecture — Claude API Service [Source: architecture.md]

Le service Claude existe déjà dans `server/services/claude.service.ts` avec :
- Client Anthropic SDK initialisé avec `process.env.ANTHROPIC_API_KEY`
- Fonction `streamChatCompletion(systemPrompt, userPrompt)` → `AsyncGenerator<string>`
- Model configurable via `process.env.CLAUDE_MODEL` (défaut: `claude-sonnet-4-6`)

**IMPORTANT — max_tokens** : La valeur actuelle est `4096`. Pour un article complet (2500+ mots), il faut augmenter à `16384`. Ajouter un paramètre optionnel plutôt que de changer la valeur par défaut (pour ne pas casser outline generation).

### Existing SSE Pattern [Source: server/routes/generate.routes.ts]

Le pattern SSE est déjà établi pour l'outline :

```typescript
// 1. Charger prompt AVANT writeHead (pour pouvoir retourner JSON error si échec)
const systemPrompt = await loadPrompt('generate-outline', { ... })

// 2. SSE headers
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
})

// 3. Stream chunks
let fullContent = ''
for await (const chunk of streamChatCompletion(systemPrompt, userPrompt)) {
  fullContent += chunk
  res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`)
}

// 4. Done event
res.write(`event: done\ndata: ${JSON.stringify({ outline })}\n\n`)
res.end()

// 5. Error handling with headersSent check
catch (err) {
  if (res.headersSent) {
    res.write(`event: error\ndata: ${JSON.stringify({ code: 'CLAUDE_API_ERROR', message })}\n\n`)
    res.end()
  } else {
    res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
  }
}
```

**DIFFÉRENCE pour article vs outline** :
- Outline : le `done` event contient un objet JSON parsé (`{ outline: Outline }`)
- Article : le `done` event contient le HTML brut (`{ content: string, metadata: { ... } }`)
- Outline : system prompt = le prompt complet (generate-outline.md)
- Article : system prompt = ton Propulsite (system-propulsite.md), user prompt = instructions article (generate-article.md)

### Prompt Architecture [Source: architecture.md + NFR14]

**Séparation system/user prompt pour article** :
- `system-propulsite.md` : Ton de voix, style rédactionnel, directives GEO/SEO globales
- `generate-article.md` : Instructions spécifiques à la génération d'article avec variables de contexte

Le `loadPrompt` existant dans `server/utils/prompt-loader.ts` supporte les variables `{{variable}}`.

### useStreaming Composable [Source: src/composables/useStreaming.ts]

Le composable `useStreaming<T>` existe déjà avec :
- `startStream(url, body, callbacks)` — POST fetch + SSE parsing
- Callbacks : `onChunk(accumulated)`, `onDone(data)`, `onError(message)`
- Le `done` event est parsé comme : `parsed.outline ?? parsed.metadata ?? parsed`

**IMPORTANT** : Pour l'article, le `done` event aura `{ content: string }`. Le composable résoudra `parsed.content ?? parsed.metadata ?? parsed`. Vérifier que le store `editor` récupère correctement le contenu final.

### Pinia Store Pattern [Source: codebase analysis]

```typescript
export const useEditorStore = defineStore('editor', () => {
  // ref() for state
  // async function for actions (uses useStreaming internally)
  // return { state, actions }
})
```

Pattern identique à `outline.store.ts` — store setup mode.

### Zod Import [Source: Story 2.3]

**IMPORTANT** : `import { z } from 'zod/v4'` — pas `'zod'`.

### CSS Variables [Source: src/assets/styles/variables.css]

```css
--color-primary: #2563eb;
--color-success: #16a34a;
--color-error: #dc2626;
--color-text: #1e293b;
--color-text-muted: #64748b;
--color-border: #e2e8f0;
```

### Anti-patterns

- PAS de `any` TypeScript — typer toutes les props et returns
- PAS de modification du composable `useStreaming` — il est déjà générique, l'utiliser tel quel
- PAS de retry automatique côté client — l'utilisateur utilise le bouton retry
- PAS d'augmentation globale de `max_tokens` — paramètre optionnel uniquement
- PAS de sérialisation de l'outline dans le composant — le store envoie `JSON.stringify(outline)` au backend

### Previous Story Intelligence (2.4)

**Code review findings corrigés dans Story 2.4 :**
- `generateOutline` ne réinitialisait pas `isValidated` → corrigé (ajout `isValidated.value = false`)
- `isDragOver` était hardcodé à `false` → corrigé avec `dragOverIndex` tracking
- Emit `validate` inutilisé dans OutlineEditor → supprimé

**Patterns établis dans Story 2.4 :**
- `article-content.service.ts` — CRUD pour `data/articles/{slug}.json` (réutilisé par la route PUT)
- `apiPut` dans `api.service.ts` — helper frontend pour PUT
- `updateArticleContentSchema` — validation Zod pour sauvegarde d'article
- `ArticleContent` type — outline, content, metaTitle, metaDescription, seoScore, geoScore, updatedAt

**Files créés dans Story 2.4 :**
- `src/components/outline/OutlineEditor.vue` — Éditeur interactif avec D&D
- `src/components/outline/OutlineNode.vue` — Nœud draggable avec édition inline
- `server/services/article-content.service.ts` — CRUD article content
- `shared/schemas/article.schema.ts` — updateArticleContentSchema

**147 tests passent actuellement.**

### Dependencies

- **Depends on** : Story 2.4 (sommaire validé, article-content.service) — DONE
- **Consumed by** : Story 3.2 (Génération automatique de l'article complet — UI/intégration)

### Project Structure Notes

- `server/prompts/system-propulsite.md` — Nouveau fichier, réutilisable par tous les endpoints de génération
- `server/prompts/generate-article.md` — Nouveau fichier, spécifique à la génération d'article
- `src/stores/editor.store.ts` — Nouveau store, utilisé par les stories 3.2, 3.3, 3.4
- La route `POST /api/generate/article` est ajoutée dans `generate.routes.ts` (pas de nouveau fichier route)
- Le schema `generateArticleRequestSchema` est ajouté dans `generate.schema.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Claude API Service]
- [Source: _bmad-output/planning-artifacts/architecture.md#SSE Streaming]
- [Source: server/services/claude.service.ts] — Existing Claude service
- [Source: server/routes/generate.routes.ts] — Existing SSE route pattern
- [Source: server/utils/prompt-loader.ts] — Prompt loader utility
- [Source: src/composables/useStreaming.ts] — Frontend SSE consumer
- [Source: shared/schemas/generate.schema.ts] — Existing outline schema
- [Source: server/services/article-content.service.ts] — Article CRUD (from Story 2.4)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- All 7 tasks completed successfully
- 159 tests passing (12 new: 4 route, 6 editor store, 2 maxTokens)
- Type-check clean (`vue-tsc --build`)
- system-propulsite.md defines reusable Propulsite tone/style for all generation endpoints
- generate-article.md is the article-specific prompt with variable substitution
- editor.store follows same pattern as outline.store (setup mode, useStreaming composable)
- maxTokens parameter added as optional to avoid breaking existing outline generation (4096 default)

### File List

- `server/prompts/system-propulsite.md` — NEW: System prompt with Propulsite tone
- `server/prompts/generate-article.md` — NEW: Article generation prompt template
- `src/stores/editor.store.ts` — NEW: Editor Pinia store
- `server/services/claude.service.ts` — MODIFIED: Added maxTokens parameter
- `server/routes/generate.routes.ts` — MODIFIED: Added POST /generate/article route
- `shared/schemas/generate.schema.ts` — MODIFIED: Added generateArticleRequestSchema
- `tests/unit/routes/generate.routes.test.ts` — NEW: 4 route tests
- `tests/unit/stores/editor.store.test.ts` — NEW: 6 store tests
- `tests/unit/services/claude.service.test.ts` — MODIFIED: Added 2 maxTokens tests
