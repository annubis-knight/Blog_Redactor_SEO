# Story 1.2: Types Partagés, Schemas et Chargement des Données JSON

Status: done

## Story

As a développeur,
I want charger et valider les fichiers JSON existants (articles et mots-clés) avec des types TypeScript partagés,
so that les données du plan éditorial soient accessibles de manière typée et fiable dans toute l'application.

## Acceptance Criteria

1. **AC1 — Types partagés** : Les types TypeScript sont définis dans `shared/types/` : `article.types.ts` (Article, ArticleContent, ArticleStatus, ArticleType), `cocoon.types.ts` (Cocoon, CocoonStats), `keyword.types.ts` (Keyword, KeywordType), `api.types.ts` (ApiSuccess<T>, ApiError).

2. **AC2 — Schemas Zod** : Les schemas Zod de validation sont définis dans `shared/schemas/` : `article.schema.ts`, `keyword.schema.ts`. Ils valident la structure des fichiers JSON existants.

3. **AC3 — Conversion snake_case → camelCase** : Les services backend convertissent les données JSON (snake_case originel) en camelCase pour les réponses API. Les fichiers JSON source ne sont jamais modifiés.

4. **AC4 — Endpoint GET /api/cocoons** : L'API retourne la liste des cocons avec statistiques de base (nombre d'articles, % par type, progression). Format : `{ data: Cocoon[] }`.

5. **AC5 — Endpoint GET /api/cocoons/:id/articles** : L'API retourne les articles d'un cocon identifié par son index (0-5). Format : `{ data: Article[] }`.

6. **AC6 — Endpoint GET /api/keywords/:cocoon** : L'API retourne les mots-clés d'un cocon identifié par son nom. Format : `{ data: Keyword[] }`.

7. **AC7 — Format réponse API** : Toutes les réponses suivent le format standardisé `{ data: T }` en succès et `{ error: { code: string, message: string } }` en erreur.

8. **AC8 — Erreur 404** : Les endpoints retournent `{ error: { code: 'NOT_FOUND', message: '...' } }` avec HTTP 404 si le cocon ou les données n'existent pas.

## Tasks / Subtasks

- [x] **Task 1 : Créer les types TypeScript partagés** (AC: #1)
  - [x] Créer `shared/types/article.types.ts` avec : `ArticleType` (enum: 'Pilier' | 'Intermédiaire' | 'Spécialisé'), `ArticleStatus` (enum: 'à rédiger' | 'brouillon' | 'publié'), `Article` (interface complète camelCase), `RawArticle` (interface snake_case pour le JSON source)
  - [x] Créer `shared/types/cocoon.types.ts` avec : `Cocoon` (nom, articles, stats), `CocoonStats` (totalArticles, byType, byStatus)
  - [x] Créer `shared/types/keyword.types.ts` avec : `KeywordType` ('Pilier' | 'Moyenne traine' | 'Longue traine'), `Keyword` (interface camelCase), `RawKeyword` (interface snake_case)
  - [x] Créer `shared/types/api.types.ts` avec : `ApiSuccess<T>`, `ApiError`, types SSE events
  - [x] Ajouter un barrel export `shared/types/index.ts`

- [x] **Task 2 : Créer les schemas Zod de validation** (AC: #2)
  - [x] Créer `shared/schemas/article.schema.ts` — schema Zod pour valider la structure `BDD_Articles_Blog.json` (cocons_semantiques[].articles[])
  - [x] Créer `shared/schemas/keyword.schema.ts` — schema Zod pour valider la structure `BDD_Mots_Clefs_SEO.json` (seo_data[])
  - [x] Les schemas valident la structure raw (snake_case) des fichiers source

- [x] **Task 3 : Service de chargement des données** (AC: #3)
  - [x] Créer `server/services/data.service.ts` avec :
    - `loadArticlesDb()` : lit `data/BDD_Articles_Blog.json`, valide avec Zod, convertit snake_case → camelCase
    - `loadKeywordsDb()` : lit `data/BDD_Mots_Clefs_SEO.json`, valide avec Zod, convertit snake_case → camelCase
    - `getCocoons()` : retourne les cocons avec statistiques calculées
    - `getArticlesByCocoon(cocoonIndex)` : retourne les articles d'un cocon
    - `getKeywordsByCocoon(cocoonName)` : retourne les mots-clés d'un cocon
  - [x] Les données sont chargées au démarrage et gardées en mémoire (fichiers source en lecture seule)
  - [x] La conversion snake_case → camelCase se fait via des fonctions de mapping typées, PAS de librairie externe

- [x] **Task 4 : Routes Express** (AC: #4, #5, #6, #7, #8)
  - [x] Créer `server/routes/cocoons.routes.ts` avec `GET /api/cocoons` et `GET /api/cocoons/:id/articles`
  - [x] Créer `server/routes/keywords.routes.ts` avec `GET /api/keywords/:cocoon`
  - [x] Enregistrer les routes dans `server/index.ts`
  - [x] Chaque route wrap le handler dans try/catch qui retourne le format erreur standardisé
  - [x] Retourner HTTP 404 avec `{ error: { code: 'NOT_FOUND', message } }` si cocon inexistant

- [x] **Task 5 : Tests unitaires** (AC: tous)
  - [x] Tester les schemas Zod avec des données valides et invalides
  - [x] Tester les fonctions de conversion snake_case → camelCase
  - [x] Tester `getCocoons()` retourne les 6 cocons avec stats correctes
  - [x] Tester `getArticlesByCocoon()` retourne les bons articles
  - [x] Tester `getKeywordsByCocoon()` retourne les bons mots-clés
  - [x] Tester les cas d'erreur (cocon inexistant)

- [x] **Task 6 : Vérification intégration** (AC: tous)
  - [x] `npm run dev` démarre sans erreur
  - [x] `GET /api/cocoons` retourne les 6 cocons avec stats
  - [x] `GET /api/cocoons/0/articles` retourne les articles du premier cocon
  - [x] `GET /api/keywords/Refonte de site web pour PME` retourne les mots-clés du cocon
  - [x] `GET /api/cocoons/99/articles` retourne 404
  - [x] Tous les tests passent

## Dev Notes

### Données JSON existantes — Structure exacte

**`data/BDD_Articles_Blog.json`** :
```json
{
  "cocons_semantiques": [
    {
      "nom": "Refonte de site web pour PME",
      "articles": [
        {
          "titre": "Pourquoi la refonte de votre site...",
          "type": "Pilier",
          "slug": "https://blog.propulsitetoulouse.website/pages/pourquoi-la-refonte-...",
          "theme": null
        }
      ]
    }
  ]
}
```
- 6 cocons, 54 articles au total
- `type` : "Pilier" | "Intermédiaire" | "Spécialisé"
- `theme` : string | null (null pour les articles Pilier)
- `slug` : URL complète (pas un simple slug — extraire le slug depuis l'URL pour usage interne)

**`data/BDD_Mots_Clefs_SEO.json`** :
```json
{
  "seo_data": [
    {
      "mot_clef": "refonte site web PME",
      "cocon_seo": "Refonte de site web pour PME",
      "type_mot_clef": "Pilier"
    }
  ]
}
```
- ~100 mots-clés
- `type_mot_clef` : "Pilier" | "Moyenne traine" | "Longue traine"
- `cocon_seo` : nom exact du cocon (correspondance avec `cocons_semantiques[].nom`)

### Architecture critique — Types [Source: architecture.md#Project Structure]

Les fichiers types à créer :
- `shared/types/article.types.ts` — Article, ArticleContent, ArticleStatus
- `shared/types/cocoon.types.ts` — Cocoon, CocoonStats, CocoonType
- `shared/types/keyword.types.ts` — Keyword, KeywordType, KeywordDensity
- `shared/types/api.types.ts` — ApiSuccess<T>, ApiError, SSE events

### Convention conversion snake_case → camelCase [Source: architecture.md#Naming Patterns]

- Les fichiers JSON existants gardent leur format snake_case original
- La conversion se fait dans les services backend lors du chargement
- Les réponses API utilisent camelCase : `{ articleSlug, seoScore, metaTitle }`
- **NE PAS** utiliser de librairie type lodash/camelCase — mapper manuellement les champs connus

### Format réponse API [Source: architecture.md#API Communication Patterns]

```typescript
// Succès
interface ApiSuccess<T> { data: T }

// Erreur
interface ApiError { error: { code: string; message: string } }
```

### Routes Express [Source: architecture.md#API Communication Patterns]

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/cocoons` | Liste des cocons avec stats |
| GET | `/api/cocoons/:id/articles` | Articles d'un cocon |
| GET | `/api/keywords/:cocoon` | Mots-clés d'un cocon |

### Conventions de nommage fichiers [Source: architecture.md#Implementation Patterns]

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Types | kebab-case.types.ts | `article.types.ts` |
| Schemas | kebab-case.schema.ts | `article.schema.ts` |
| Services backend | kebab-case.service.ts | `data.service.ts` |
| Routes Express | kebab-case.routes.ts | `cocoons.routes.ts` |
| Tests | même nom + .test.ts | `data.service.test.ts` |

### Stores Pinia [Source: architecture.md#Frontend Architecture]

Les stores `articles`, `cocoons`, `keywords` n'existent pas encore. Ils seront créés dans les stories 1.3 et 1.4. Cette story crée uniquement le **backend** (types, schemas, services, routes).

### Anti-patterns à éviter [Source: architecture.md#Enforcement Guidelines]

- **PAS** de `any` — utiliser `unknown` + type guards
- **PAS** de librairie externe pour la conversion snake_case → camelCase
- **PAS** de modification des fichiers JSON source
- **PAS** de logique métier dans les routes Express — déléguer aux services
- **PAS** de duplication des types (les types dans `shared/types/` sont la source unique)

### Learnings Story 1.1

- Le projet utilise `tsx watch` pour le backend (pas de compilation séparée)
- Les imports backend utilisent `.js` extension (ESM)
- `json-storage.ts` existe déjà dans `server/utils/` — le réutiliser pour lire les fichiers JSON avec `readJson<T>()`
- CORS est restreint à localhost
- L'error handler global existe dans `server/utils/error-handler.ts`
- `@shared/*` path alias est configuré dans `tsconfig.app.json` et `vite.config.ts`

### Project Structure Notes

- Les types dans `shared/types/` sont importables depuis `src/` (via `@shared/types/`) ET `server/` (via import relatif `../../shared/types/`)
- Le `tsconfig.node.json` inclut déjà `shared/**/*`
- Le `tsconfig.app.json` inclut déjà `shared/**/*` avec path `@shared/*`

### Extraction du slug depuis l'URL

Les slugs dans `BDD_Articles_Blog.json` sont des URLs complètes. Extraire le slug court :
```typescript
// "https://blog.propulsitetoulouse.website/pages/pourquoi-la-refonte-..."
// → "pourquoi-la-refonte-..."
function extractSlug(url: string): string {
  return url.split('/pages/')[1] || url
}
```

### References

- [Source: architecture.md#Data Architecture] — Structure fichiers JSON, modèle données
- [Source: architecture.md#API Communication Patterns] — Endpoints, format réponse
- [Source: architecture.md#Implementation Patterns] — Conventions nommage, anti-patterns
- [Source: architecture.md#Project Structure] — Emplacement types, schemas, services
- [Source: epics.md#Story 1.2] — Acceptance criteria originaux
- [Source: prd.md#FR57-FR58] — Chargement BDD_Articles_Blog.json et BDD_Mots_Clefs_SEO.json

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 5 type files created in shared/types/ (article, cocoon, keyword, api, index barrel)
- 2 Zod schema files in shared/schemas/ (article, keyword) — validates actual JSON data files
- data.service.ts with in-memory caching, Zod validation, snake_case→camelCase conversion
- 2 route files (cocoons, keywords) registered in server/index.ts
- Slug extraction from full URLs implemented
- 31/31 tests passing (26 new + 5 existing)
- Type-check clean with vue-tsc --build

### File List

- shared/types/article.types.ts (new)
- shared/types/cocoon.types.ts (new)
- shared/types/keyword.types.ts (new)
- shared/types/api.types.ts (new)
- shared/types/index.ts (new)
- shared/schemas/article.schema.ts (new)
- shared/schemas/keyword.schema.ts (new)
- server/services/data.service.ts (new)
- server/routes/cocoons.routes.ts (new)
- server/routes/keywords.routes.ts (new)
- server/index.ts (modified — added route imports and registration)
- tests/unit/services/data.service.test.ts (new — 14 tests)
- tests/unit/schemas/zod-schemas.test.ts (new — 12 tests)
