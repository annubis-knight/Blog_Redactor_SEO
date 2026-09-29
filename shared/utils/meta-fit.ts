/**
 * Ramener un meta title ou une meta description à la longueur que Google
 * affiche, sans les couper en plein vol.
 *
 * La route de génération coupait la description à 157 caractères puis
 * ajoutait « ... » : c'est exactement ce que `validateArticleMeta` classe en
 * erreur (`meta-*-truncated`). Ici, on s'arrête à la dernière phrase complète
 * quand elle garde l'essentiel, sinon au dernier mot, en retirant les mots qui
 * ne terminent jamais une phrase (« en », « de »…). Jamais de points de
 * suspension (épopée qualité SEO, R4).
 */
import { DANGLING_WORDS } from '../content-validators.js'

const TRAILING_JUNK = /[\s,;:–—\-|]+$/
const ELLIPSIS = /(\s*(\.\.\.|…))+$/

function dropDanglingWords(text: string): string {
  let words = text.replace(TRAILING_JUNK, '').split(/\s+/)
  while (words.length > 1) {
    const last = (words[words.length - 1] ?? '').toLowerCase().replace(/[.!?]+$/, '')
    if (!DANGLING_WORDS.has(last)) break
    words = words.slice(0, -1)
    words = words.join(' ').replace(TRAILING_JUNK, '').split(/\s+/)
  }
  return words.join(' ')
}

export function fitMetaText(text: string, max: number): string {
  const clean = text.trim().replace(ELLIPSIS, '').trim()
  if (clean.length <= max) return dropDanglingWords(clean)

  const window = clean.slice(0, max)
  // Dernière fin de phrase dans la fenêtre, si elle garde au moins la moitié du texte permis.
  const sentenceEnds = [...window.matchAll(/[.!?](?=\s|$)/g)].map(m => m.index ?? -1)
  const lastSentenceEnd = sentenceEnds[sentenceEnds.length - 1] ?? -1
  if (lastSentenceEnd + 1 >= max / 2) return window.slice(0, lastSentenceEnd + 1)

  const lastSpace = window.lastIndexOf(' ')
  return dropDanglingWords(lastSpace > 0 ? window.slice(0, lastSpace) : window)
}
