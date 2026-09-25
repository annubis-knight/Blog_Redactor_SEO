/**
 * Chapitres d'un article (FR-RED-ENRICH-PASSES, FR-RED-SECTION-REWRITE).
 *
 * Une passe d'enrichissement propose une nouvelle version chapitre par chapitre,
 * et une réécriture ne vise qu'un chapitre : il faut pouvoir en remplacer UN sans
 * toucher aux autres. Chapitre -1 = ce qui précède le premier H2 (titre H1 et
 * chapeau) ; chapitre i = le i-ème H2 et ce qui le suit jusqu'au suivant.
 */
import { splitByH2Regex } from './html-utils.js'

export interface Chapter {
  index: number
  title: string
  html: string
}

/** Titre de chapitre comparable : casse, espaces et ponctuation finale ignorés. */
export function sectionKey(title: string): string {
  return title.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').replace(/[\s?!.:;…]+$/u, '').trim()
}

export function listChapters(html: string): Chapter[] {
  const { intro, sections } = splitByH2Regex(html)
  const chapters: Chapter[] = intro ? [{ index: -1, title: 'Introduction', html: intro }] : []
  sections.forEach((s, i) => chapters.push({ index: i, title: s.title, html: s.fullHtml }))
  return chapters
}

/** L'article avec le chapitre `index` remplacé ; inchangé si ce chapitre n'existe pas. */
export function replaceChapter(html: string, index: number, replacement: string): string {
  const chapters = listChapters(html)
  if (!chapters.some(c => c.index === index)) return html
  return chapters.map(c => (c.index === index ? replacement.trim() : c.html)).join('\n')
}

/**
 * L'article avec `chapter` inséré avant le chapitre `beforeIndex` ; à la fin si
 * ce chapitre n'existe pas. La FAQ s'insère ainsi avant la conclusion.
 */
export function insertChapter(html: string, beforeIndex: number, chapter: string): string {
  const chapters = listChapters(html)
  const at = chapters.findIndex(c => c.index === beforeIndex)
  const blocks = chapters.map(c => c.html)
  blocks.splice(at === -1 ? blocks.length : at, 0, chapter.trim())
  return blocks.join('\n')
}

/** Chapitre avant lequel la FAQ s'insère : la conclusion (dernier H2), sinon la fin. */
export function faqInsertIndex(html: string): number {
  const chapters = listChapters(html)
  const last = chapters[chapters.length - 1]
  return last && last.index >= 1 ? last.index : Number.MAX_SAFE_INTEGER
}

/** Texte brut de l'article, pour donner le contexte entier à une passe ou une réécriture. */
export function articlePlainText(html: string, maxChars = 12000): string {
  const text = html
    .replace(/<\/(p|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*/g, '\n')
    .trim()
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text
}
