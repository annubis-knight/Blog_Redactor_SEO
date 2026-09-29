/**
 * Suivi des chapitres (H2) d'un article reçu en flux (FR-RED-DRAFT-SINGLE-PASS).
 *
 * Le premier jet est rédigé en UN appel ; l'écran garde pourtant sa progression
 * chapitre par chapitre (`section-start` / `section-done`, sauvegarde au fil).
 * Le serveur repère donc chaque ouverture `<h2…>` dans le texte qui arrive,
 * y compris quand la balise est coupée entre deux paquets du flux.
 *
 * Index = rang du H2 dans le texte (0 pour le premier) ; le chapeau placé avant
 * le premier H2 appartient au chapitre 0. Titre et total viennent du sommaire.
 */
export type ChapterEvent =
  | { type: 'section-start'; index: number; total: number; title: string }
  | { type: 'section-done'; index: number }

interface H2Tracker {
  /** Ouvre le chapitre 0 (le texte commence par l'introduction). */
  start(): ChapterEvent[]
  /** Ajoute un paquet du flux ; renvoie les changements de chapitre qu'il provoque. */
  push(chunk: string): ChapterEvent[]
  /** Clôt le chapitre en cours (une seule fois). */
  finish(): ChapterEvent[]
  /** Nombre de H2 ouverts dans le texte reçu. */
  h2Seen(): number
}

const H2_OPEN_SOURCE = /<h2(?:\s[^>]*)?>/.source

/**
 * @param offset  index du premier chapitre suivi : une continuation reprend au
 *                chapitre `offset`, déjà ouvert à l'écran (son `start()` ne sert
 *                qu'à le rouvrir côté serveur).
 */
export function createH2Tracker(outlineTitles: readonly string[], offset = 0): H2Tracker {
  // Une expression par suivi : une expression globale garde un état (lastIndex).
  const h2Open = new RegExp(H2_OPEN_SOURCE, 'gi')
  let buffer = ''
  let scanFrom = 0
  let seen = 0
  let current = -1
  let finished = false
  const total = outlineTitles.length

  const open = (index: number): ChapterEvent => ({ type: 'section-start', index, total, title: outlineTitles[index] ?? '' })

  return {
    start() {
      if (current >= 0) return []
      current = offset
      return [open(offset)]
    },
    push(chunk) {
      if (finished) return []
      buffer += chunk
      const events: ChapterEvent[] = []
      h2Open.lastIndex = scanFrom
      for (let m = h2Open.exec(buffer); m; m = h2Open.exec(buffer)) {
        scanFrom = m.index + m[0].length
        seen++
        // Le premier H2 appartient au chapitre déjà ouvert par start().
        if (seen === 1) continue
        events.push({ type: 'section-done', index: current })
        current++
        events.push(open(current))
      }
      return events
    },
    finish() {
      if (finished || current < 0) return []
      finished = true
      return [{ type: 'section-done', index: current }]
    },
    h2Seen: () => seen,
  }
}
