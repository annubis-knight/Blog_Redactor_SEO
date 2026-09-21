/**
 * Vérifie la qualité des articles présents en base, et l'hygiène du dépôt.
 *
 * C'est le pendant « données » de `npm run lint` : chaque défaut corrigé
 * pendant l'audit du 2026-09-19 a ici son contrôle automatique, pour qu'il ne
 * revienne pas en silence. Lancé par `npm run verify`.
 *
 * Usage :
 *   npm run verify:content              # tous les articles rédigés
 *   npm run verify:content -- --id=455  # un seul
 *
 * Sortie : 0 si aucune erreur (les avertissements n'échouent pas).
 */

import 'dotenv/config'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import {
  validateArticleContent,
  validateArticleMeta,
  type ContentIssue,
} from '../shared/content-validators.js'

const { Client } = pg

/** Au-delà, la sauvegarde est considérée comme trop vieille. */
const BACKUP_MAX_AGE_DAYS = 14

interface ArticleRow {
  id: number
  titre: string
  slug: string
  status: string
  meta_title: string | null
  meta_description: string | null
  content: string | null
}

/** Sauvegarde PostgreSQL la plus récente dans `data/`. */
function checkBackupFreshness(): ContentIssue[] {
  let newest = 0
  try {
    for (const file of readdirSync('data')) {
      if (!/^_backup_pg_.*\.sql$/.test(file)) continue
      newest = Math.max(newest, statSync(join('data', file)).mtimeMs)
    }
  } catch {
    // dossier absent : traité comme aucune sauvegarde
  }

  if (newest === 0) {
    return [
      {
        rule: 'backup-missing',
        severity: 'warning',
        message: 'Aucune sauvegarde dans data/ — lance « npm run db:backup ».',
      },
    ]
  }

  const ageDays = Math.floor((Date.now() - newest) / 86_400_000)
  if (ageDays > BACKUP_MAX_AGE_DAYS) {
    return [
      {
        rule: 'backup-stale',
        severity: 'warning',
        message: `Dernière sauvegarde il y a ${ageDays} jours — lance « npm run db:backup ».`,
      },
    ]
  }
  return []
}

/** Articles fantômes laissés par la suite de tests. */
async function checkTestGhosts(client: pg.Client): Promise<ContentIssue[]> {
  const { rows } = await client.query<{ count: string }>(
    `SELECT count(*) FROM articles WHERE slug ~ '^test-[0-9]{10,}-'`,
  )
  const count = Number(rows[0]?.count ?? 0)
  if (count === 0) return []
  return [
    {
      rule: 'test-ghost-articles',
      severity: 'error',
      message: `${count} article(s) de test en base — lance « npm run db:clean-tests ».`,
    },
  ]
}

/** Liens internes du contenu pointant vers un article qui n'est pas rédigé. */
function checkInternalLinks(html: string, writtenSlugs: Set<string>): ContentIssue[] {
  const issues: ContentIssue[] = []
  const seen = new Set<string>()

  for (const match of html.matchAll(/<a\b[^>]*href="\/([^"#?]+)"[^>]*>/gi)) {
    const slug = match[1]!.replace(/\/$/, '')
    if (seen.has(slug)) continue
    seen.add(slug)
    if (!writtenSlugs.has(slug)) {
      issues.push({
        rule: 'dead-internal-link',
        severity: 'error',
        message: `Lien interne vers « /${slug} » : article inexistant ou pas encore rédigé.`,
      })
    }
  }
  return issues
}

function render(issues: ContentIssue[], indent = '  '): void {
  for (const issue of issues) {
    const icon = issue.severity === 'error' ? '✗' : '!'
    console.log(`${indent}${icon} [${issue.rule}] ${issue.message}`)
    if (issue.excerpt) console.log(`${indent}    « ${issue.excerpt} »`)
  }
}

async function main(): Promise<void> {
  const only = process.argv
    .filter((a) => a.startsWith('--id='))
    .map((a) => Number(a.slice('--id='.length)))

  const client = new Client({
    host: process.env.PG_HOST ?? 'localhost',
    port: Number(process.env.PG_PORT ?? 5432),
    user: process.env.PG_USER ?? 'postgres',
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE ?? 'blog_redactor_seo',
  })
  await client.connect()

  let errors = 0
  let warnings = 0
  const count = (issues: ContentIssue[]): void => {
    errors += issues.filter((i) => i.severity === 'error').length
    warnings += issues.filter((i) => i.severity === 'warning').length
  }

  try {
    const { rows } = await client.query<ArticleRow>(
      `SELECT a.id, a.titre, a.slug, a.status, a.meta_title, a.meta_description, ac.content
       FROM articles a JOIN article_content ac ON ac.article_id = a.id
       WHERE length(coalesce(ac.content, '')) > 200
       ORDER BY a.id`,
    )
    const written = new Set(rows.map((r) => r.slug))
    const targets = only.length > 0 ? rows.filter((r) => only.includes(r.id)) : rows

    console.log(`Articles rédigés vérifiés : ${targets.length}\n`)
    for (const article of targets) {
      const issues = [
        ...validateArticleContent(article.content ?? ''),
        ...validateArticleMeta({
          metaTitle: article.meta_title,
          metaDescription: article.meta_description,
        }),
        ...checkInternalLinks(article.content ?? '', written),
      ]
      count(issues)

      if (issues.length === 0) {
        console.log(`✓ #${article.id} ${article.titre.slice(0, 70)}`)
      } else {
        console.log(`  #${article.id} ${article.titre.slice(0, 70)}`)
        render(issues)
      }
    }

    const repo = [...(await checkTestGhosts(client)), ...checkBackupFreshness()]
    count(repo)
    if (repo.length > 0) {
      console.log('\nHygiène du dépôt')
      render(repo)
    }
  } finally {
    await client.end()
  }

  console.log(`\n${errors} erreur(s), ${warnings} avertissement(s).`)
  if (errors > 0) process.exitCode = 1
}

main().catch((err: unknown) => {
  console.error(`✗ Échec : ${(err as Error).message}`)
  process.exitCode = 1
})
