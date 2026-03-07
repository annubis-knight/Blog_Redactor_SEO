# Story 1.1: Initialisation du Projet et Structure Monorepo

Status: done

## Story

As a développeur,
I want un projet Vue 3 initialisé avec la structure monorepo complète (client/server/shared/data),
so that toute l'équipe de développement dispose d'une base solide et cohérente pour implémenter les fonctionnalités.

## Acceptance Criteria

1. **AC1 — Initialisation create-vue** : Le projet est initialisé avec `npm create vue@latest blog-redactor-seo -- --typescript --router --pinia --vitest --eslint-with-prettier`. La structure `src/` avec `components/`, `views/`, `router/`, `stores/`, `assets/` est créée.

2. **AC2 — Dépendances additionnelles** : Les packages suivants sont installés : `@tiptap/vue-3`, `@tiptap/starter-kit`, `@anthropic-ai/sdk`, `express`, `zod`, `@vueuse/core`. Les dev-dependencies incluent les types Express (`@types/express`) et `tsx` pour le backend.

3. **AC3 — Structure monorepo** : Les dossiers `server/`, `shared/`, `data/`, `tests/` sont créés à la racine avec la structure complète définie dans l'architecture.

4. **AC4 — Serveur Express** : Le serveur Express de base démarre sur le port configuré (env `PORT`, défaut 3001) avec middleware d'erreur global, CORS localhost, et JSON body parser.

5. **AC5 — Proxy Vite** : Vite est configuré pour proxier les requêtes `/api/*` vers `http://localhost:3001`.

6. **AC6 — Variables d'environnement** : Un fichier `.env.example` documente toutes les variables nécessaires : `ANTHROPIC_API_KEY`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `CLAUDE_MODEL`, `PORT`.

7. **AC7 — Stockage JSON atomique** : L'utilitaire `server/utils/json-storage.ts` implémente le pattern write-to-temp + `fs.rename()` pour écriture atomique, avec fonctions `readJson<T>()` et `writeJson<T>()`.

8. **AC8 — Dev simultané** : `npm run dev` lance simultanément le frontend Vite et le backend Express (via script concurrently ou npm-run-all).

## Tasks / Subtasks

- [x] **Task 1 : Initialisation du projet Vue** (AC: #1)
  - [x] Exécuter `npm create vue@latest` avec les flags TypeScript, Router, Pinia, Vitest, ESLint+Prettier
  - [x] Le projet doit être créé DANS le répertoire courant (pas un sous-dossier) — les fichiers JSON existants et `_bmad*` doivent rester à leur place
  - [x] Vérifier que le scaffolding est complet (`src/`, `router/`, `stores/`, etc.)

- [x] **Task 2 : Installation des dépendances** (AC: #2)
  - [x] `npm install @tiptap/vue-3 @tiptap/starter-kit @anthropic-ai/sdk express zod @vueuse/core`
  - [x] `npm install -D @types/express tsx concurrently`
  - [x] Vérifier que le `package.json` est cohérent

- [x] **Task 3 : Création de la structure monorepo** (AC: #3)
  - [x] Créer `server/` avec sous-dossiers : `routes/`, `services/`, `prompts/`, `prompts/actions/`, `utils/`
  - [x] Créer `shared/` avec sous-dossiers : `types/`, `schemas/`, `constants/`
  - [x] Créer `data/` avec sous-dossiers : `articles/`, `cache/`, `links/`
  - [x] Copier `BDD_Articles_Blog.json` et `BDD_Mots_Clefs_SEO.json` dans `data/`
  - [x] Copier `templateArticle.html` dans `src/assets/templates/`
  - [x] Créer `tests/unit/` avec sous-dossiers : `stores/`, `composables/`, `utils/`, `services/`
  - [x] Ajouter fichiers `.gitkeep` dans les dossiers vides

- [x] **Task 4 : Configuration TypeScript** (AC: #3)
  - [x] Configurer `tsconfig.json` pour inclure les paths `shared/` et `server/`
  - [x] Créer `tsconfig.node.json` pour le code backend (target ESNext, module NodeNext)
  - [x] S'assurer que les types partagés dans `shared/types/` sont importables depuis `src/` ET `server/`

- [x] **Task 5 : Serveur Express de base** (AC: #4)
  - [x] Créer `server/index.ts` — entry point Express
  - [x] Configurer : `express.json()`, CORS (origins `http://localhost:*`), health check `GET /api/health`
  - [x] Implémenter middleware d'erreur global dans `server/utils/error-handler.ts`
  - [x] Le serveur écoute sur `process.env.PORT || 3001`

- [x] **Task 6 : Configuration Vite proxy** (AC: #5)
  - [x] Modifier `vite.config.ts` pour ajouter le proxy `/api` → `http://localhost:3001`
  - [x] Vérifier que les requêtes `/api/health` passent bien du frontend au backend

- [x] **Task 7 : Variables d'environnement** (AC: #6)
  - [x] Créer `.env.example` avec toutes les variables documentées
  - [x] S'assurer que `.env` est dans `.gitignore`
  - [x] Le backend charge les variables via `process.env` (pas de dotenv nécessaire si lancé avec tsx)

- [x] **Task 8 : Utilitaire JSON Storage** (AC: #7)
  - [x] Implémenter `server/utils/json-storage.ts` :
    - `readJson<T>(filePath: string): Promise<T>` — lit et parse un fichier JSON
    - `writeJson<T>(filePath: string, data: T): Promise<void>` — écrit via temp + rename atomique
    - `ensureDir(dirPath: string): Promise<void>` — crée le dossier si inexistant
  - [x] Le pattern : écrire dans `{filename}.tmp`, puis `fs.rename()` vers `{filename}`
  - [x] Utiliser `fs/promises` (pas de callbacks)

- [x] **Task 9 : Script dev simultané** (AC: #8)
  - [x] Ajouter script `"dev:server"` → `tsx watch server/index.ts`
  - [x] Ajouter script `"dev:client"` → `vite`
  - [x] Modifier script `"dev"` → `concurrently "npm:dev:client" "npm:dev:server"`
  - [x] Vérifier que `npm run dev` lance les deux processus

- [x] **Task 10 : Vérification intégration** (AC: tous)
  - [x] `npm run dev` démarre sans erreur
  - [x] Frontend accessible sur `http://localhost:5173`
  - [x] Backend accessible sur `http://localhost:3001`
  - [x] `GET /api/health` depuis le frontend retourne `{ data: { status: 'ok' } }`

## Dev Notes

### Architecture Critique

- **IMPORTANT : Créer le projet DANS le répertoire courant.** Les fichiers `BDD_Articles_Blog.json`, `BDD_Mots_Clefs_SEO.json`, `templateArticle.html` et le dossier `_bmad*` existent déjà à la racine. Le scaffolding create-vue doit cohabiter avec ces fichiers existants.
- **Monorepo flat** : pas de workspaces npm. Le code partagé est dans `shared/` importé directement via TypeScript paths.
- **Convention SFC** : `<script setup lang="ts">` → `<template>` → `<style scoped>` (cet ordre exact)
- **Stores Pinia** : mode setup (Composition API), fichiers en `kebab-case.store.ts`

### Conventions de nommage [Source: architecture.md#Implementation Patterns]

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Composants Vue | PascalCase.vue | `CocoonCard.vue` |
| Stores Pinia | kebab-case.store.ts | `articles.store.ts` |
| Services backend | kebab-case.service.ts | `claude.service.ts` |
| Types | kebab-case.types.ts | `article.types.ts` |
| Routes Express | kebab-case.routes.ts | `articles.routes.ts` |
| Composables | camelCase use*.ts | `useSeoScoring.ts` |

### Format réponse API [Source: architecture.md#API Communication Patterns]

```typescript
// Succès
{ data: T }

// Erreur
{ error: { code: string, message: string } }
```

### Structure de fichiers à créer [Source: architecture.md#Project Structure]

```
blog-redactor-seo/         (= répertoire courant)
├── .env.example
├── .gitignore             (mettre à jour avec data/, .env)
├── package.json           (modifié avec deps + scripts)
├── vite.config.ts         (modifié avec proxy)
├── tsconfig.json          (modifié avec paths shared/)
├── tsconfig.node.json     (nouveau, pour backend)
├── data/
│   ├── BDD_Articles_Blog.json    (copié)
│   ├── BDD_Mots_Clefs_SEO.json   (copié)
│   ├── articles/                  (vide, .gitkeep)
│   ├── cache/                     (vide, .gitkeep)
│   └── links/                     (vide, .gitkeep)
├── server/
│   ├── index.ts
│   ├── routes/                    (.gitkeep)
│   ├── services/                  (.gitkeep)
│   ├── prompts/
│   │   └── actions/               (.gitkeep)
│   └── utils/
│       ├── json-storage.ts
│       └── error-handler.ts
├── shared/
│   ├── types/                     (.gitkeep)
│   ├── schemas/                   (.gitkeep)
│   └── constants/                 (.gitkeep)
├── src/                           (scaffoldé par create-vue)
│   ├── assets/
│   │   ├── styles/
│   │   │   ├── main.css
│   │   │   ├── editor.css         (.gitkeep)
│   │   │   └── variables.css      (.gitkeep)
│   │   └── templates/
│   │       └── templateArticle.html  (copié)
│   └── ...
└── tests/
    ├── setup.ts                   (.gitkeep)
    └── unit/
        ├── stores/                (.gitkeep)
        ├── composables/           (.gitkeep)
        ├── utils/                 (.gitkeep)
        └── services/              (.gitkeep)
```

### Middleware erreur Express [Source: architecture.md#Process Patterns]

```typescript
// server/utils/error-handler.ts
import type { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(`[${req.method}] ${req.path}:`, err.message)
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: err.message }
  })
}
```

### JSON Storage atomique [Source: architecture.md#Process Patterns — NFR10]

```typescript
// server/utils/json-storage.ts
import { readFile, writeFile, rename, mkdir } from 'fs/promises'
import { dirname } from 'path'

export async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  const tmpPath = `${filePath}.tmp`
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  await rename(tmpPath, filePath)
}
```

### Versions clés [Source: architecture.md#Starter Template]

| Package | Version |
|---------|---------|
| Vue | 3.5.x |
| Vite | 7.x |
| Pinia | 3.0.x |
| Vue Router | 5.0.x |
| TypeScript | 5.x |
| Express | 5.x |
| TipTap | 3.x |
| Zod | 3.x |

### Anti-patterns à éviter [Source: architecture.md#Enforcement Guidelines]

- **PAS** d'Options API (`data()`, `methods:`, `computed:`)
- **PAS** de `any` en TypeScript — utiliser `unknown` + type guards
- **PAS** d'appels API directs depuis les composants — toujours via services ou stores
- **PAS** de clés API côté frontend
- **PAS** de dotenv côté client — les variables sensibles restent server-side

### Gestion du .gitignore

Ajouter au `.gitignore` existant :
```
.env
data/articles/
data/cache/
data/links/
*.tmp
```
Ne PAS ignorer `data/BDD_Articles_Blog.json` ni `data/BDD_Mots_Clefs_SEO.json` (fichiers sources).

### Project Structure Notes

- Le projet est créé dans le répertoire existant qui contient déjà les JSON et le dossier `_bmad*`
- La commande `create-vue` va créer `src/`, `public/`, `index.html`, `package.json`, etc. aux côtés des fichiers existants
- Le dossier `_bmad*` et les fichiers markdown de planification ne doivent PAS être modifiés ou déplacés

### References

- [Source: architecture.md#Starter Template Evaluation] — commande create-vue et versions
- [Source: architecture.md#Core Architectural Decisions] — stockage JSON, API patterns, proxy Vite
- [Source: architecture.md#Implementation Patterns] — conventions nommage, anti-patterns
- [Source: architecture.md#Project Structure] — arborescence complète des fichiers
- [Source: prd.md#Non-Functional Requirements] — NFR4 (chargement < 3s), NFR10 (atomic writes), NFR11 (clés server-side)
- [Source: epics.md#Story 1.1] — acceptance criteria originaux

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- create-vue 3.22.0 scaffolded with TS/Router/Pinia/Vitest/ESLint+Prettier
- Scaffolded in temp dir then moved to project root to preserve existing files
- Installed: Vue 3.5.29, Vite 7.3.1, Pinia 3.0.4, Router 5.0.3, TS 5.9.3, Vitest 4.0.18
- Installed: Express 5.2.1, TipTap 3.20.1, Anthropic SDK 0.78.0, Zod 4.3.6, VueUse 14.2.1
- 5/5 tests passing (4 json-storage + 1 HelloWorld)
- Both dev servers start: Vite on 5173, Express on 3001
- Atomic JSON storage tested with write-to-temp + rename pattern

### File List

- package.json (modified)
- vite.config.ts (modified)
- tsconfig.app.json (modified)
- tsconfig.node.json (modified)
- .gitignore (modified)
- .env.example (new)
- server/index.ts (new)
- server/utils/error-handler.ts (new)
- server/utils/json-storage.ts (new)
- data/BDD_Articles_Blog.json (copied)
- data/BDD_Mots_Clefs_SEO.json (copied)
- src/assets/templates/templateArticle.html (copied)
- tests/setup.ts (new)
- tests/unit/services/json-storage.test.ts (new)
