/**
 * Reset le captain_keyword_locked d'un article. Pratique après cleanup
 * de captain_explorations pour repartir d'un état propre.
 *
 * Usage : ARTICLE_ID=64 node --env-file=.env --import=tsx/esm scripts/clear-article-lock.ts
 */
import { pool } from '../server/db/client.js'
const articleId = Number(process.env.ARTICLE_ID)
if (!articleId) { console.error('Missing ARTICLE_ID'); process.exit(1) }
await pool.query(`UPDATE articles SET captain_keyword_locked = NULL WHERE id = $1`, [articleId])
await pool.query(`DELETE FROM article_progress_checks WHERE article_id = $1 AND check_name = 'capitaine_locked'`).catch(() => undefined)
console.log(`Article ${articleId} : captain_keyword_locked → NULL`)
await pool.end()
