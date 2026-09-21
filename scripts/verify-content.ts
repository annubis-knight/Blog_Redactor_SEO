/**
 * Vérifie les LIVRABLES (articles en base) et l'hygiène du dépôt.
 *
 * C'est le pendant « données » de `npm run lint` : chaque défaut corrigé depuis
 * l'audit du 2026-09-19 a ici son contrôle automatique, pour qu'il ne revienne
 * pas en silence. Lancé par `npm run verify`.
 *
 * Trois étages :
 *   1. chaque article rédigé — propreté (content-validators), metas, liens,
 *      qualité SEO (seo-validators) ;
 *   2. les articles entre eux — cannibalisation, ordre de construction du cocon ;
 *   3. le dépôt — articles de test résiduels, sauvegarde, référence des tests,
 *      fichiers `.bak`, clés d'environnement.
 *
 * Usage :
 *   npm run verify:content              # tout
 *   npm run verify:content -- --id=1012 # un article (+ contrôles transverses)
 *
 * Sortie : 0 si aucune erreur (les avertissements n'échouent pas).
 */

import 'dotenv/config'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import {
  validateArticleContent,
  validateArticleMeta,
  validateExportedPage,
  type ContentIssue,
} from '../shared/content-validators.js'
import { keywordCoverage, validateArticleSeo, type SeoLevel } from '../shared/seo-validators.js'

const { Client } = pg

const BACKUP_MAX_AGE_DAYS = 14
const BASELINE_MAX_AGE_DAYS = 30
const REQUIRED_ENV = ['ANTHROPIC_API_KEY', 'DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD', 'PG_DATABASE']

const LEVEL_BY_TYPE: Record<string, SeoLevel> = {
  Pilier: 'pilier',
  Intermédiaire: 'intermediaire',
  Spécialisé: 'specifique',
}

interface ArticleRow {
  id: number
  titre: string
  slug: string
  type: string
  cocoon_id: number | null
  cocoon: string | null
  meta_title: string | null
  meta_description: string | null
  content: string
  capitaine: string | null
  lieutenants: string[] | null
}

const daysSince = (ms: number): number => Math.floor((Date.now() - ms) / 86_400_000)
const warn = (rule: string, message: string): ContentIssue => ({ rule, severity: 'warning', message })
const fail = (rule: string, message: string): ContentIssue => ({ rule, severity: 'error', message })

// ---------------------------------------------------------------------------
// Étage 1 — liens internes du contenu stocké
// ---------------------------------------------------------------------------

/**
 * Le contenu stocké porte trois formes de lien selon l'outil qui l'a écrit :
 * `#article-<id>` (éditeur), `/<slug>` (robot), `/blog/<slug>` (canonique).
 * Chacune doit viser un article rédigé.
 */
function checkInternalLinks(
  html: string,
  written: { slugs: Set<string>; ids: Set<number> },
): ContentIssue[] {
  const issues: ContentIssue[] = []
  const seen = new Set<string>()

  for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/gi)) {
    const href = match[1]!
    if (/^(https?:|mailto:|tel:|\/\/)/i.test(href) || seen.has(href)) continue
    seen.add(href)

    const byId = /^#article-(\d+)$/.exec(href)
    if (byId) {
      if (!written.ids.has(Number(byId[1]))) {
        issues.push(fail('dead-internal-link', `Lien vers l'article #${byId[1]}, qui n'est pas rédigé.`))
      }
      continue
    }
    if (href.startsWith('#')) continue // ancre de sommaire

    const slug = href.replace(/^\/(blog\/)?/, '').replace(/\/$/, '')
    if (!written.slugs.has(slug)) {
      issues.push(fail('dead-internal-link', `Lien vers « ${href} » : article inexistant ou pas encore rédigé.`))
    }
  }
  return issues
}

// ---------------------------------------------------------------------------
// Étage 2 — contrôles transverses
// ---------------------------------------------------------------------------

/** Deux articles rédigés qui visent la même recherche se font concurrence. */
function checkCannibalization(articles: ArticleRow[]): ContentIssue[] {
  const issues: ContentIssue[] = []
  const withKeyword = articles.filter((a) => a.capitaine?.trim())

  for (let i = 0; i < withKeyword.length; i++) {
    for (let j = i + 1; j < withKeyword.length; j++) {
      const a = withKeyword[i]!
      const b = withKeyword[j]!
      const overlap = Math.min(
        keywordCoverage(a.capitaine!, b.capitaine!),
        keywordCoverage(b.capitaine!, a.capitaine!),
      )
      if (overlap >= 0.85) {
        issues.push(
          fail(
            'seo-cannibalization',
            `#${a.id} et #${b.id} visent la même recherche (« ${a.capitaine} » / « ${b.capitaine} »).`,
          ),
        )
      }
    }
  }
  return issues
}

/** Un cocon se construit du haut vers le bas : pas d'enfant publié sans pilier. */
function checkCocoonOrder(articles: ArticleRow[]): ContentIssue[] {
  const issues: ContentIssue[] = []
  const byCocoon = new Map<number, ArticleRow[]>()
  for (const a of articles) {
    if (a.cocoon_id == null) {
      issues.push(fail('article-outside-cocoon', `#${a.id} est rédigé mais rangé dans aucun cocon.`))
      continue
    }
    byCocoon.set(a.cocoon_id, [...(byCocoon.get(a.cocoon_id) ?? []), a])
  }

  for (const members of byCocoon.values()) {
    const hasPillar = members.some((a) => a.type === 'Pilier')
    const children = members.filter((a) => a.type !== 'Pilier')
    if (!hasPillar && children.length > 0) {
      issues.push(
        warn(
          'cocoon-pillar-missing',
          `Cocon « ${members[0]!.cocoon} » : ${children.length} article(s) rédigé(s) sans pilier rédigé.`,
        ),
      )
    }
  }
  return issues
}

// ---------------------------------------------------------------------------
// Étage 2 bis — les pages exportées, livrable final
// ---------------------------------------------------------------------------

const EXPORT_DIR = '_auto-output'

/** `<slug-du-titre>-<id>.html` → id, ou null. */
function exportedId(file: string): number | null {
  const match = /-(\d+)\.html$/.exec(file)
  return match ? Number(match[1]) : null
}

/**
 * Chaque page exportée doit être conforme (un H1, canonique sur le domaine
 * validé, aucun lien mort) et correspondre à un article existant — sinon c'est
 * le fantôme d'un article supprimé, qu'on risquerait de publier.
 */
function checkExports(articles: ArticleRow[]): ContentIssue[] {
  if (!existsSync(EXPORT_DIR)) return []
  const issues: ContentIssue[] = []
  const byId = new Map(articles.map((a) => [a.id, a]))
  const published = articles.map((a) => a.slug)
  const exported = new Set<number>()

  for (const file of readdirSync(EXPORT_DIR).filter((f) => f.endsWith('.html'))) {
    const id = exportedId(file)
    if (id == null || !byId.has(id)) {
      issues.push(warn('export-orphan', `${EXPORT_DIR}/${file} ne correspond à aucun article rédigé.`))
      continue
    }
    exported.add(id)
    const page = readFileSync(join(EXPORT_DIR, file), 'utf8')
    for (const problem of validateExportedPage(page, { publishedSlugs: published })) {
      issues.push({ ...problem, message: `${file} — ${problem.message}` })
    }
  }

  for (const a of articles) {
    if (!exported.has(a.id)) {
      issues.push(warn('export-missing', `#${a.id} est rédigé mais n'a pas de page exportée.`))
    }
  }
  return issues
}

// ---------------------------------------------------------------------------
// Étage 3 — hygiène du dépôt
// ---------------------------------------------------------------------------

function newestMtime(dir: string, pattern: RegExp): number {
  try {
    return readdirSync(dir)
      .filter((f) => pattern.test(f))
      .reduce((max, f) => Math.max(max, statSync(join(dir, f)).mtimeMs), 0)
  } catch {
    return 0
  }
}

function countFiles(dir: string, pattern: RegExp): number {
  if (!existsSync(dir)) return 0
  let count = 0
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) count += countFiles(full, pattern)
    else if (pattern.test(entry)) count++
  }
  return count
}

function checkRepository(): ContentIssue[] {
  const issues: ContentIssue[] = []

  const backup = newestMtime('data', /^_backup_pg_.*\.sql$/)
  if (backup === 0) {
    issues.push(warn('backup-missing', 'Aucune sauvegarde dans data/ — lance « npm run db:backup ».'))
  } else if (daysSince(backup) > BACKUP_MAX_AGE_DAYS) {
    issues.push(warn('backup-stale', `Dernière sauvegarde il y a ${daysSince(backup)} jours — lance « npm run db:backup ».`))
  }

  try {
    const baseline = JSON.parse(readFileSync('tests/.baseline.json', 'utf8')) as { generated_at?: string }
    const age = baseline.generated_at ? daysSince(Date.parse(baseline.generated_at)) : Infinity
    if (age > BASELINE_MAX_AGE_DAYS) {
      issues.push(warn('test-baseline-stale', `Référence des tests vieille de ${age} jours — lance « npm run test:snapshot ».`))
    }
  } catch {
    issues.push(warn('test-baseline-missing', 'Aucune référence de tests — lance « npm run test:snapshot ».'))
  }

  const bak = countFiles('src', /\.bak$/)
  if (bak > 0) {
    issues.push(warn('stray-backup-files', `${bak} fichier(s) .bak dans src/ : d'anciennes versions à supprimer.`))
  }

  const missing = REQUIRED_ENV.filter((key) => !process.env[key])
  if (missing.length > 0) {
    issues.push(warn('env-missing', `Clé(s) absente(s) du .env : ${missing.join(', ')}.`))
  }
  return issues
}

async function checkTestGhosts(client: pg.Client): Promise<ContentIssue[]> {
  const { rows } = await client.query<{ count: string }>(
    `SELECT count(*) FROM articles WHERE slug ~ '^test-[0-9]{10,}-'`,
  )
  const count = Number(rows[0]?.count ?? 0)
  return count === 0 ? [] : [fail('test-ghost-articles', `${count} article(s) de test en base — lance « npm run db:clean-tests ».`)]
}

// ---------------------------------------------------------------------------

function render(title: string, issues: ContentIssue[]): void {
  if (issues.length === 0) {
    console.log(`✓ ${title}`)
    return
  }
  console.log(`  ${title}`)
  for (const i of issues) {
    console.log(`  ${i.severity === 'error' ? '✗' : '!'} [${i.rule}] ${i.message}`)
    if (i.excerpt) console.log(`      « ${i.excerpt} »`)
  }
}

async function main(): Promise<void> {
  const started = Date.now()
  const only = process.argv.filter((a) => a.startsWith('--id=')).map((a) => Number(a.slice(5)))

  const client = new Client({
    host: process.env.PG_HOST ?? 'localhost',
    port: Number(process.env.PG_PORT ?? 5432),
    user: process.env.PG_USER ?? 'postgres',
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE ?? 'blog_redactor_seo',
  })
  await client.connect()

  const all: ContentIssue[] = []
  try {
    const { rows } = await client.query<ArticleRow>(
      `SELECT a.id, a.titre, a.slug, a.type, a.cocoon_id, c.nom AS cocoon,
              a.meta_title, a.meta_description, ac.content,
              ak.capitaine, ak.lieutenants
       FROM articles a
       JOIN article_content ac ON ac.article_id = a.id
       LEFT JOIN cocoons c ON c.id = a.cocoon_id
       LEFT JOIN article_keywords ak ON ak.article_id = a.id
       WHERE length(coalesce(ac.content, '')) > 200
       ORDER BY a.id`,
    )
    const written = { slugs: new Set(rows.map((r) => r.slug)), ids: new Set(rows.map((r) => r.id)) }
    const targets = only.length > 0 ? rows.filter((r) => only.includes(r.id)) : rows

    console.log(`Livrables — ${targets.length} article(s) rédigé(s)\n`)
    for (const a of targets) {
      const issues = [
        ...validateArticleContent(a.content),
        ...validateArticleMeta({ metaTitle: a.meta_title, metaDescription: a.meta_description }),
        ...checkInternalLinks(a.content, written),
        ...validateArticleSeo({
          title: a.titre,
          slug: a.slug,
          level: LEVEL_BY_TYPE[a.type] ?? 'specifique',
          content: a.content,
          metaTitle: a.meta_title,
          metaDescription: a.meta_description,
          capitaine: a.capitaine,
          lieutenants: a.lieutenants ?? [],
          localCity: a.cocoon?.includes('Toulouse') ? 'Toulouse' : null,
        }),
      ]
      all.push(...issues)
      render(`#${a.id} ${a.titre.slice(0, 72)}`, issues)
    }

    const transverse = [...checkCannibalization(rows), ...checkCocoonOrder(rows)]
    all.push(...transverse)
    console.log('')
    render('Cohérence entre articles (cannibalisation, ordre du cocon)', transverse)

    const exports = checkExports(rows)
    all.push(...exports)
    render('Pages exportées (H1, canonique, liens, fantômes)', exports)

    const repo = [...(await checkTestGhosts(client)), ...checkRepository()]
    all.push(...repo)
    render('Hygiène du dépôt (tests, sauvegarde, environnement)', repo)
  } finally {
    await client.end()
  }

  const errors = all.filter((i) => i.severity === 'error').length
  const warnings = all.length - errors
  console.log(`\n${errors} erreur(s), ${warnings} avertissement(s) — ${Date.now() - started} ms.`)
  if (errors > 0) process.exitCode = 1
}

main().catch((err: unknown) => {
  console.error(`✗ Échec : ${(err as Error).message}`)
  process.exitCode = 1
})
