/**
 * One-shot script: backfill pain_point + suggested_keyword from cocoon-strategy cache
 * Run: node scripts/backfill-article-fields.cjs
 */
const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT || 5432),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  database: process.env.PG_DATABASE || 'blog_redactor_seo',
})

async function main() {
  const client = await pool.connect()
  try {
    // Read all cocoon-strategy entries from cache
    const cacheRes = await client.query(
      `SELECT cache_key, data FROM api_cache WHERE cache_type = 'cocoon-strategy'`
    )
    console.log(`Found ${cacheRes.rows.length} cocoon-strategy cache entries`)

    let updated = 0
    for (const row of cacheRes.rows) {
      const strategy = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
      const articles = strategy.proposedArticles || []

      for (const article of articles) {
        if (!article.dbId || article.dbId <= 0) continue

        const painPoint = article.painPoint?.trim() || null
        const suggestedKeyword = article.suggestedKeyword?.trim() || null

        if (!painPoint && !suggestedKeyword) continue

        const res = await client.query(
          `UPDATE articles
           SET pain_point = COALESCE(pain_point, $1),
               suggested_keyword = COALESCE(suggested_keyword, $2)
           WHERE id = $3 AND (pain_point IS NULL OR suggested_keyword IS NULL)
           RETURNING id`,
          [painPoint, suggestedKeyword, article.dbId]
        )
        if (res.rowCount > 0) {
          updated++
          console.log(`  Updated article ${article.dbId}: painPoint=${painPoint ? 'yes' : 'no'}, keyword=${suggestedKeyword || 'no'}`)
        }
      }
    }

    console.log(`\nDone. Updated ${updated} articles.`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
