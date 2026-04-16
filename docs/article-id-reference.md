# Référence : Identification des articles par `id`

> **Contexte** : Les articles sont identifiés par leur `id` (number), seul identifiant stable. Le `slug` subsiste comme métadonnée SEO et comme nom de fichier pour le contenu (`data/articles/{slug}.json`).

---

## Vue d'ensemble du flux

```
URL navigateur (/article/:articleId/editor  ou  /cocoon/:cocoonId/article/:articleId)
        │
        ▼
 Vue Vue.js — parseInt(route.params.articleId)
        │
        ├─▶ GET /api/articles/:id             → brief + métadonnées
        ├─▶ GET /api/articles/:id/keywords    → mots-clés
        ├─▶ GET /api/articles/:id/content     → contenu éditeur (résout slug côté serveur)
        ├─▶ GET /api/articles/:id/progress    → progression (intégrée dans BDD)
        └─▶ GET /api/strategy/:id             → stratégie
```

---

## 1. Stockage — `data/BDD_Articles_Blog.json`

Chaque article a un `id` entier auto-incrémenté unique dans toute la base.

```json
{
  "titre": "Booster la croissance digitale de votre PME à Toulouse",
  "type": "Pilier",
  "slug": "https://blog.propulsitetoulouse.website/pages/booster-la-croissance-digitale...",
  "topic": null,
  "id": 1,
  "phase": "proposed",
  "completedChecks": ["discovery_done", "radar_done"],
  "checkTimestamps": { "discovery_done": "2026-04-15T20:10:00.000Z" },
  "status": null,
  "createdAt": "2026-04-15T20:09:59.935Z",
  "updatedAt": "2026-04-15T20:09:59.935Z"
}
```

- **`id`** : entier positif, unique globalement, immuable
- **`slug`** : URL complète. À la lecture, `extractSlug()` extrait la partie courte après `/pages/` pour l'API
- **`phase`** : `"proposed"` (défaut) — phase du workflow moteur
- **`completedChecks`** : tableau de checks validés (`discovery_done`, `radar_done`, `capitaine_locked`, `lexique_validated`, `lieutenants_locked`, `brief-validated`)
- **`checkTimestamps`** : horodatage de chaque check (optionnel)
- **`status`** : statut éditorial (`"brouillon"`, `"publié"`, etc.) — `null` par défaut

**Schéma Zod** : [`shared/schemas/article.schema.ts`](../shared/schemas/article.schema.ts)
```typescript
export const rawArticleSchema = z.object({
  id: z.number().int().positive(),
  titre: z.string().min(1),
  slug: z.string().min(1),
  // ...
})
```

---

## 2. Couche données — `server/services/data.service.ts`

### Génération d'`id` (création d'articles)

```typescript
// addArticlesToCocoon() — ligne ~556
const allRawIds = raw.silos.flatMap(s => s.cocons.flatMap(c => c.articles.map(a => a.id)))
let nextIdCounter = allRawIds.length > 0 ? Math.max(...allRawIds) : 0
nextIdCounter++ // auto-incrément sur le max existant
const rawArticle: RawArticle = { id: nextIdCounter, ... }
```

### Fonctions de lookup par `id`

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `getArticleById` | `(id: number)` | Renvoie `{ article, cocoonName }` ou `null` |
| `getArticleBySlug` | `(slug: string)` | Lookup secondaire pour résolution slug→id |
| `updateArticleInCocoon` | `(id: number, updates)` | Modifie titre/slug d'un article |
| `removeArticleFromCocoon` | `(id: number)` | Supprime un article |
| `getArticleKeywords` | `(id: number)` | Renvoie les mots-clés d'un article |
| `saveArticleKeywords` | `(id: number, data)` | Sauvegarde les mots-clés |
| `getArticleKeywordsByCocoon` | `(cocoonName)` | Filtre par `cocoon.articles.map(a => a.id)` |
| `loadArticleMicroContext` | `(id: number)` | Micro-contexte IA de l'article |
| `saveArticleMicroContext` | `(id: number, data)` | Sauvegarde du micro-contexte |

### Transformation slug dans `mapArticle()`

```typescript
// ligne ~44
function extractSlug(url: string): string {
  const parts = url.split('/pages/')
  return parts[1] || url  // "https://.../pages/mon-article" → "mon-article"
}

function mapArticle(raw: RawArticle): Article {
  return {
    id: raw.id,           // conservé tel quel
    slug: extractSlug(raw.slug), // URL complète → slug court
    title: raw.titre,
    // ...
  }
}
```

---

## 3. Routes Express — `server/routes/`

### Pattern de validation `id` (identique sur toutes les routes)

```typescript
const id = parseInt(req.params.id, 10)
if (isNaN(id)) {
  res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
  return
}
```

### Table des routes par `id`

| Route | Méthode | Fichier | Service appelé |
|-------|---------|---------|----------------|
| `/articles/by-slug/:slug` | GET | `articles.routes.ts` | `getArticleBySlug()` → `{ id, slug, title }` |
| `/articles/:id` | GET | `articles.routes.ts` | `getArticleById(id)` |
| `/articles/:id/content` | GET | `articles.routes.ts` | `getArticleContent(id)` |
| `/articles/:id` | PUT | `articles.routes.ts` | `saveArticleContent(id, data)` |
| `/articles/:id/status` | PUT | `articles.routes.ts` | `updateArticleStatus(id, status)` |
| `/articles/:id` | PATCH | `articles.routes.ts` | `updateArticleInCocoon(id, updates)` |
| `/articles/:id` | DELETE | `articles.routes.ts` | `removeArticleFromCocoon(id)` |
| `/articles/:id/micro-context` | GET/PUT | `articles.routes.ts` | `loadArticleMicroContext` / `saveArticleMicroContext` |
| `/articles/:id/keywords` | GET | `keywords.routes.ts` | `getArticleKeywords(id)` |
| `/articles/:id/keywords` | PUT | `keywords.routes.ts` | `saveArticleKeywords(id, data)` |
| `/articles/:id/progress` | GET/PUT | `articles.routes.ts` | `getArticleProgress(id)` / `saveArticleProgress(id, data)` |
| `/articles/:id/progress/check` | POST | `articles.routes.ts` | `addArticleCheck(id, check)` |
| `/articles/:id/progress/uncheck` | POST | `articles.routes.ts` | `removeArticleCheck(id, check)` |
| `/articles/:id/semantic-field` | GET/PUT | `articles.routes.ts` | `getSemanticField(id)` / `saveSemanticField(id, terms)` |
| `/articles/:id/cached-results` | GET | `article-results.routes.ts` | `getArticleKeywords(id)` puis fetch résultats |
| `/strategy/:id` | GET/PUT | `strategy.routes.ts` | `getStrategy(id)` / `saveStrategy(id, data)` |
| `/links/suggest` | POST | `links.routes.ts` | `suggestLinks(articleId, content)` |

---

## 4. Stores Pinia — `src/stores/`

| Store | Comment il utilise `id` |
|-------|------------------------|
| `brief.store.ts` | `fetchBrief(id)` → GET `/articles/:id`. Expose `briefData.article.id` |
| `editor.store.ts` | `saveArticle(id)`, `generateMeta(id)`, `reduceArticle(id)` |
| `outline.store.ts` | `generateOutline(briefData)` — lit `briefData.article.id` |
| `article-keywords.store.ts` | `fetchKeywords(id)`, `saveKeywords(id)`, `suggestLexique(articleId)` |
| `article-progress.store.ts` | `fetchProgress(id)` — cache indexé par `String(id)` |
| `strategy.store.ts` | `fetchStrategy(id)`, `saveStrategy(id)`, `nextStep(id)` |
| `linking.store.ts` | `fetchSuggestions(id, content)` — links ont `sourceId: number` |
| `moteur-basket.store.ts` | `articleId: ref<number \| null>`, `setArticle(id)` — vide le panier si l'id change |

---

## 5. Composables — `src/composables/`

### `useAutoSave.ts`
```typescript
export function useAutoSave(articleId: number, intervalMs = 30_000) {
  // Toutes les X secondes : editorStore.saveArticle(articleId)
}
```

### `useArticleResults.ts`
```typescript
const currentArticleId = ref<number | null>(null)

async function loadCachedResults(articleId: number) {
  currentArticleId.value = articleId
  // GET /api/articles/:articleId/cached-results
}
```

### `useCannibalization.ts`
```typescript
export function useCannibalization(
  articleId: Ref<number>,     // id de l'article courant
  cocoonName: Ref<string>,
) {
  // Compare articleId avec les ids des autres articles du cocon
  // pour détecter la cannibalisation de mots-clés
}
```

### `useInternalLinking.ts`
```typescript
export function useInternalLinking(articleId: MaybeRef<number>) {
  const id = unref(articleId)
  // linkingStore.fetchSuggestions(id, content)
  // Crée des liens avec sourceId: id, targetId: suggestion.targetId
}
```

---

## 6. Vues — Accès direct par `id`

Les routes Vue utilisent `:articleId` (number) directement dans l'URL. Plus besoin de résolution slug→id au montage.

### Routes Vue Router

```
/cocoon/:cocoonId/article/:articleId    → ArticleWorkflowView
/article/:articleId/editor              → ArticleEditorView
/article/:articleId/preview             → ArticlePreviewView
```

### `ArticleEditorView.vue` et `ArticleWorkflowView.vue`

```typescript
// L'id est directement dans l'URL
const id = parseInt(route.params.articleId as string, 10)

onMounted(async () => {
  // Toutes les données chargées directement par id
  await briefStore.fetchBrief(id)
  await articleKeywordsStore.fetchKeywords(id)
  await editorStore.loadContent(id)   // GET /articles/:id/content
  useAutoSave(id)
})
```

### Fichiers de contenu — résolution slug côté serveur

Les fichiers de contenu d'article sont stockés dans `data/articles/{slug}.json` (nommés par slug, pas par id). Le service `article-content.service.ts` résout le slug via `getArticleById(id)` :

```typescript
async function resolveArticlePath(id: number): Promise<string> {
  const result = await getArticleById(id)
  if (!result) throw new Error(`Article ${id} not found in BDD`)
  return join(ARTICLES_DIR, `${result.article.slug}.json`)
}
```

---

## 7. Rôle du `slug` après migration

Le `slug` n'est **plus jamais** utilisé comme clé de lookup dans les opérations CRUD. Il joue uniquement ces rôles :

| Rôle | Où |
|------|----|
| **Nom de fichier contenu** | `data/articles/{slug}.json` — résolu côté serveur via `getArticleById(id)` |
| **Métadonnée SEO** | Affiché dans les formulaires, utilisé à l'export |
| **Déduplication** à la création en lot | `addArticlesToCocoon()` — vérifie `existingSlugs` avant d'insérer |
| **Modifiable** via PATCH | `PATCH /api/articles/:id` accepte `{ slug }` dans le body |

---

## 8. Règles à respecter lors de l'ajout de features

1. **Toute nouvelle route** qui cible un article doit utiliser `:id` (pas `:slug`) et parser avec `parseInt(req.params.id, 10)` + vérification `isNaN`.

2. **Tout nouveau store ou composable** doit accepter `id: number` (ou `Ref<number>`) — jamais `slug: string` comme identifiant.

3. **Les vues** naviguent par `articleId` (number) directement dans l'URL. Ne jamais passer le slug aux stores ou composables.

4. **Les nouvelles données** liées à un article (fichiers JSON de sauvegarde, etc.) doivent être indexées par `articleId: number`, pas par slug.

5. **Génération d'id** : toujours utiliser `Math.max(...existingIds) + 1` — ne pas utiliser `length` (risque de collision si des articles ont été supprimés).
