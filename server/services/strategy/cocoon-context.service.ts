/**
 * AUTHORITY: aucune — lecture seule de l'arbre du cocon (`articles.parent_id`,
 *            `parent_section`, `completed_checks`), des textes
 *            (`article_content.content`) et des mots-clés (`article_keywords`).
 * READS FROM: getCocoonTree (cocoon-article.service), article_content du parent.
 * WRITES TO: rien.
 * CONSUMERS: `{{cocoon_context}}` — candidats d'un nouvel article (Cerveau,
 *            child-candidates.service), structure Hn (Moteur, ai-hn-structure),
 *            premier jet (Rédaction, article-draft.routes).
 * RELATED FR: FR-INFRA-COCOON-CONTEXT, FR-CER-CHILD-FROM-PILLAR-H2
 *
 * Le même état du cocon pour les trois ateliers : un article sait de quelle
 * section de son parent il naît (et ce qu'elle dit déjà), et quels sujets ont
 * leur propre article — à résumer, pas à creuser.
 */
import { pool } from '../../db/client.js'
import { getCocoonTree } from '../article/cocoon-article.service.js'
import { getArticleContent } from '../article/article-content.service.js'
import { listChapters, articlePlainText } from '../../../shared/chapters.js'
import { sectionKey } from '../../../shared/verifiers/cocoon-hierarchy.js'
import { renderCocoonContext } from '../../../shared/cocoon-context.js'
import { log } from '../../utils/logger.js'

/** Le texte brut d'une section (H2) du parent ; vide si elle n'y est plus. */
async function parentSectionText(parentId: number, section: string): Promise<string> {
  const { content } = await getArticleContent(parentId)
  const chapter = listChapters(content ?? '').find(c => c.index >= 0 && sectionKey(c.title) === sectionKey(section))
  return chapter ? articlePlainText(chapter.html, 2000) : ''
}

/** Contexte du cocon pour un article existant (Moteur, Rédaction). Vide si l'article n'a pas de cocon. */
export async function cocoonContextForArticle(articleId: number): Promise<string> {
  const res = await pool.query(
    `SELECT a.cocoon_id, c.nom FROM articles a JOIN cocoons c ON c.id = a.cocoon_id WHERE a.id = $1`,
    [articleId],
  )
  const row = res.rows[0] as { cocoon_id: number; nom: string } | undefined
  if (!row) return ''
  const tree = await getCocoonTree(row.cocoon_id)
  const self = tree?.find(n => n.id === articleId)
  if (!tree || !self) return ''
  const text = self.parentId !== null && self.parentSection
    ? await parentSectionText(self.parentId, self.parentSection)
    : null
  log.debug('[cocoon-context] article', { articleId, articles: tree.length, parentId: self.parentId })
  return renderCocoonContext({
    cocoonName: row.nom,
    tree,
    focus: { articleId, parentId: self.parentId, parentSection: self.parentSection },
    parentSectionText: text,
  })
}

/**
 * Contexte du cocon pour un article à naître (Cerveau : candidats mots-clés),
 * avec le nom du cocon (qui ouvre sa stratégie). `null` si le cocon n'existe pas.
 */
export async function cocoonContextForNewArticle(
  cocoonId: number,
  parentId: number | null,
  parentSection: string | null,
): Promise<{ cocoonName: string; context: string } | null> {
  const res = await pool.query(`SELECT nom FROM cocoons WHERE id = $1`, [cocoonId])
  const name = (res.rows[0] as { nom: string } | undefined)?.nom
  const tree = await getCocoonTree(cocoonId)
  if (!name || !tree) return null
  const text = parentId !== null && parentSection ? await parentSectionText(parentId, parentSection) : null
  return {
    cocoonName: name,
    context: renderCocoonContext({ cocoonName: name, tree, focus: { parentId, parentSection }, parentSectionText: text }),
  }
}
