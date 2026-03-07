# Story 3.2: Génération Automatique de l'Article Complet

Status: done

## Story

As a Arnau (utilisateur),
I want générer un article complet en ton Propulsite basé sur le sommaire validé,
so that j'obtienne un article prêt à publier avec SEO/GEO intégrés, affiché progressivement via streaming.

## Acceptance Criteria

1. **AC1 — Bouton de génération** : Après validation du sommaire, un bouton "Générer l'article" apparaît. Il appelle `editorStore.generateArticle(briefData, outline)` — FR14.

2. **AC2 — Affichage streaming** : Pendant la génération, le contenu HTML s'affiche progressivement dans un composant `ArticleStreamDisplay` avec un curseur animé — NFR17.

3. **AC3 — Contenu final** : À la fin de la génération, le contenu complet est stocké dans `editorStore.content` et affiché en rendu HTML — FR14.

4. **AC4 — Génération meta** : Un second appel génère le meta title et la meta description via un nouveau endpoint `POST /api/generate/meta` — FR20.

5. **AC5 — Sauvegarde après génération** : Le contenu généré est automatiquement sauvegardé via `PUT /api/articles/:slug` avec le contenu, metaTitle et metaDescription — FR14.

6. **AC6 — Gestion d'erreurs UI** : En cas d'erreur de génération, un message d'erreur avec bouton retry s'affiche — NFR9.

7. **AC7 — Régénération** : L'utilisateur peut régénérer l'article (le bouton change en "Régénérer l'article") — FR14.

## Tasks / Subtasks

- [x] **Task 1 : Créer le composant `ArticleStreamDisplay.vue`** (AC: #2, #3)
  - [x] Créer `src/components/article/ArticleStreamDisplay.vue`
  - [x] Props : `streamedText`, `content`, `isGenerating`
  - [x] Mode streaming : affiche le HTML en texte brut avec curseur animé (comme OutlineDisplay)
  - [x] Mode final : affiche le contenu HTML rendu via `v-html`
  - [x] Styles : conteneur avec bordure, fond surface, police serif pour le rendu article

- [x] **Task 2 : Créer le composant `ArticleActions.vue`** (AC: #1, #7)
  - [x] Créer `src/components/article/ArticleActions.vue`
  - [x] Props : `isGenerating`, `hasContent`, `isOutlineValidated`
  - [x] Emits : `generate`, `regenerate`
  - [x] Bouton "Générer l'article" (primary) si pas de contenu et sommaire validé
  - [x] Bouton "Régénérer l'article" (secondary) si contenu existe
  - [x] Pattern identique à `OutlineActions.vue`

- [x] **Task 3 : Créer le composant `ArticleMetaDisplay.vue`** (AC: #4)
  - [x] Créer `src/components/article/ArticleMetaDisplay.vue`
  - [x] Props : `metaTitle`, `metaDescription`, `isGenerating`
  - [x] Affiche le meta title et meta description dans des champs lecture seule
  - [x] Indicateur de chargement pendant la génération des metas

- [x] **Task 4 : Créer le prompt et endpoint de génération meta** (AC: #4)
  - [x] Créer `server/prompts/generate-meta.md` avec variables `{{articleTitle}}`, `{{keyword}}`, `{{articleContent}}`
  - [x] Ajouter `generateMetaRequestSchema` dans `shared/schemas/generate.schema.ts`
  - [x] Ajouter route `POST /api/generate/meta` dans `generate.routes.ts` (réponse JSON, pas SSE)
  - [x] Le endpoint retourne `{ metaTitle: string, metaDescription: string }`

- [x] **Task 5 : Ajouter `generateMeta` action dans `editor.store.ts`** (AC: #4, #5)
  - [x] Ajouter action `generateMeta(slug, keyword, articleTitle, content)` dans `editor.store.ts`
  - [x] Appelle `POST /api/generate/meta` via `apiPost`
  - [x] Met à jour `metaTitle` et `metaDescription`
  - [x] Ajouter action `saveArticle(slug)` qui appelle `PUT /api/articles/:slug` avec content + metas

- [x] **Task 6 : Intégrer la section article dans `ArticleWorkflowView.vue`** (AC: #1, #2, #3, #5, #6, #7)
  - [x] Importer `useEditorStore`, `ArticleActions`, `ArticleStreamDisplay`, `ArticleMetaDisplay`
  - [x] Ajouter section article après la section outline (visible quand `outlineStore.isValidated`)
  - [x] Bouton génération → `editorStore.generateArticle(briefStore.briefData!, outlineStore.outline!)`
  - [x] Après génération : appeler `editorStore.generateMeta(...)` puis `editorStore.saveArticle(slug)`
  - [x] Afficher `ErrorMessage` si `editorStore.error`

- [x] **Task 7 : Tests et validation** (AC: tous)
  - [x] Tests du composant `ArticleActions.vue` — 3 tests (bouton generate, regenerate, disabled states)
  - [x] Tests de la route `POST /api/generate/meta` — 3 tests (succès, validation, erreur)
  - [x] Tests de `editor.store.ts` — 4 tests (generateMeta, saveArticle, error, resetEditor)
  - [x] `npx vitest run` — 169 tests passent (was 159)
  - [x] `npx vue-tsc --build` — type-check clean

## Dev Notes

### Architecture — Article Generation Flow [Source: architecture.md]

Le flow complet de génération d'article est :

```
1. Sommaire validé (outlineStore.isValidated = true)
2. Utilisateur clique "Générer l'article"
3. editorStore.generateArticle(briefData, outline) → SSE streaming
4. Contenu HTML affiché progressivement via ArticleStreamDisplay
5. À la fin : editorStore.generateMeta() → JSON response
6. Auto-save : editorStore.saveArticle(slug) → PUT /api/articles/:slug
```

### Existing Editor Store [Source: src/stores/editor.store.ts — Story 3.1]

Le store `editor` existe déjà avec :
- State : `content`, `streamedText`, `isGenerating`, `error`, `metaTitle`, `metaDescription`
- Action : `generateArticle(briefData, outline)` — SSE streaming via `useStreaming`
- Action : `resetEditor()` — reset tout l'état

**À AJOUTER dans cette story** :
- Action `generateMeta(slug, keyword, articleTitle, content)` — appelle `POST /api/generate/meta`
- Action `saveArticle(slug)` — appelle `PUT /api/articles/:slug` avec content + metas

### Existing Outline Store [Source: src/stores/outline.store.ts]

- `isValidated` : flag qui indique si le sommaire est validé
- `outline` : l'objet Outline complet (sections avec niveaux, titres, annotations)
- La section article dans ArticleWorkflowView ne doit apparaître que quand `isValidated === true`

### Existing Brief Store [Source: src/stores/brief.store.ts]

- `briefData` : contient `article`, `keywords`, `dataForSeo`, `contentLengthRecommendation`
- `pilierKeyword` : computed qui extrait le mot-clé pilier
- Chargé au mount de ArticleWorkflowView — toujours disponible quand on arrive à la génération d'article

### Existing ArticleWorkflowView [Source: src/views/ArticleWorkflowView.vue]

Le view orchestre déjà : Brief → Outline. Il faut ajouter une 3ème section "Article" après la section outline, visible uniquement quand `outlineStore.isValidated`.

Pattern existant :
```html
<section class="outline-section">
  <OutlineActions ... />
  <OutlineDisplay ... />
  <OutlineEditor ... />
</section>

<!-- À AJOUTER -->
<section v-if="outlineStore.isValidated" class="article-section">
  <ArticleActions ... />
  <ErrorMessage v-if="editorStore.error" ... />
  <ArticleStreamDisplay ... />
  <ArticleMetaDisplay ... />
</section>
```

### Component Pattern — OutlineDisplay for streaming [Source: src/components/outline/OutlineDisplay.vue]

Le composant `OutlineDisplay` montre le pattern streaming :
- Mode streaming : `<pre>{{ streamedText }}<span class="cursor">▊</span></pre>`
- Mode final : affichage structuré du contenu

Pour l'article, la différence est :
- Mode streaming : affiche le HTML brut en texte (pas en rendu HTML, pour éviter les artefacts pendant le streaming)
- Mode final : `<div v-html="content">` pour le rendu HTML complet

### Meta Generation [Source: architecture.md — FR20]

La génération des metas est un appel JSON classique (pas SSE) car le contenu est court :
- `POST /api/generate/meta` accepte `{ slug, keyword, articleTitle, articleContent }`
- Retourne `{ data: { metaTitle: string, metaDescription: string } }`
- Le prompt `generate-meta.md` donne les consignes : meta title < 60 chars, meta desc < 160 chars
- Utilise `streamChatCompletion` mais collecte tout le contenu sans streaming (petite réponse)

### Save After Generation [Source: server/routes/articles.routes.ts]

Le endpoint `PUT /api/articles/:slug` existe déjà (Story 2.4). Il accepte un body partiel via `updateArticleContentSchema` :
```typescript
{ content?: string, metaTitle?: string, metaDescription?: string, ... }
```

L'action `saveArticle(slug)` dans le store doit envoyer :
```typescript
apiPut(`/articles/${slug}`, {
  content: content.value,
  metaTitle: metaTitle.value,
  metaDescription: metaDescription.value,
})
```

### useStreaming done event resolution [Source: src/composables/useStreaming.ts:70]

```typescript
result.value = parsed.outline ?? parsed.metadata ?? parsed
```

Pour l'article, le `done` event envoie `{ content: fullContent }`. Le composable résout `parsed.outline` (undefined) → `parsed.metadata` (undefined) → `parsed` = `{ content: fullContent }`. Donc `onDone(data)` reçoit `{ content: string }` et le store fait `content.value = data.content`.

### CSS Variables [Source: src/assets/styles/variables.css]

```css
--color-primary: #2563eb;
--color-success: #16a34a;
--color-error: #dc2626;
--color-text: #1e293b;
--color-text-muted: #64748b;
--color-border: #e2e8f0;
--color-surface: #f8fafc;
```

### Anti-patterns

- PAS de `any` TypeScript — typer toutes les props et returns
- PAS de modification du composable `useStreaming` — l'utiliser tel quel
- PAS de `v-html` pendant le streaming — uniquement quand `content` final est disponible (risque d'artefacts HTML incomplets)
- PAS de retry automatique côté client — l'utilisateur utilise le bouton retry
- PAS de génération meta pendant le streaming article — attendre que `content` soit défini
- PAS de nouvelle instance `useStreaming` dans le store pour meta — utiliser `apiPost` car c'est une réponse JSON

### Previous Story Intelligence (3.1)

**Code review findings Story 3.1 :**
- `paa` field validated but unused in article generation — by design (outline uses PAA)
- Subtask checkboxes weren't marked — fixed in review
- Test count in subtasks didn't match actual — fixed in review

**Patterns établis dans Story 3.1 :**
- `editor.store.ts` — Pinia setup mode, `useStreaming<{ content: string }>()` pattern
- SSE route pattern : `loadPrompt` → `writeHead` → `streamChatCompletion` → `done` event
- `system-propulsite.md` réutilisable pour toutes les générations

**Files créés dans Story 3.1 :**
- `server/prompts/system-propulsite.md` — System prompt Propulsite
- `server/prompts/generate-article.md` — Prompt article
- `src/stores/editor.store.ts` — Editor Pinia store
- `tests/unit/routes/generate.routes.test.ts` — Route tests
- `tests/unit/stores/editor.store.test.ts` — Store tests

**159 tests passent actuellement.**

### Dependencies

- **Depends on** : Story 3.1 (editor store, article generation endpoint) — DONE
- **Consumed by** : Story 3.3 (Éditeur TipTap), Story 3.4 (Auto-save)

### Project Structure Notes

- `src/components/article/ArticleStreamDisplay.vue` — Nouveau composant
- `src/components/article/ArticleActions.vue` — Nouveau composant
- `src/components/article/ArticleMetaDisplay.vue` — Nouveau composant
- `server/prompts/generate-meta.md` — Nouveau prompt
- `src/views/ArticleWorkflowView.vue` — Modifié (ajout section article)
- `src/stores/editor.store.ts` — Modifié (ajout generateMeta, saveArticle)
- `shared/schemas/generate.schema.ts` — Modifié (ajout generateMetaRequestSchema)
- `server/routes/generate.routes.ts` — Modifié (ajout POST /generate/meta)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Génération de Contenu]
- [Source: src/views/ArticleWorkflowView.vue] — Existing workflow view
- [Source: src/stores/editor.store.ts] — Editor store (Story 3.1)
- [Source: src/stores/outline.store.ts] — Outline store with isValidated
- [Source: src/stores/brief.store.ts] — Brief data
- [Source: src/components/outline/OutlineActions.vue] — Component pattern
- [Source: src/components/outline/OutlineDisplay.vue] — Streaming display pattern
- [Source: server/routes/generate.routes.ts] — Existing generation routes
- [Source: server/routes/articles.routes.ts] — PUT /articles/:slug for save

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 169 tests passing (was 159), 10 new tests added
- Type-check clean via `npx vue-tsc --build`
- All 7 ACs implemented
- Meta endpoint uses JSON response (not SSE) — correct per spec
- `handleGenerateArticle()` orchestrates: generateArticle → generateMeta → saveArticle
- Added `isGeneratingMeta` state for meta loading indicator
- Character count badges on meta fields with warning state (>60 for title, >160 for description)

### File List

**New files:**
- `src/components/article/ArticleStreamDisplay.vue` — Streaming/final HTML display
- `src/components/article/ArticleActions.vue` — Generate/regenerate buttons
- `src/components/article/ArticleMetaDisplay.vue` — Meta title/description display
- `server/prompts/generate-meta.md` — Meta generation prompt
- `tests/unit/components/ArticleActions.test.ts` — 3 component tests

**Modified files:**
- `src/stores/editor.store.ts` — Added generateMeta, saveArticle, isGeneratingMeta
- `src/views/ArticleWorkflowView.vue` — Added article section with full flow
- `shared/schemas/generate.schema.ts` — Added generateMetaRequestSchema
- `server/routes/generate.routes.ts` — Added POST /generate/meta endpoint
- `tests/unit/routes/generate.routes.test.ts` — Added 3 meta route tests
- `tests/unit/stores/editor.store.test.ts` — Added 4 store tests (generateMeta, saveArticle, errors, reset)
