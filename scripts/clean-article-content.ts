/**
 * Répare le contenu d'articles déjà rédigés : retire le texte hors paragraphe
 * (monologue de l'IA, auto-évaluation Markdown) et les fins de bloc tronquées.
 *
 * Pourquoi : le pipeline est corrigé depuis le 2026-09-20, mais les articles
 * rédigés AVANT portent encore ces défauts — et le garde-fou refuse de les
 * exporter. Ce script les répare sans rien régénérer (gratuit, déterministe).
 *
 * Usage :
 *   npm run content:clean -- --id=455                    # simulation
 *   npm run content:clean -- --id=455 --id=456 --confirm # écriture en base
 *
 * Ce script NE touche PAS au fond : les affirmations invérifiables ou les
 * faux cas clients demandent un jugement éditorial, à faire à la main.
 * Prends une sauvegarde avant (`npm run db:backup`).
 */

import 'dotenv/config'
import pg from 'pg'
import { detectAiMetaLeaks } from '../shared/ai-text.js'
import {
  detectOrphanBlockText,
  removeSelfReviewBlocks,
  stripOrphanBlockText,
  trimTruncatedBlocks,
} from '../shared/content-repair.js'

const { Client } = pg

export interface RepairReport {
  html: string
  removedOrphans: string[]
  removedSelfReview: string[]
  trimmedFragments: string[]
  leaksBefore: number
  leaksAfter: number
  orphansAfter: number
}

/**
 * Enchaîne les réparations dans l'ordre utile : texte orphelin, bilans que
 * l'IA s'adresse à elle-même, puis fins de bloc tronquées.
 */
export function repairArticleHtml(original: string): RepairReport {
  const leaksBefore = detectAiMetaLeaks(original, { max: 1000 }).length

  const orphanPass = stripOrphanBlockText(original)
  const reviewPass = removeSelfReviewBlocks(orphanPass.html)
  const trimPass = trimTruncatedBlocks(reviewPass.html)
  const html = trimPass.html
    .replace(/<p>\s*<\/p>/g, '') // paragraphes vidés par la coupe
    .replace(/\n{3,}/g, '\n\n')

  return {
    html,
    removedOrphans: orphanPass.removed,
    removedSelfReview: reviewPass.removed,
    trimmedFragments: trimPass.trimmed,
    leaksBefore,
    leaksAfter: detectAiMetaLeaks(html, { max: 1000 }).length,
    orphansAfter: detectOrphanBlockText(html).length,
  }
}

function parseIds(argv: string[]): number[] {
  return argv
    .filter((a) => a.startsWith('--id='))
    .map((a) => Number(a.slice('--id='.length)))
    .filter((n) => Number.isInteger(n) && n > 0)
}

const short = (s: string, n = 90): string => (s.length > n ? `${s.slice(0, n)}…` : s)

async function main(): Promise<void> {
  const ids = parseIds(process.argv.slice(2))
  const confirm = process.argv.includes('--confirm')
  if (ids.length === 0) {
    console.error('Usage : npm run content:clean -- --id=<articleId> [--id=…] [--confirm]')
    process.exitCode = 1
    return
  }

  const client = new Client({
    host: process.env.PG_HOST ?? 'localhost',
    port: Number(process.env.PG_PORT ?? 5432),
    user: process.env.PG_USER ?? 'postgres',
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE ?? 'blog_redactor_seo',
  })
  await client.connect()

  try {
    for (const id of ids) {
      const { rows } = await client.query<{ titre: string; content: string | null }>(
        `SELECT a.titre, ac.content FROM articles a
         LEFT JOIN article_content ac ON ac.article_id = a.id WHERE a.id = $1`,
        [id],
      )
      const row = rows[0]
      if (!row?.content) {
        console.log(`\n#${id} — introuvable ou sans contenu, ignoré.`)
        continue
      }

      const r = repairArticleHtml(row.content)
      console.log(`\n#${id} — ${row.titre}`)
      console.log(`  Texte hors paragraphe retiré : ${r.removedOrphans.length}`)
      for (const o of r.removedOrphans) console.log(`    − « ${short(o)} »`)
      console.log(`  Auto-évaluation de l'IA retirée : ${r.removedSelfReview.length}`)
      for (const s of r.removedSelfReview) console.log(`    − « ${short(s)} »`)
      console.log(`  Fins de bloc tronquées réparées : ${r.trimmedFragments.length}`)
      for (const t of r.trimmedFragments) console.log(`    ✂ « ${short(t, 70)} »`)
      console.log(`  Monologue détecté : ${r.leaksBefore} → ${r.leaksAfter}`)
      console.log(`  Texte hors paragraphe restant : ${r.orphansAfter}`)
      console.log(`  Taille : ${row.content.length} → ${r.html.length} caractères`)

      if (confirm && r.html !== row.content) {
        await client.query(
          'UPDATE article_content SET content = $1, updated_at = now() WHERE article_id = $2',
          [r.html, id],
        )
        console.log('  ✓ Écrit en base.')
      }
    }

    if (!confirm) {
      console.log('\nSimulation — rien n\'a été écrit. Ajoute --confirm pour appliquer.')
    }
  } finally {
    await client.end()
  }
}

if (process.argv[1]?.includes('clean-article-content')) {
  main().catch((err: unknown) => {
    console.error(`✗ Échec : ${(err as Error).message}`)
    process.exitCode = 1
  })
}
