/**
 * Phase 0 — Slug-to-ID migration script
 *
 * Converts all slug-based references to numeric IDs across data files.
 *
 * Usage:
 *   npx tsx scripts/migrate-slug-to-id.ts            # dry run (no writes)
 *   npx tsx scripts/migrate-slug-to-id.ts --apply     # actually write changes
 */

import { readFile, writeFile, rename, cp, rm, readdir, access } from 'fs/promises'
import { join, basename } from 'path'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = process.cwd()
const DATA_DIR = join(ROOT, 'data')

const FILES = {
  articles: join(DATA_DIR, 'BDD_Articles_Blog.json'),
  keywords: join(DATA_DIR, 'BDD_Mots_Clefs_SEO.json'),
  articleKeywords: join(DATA_DIR, 'article-keywords.json'),
  progress: join(DATA_DIR, 'article-progress.json'),
  statuses: join(DATA_DIR, 'article-statuses.json'),
  microContext: join(DATA_DIR, 'article-micro-context.json'),
  hierarchy: join(DATA_DIR, 'hierarchy.json'),
} as const

const ARTICLES_DIR = join(DATA_DIR, 'articles')
const STRATEGIES_DIR = join(DATA_DIR, 'strategies')
const BACKUP_DIR = join(DATA_DIR, '_backup-pre-migration')
const SLUG_MAP_FILE = join(DATA_DIR, 'slug-to-id-map.json')

const DRY_RUN = !process.argv.includes('--apply')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Replicate extractSlug from server/services/data.service.ts */
function extractSlug(url: string): string {
  const parts = url.split('/pages/')
  return parts[1] || url
}

async function readJson<T = unknown>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function listJsonFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir)
    return entries.filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Types (minimal, matching current data shapes)
// ---------------------------------------------------------------------------

interface RawArticle {
  titre: string
  type: string
  slug: string
  topic: string | null
  id?: number
  createdAt?: string
  updatedAt?: string
}

interface RawCocoon {
  nom: string
  articles: RawArticle[]
}

interface RawSilo {
  nom: string
  description: string
  cocons: RawCocoon[]
}

interface RawArticlesDb {
  theme: { nom: string; description: string }
  silos: RawSilo[]
  _schemaVersion?: number
}

interface ArticleKeywordEntry {
  articleSlug?: string
  articleId?: number
  capitaine: string
  [key: string]: unknown
}

interface ArticleKeywordsDb {
  keywords_par_article: ArticleKeywordEntry[]
  _schemaVersion?: number
}

interface MicroContextEntry {
  slug: string
  id?: number
  [key: string]: unknown
}

interface MicroContextDb {
  micro_contexts: MicroContextEntry[]
  _schemaVersion?: number
}

interface SeoKeyword {
  mot_clef: string
  cocon_seo: string
  type_mot_clef: string
  [key: string]: unknown
}

interface SeoKeywordsDb {
  seo_data: SeoKeyword[]
  _schemaVersion?: number
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60))
  console.log(DRY_RUN ? '  DRY RUN — no files will be modified' : '  APPLY MODE — files WILL be modified')
  console.log('='.repeat(60))
  console.log()

  // ------------------------------------------------------------------
  // Step 0: Backup
  // ------------------------------------------------------------------
  console.log('[Step 0] Backup data/ to data/_backup-pre-migration/')
  if (!DRY_RUN) {
    if (await fileExists(BACKUP_DIR)) {
      console.log('  Backup directory already exists — skipping backup')
    } else {
      await cp(DATA_DIR, BACKUP_DIR, { recursive: true })
      console.log('  Backup created')
    }
  } else {
    console.log('  (skipped in dry run)')
  }
  console.log()

  // ------------------------------------------------------------------
  // Step 1: Read BDD_Articles_Blog.json & assign IDs
  // ------------------------------------------------------------------
  console.log('[Step 1] Read BDD_Articles_Blog.json and assign sequential IDs')
  const articlesDb = await readJson<RawArticlesDb>(FILES.articles)
  const now = new Date().toISOString()
  const slugToId = new Map<string, number>()
  let nextId = 1

  for (const silo of articlesDb.silos) {
    for (const cocoon of silo.cocons) {
      for (const article of cocoon.articles) {
        const normalizedSlug = extractSlug(article.slug)
        article.id = nextId
        article.createdAt = now
        article.updatedAt = now
        slugToId.set(normalizedSlug, nextId)
        console.log(`  [${nextId}] ${normalizedSlug}`)
        nextId++
      }
    }
  }

  articlesDb._schemaVersion = 1
  console.log(`  Total articles: ${slugToId.size}`)
  console.log()

  // ------------------------------------------------------------------
  // Step 2: Update article-keywords.json
  // ------------------------------------------------------------------
  console.log('[Step 2] Update article-keywords.json (articleSlug -> articleId)')
  const articleKeywordsDb = await readJson<ArticleKeywordsDb>(FILES.articleKeywords)

  for (const entry of articleKeywordsDb.keywords_par_article) {
    const slug = entry.articleSlug
    if (slug === undefined) {
      console.log('  WARNING: entry has no articleSlug — skipping')
      continue
    }
    const id = slugToId.get(slug)
    if (id !== undefined) {
      entry.articleId = id
      delete entry.articleSlug
      console.log(`  "${slug}" -> articleId: ${id}`)
    } else {
      console.log(`  WARNING: no mapping for slug "${slug}" — keeping articleSlug as-is`)
    }
  }

  articleKeywordsDb._schemaVersion = 1
  console.log()

  // ------------------------------------------------------------------
  // Step 3: Update article-progress.json
  // ------------------------------------------------------------------
  console.log('[Step 3] Update article-progress.json (slug keys -> id keys)')
  const progressDb = await readJson<Record<string, unknown>>(FILES.progress)
  const newProgressDb: Record<string, unknown> = {}

  for (const [slug, value] of Object.entries(progressDb)) {
    if (slug === '_schemaVersion') continue
    const id = slugToId.get(slug)
    if (id !== undefined) {
      newProgressDb[String(id)] = value
      console.log(`  "${slug}" -> "${id}"`)
    } else {
      console.log(`  WARNING: no mapping for slug "${slug}" — keeping as-is`)
      newProgressDb[slug] = value
    }
  }

  ;(newProgressDb as Record<string, unknown>)._schemaVersion = 1
  console.log()

  // ------------------------------------------------------------------
  // Step 4: Update article-statuses.json
  // ------------------------------------------------------------------
  console.log('[Step 4] Update article-statuses.json (slug keys -> id keys)')
  const statusesDb = await readJson<Record<string, unknown>>(FILES.statuses)
  const newStatusesDb: Record<string, unknown> = {}

  for (const [slug, value] of Object.entries(statusesDb)) {
    if (slug === '_schemaVersion') continue
    const id = slugToId.get(slug)
    if (id !== undefined) {
      newStatusesDb[String(id)] = value
      console.log(`  "${slug}" -> "${id}"`)
    } else {
      console.log(`  WARNING: no mapping for slug "${slug}" — keeping as-is`)
      newStatusesDb[slug] = value
    }
  }

  ;(newStatusesDb as Record<string, unknown>)._schemaVersion = 1
  console.log()

  // ------------------------------------------------------------------
  // Step 5: Update article-micro-context.json
  // ------------------------------------------------------------------
  console.log('[Step 5] Update article-micro-context.json (slug -> id, keep slug for reference)')
  const microContextDb = await readJson<MicroContextDb>(FILES.microContext)

  for (const entry of microContextDb.micro_contexts) {
    const id = slugToId.get(entry.slug)
    if (id !== undefined) {
      entry.id = id
      console.log(`  "${entry.slug}" -> id: ${id} (slug kept for reference)`)
    } else {
      console.log(`  WARNING: no mapping for slug "${entry.slug}" — id not set`)
    }
  }

  microContextDb._schemaVersion = 1
  console.log()

  // ------------------------------------------------------------------
  // Step 6: (removed) article-semantic-fields.json — table dropped in migration 005
  // ------------------------------------------------------------------

  // ------------------------------------------------------------------
  // Step 7: Rename files in data/articles/ from {slug}.json to {id}.json
  // ------------------------------------------------------------------
  console.log('[Step 7] Rename files in data/articles/ (slug.json -> id.json)')
  const articleFiles = await listJsonFiles(ARTICLES_DIR)

  for (const file of articleFiles) {
    const slug = basename(file, '.json')
    const id = slugToId.get(slug)
    if (id !== undefined) {
      const oldPath = join(ARTICLES_DIR, file)
      const newPath = join(ARTICLES_DIR, `${id}.json`)
      console.log(`  ${file} -> ${id}.json`)
      if (!DRY_RUN) {
        await rename(oldPath, newPath)
      }
    } else {
      console.log(`  WARNING: no mapping for file "${file}" — skipping rename`)
    }
  }
  console.log()

  // ------------------------------------------------------------------
  // Step 8: Rename files in data/strategies/ from {slug}.json to {id}.json
  //         Also update slug field inside to id (number)
  // ------------------------------------------------------------------
  console.log('[Step 8] Rename strategy files and update slug -> id inside')
  const strategyFiles = await listJsonFiles(STRATEGIES_DIR)

  for (const file of strategyFiles) {
    const fileSlug = basename(file, '.json')
    // Strategy files may be named with cocoon prefix (e.g., cocoon-xxx.json)
    // Try to find a matching slug directly first
    const id = slugToId.get(fileSlug)
    const oldPath = join(STRATEGIES_DIR, file)

    if (id !== undefined) {
      const newPath = join(STRATEGIES_DIR, `${id}.json`)
      console.log(`  ${file} -> ${id}.json`)

      const strategyData = await readJson<Record<string, unknown>>(oldPath)
      if ('slug' in strategyData) {
        strategyData.id = id
        delete strategyData.slug
        console.log(`    updated slug field -> id: ${id}`)
      }
      if ('cocoonSlug' in strategyData) {
        // Keep cocoonSlug as-is — these are cocoon-level strategies, not article-level
        console.log(`    (cocoonSlug "${strategyData.cocoonSlug}" kept as-is — cocoon-level file)`)
      }

      if (!DRY_RUN) {
        await writeJson(oldPath, strategyData)
        await rename(oldPath, newPath)
      }
    } else {
      console.log(`  No article mapping for "${fileSlug}" — skipping (likely a cocoon-level strategy)`)
    }
  }
  console.log()

  // ------------------------------------------------------------------
  // Step 9: Standardize keyword types in BDD_Mots_Clefs_SEO.json
  // ------------------------------------------------------------------
  console.log('[Step 9] Standardize keyword types in BDD_Mots_Clefs_SEO.json')
  const seoKeywordsDb = await readJson<SeoKeywordsDb>(FILES.keywords)
  let moyenneCount = 0
  let longueCount = 0

  for (const kw of seoKeywordsDb.seo_data) {
    if (kw.type_mot_clef === 'Moyenne traine') {
      kw.type_mot_clef = 'Intermédiaire'
      moyenneCount++
    } else if (kw.type_mot_clef === 'Longue traine') {
      kw.type_mot_clef = 'Spécialisé'
      longueCount++
    }
  }

  seoKeywordsDb._schemaVersion = 1
  console.log(`  "Moyenne traine" -> "Intermédiaire": ${moyenneCount} entries`)
  console.log(`  "Longue traine" -> "Spécialisé": ${longueCount} entries`)
  console.log()

  // ------------------------------------------------------------------
  // Step 10: Delete orphan hierarchy.json
  // ------------------------------------------------------------------
  console.log('[Step 10] Delete orphan file: data/hierarchy.json')
  if (await fileExists(FILES.hierarchy)) {
    if (!DRY_RUN) {
      await rm(FILES.hierarchy)
      console.log('  Deleted hierarchy.json')
    } else {
      console.log('  Would delete hierarchy.json')
    }
  } else {
    console.log('  hierarchy.json not found — nothing to delete')
  }
  console.log()

  // ------------------------------------------------------------------
  // Step 11: Save slug-to-id-map.json
  // ------------------------------------------------------------------
  console.log('[Step 11] Save slug-to-id-map.json for debug/recovery')
  const slugMap: Record<string, number> = {}
  for (const [slug, id] of slugToId.entries()) {
    slugMap[slug] = id
  }
  console.log(`  ${Object.keys(slugMap).length} entries`)

  if (!DRY_RUN) {
    await writeJson(SLUG_MAP_FILE, slugMap)
    console.log('  Saved to data/slug-to-id-map.json')
  }
  console.log()

  // ------------------------------------------------------------------
  // Step 12: Write all modified JSON files
  // ------------------------------------------------------------------
  console.log('[Step 12] Write modified JSON files')

  const writes: Array<{ label: string; path: string; data: unknown }> = [
    { label: 'BDD_Articles_Blog.json', path: FILES.articles, data: articlesDb },
    { label: 'BDD_Mots_Clefs_SEO.json', path: FILES.keywords, data: seoKeywordsDb },
    { label: 'article-keywords.json', path: FILES.articleKeywords, data: articleKeywordsDb },
    { label: 'article-progress.json', path: FILES.progress, data: newProgressDb },
    { label: 'article-statuses.json', path: FILES.statuses, data: newStatusesDb },
    { label: 'article-micro-context.json', path: FILES.microContext, data: microContextDb },
  ]

  for (const w of writes) {
    if (!DRY_RUN) {
      await writeJson(w.path, w.data)
      console.log(`  Wrote ${w.label}`)
    } else {
      console.log(`  Would write ${w.label}`)
    }
  }
  console.log()

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log('='.repeat(60))
  console.log('  MIGRATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`  Articles assigned IDs: ${slugToId.size}`)
  console.log(`  Article keyword entries remapped: ${articleKeywordsDb.keywords_par_article.length}`)
  console.log(`  Progress entries remapped: ${Object.keys(newProgressDb).filter((k) => k !== '_schemaVersion').length}`)
  console.log(`  Status entries remapped: ${Object.keys(newStatusesDb).filter((k) => k !== '_schemaVersion').length}`)
  console.log(`  Micro-context entries updated: ${microContextDb.micro_contexts.length}`)
  console.log(`  Semantic field entries remapped: ${Object.keys(newSemanticFieldsDb).filter((k) => k !== '_schemaVersion').length}`)
  console.log(`  Article files renamed: ${articleFiles.filter((f) => slugToId.has(basename(f, '.json'))).length}`)
  console.log(`  Strategy files renamed: ${strategyFiles.filter((f) => slugToId.has(basename(f, '.json'))).length}`)
  console.log(`  Keyword type standardizations: ${moyenneCount + longueCount}`)
  console.log(`  Schema version set to 1 on: 7 files`)
  console.log()

  if (DRY_RUN) {
    console.log('  This was a DRY RUN. Re-run with --apply to write changes:')
    console.log('    npx tsx scripts/migrate-slug-to-id.ts --apply')
  } else {
    console.log('  Migration APPLIED successfully.')
    console.log('  Backup available at: data/_backup-pre-migration/')
    console.log('  Slug-to-ID map saved at: data/slug-to-id-map.json')
  }
  console.log()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
