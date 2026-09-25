/**
 * AUTHORITY: PostgreSQL `articles` (titre, type, cocoon_id) + `article_keywords.capitaine`
 * READS FROM: les autres articles du cocon d'un article
 * WRITES TO: rien
 * CONSUMERS: porte `hn-lock` (gate.service, recoupements d'un pilier),
 *            POST /keywords/:keyword/ai-hn-structure (`{{cocoon_articles}}`)
 * RELATED FR: FR-HN-TAB, FR-HN-LOCK-GATE
 *
 * Un pilier qui ignore ses enfants traite tout en profondeur (le 1013) : la
 * structure et sa porte voient donc les autres articles du cocon.
 */
import { pool } from '../../db/client.js'
import { articleTypeDbToLevel } from '../../../shared/utils/article-level.js'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types.js'

export interface CocoonSibling {
  title: string
  level: ArticleLevel
  captain: string | null
}

export async function getCocoonSiblings(articleId: number): Promise<CocoonSibling[]> {
  const res = await pool.query(
    `SELECT a.titre, a.type, ak.capitaine
     FROM articles me
     JOIN articles a ON a.cocoon_id = me.cocoon_id AND a.id <> me.id
     LEFT JOIN article_keywords ak ON ak.article_id = a.id
     WHERE me.id = $1 AND me.cocoon_id IS NOT NULL
     ORDER BY a.id`,
    [articleId],
  )
  return res.rows.map(r => ({
    title: r.titre as string,
    level: articleTypeDbToLevel(r.type as string),
    captain: (r.capitaine as string | null)?.trim() || null,
  }))
}

/** Les autres articles du cocon, rédigés pour un prompt (`{{cocoon_articles}}`). */
export function describeCocoonSiblings(siblings: CocoonSibling[]): string {
  return siblings
    .map(s => `- ${s.title} (${s.level}${s.captain ? `, mot-clé « ${s.captain} »` : ''})`)
    .join('\n')
}
