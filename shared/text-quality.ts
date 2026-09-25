/**
 * Détecteurs de qualité du texte (fonctions pures) — FR-RED-DRAFT-SINGLE-PASS,
 * FR-RED-DRAFT-TO-SOURCE.
 *
 * Le pilier 1013 contenait des phrases en anglais, des paragraphes recopiés
 * d'une section à l'autre et des chiffres « de 2024 » sans source : aucun
 * contrôle ne les voyait (seul le monologue « let me… » était repéré). Ces
 * détecteurs servent la porte du premier jet et celle de la publication.
 */

/** Texte visible, balises retirées, espaces réduits. */
function plain(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Mots du texte visible — même comptage que la porte de publication. */
export function countWordsHtml(html: string): number {
  return html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(Boolean)
}

function words(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

// Mots-outils : ils trahissent la langue d'une phrase bien mieux que le
// vocabulaire (les anglicismes métier — « call-to-action » — ne comptent pas).
const EN_FUNCTION = new Set([
  'the', 'and', 'of', 'to', 'is', 'are', 'for', 'with', 'that', 'this', 'you', 'your', 'we', 'our',
  'it', 'be', 'can', 'will', 'from', 'by', 'at', 'an', 'have', 'has', 'was', 'were', 'which', 'their', 'they',
])
const FR_FUNCTION = new Set([
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'est', 'pour', 'que', 'qui', 'dans', 'sur',
  'avec', 'vous', 'votre', 'vos', 'nous', 'pas', 'ce', 'cette', 'au', 'aux', 'en', 'ils', 'sont', 'leur',
])

/** Phrases (6 mots ou plus) où l'anglais domine. */
export function detectNonFrenchSentences(html: string): string[] {
  return sentences(plain(html)).filter((sentence) => {
    const w = words(sentence)
    if (w.length < 6) return false
    const en = w.filter(x => EN_FUNCTION.has(x)).length
    const fr = w.filter(x => FR_FUNCTION.has(x)).length
    return en >= 3 && en > fr
  })
}

/**
 * Paragraphes et éléments de liste, en texte. Un `<br>` sépare aussi deux
 * paragraphes : jusqu'au 2026-09-25 (R14), la rédaction fusionnait les `<p>`
 * consécutifs en un seul, joints par `<br>`, et des articles l'ont gardé.
 */
function blocks(html: string): string[] {
  return [...html.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .flatMap(m => (m[2] ?? '').split(/<br\s*\/?>/i))
    .map(part => plain(part))
    .filter(Boolean)
}

/**
 * Paragraphes qui en répètent un autre (12 mots ou plus, au moins 80 % de mots
 * en commun). Renvoie le début de chaque répétition.
 */
export function detectRepeatedParagraphs(html: string): string[] {
  const sets = blocks(html).map(text => ({ text, set: new Set(words(text)) })).filter(b => b.set.size >= 12)
  const repeated: string[] = []
  sets.forEach((b, i) => {
    const copies = sets.slice(0, i).some((earlier) => {
      const common = [...b.set].filter(x => earlier.set.has(x)).length
      const union = new Set([...b.set, ...earlier.set]).size
      return common / union >= 0.8
    })
    if (copies) repeated.push(b.text.slice(0, 80))
  })
  return repeated
}

const FIGURE = /\d+(?:[.,]\d+)?\s?%|\d[\d\s.,]*\s?(?:€|euros?\b)|\b\d+(?:[.,]\d+)?\s?(?:millions?|milliards?)\b|\b\d+(?:[.,]\d+)?\s?fois\b/i
const ATTRIBUTION = /\b(?:selon|d['’]après|source\s*:)/i

/**
 * Phrases qui avancent un chiffre (pourcentage, prix, multiplicateur, million)
 * sans l'attribuer à une source. Un chiffre posé dans un marqueur « à sourcer »
 * (`<mark data-a-sourcer>`) est en attente de source : il ne compte pas ici.
 */
const SOURCER_MARK = /<mark\b[^>]*data-a-sourcer[^>]*>[\s\S]*?<\/mark>/gi

/**
 * FR-RED-DRAFT-TO-SOURCE — pose un marqueur « à sourcer » sur chaque phrase
 * chiffrée sans source d'un paragraphe ou d'un élément de liste : aucun chiffre
 * inventé n'est présenté comme un fait (recette C8 du 2026-09-25, où le premier
 * jet affirmait « 95 % des clients… » malgré la consigne). Titres, chiffres
 * attribués et marqueurs existants ne changent pas ; la passe « sources »
 * trouvera une source, ou retirera le chiffre.
 */
export function markUnsourcedFigures(html: string): string {
  return html.replace(/<(p|li)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag: string, attrs: string, inner: string) => {
    // Les marqueurs existants sont mis de côté : une phrase ne les coupe jamais.
    const kept: string[] = []
    const guarded = inner.replace(SOURCER_MARK, (mark) => `@@SOURCER${kept.push(mark) - 1}@@`)
    let changed = false
    const segments = guarded.split(/(?<=[.!?…])(\s+)/).map((segment) => {
      if (!segment.trim() || segment.includes('@@SOURCER') || /\[à sourcer/i.test(segment)) return segment
      const text = plain(segment)
      if (!FIGURE.test(text) || ATTRIBUTION.test(text)) return segment
      changed = true
      return `<mark data-a-sourcer>[à sourcer : ${segment.trim()}]</mark>`
    })
    if (!changed) return block
    const restored = segments.join('').replace(/@@SOURCER(\d+)@@/g, (_m, i: string) => kept[Number(i)] ?? '')
    return `<${tag}${attrs}>${restored}</${tag}>`
  })
}

export function detectUnsourcedFigures(html: string): string[] {
  // Le texte « [à sourcer : …] » compte aussi comme marqueur : l'éditeur peut
  // perdre la balise `<mark>` et ne garder que ce texte.
  const withoutMarkers = html
    .replace(/<mark\b[^>]*data-a-sourcer[^>]*>[\s\S]*?<\/mark>/gi, ' ')
    .replace(/\[à sourcer[^\]]*\]/gi, ' ')
  return sentences(plain(withoutMarkers)).filter(s => FIGURE.test(s) && !ATTRIBUTION.test(s))
}
