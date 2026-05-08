> ⚠️ **ARCHIVED — HISTORICAL SPEC (do not use as current source of truth)**
>
> Ce document est une spec de planification historique (2026-03 / 2026-04) implémentée depuis.
> Il peut diverger de l'état actuel du code. Pour connaître l'état livré, consulter :
> `_bmad-output/planning-artifacts/prd.md`, `architecture.md`, `epics.md`, et le code (`src/`, `server/`, `shared/`).
> Voir `CLAUDE.md` à la racine pour les règles complètes.

---
title: 'Migration Stockage JSON → PostgreSQL'
slug: 'migration-json-to-postgresql'
created: '2026-04-18'
status: 'implementation-complete'
stepsCompleted: [0, 1, 2, 3, 4, 5, 6]
tech_stack:
  - 'Node.js + TypeScript (tsx)'
  - 'Express 5.2.1'
  - 'Vue 3 + Pinia (frontend — non modifié)'
  - 'Zod (validation schémas)'
  - 'pg / node-postgres (à installer)'
  - 'dotenv (à installer pour .env)'
files_to_modify:
  - 'package.json'
  - '.env (CRÉER — credentials PG)'
  - 'server/db/client.ts (CRÉER)'
  - 'server/db/migrations/001_initial_schema.sql (CRÉER)'
  - 'server/db/seed.ts (CRÉER)'
  - 'server/db/cache-helpers.ts (CRÉER)'
  - 'server/services/infra/data.service.ts'
  - 'server/services/article/article-content.service.ts'
  - 'server/services/article/linking.service.ts'
  - 'server/services/strategy/strategy.service.ts'
  - 'server/services/strategy/theme-config.service.ts'
  - 'server/services/keyword/semantic-field.service.ts'
  - 'server/services/infra/paa-cache.service.ts'
  - 'server/services/infra/radar-cache.service.ts'
  - 'server/services/infra/discovery-cache.service.ts'
  - 'server/services/infra/local-entities.service.ts'
  - 'server/services/external/dataforseo.service.ts'
  - 'server/services/intent/intent.service.ts'
  - 'server/services/keyword/autocomplete.service.ts'
  - 'server/services/keyword/suggest.service.ts'
  - 'server/services/keyword/keyword-radar.service.ts'
  - 'server/services/keyword/keyword-discovery.service.ts'
  - 'server/services/article/content-gap.service.ts'
  - 'server/services/intent/community-discussions.service.ts'
  - 'server/services/strategy/local-seo.service.ts'
  - 'server/utils/json-storage.ts (SUPPRIMER)'
  - 'server/utils/cache.ts (SUPPRIMER)'
  - 'server/index.ts'
code_patterns:
  - 'Services utilisent readJson/writeJson — remplacer par requêtes pg pool'
  - 'Caches services : memoryCache Map + slugify + isValid(expiresAt) — remplacer par table api_cache'
  - 'data.service.ts : in-memory cachedXxx variables + read-modify-write BDD entière — remplacer par CRUD SQL atomiques'
  - 'strategy.service.ts : fichier par article id → ligne dans article_strategies'
  - 'article-content.service.ts : fichier par slug → ligne dans article_content'
  - 'Toutes les fonctions restent async/await — garder le pattern'
  - 'Zod validations conservées — garder les appels schema.parse()'
  - 'Credentials PG via process.env — jamais hardcodés'
test_patterns:
  - 'Tests dans /tests/ avec vitest — hors scope cette spec'
---

# Tech-Spec: Migration Stockage JSON → PostgreSQL

**Created:** 2026-04-18

## Overview

### Problem Statement

Le projet stocke toutes ses données persistantes dans des fichiers JSON répartis en 3 couches :
- **Master DBs** : `BDD_Articles_Blog.json` (37 KB), `BDD_Mots_Clefs_SEO.json` (25 KB), `article-keywords.json` (192 KB) — chaque mise à jour unitaire force la réécriture du fichier entier
- **Per-item files** : `data/strategies/{id}.json`, `data/articles/{slug}.json`, `data/links/linking-matrix.json`, `article-micro-context.json`, `article-semantic-fields.json` — prolifération de fichiers, aucune requête cross-article possible
- **Caches** : `data/cache/paa/`, `data/cache/serp/`, `data/cache/radar/`, `data/cache/discovery/`, `data/cache/autocomplete/`, `data/cache/suggest/`, `data/cache/validate/`, `data/cache/discussions/` — centaines de fichiers, TTL géré manuellement avec logique dupliquée dans chaque service

Les variables in-memory (`cachedCocoons`, `cachedKeywords`, etc.) dans `data.service.ts` dupliquent la logique de cache. Le pattern Read-Modify-Write sur les master DBs est fragile malgré les mutex.

### Solution

Migrer l'ensemble du stockage vers une base PostgreSQL dédiée (`blog_redactor_seo`) sur `localhost:5432`. Créer un module `server/db/` avec pool de connexions et fonctions CRUD typées par domaine. Les caches utilisent une table `api_cache` avec `expires_at` natif et un job de purge périodique. Supprimer `json-storage.ts`, `cache.ts` et tous les in-memory caches manuels.

**Les contrats API REST restent identiques** — le frontend n'est pas touché.

### Scope

**In Scope :**
- Phase 1 : Créer DB + pool + tables SQL (13 tables) + triggers + index
- Phase 2 : Script de migration one-shot (JSON → PG)
- Phase 3 : Réécriture `data.service.ts` (master DBs)
- Phase 4 : Réécriture per-item files (strategies, article-content, linking, micro-context, semantic-fields)
- Phase 5 : Réécriture caches (PAA, SERP, radar, discovery, autocomplete, suggest, validate, discussions, local-seo)
- Phase 6 : Nettoyage final (suppression JSON + code mort)

**Out of Scope :**
- Modifications frontend / stores Pinia (contrats API inchangés)
- Données GSC / DataForSEO (externes, non persistées localement)
- Tests automatisés
- Gestion multi-utilisateurs / auth
- ORM (on utilise `pg` directement)

---

## Context for Development

### Codebase Patterns

**Pattern 1 — Read-Modify-Write → remplacé par UPDATE atomique**
```typescript
// AVANT (data.service.ts)
const raw = await readJson(BDD_FILE)
raw.silos[x].cocons[y].articles.push(newArticle)
await writeJson(BDD_FILE, raw)

// APRÈS
await pool.query('INSERT INTO articles (...) VALUES ($1, $2, ...)', [...])
```

**Pattern 2 — Cache services → table api_cache unifiée**
- `memoryCache = new Map<string, T>()` → supprimer entièrement
- `slugify(seed)` pour la clé → colonne `cache_key TEXT`
- `isValid(entry)` via `expiresAt` → `WHERE expires_at > NOW()`
- `load/save/clear` → `getCached / setCached / deleteCached` (cache-helpers.ts)

**Pattern 3 — Per-item files → lignes PG**
```typescript
// AVANT (strategy.service.ts)
await readJson(join(STRATEGIES_DIR, `${id}.json`))
await writeJson(join(STRATEGIES_DIR, `${id}.json`), merged)

// APRÈS
await pool.query('SELECT data FROM article_strategies WHERE article_id = $1', [id])
await pool.query(`INSERT INTO article_strategies (article_id, data, ...) VALUES (...)
  ON CONFLICT (article_id) DO UPDATE SET data = $2, updated_at = NOW()`, [...])
```

**Pattern 4 — In-memory caches supprimés**
Variables `cachedCocoons`, `cachedKeywords`, `cachedTheme`, `memoryCache Map` → supprimer entièrement.

**Pattern 5 — Reconstruction structure imbriquée depuis JOIN**
`loadArticlesDb()` retourne `CocoonWithArticles[]`. Depuis SQL, regrouper les résultats du JOIN avec un `reduce` :
```typescript
const rows = await pool.query(`
  SELECT s.nom as silo_nom, s.description as silo_desc,
         c.id as cocoon_id, c.nom as cocoon_nom,
         a.*
  FROM silos s
  JOIN cocoons c ON c.silo_id = s.id
  LEFT JOIN articles a ON a.cocoon_id = c.id
  ORDER BY s.id, c.id, a.id
`)
// Regrouper rows → silos[] → cocons[] → articles[] via Map
```

**Pattern 6 — Insertion JSONB**
Toujours passer un objet JS (pas `JSON.stringify`) aux colonnes JSONB — `pg` sérialise automatiquement :
```typescript
// CORRECT
await pool.query('INSERT INTO api_cache (data) VALUES ($1)', [myObject])
// INCORRECT — risque d'erreur driver
await pool.query('INSERT INTO api_cache (data) VALUES ($1)', [JSON.stringify(myObject)])
```

**Règle d'extraction de slug :**
Les slugs dans `BDD_Articles_Blog.json` sont des URLs complètes (`https://blog.propulsitetoulouse.website/pages/mon-slug`). Règle de normalisation **déterministe** :
```typescript
function extractSlug(rawSlug: string): string {
  // Si URL complète → prendre le dernier segment de path
  try {
    const url = new URL(rawSlug)
    return url.pathname.split('/').filter(Boolean).pop() ?? rawSlug
  } catch {
    // Déjà un slug court → retourner tel quel
    return rawSlug
  }
}
```
Cette fonction est utilisée à la fois dans le seed ET dans `getArticleBySlug()` pour garantir la cohérence.

**Conventions :**
- Toutes les fonctions restent `async/await`
- TypeScript strict — garder les types existants (ArticleStrategy, ThemeConfig, etc.)
- Zod validations conservées sur les données en entrée
- `log.debug/info/error` depuis `server/utils/logger.ts`
- Signatures publiques des services inchangées
- Credentials PG **toujours** via `process.env`, jamais hardcodés
- `slugify` consolidé dans `server/db/cache-helpers.ts` — les services cache n'importent plus depuis `dataforseo.service.ts`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `server/utils/json-storage.ts` | À SUPPRIMER après Phase 3-5 |
| `server/utils/cache.ts` | À SUPPRIMER après Phase 5 |
| `server/services/infra/data.service.ts` | Service central 998 lignes — réécriture complète |
| `server/services/article/article-content.service.ts` | Per-item file pour contenu article (outline JSONB + HTML) |
| `server/services/article/linking.service.ts` | Matrice liens internes (`data/links/linking-matrix.json`) |
| `server/services/strategy/strategy.service.ts` | Per-item files `data/strategies/{id}.json` |
| `server/services/strategy/theme-config.service.ts` | `theme-config.json` — utilise readFileSync synchrone (anomalie) |
| `server/services/keyword/semantic-field.service.ts` | `article-semantic-fields.json` — un seul fichier pour tous |
| `server/services/infra/paa-cache.service.ts` | Cache PAA + reverse index JSON séparé |
| `server/services/infra/radar-cache.service.ts` | Cache radar 7j TTL + memoryCache Map |
| `server/services/infra/discovery-cache.service.ts` | Cache discovery 7j TTL + memoryCache Map |
| `server/index.ts` | Point d'entrée Express — ajouter init DB + pool error handler |
| `data/BDD_Articles_Blog.json` | Master DB : `theme + silos[] → cocons[] → articles[]` (slugs = URLs complètes) |
| `data/BDD_Mots_Clefs_SEO.json` | Master DB keywords |
| `data/article-keywords.json` | 192 KB — enrichissements capitaine/lieutenants/lexique par article |
| `data/strategies/*.json` | Per-item stratégies (par article id numérique) |
| `data/articles/*.json` | Per-item contenu articles (outline stringifié + HTML + meta) |
| `package.json` | Ajouter `pg`, `@types/pg`, `dotenv` |

### Technical Decisions

1. **Pas d'ORM** : `pg` (node-postgres) directement — SQL explicite, contrôle total.
2. **Pool unique** : `server/db/client.ts` exporte un `Pool` singleton. L'event `error` du pool est géré pour éviter le crash process Node.js.
3. **JSONB pour données semi-structurées** : `outline`, `content` HTML, `cta` objet, `scan_result`, listes keywords discovery. Passer toujours un objet JS (jamais `JSON.stringify`) à `pg`.
4. **Table `api_cache` unifiée** : colonne `cache_type` discrimine PAA / SERP / radar / autocomplete / etc. Un job de purge `setInterval` tourne toutes les heures pour supprimer les entrées expirées.
5. **Seed one-shot avec option reset** : `server/db/seed.ts` supporte deux modes — `--mode=insert` (ON CONFLICT DO NOTHING, défaut) et `--mode=reset` (TRUNCATE + INSERT pour corriger les données en cas de besoin).
6. **Suppression in-memory caches** : PostgreSQL buffer cache remplace `cachedCocoons`, `memoryCache Map`, etc.
7. **Credentials via `.env`** : `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`. Fichier `.env` ajouté à `.gitignore`.
8. **`slugify` consolidé** dans `server/db/cache-helpers.ts` — source unique pour toutes les clés de cache. Supprime le couplage inter-domaine avec `dataforseo.service.ts`.
9. **Trigger `updated_at`** : Une fonction PostgreSQL `set_updated_at()` + trigger sur toutes les tables avec `updated_at` — plus besoin de passer `updated_at = NOW()` manuellement.
10. **`getArticleBySlug` : match exact** `WHERE slug = $1` — pas de LIKE. La fonction `extractSlug()` normalise en amont dans le seed ET dans les routes.

---

## Implementation Plan

### Tasks

---

#### PHASE 0 — Pré-requis & configuration sécurisée

- [ ] **Tâche 0.1 : Créer le fichier `.env` et sécuriser les credentials**
  - Fichier : `.env` (à la racine du projet)
  - Action : Créer `.env` avec les variables PG. Vérifier que `.gitignore` contient déjà `.env` (si non, l'ajouter).
  - Contenu `.env` :
    ```
    PG_HOST=localhost
    PG_PORT=5432
    PG_USER=postgres
    PG_PASSWORD=Gght-101010
    PG_DATABASE=blog_redactor_seo
    ```
  - Action : Installer dotenv : `npm install dotenv`
  - Notes : `.env` ne doit **jamais** être commité. Créer aussi `.env.example` avec les clés vides pour documentation.

- [ ] **Tâche 0.2 : Créer la base de données PostgreSQL**
  - Action manuelle (une seule fois) :
    ```bash
    psql -U postgres -c "CREATE DATABASE blog_redactor_seo;"
    ```
  - Prérequis : PostgreSQL installé et accessible sur `localhost:5432`. Si PostgreSQL n'est pas installé, l'installer via le package officiel ou Docker : `docker run --name pg-blog -e POSTGRES_PASSWORD=Gght-101010 -p 5432:5432 -d postgres:16`

---

#### PHASE 1 — Infrastructure DB

- [ ] **Tâche 1.1 : Installer les dépendances**
  - Fichier : `package.json`
  - Action : `npm install pg && npm install -D @types/pg`
  - Résultat : `"pg"` dans `dependencies`, `"@types/pg"` dans `devDependencies`

- [ ] **Tâche 1.2 : Créer le pool de connexions PostgreSQL**
  - Fichier : `server/db/client.ts` (nouveau)
  - Action : Créer et exporter un `Pool` configuré depuis `process.env`. Gérer l'event `error` du pool. Exporter un helper `query()`.
  - Contenu :
    ```typescript
    import 'dotenv/config'
    import pg from 'pg'
    const { Pool } = pg

    export const pool = new Pool({
      host: process.env.PG_HOST ?? 'localhost',
      port: Number(process.env.PG_PORT ?? 5432),
      user: process.env.PG_USER ?? 'postgres',
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE ?? 'blog_redactor_seo',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    // Évite le crash process Node.js sur erreur pool idle
    pool.on('error', (err) => {
      console.error('Unexpected PG pool error:', err)
    })

    export async function query<T = unknown>(
      text: string,
      params?: unknown[]
    ): Promise<pg.QueryResult<T>> {
      return pool.query<T>(text, params)
    }
    ```

- [ ] **Tâche 1.3 : Créer le schéma SQL complet (13 tables + triggers + index)**
  - Fichier : `server/db/migrations/001_initial_schema.sql` (nouveau)
  - Action : Écrire et exécuter : `psql -U postgres -d blog_redactor_seo -f server/db/migrations/001_initial_schema.sql`
  - Contenu SQL :
    ```sql
    -- =====================================================
    -- Trigger function pour updated_at automatique
    -- =====================================================
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- =====================================================
    -- TABLE: theme_config (1 seule ligne)
    -- =====================================================
    CREATE TABLE IF NOT EXISTS theme_config (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE OR REPLACE TRIGGER theme_config_updated_at
      BEFORE UPDATE ON theme_config
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    -- =====================================================
    -- TABLE: silos
    -- =====================================================
    CREATE TABLE IF NOT EXISTS silos (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- =====================================================
    -- TABLE: cocoons
    -- =====================================================
    CREATE TABLE IF NOT EXISTS cocoons (
      id SERIAL PRIMARY KEY,
      silo_id INTEGER NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
      nom TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- =====================================================
    -- TABLE: articles
    -- =====================================================
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY,
      cocoon_id INTEGER REFERENCES cocoons(id) ON DELETE SET NULL,
      titre TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('Pilier', 'Intermédiaire', 'Spécialisé')),
      slug TEXT UNIQUE NOT NULL,
      topic TEXT,
      status TEXT DEFAULT 'à rédiger',
      phase TEXT DEFAULT 'proposed',
      seo_score NUMERIC,
      geo_score NUMERIC,
      meta_title TEXT,
      meta_description TEXT,
      completed_checks TEXT[] DEFAULT '{}',
      check_timestamps JSONB DEFAULT '{}',
      validation_history JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE OR REPLACE TRIGGER articles_updated_at
      BEFORE UPDATE ON articles
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    -- =====================================================
    -- TABLE: article_content (séparé pour les gros champs)
    -- =====================================================
    CREATE TABLE IF NOT EXISTS article_content (
      article_id INTEGER PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
      outline JSONB,
      content TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE OR REPLACE TRIGGER article_content_updated_at
      BEFORE UPDATE ON article_content
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    -- =====================================================
    -- TABLE: keywords_seo
    -- =====================================================
    CREATE TABLE IF NOT EXISTS keywords_seo (
      id SERIAL PRIMARY KEY,
      cocoon_name TEXT,
      mot_clef TEXT NOT NULL,
      type_mot_clef TEXT,
      statut TEXT DEFAULT 'suggested',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- =====================================================
    -- TABLE: article_keywords
    -- =====================================================
    CREATE TABLE IF NOT EXISTS article_keywords (
      article_id INTEGER PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
      capitaine TEXT,
      lieutenants TEXT[] DEFAULT '{}',
      lexique TEXT[] DEFAULT '{}',
      hn_structure JSONB,
      validation_history JSONB DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE OR REPLACE TRIGGER article_keywords_updated_at
      BEFORE UPDATE ON article_keywords
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    -- =====================================================
    -- TABLE: article_strategies
    -- =====================================================
    CREATE TABLE IF NOT EXISTS article_strategies (
      article_id INTEGER PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      completed_steps INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE OR REPLACE TRIGGER article_strategies_updated_at
      BEFORE UPDATE ON article_strategies
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    -- =====================================================
    -- TABLE: article_micro_contexts
    -- =====================================================
    CREATE TABLE IF NOT EXISTS article_micro_contexts (
      article_id INTEGER PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
      angle TEXT,
      tone TEXT,
      directives TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE OR REPLACE TRIGGER article_micro_contexts_updated_at
      BEFORE UPDATE ON article_micro_contexts
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    -- =====================================================
    -- TABLE: article_semantic_fields
    -- =====================================================
    CREATE TABLE IF NOT EXISTS article_semantic_fields (
      id SERIAL PRIMARY KEY,
      article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
      term TEXT NOT NULL,
      occurrences INTEGER DEFAULT 0,
      target_count INTEGER DEFAULT 0,
      UNIQUE(article_id, term)
    );

    -- =====================================================
    -- TABLE: internal_links
    -- =====================================================
    CREATE TABLE IF NOT EXISTS internal_links (
      id SERIAL PRIMARY KEY,
      source_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      position TEXT,
      anchor_text TEXT,
      reason TEXT,
      validated_at TIMESTAMPTZ,
      UNIQUE(source_id, target_id, position)
    );

    -- =====================================================
    -- TABLE: local_entities
    -- =====================================================
    CREATE TABLE IF NOT EXISTS local_entities (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      aliases TEXT[] DEFAULT '{}',
      region TEXT
    );

    -- =====================================================
    -- TABLE: api_cache (cache unifié — 9 types)
    -- cache_type values: 'paa', 'paa_reverse_index', 'serp',
    --   'radar', 'discovery', 'autocomplete', 'suggest',
    --   'validate', 'discussions', 'local-seo', 'intent'
    -- =====================================================
    CREATE TABLE IF NOT EXISTS api_cache (
      id SERIAL PRIMARY KEY,
      cache_key TEXT NOT NULL,
      cache_type TEXT NOT NULL,
      data JSONB NOT NULL,
      cached_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      UNIQUE(cache_key, cache_type)
    );

    -- =====================================================
    -- INDEX
    -- =====================================================
    CREATE INDEX IF NOT EXISTS idx_articles_cocoon_id ON articles(cocoon_id);
    CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
    CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
    CREATE INDEX IF NOT EXISTS idx_keywords_seo_cocoon ON keywords_seo(cocoon_name);
    CREATE INDEX IF NOT EXISTS idx_api_cache_key_type ON api_cache(cache_key, cache_type);
    CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);
    CREATE INDEX IF NOT EXISTS idx_internal_links_source ON internal_links(source_id);
    CREATE INDEX IF NOT EXISTS idx_internal_links_target ON internal_links(target_id);
    CREATE INDEX IF NOT EXISTS idx_semantic_fields_article ON article_semantic_fields(article_id);
    ```

- [ ] **Tâche 1.4 : Initialiser la connexion DB et le job de purge au démarrage**
  - Fichier : `server/index.ts`
  - Action 1 : Ajouter `import 'dotenv/config'` **en première ligne** du fichier.
  - Action 2 : Importer `pool` depuis `./db/client.js` et vérifier la connexion au démarrage :
    ```typescript
    pool.query('SELECT 1').then(() => {
      log.info('PostgreSQL connected')
    }).catch((err) => {
      log.error('PostgreSQL connection failed:', err.message)
      // Ne pas crash — le serveur peut démarrer mais loguer l'erreur
    })
    ```
  - Action 3 : Ajouter un job de purge des caches expirés toutes les heures :
    ```typescript
    setInterval(async () => {
      const res = await pool.query('DELETE FROM api_cache WHERE expires_at < NOW()')
      if (res.rowCount > 0) log.debug(`api_cache purge: ${res.rowCount} expired entries deleted`)
    }, 60 * 60 * 1000)
    ```

- [ ] **Tâche 1.5 : Créer les helpers cache partagés**
  - Fichier : `server/db/cache-helpers.ts` (nouveau)
  - Action : Créer les fonctions `getCached`, `setCached`, `deleteCached` et consolider `slugify` (source unique).
  - Contenu :
    ```typescript
    import { query } from './client.js'

    // Source unique de slugify — tous les services cache l'importent ici
    export function slugify(text: string): string {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }

    export async function getCached<T>(
      cacheType: string,
      cacheKey: string
    ): Promise<T | null> {
      const res = await query<{ data: T }>(
        `SELECT data FROM api_cache
         WHERE cache_type = $1 AND cache_key = $2 AND expires_at > NOW()`,
        [cacheType, cacheKey]
      )
      return res.rows[0]?.data ?? null
    }

    export async function setCached<T>(
      cacheType: string,
      cacheKey: string,
      data: T,
      ttlMs: number
    ): Promise<void> {
      const expiresAt = new Date(Date.now() + ttlMs)
      // Passer l'objet JS directement — pg sérialise en JSONB
      await query(
        `INSERT INTO api_cache (cache_type, cache_key, data, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (cache_key, cache_type) DO UPDATE
         SET data = EXCLUDED.data, cached_at = NOW(), expires_at = EXCLUDED.expires_at`,
        [cacheType, cacheKey, data, expiresAt]
      )
    }

    export async function deleteCached(
      cacheType: string,
      cacheKey: string
    ): Promise<void> {
      await query(
        `DELETE FROM api_cache WHERE cache_type = $1 AND cache_key = $2`,
        [cacheType, cacheKey]
      )
    }
    ```

---

#### PHASE 2 — Script de migration des données (JSON → PostgreSQL)

- [ ] **Tâche 2.1 : Créer le script de seed/migration**
  - Fichier : `server/db/seed.ts` (nouveau)
  - Exécution : `npx tsx server/db/seed.ts` (mode insert, défaut) ou `npx tsx server/db/seed.ts --mode=reset` (TRUNCATE + re-insert)
  - Pré-requis : Phase 1 complète (tables créées)
  - Fonction de normalisation de slug (réutilisée dans les services après migration) :
    ```typescript
    function extractSlug(rawSlug: string): string {
      try {
        const url = new URL(rawSlug)
        return url.pathname.split('/').filter(Boolean).pop() ?? rawSlug
      } catch {
        return rawSlug // déjà un slug court
      }
    }
    ```
  - Migrations dans l'ordre (avec log de progression) :
    1. **theme_config** ← `data/theme-config.json` → INSERT ON CONFLICT (id) DO NOTHING
    2. **silos** ← `BDD_Articles_Blog.json → silos[]` → INSERT, stocker map `nomSilo → id`
    3. **cocoons** ← `silos[].cocons[]` → INSERT avec `silo_id` résolu, stocker map `nomCocon → id`
    4. **articles** ← `articles[]` → slug normalisé via `extractSlug()`, INSERT avec `cocoon_id` résolu, batch de 50
    5. **keywords_seo** ← `data/BDD_Mots_Clefs_SEO.json` → INSERT batch de 50
    6. **article_keywords** ← `data/article-keywords.json` → `keywords_par_article[]` avec `articleId`, INSERT batch de 50
    7. **article_content** ← `data/articles/*.json` → `outline` parsé si string, INSERT par fichier
    8. **article_strategies** ← `data/strategies/*.json` → INSERT par fichier (`{id}.json` → `article_id = parseInt(filename)`)
    9. **article_micro_contexts** ← `data/article-micro-context.json` → résoudre `slug` → `article_id` via lookup
    10. **article_semantic_fields** ← `data/article-semantic-fields.json` → INSERT batch `(article_id, term, occurrences, target_count)` ON CONFLICT DO UPDATE
    11. **internal_links** ← `data/links/linking-matrix.json → links[]` → INSERT batch
    12. **local_entities** ← `data/local-entities.json` → INSERT batch
  - Fin : Afficher les counts par table. En mode reset, utiliser une transaction pour TRUNCATE en cascade.
  - Notes : `article_keywords.json` pèse 192 KB — utiliser des transactions de 50 rows. En cas d'erreur partielle sur un batch, logger le batch échoué et continuer (ne pas interrompre le seed entier).

---

#### PHASE 3 — Réécriture de `data.service.ts`

- [ ] **Tâche 3.1 : Réécrire `data.service.ts` — fonctions articles et cocoons**
  - Fichier : `server/services/infra/data.service.ts`
  - Action : Supprimer `readJson`/`writeJson`, supprimer les variables in-memory `cachedCocoons`, `cachedTheme`, `cachedSilos`, `cachedArticleKeywords`, `cachedMicroContexts`. Garder les signatures exportées identiques.
  - Fonctions et SQL :
    - `loadArticlesDb()` → JOIN `silos + cocoons + articles` → reconstruire `CocoonWithArticles[]` via `Map` (regroupement par cocoon_id)
    - `getArticleById(id)` → `SELECT * FROM articles WHERE id = $1`
    - `getArticleBySlug(slug)` → `SELECT * FROM articles WHERE slug = $1` — **match exact uniquement** (plus de LIKE)
    - `updateArticleStatus(id, status)` → `UPDATE articles SET status = $1 WHERE id = $2` (trigger gère `updated_at`)
    - `addArticlesToCocoon(cocoonName, newArticles)` → résoudre `cocoon_id`, INSERT batch ON CONFLICT (slug) DO NOTHING
    - `removeArticleFromCocoon(articleId)` → `UPDATE articles SET cocoon_id = NULL WHERE id = $1` — **note** : l'article reste en DB avec `cocoon_id = NULL` ; toutes les requêtes qui listent les articles d'un cocon doivent filtrer `WHERE cocoon_id IS NOT NULL`
    - `getArticleProgress(id)` → `SELECT phase, completed_checks, check_timestamps FROM articles WHERE id = $1`
    - `saveArticleProgress(id, progress)` → `UPDATE articles SET phase = $1 WHERE id = $2`
    - `addArticleCheck(id, check)` → `UPDATE articles SET completed_checks = array_append(completed_checks, $1) WHERE id = $2`
    - `removeArticleCheck(id, check)` → `UPDATE articles SET completed_checks = array_remove(completed_checks, $1) WHERE id = $2`
    - `getCocoons()` → `SELECT c.*, s.nom as silo_nom FROM cocoons c JOIN silos s ON s.id = c.silo_id`
    - `getCocoonsBySilo(siloName)` → `SELECT c.* FROM cocoons c JOIN silos s ON s.id = c.silo_id WHERE s.nom = $1`
    - `addCocoonToSilo(siloName, cocoonName)` → résoudre `silo_id`, `INSERT INTO cocoons (silo_id, nom) VALUES (...)`
    - `computeStats()` → deux requêtes COUNT GROUP BY : une par `type`, une par `status` → reconstruire l'objet attendu par les callers (vérifier le type de retour actuel dans le code avant d'écrire le SQL)
    - `loadArticleMicroContext(slug)` → `SELECT amc.* FROM article_micro_contexts amc JOIN articles a ON a.id = amc.article_id WHERE a.slug = $1`
    - `saveArticleMicroContext(slug, ctx)` → résoudre `article_id` par `slug`, `INSERT INTO article_micro_contexts ... ON CONFLICT (article_id) DO UPDATE`

- [ ] **Tâche 3.2 : Réécrire `data.service.ts` — fonctions keywords**
  - Fichier : `server/services/infra/data.service.ts`
  - Action : Supprimer les accès à `BDD_Mots_Clefs_SEO.json` et `article-keywords.json`. Supprimer `cachedKeywords`.
  - Fonctions et SQL :
    - `loadKeywordsDb()` → `SELECT * FROM keywords_seo ORDER BY id`
    - `addKeyword(kw)` → `INSERT INTO keywords_seo (cocoon_name, mot_clef, type_mot_clef, statut) VALUES ($1, $2, $3, $4) RETURNING *`
    - `replaceKeyword(oldId, newKw)` → `UPDATE keywords_seo SET mot_clef = $1, type_mot_clef = $2 WHERE id = $3`
    - `updateKeywordStatus(id, status)` → `UPDATE keywords_seo SET statut = $1 WHERE id = $2`
    - `deleteKeyword(id)` → `DELETE FROM keywords_seo WHERE id = $1`
    - `getArticleKeywords(slug)` → `SELECT ak.* FROM article_keywords ak JOIN articles a ON a.id = ak.article_id WHERE a.slug = $1`
    - `saveArticleKeywords(slug, kw)` → résoudre `article_id`, `INSERT INTO article_keywords ... ON CONFLICT (article_id) DO UPDATE SET capitaine = $2, lieutenants = $3, lexique = $4, hn_structure = $5`
    - `getArticleKeywordsByCocoon(cocoonName)` → `SELECT ak.* FROM article_keywords ak JOIN articles a ON a.id = ak.article_id JOIN cocoons c ON c.id = a.cocoon_id WHERE c.nom = $1`
    - `getCocoonExistingLieutenants(cocoonName)` → `SELECT DISTINCT unnest(ak.lieutenants) as lieutenant FROM article_keywords ak JOIN articles a ON a.id = ak.article_id JOIN cocoons c ON c.id = a.cocoon_id WHERE c.nom = $1`

---

#### PHASE 4 — Réécriture des services per-item files

- [ ] **Tâche 4.1 : Réécrire `article-content.service.ts`**
  - Fichier : `server/services/article/article-content.service.ts`
  - Fonctions :
    - `getArticleContent(id)` → `SELECT outline, content, updated_at FROM article_content WHERE article_id = $1` — retourner `DEFAULT_CONTENT` si aucune ligne
    - `saveArticleContent(id, updates)` → Si `updates.outline` est une string JSON → parser en objet avant INSERT. `INSERT INTO article_content (article_id, outline, content) VALUES ($1, $2, $3) ON CONFLICT (article_id) DO UPDATE SET outline = COALESCE(EXCLUDED.outline, article_content.outline), content = COALESCE(EXCLUDED.content, article_content.content)`
  - Notes : Passer `outline` comme objet JS (pas string) à `pg` pour la colonne JSONB.

- [ ] **Tâche 4.2 : Réécrire `strategy.service.ts`**
  - Fichier : `server/services/strategy/strategy.service.ts`
  - Fonctions :
    - `getStrategy(id)` → `SELECT data, completed_steps FROM article_strategies WHERE article_id = $1` → si null retourner `null`, sinon `articleStrategySchema.parse(row.data)`
    - `saveStrategy(id, strategy)` → valider avec Zod, puis `INSERT INTO article_strategies (article_id, data, completed_steps) VALUES ($1, $2, $3) ON CONFLICT (article_id) DO UPDATE SET data = EXCLUDED.data, completed_steps = EXCLUDED.completed_steps`
  - Notes : Passer l'objet `merged` directement à pg (JSONB).

- [ ] **Tâche 4.3 : Réécrire `theme-config.service.ts`**
  - Fichier : `server/services/strategy/theme-config.service.ts`
  - Action : Remplacer `readFileSync`/`writeFile` par des requêtes PG async. Corriger l'anomalie synchrone.
  - `getThemeConfig()` → `SELECT data FROM theme_config WHERE id = 1` → si null retourner config par défaut
  - `saveThemeConfig(config)` → valider avec Zod, puis `INSERT INTO theme_config (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`

- [ ] **Tâche 4.4 : Réécrire `semantic-field.service.ts`**
  - Fichier : `server/services/keyword/semantic-field.service.ts`
  - Action : Supprimer la variable `cache` in-memory. Supprimer `loadAll()`.
  - `getField(slug)` → `SELECT asf.term, asf.occurrences, asf.target_count FROM article_semantic_fields asf JOIN articles a ON a.id = asf.article_id WHERE a.slug = $1`
  - `saveField(slug, terms)` → Dans une transaction : `DELETE FROM article_semantic_fields WHERE article_id = $1`, puis INSERT batch
  - `addTerms(slug, newTerms)` → Résoudre `article_id`, puis `INSERT INTO article_semantic_fields (article_id, term, occurrences, target_count) VALUES (...) ON CONFLICT (article_id, term) DO UPDATE SET occurrences = article_semantic_fields.occurrences + EXCLUDED.occurrences, target_count = GREATEST(article_semantic_fields.target_count, EXCLUDED.target_count)` — le `UNIQUE(article_id, term)` est présent dans le schéma (T1.3)

- [ ] **Tâche 4.5 : Réécrire `linking.service.ts`**
  - Fichier : `server/services/article/linking.service.ts`
  - Fonctions :
    - `getMatrix()` → `SELECT * FROM internal_links ORDER BY source_id, target_id` → reconstruire l'objet `LinkingMatrix { links: InternalLink[], updatedAt: string | null }`
    - `saveMatrix(matrix)` → Dans une transaction : DELETE all + INSERT batch
    - `upsertLinks(newLinks)` → `INSERT INTO internal_links (source_id, target_id, position, anchor_text, reason) VALUES (...) ON CONFLICT (source_id, target_id, position) DO UPDATE SET anchor_text = EXCLUDED.anchor_text, reason = EXCLUDED.reason`
    - `detectOrphans()` → **Comportement identique à l'original** : `SELECT a.id, a.slug, a.titre, a.type, c.nom as cocoon_name FROM articles a LEFT JOIN internal_links il ON il.target_id = a.id JOIN cocoons c ON c.id = a.cocoon_id WHERE il.id IS NULL AND a.cocoon_id IS NOT NULL` — tous les articles sans aucun lien entrant (pas de filtre sur le statut de la source, identique à l'original JSON qui listait simplement les IDs sans incoming links)
    - Les fonctions pures (`isValidHierarchyLink`, `getLinksForArticle`, `checkAnchorDiversity`, `findCrossCocoonOpportunities`) → conserver telles quelles, elles n'accèdent pas au stockage

---

#### PHASE 5 — Réécriture des services cache

- [ ] **Tâche 5.1 : Réécrire `paa-cache.service.ts`**
  - Fichier : `server/services/infra/paa-cache.service.ts`
  - Action : Remplacer `readJson`/`writeJson` + supprimer `_reverse-index.json`. Importer `getCached`, `setCached`, `slugify` depuis `server/db/cache-helpers.ts`.
  - `readPaaCache(keyword, depth)` → `getCached<PaaCacheEntry>('paa', slugify(keyword))` → vérifier `cachedDepth >= requiredDepth`
  - `writePaaCache(entry)` → `setCached('paa', slugify(entry.keyword), entry, ttl)` — puis mettre à jour le reverse index : `getCached('paa_reverse_index', 'global')` → modifier en mémoire → `setCached('paa_reverse_index', 'global', updatedIndex, 30 * 24 * 3600 * 1000)`
  - Notes : Le reverse index reste une entrée cache unique. C'est un compromis conscient — il est rarement écrit (seulement lors d'un `writePaaCache`) et jamais lu à haute fréquence. Acceptable pour ce projet mono-utilisateur.

- [ ] **Tâche 5.2 : Réécrire `radar-cache.service.ts`**
  - Fichier : `server/services/infra/radar-cache.service.ts`
  - Action : Supprimer `memoryCache Map`, `isValid()`, `getCachePath()`. Importer `getCached`, `setCached`, `deleteCached`, `slugify` depuis `server/db/cache-helpers.ts`.
  - `checkRadarCache(seed)` → `getCached<RadarCacheData>('radar', slugify(seed))` → si non null → `{ cached: true, cachedAt, keywordCount, globalScore, heatLevel }` sinon `{ cached: false }`
  - `loadRadarCache(seed)` → `getCached<RadarCacheData>('radar', slugify(seed))`
  - `saveRadarCache(data)` → construire `full` avec `cachedAt` + `expiresAt`, puis `setCached('radar', slugify(data.seed), full, CACHE_TTL_MS)`
  - `clearRadarCache(seed)` → `deleteCached('radar', slugify(seed))`

- [ ] **Tâche 5.3 : Réécrire `discovery-cache.service.ts`**
  - Fichier : `server/services/infra/discovery-cache.service.ts`
  - Action : Même pattern que radar. Supprimer `memoryCache Map`.
  - `checkCache(seed)` / `loadCache(seed)` → `getCached('discovery', slugify(seed))`
  - `saveCache(entry)` → `setCached('discovery', slugify(entry.seed), full, CACHE_TTL_MS)`
  - `clearCache(seed)` → `deleteCached('discovery', slugify(seed))`

- [ ] **Tâche 5.4 : Adapter les 9 services cache restants**
  - Fichiers :
    - `server/services/keyword/autocomplete.service.ts` → `cache_type = 'autocomplete'`
    - `server/services/keyword/suggest.service.ts` → `cache_type = 'suggest'`
    - `server/services/keyword/keyword-radar.service.ts` → `cache_type = 'keyword-radar'`
    - `server/services/keyword/keyword-discovery.service.ts` → `cache_type = 'keyword-discovery'`
    - `server/services/article/content-gap.service.ts` → `cache_type = 'content-gap'`
    - `server/services/intent/intent.service.ts` → `cache_type = 'intent'`
    - `server/services/intent/community-discussions.service.ts` → `cache_type = 'discussions'`
    - `server/services/strategy/local-seo.service.ts` → `cache_type = 'local-seo'`
    - `server/services/external/dataforseo.service.ts` → `cache_type = 'dataforseo'` (si cache utilisé)
  - Action pour chaque :
    1. Remplacer l'import de `cache.ts` par `import { getCached, setCached, slugify } from '../../db/cache-helpers.js'`
    2. Remplacer `getOrFetch(cacheDir, key, ttl, fetcher)` par : `const cached = await getCached(TYPE, slugify(key)); if (cached) return cached; const data = await fetcher(); await setCached(TYPE, slugify(key), data, ttl); return data`
    3. Supprimer les variables `const cacheDir = join(...)`

- [ ] **Tâche 5.5 : Réécrire `local-entities.service.ts`**
  - Fichier : `server/services/infra/local-entities.service.ts`
  - `getLocalEntities()` → `SELECT id, name, type, aliases, region FROM local_entities ORDER BY id`
  - `saveLocalEntities(entities)` → Dans une transaction : `DELETE FROM local_entities`, puis INSERT batch

---

#### PHASE 6 — Nettoyage final

- [ ] **Tâche 6.1 : Audit des imports résiduels avant suppression**
  - Action : Exécuter `grep -r "json-storage\|utils/cache\b" server/` et vérifier que 0 résultat.
  - **Ne passer à T6.2 que si 0 import résiduel.**

- [ ] **Tâche 6.2 : Supprimer `json-storage.ts` et `cache.ts`**
  - Fichiers : `server/utils/json-storage.ts`, `server/utils/cache.ts`
  - Action : Supprimer les deux fichiers.

- [ ] **Tâche 6.3 : Dump PostgreSQL avant archivage JSON**
  - Action : **Avant de toucher aux fichiers JSON**, créer un dump PG de sécurité :
    ```bash
    pg_dump -U postgres blog_redactor_seo > data/_backup_pre_cleanup_$(date +%Y%m%d).sql
    ```

- [ ] **Tâche 6.4 : Archiver les fichiers JSON racine**
  - Fichiers spécifiques (pas de glob) : `data/BDD_Articles_Blog.json`, `data/BDD_Mots_Clefs_SEO.json`, `data/article-keywords.json`, `data/article-micro-context.json`, `data/article-semantic-fields.json`, `data/theme-config.json`, `data/local-entities.json`, `data/hierarchy.json`
  - Action : Créer `data/_archive/` et y déplacer **explicitement** ces fichiers un par un (pas de glob `data/*.json` qui manquerait les sous-dossiers).

- [ ] **Tâche 6.5 : Archiver et supprimer les dossiers per-item et cache**
  - Dossiers : `data/strategies/`, `data/articles/`, `data/links/`, `data/cache/`
  - Action : Vérifier d'abord les counts PG vs nombre de fichiers :
    ```bash
    # Compter les fichiers
    ls data/strategies/ | wc -l
    ls data/articles/ | wc -l
    # Comparer avec PG
    psql -U postgres -d blog_redactor_seo -c "SELECT COUNT(*) FROM article_strategies; SELECT COUNT(*) FROM article_content;"
    ```
  - Déplacer dans `data/_archive/` puis supprimer les dossiers vides.

- [ ] **Tâche 6.6 : Nettoyer les imports morts restants**
  - Action : `grep -r "from.*data/" server/` pour détecter tout import direct de fichiers JSON restants. Supprimer ou corriger.

---

### Acceptance Criteria

- [ ] **AC 1** : Given la DB est vide et les JSON existent, when `npx tsx server/db/seed.ts` est exécuté, then 0 erreur, et `SELECT COUNT(*) FROM articles` = nombre d'articles dans `BDD_Articles_Blog.json`, et tous les slugs sont des slugs courts (pas d'URLs `https://`).

- [ ] **AC 2** : Given le serveur est démarré après migration complète, when `GET /api/silos` est appelé, then la réponse a la même structure `{ theme: {...}, silos: [...] }` qu'avant, avec les mêmes silos, cocons et articles.

- [ ] **AC 3** : Given un article id=1, when `PUT /api/articles/1` avec `{ status: 'publié' }` est appelé, then `SELECT status, updated_at FROM articles WHERE id=1` retourne `'publié'` et `updated_at` est une date récente (trigger déclenché).

- [ ] **AC 4** : Given une clé autocomplete non en cache, when l'API autocomplete est appelée deux fois avec la même clé, then le second appel retourne `getCached('autocomplete', key) != null`, et `SELECT COUNT(*) FROM api_cache WHERE cache_type = 'autocomplete'` > 0.

- [ ] **AC 5** : Given des liens internes existent, when `GET /links/matrix` est appelé, then la réponse `{ links: [...], orphans: [...] }` correspond aux données de `internal_links` en PG.

- [ ] **AC 6** : Given `json-storage.ts` et `cache.ts` sont supprimés, when `npx tsc --noEmit` est exécuté, then 0 erreur TypeScript liée à des imports manquants.

- [ ] **AC 7** : Given un article sans stratégie, when `PUT /api/strategies/:id` est appelé puis `GET /api/strategies/:id`, then `SELECT data FROM article_strategies WHERE article_id = :id` retourne les données, et aucun fichier n'est créé dans `data/strategies/`.

- [ ] **AC 8** : Given une entrée cache radar avec `expires_at` dans le passé, when `loadRadarCache(seed)` est appelé, then `getCached` retourne `null` (le `WHERE expires_at > NOW()` filtre l'entrée), et le cache est régénéré par le service.

- [ ] **AC 9** : Given le serveur tourne depuis plus d'une heure, when le job de purge s'exécute, then `SELECT COUNT(*) FROM api_cache WHERE expires_at < NOW()` retourne 0.

---

## Additional Context

### Dependencies

- **PostgreSQL 14+** sur `localhost:5432`. Si non installé : `docker run --name pg-blog -e POSTGRES_PASSWORD=Gght-101010 -p 5432:5432 -d postgres:16`
- **Créer la DB** (une fois) : `psql -U postgres -c "CREATE DATABASE blog_redactor_seo;"`
- **Packages** : `npm install pg dotenv && npm install -D @types/pg`
- **Appliquer le schéma** : `psql -U postgres -d blog_redactor_seo -f server/db/migrations/001_initial_schema.sql`
- **Migrer les données** : `npx tsx server/db/seed.ts`
- **Credentials** : dans `.env` — ne jamais commiter ce fichier

### Testing Strategy

Validation manuelle par phase :
1. **Après T1.3** : `psql -U postgres -d blog_redactor_seo -c "\dt"` → 13 tables listées
2. **Après T2.1** : Comparer les counts PG vs fichiers JSON source
3. **Après Phase 3** : Tester `GET /api/silos`, `GET /api/articles/:id`, `PUT /api/articles/:id/status`
4. **Après Phase 4** : Tester `GET /api/strategies/:id`, `PUT /api/strategies/:id`, `GET /api/articles/:id/content`
5. **Après Phase 5** : Tester les API qui utilisent les caches (autocomplete, radar, PAA)
6. **Après Phase 6** : `npx tsc --noEmit` → 0 erreur

### Notes

**Ordre d'exécution impératif :**
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
**Ne jamais supprimer les JSON avant que le build TypeScript soit propre.**

**Rollback :**
- Jusqu'à Phase 5 : Les JSON originaux sont encore sur le filesystem. Rollback = revert git sur les services modifiés.
- Après Phase 6 : Le dump PG (`data/_backup_pre_cleanup_*.sql`) + `data/_archive/` permettent de restaurer. Rollback = `psql -U postgres -d blog_redactor_seo < backup.sql` + restaurer les fichiers depuis `_archive/`.

**Points d'attention :**
- `computeStats()` : Lire le type de retour actuel dans `data.service.ts` avant d'écrire le SQL GROUP BY — le mapping SQL → objet JS doit être identique.
- `removeArticleFromCocoon` : L'article reste en DB avec `cocoon_id = NULL`. Vérifier que toutes les requêtes `getCocoons()` / `loadArticlesDb()` filtrent `WHERE cocoon_id IS NOT NULL`.
- `slugify` : Maintenant importé depuis `server/db/cache-helpers.ts`. Supprimer les imports depuis `dataforseo.service.ts` dans tous les services cache lors de la Phase 5.
- `dotenv/config` : Importer en première ligne de `server/index.ts` ET de `server/db/seed.ts` pour que `process.env` soit peuplé avant la création du pool.
