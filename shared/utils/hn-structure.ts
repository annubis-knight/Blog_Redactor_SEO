/**
 * Structure Hn d'un article (sommaire H1/H2/H3) et récurrence des titres chez
 * les concurrents.
 *
 * `article_keywords.hn_structure` stocke le format du Moteur :
 * `{ level: number, text, children? }`. D'anciens appelants lisaient
 * `{ level: 'H2', title }` et ne trouvaient donc rien (épopée qualité SEO, M9).
 */
import type { HnRecurrenceItem } from '../types/serp-analysis.types.js'

export interface HnHeading {
  level: 1 | 2 | 3
  text: string
}

/**
 * Un titre n'est « récurrent » chez les concurrents que s'il revient sur au
 * moins ce nombre de pages. Un seuil en pourcentage (10 %) laissait passer, sur
 * 10 pages, n'importe quel titre vu une seule fois : menus, pieds de page (M6).
 */
export const MIN_RECURRING_PAGES = 2

function readLevel(raw: unknown): 1 | 2 | 3 | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.trim().replace(/^h/i, '')) : NaN
  return n === 1 || n === 2 || n === 3 ? n : null
}

/** Aplatit le sommaire stocké, dans l'ordre de lecture ; ignore ce qui n'est pas un titre lisible. */
export function flattenHnStructure(raw: unknown): HnHeading[] {
  if (!Array.isArray(raw)) return []
  const out: HnHeading[] = []
  for (const node of raw) {
    if (typeof node !== 'object' || node === null) continue
    const n = node as { level?: unknown; text?: unknown; title?: unknown; children?: unknown }
    const level = readLevel(n.level)
    const text = (typeof n.text === 'string' ? n.text : typeof n.title === 'string' ? n.title : '').trim()
    if (level && text) out.push({ level, text })
    out.push(...flattenHnStructure(n.children))
  }
  return out
}

/** Titres des concurrents réellement récurrents, dans la forme envoyée aux prompts. */
export function recurringHeadings(items: HnRecurrenceItem[]): Array<Omit<HnRecurrenceItem, 'total'>> {
  return items
    .filter(h => h.count >= MIN_RECURRING_PAGES)
    .map(h => ({ level: h.level, text: h.text, count: h.count, percent: h.percent }))
}
