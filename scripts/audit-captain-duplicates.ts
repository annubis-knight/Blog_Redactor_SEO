/**
 * Audit ponctuel : liste les captain_explorations par article + détecte les
 * articles dont la `validationHistory` (côté DB) contient des keywords qui
 * pourraient ressembler à des doublons de variantes (ex. "creation site web"
 * et "creation site web entreprise" coexistent sur le même article — ce
 * n'est PAS techniquement un doublon mais ça gonfle la radar-list).
 *
 * Usage : node --env-file=.env --import=tsx/esm scripts/audit-captain-duplicates.ts
 */
import { pool } from '../server/db/client.js'

async function main() {
  const articleRes = await pool.query<{ id: number; titre: string; captain_keyword_locked: string | null }>(`
    SELECT id, titre, captain_keyword_locked
    FROM articles
    WHERE titre ILIKE '%toulouse%' OR titre ILIKE '%creation%' OR titre ILIKE '%cr%C3%A9ation%'
    ORDER BY id
  `)
  console.log('\n=== Articles candidats ===')
  for (const row of articleRes.rows) {
    console.log(`  id=${row.id}  captainLocked=${row.captain_keyword_locked ?? '(null)'}`)
    console.log(`    titre="${row.titre}"`)
  }

  const captainRes = await pool.query<{ article_id: number; keyword: string; status: string; explored_at: string; locked_at: string | null }>(`
    SELECT article_id, keyword, status, explored_at, locked_at
    FROM captain_explorations
    ORDER BY article_id, explored_at
  `)
  const byArticle = new Map<number, typeof captainRes.rows>()
  for (const row of captainRes.rows) {
    if (!byArticle.has(row.article_id)) byArticle.set(row.article_id, [])
    byArticle.get(row.article_id)!.push(row)
  }
  console.log('\n=== captain_explorations par article ===')
  for (const [aid, rows] of [...byArticle.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`\n  article ${aid} : ${rows.length} entries`)
    for (const r of rows) {
      console.log(`    - "${r.keyword}" status=${r.status} locked_at=${r.locked_at ? 'YES' : 'no'}`)
    }
  }

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
