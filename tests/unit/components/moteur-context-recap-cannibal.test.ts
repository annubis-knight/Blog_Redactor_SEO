import { describe, it, expect } from 'vitest'
import { hasCannibalization } from '../../../src/composables/moteur/useCannibalizationDetection'

/**
 * Tests de la détection de cannibalisation réelle (Bloc 4 du plan moteur).
 *
 * Le bug d'origine : la map était indexée par `slug` (string) côté front
 * alors que le backend renvoie `Record<number, string>` (clé = articleId).
 * Les deux univers ne se croisaient jamais, ce qui faisait apparaître le
 * badge ⚠️ sur tous les articles. Ces tests verrouillent l'invariant
 * "comparaison par articleId, jamais par slug".
 */
describe('hasCannibalization — Bloc 4 (indexation par articleId)', () => {
  it('returns false sur une map vide', () => {
    expect(hasCannibalization(12, {})).toBe(false)
  })

  it('returns false si l\'article n\'a pas de Capitaine dans la map', () => {
    expect(hasCannibalization(12, { 15: 'autre keyword' })).toBe(false)
  })

  it('returns false si l\'article est seul à utiliser ce Capitaine', () => {
    const map = { 12: 'creation site web', 15: 'refonte site web' }
    expect(hasCannibalization(12, map)).toBe(false)
    expect(hasCannibalization(15, map)).toBe(false)
  })

  it('returns true quand 2 articles différents partagent le même Capitaine', () => {
    const map = { 12: 'creation site web', 15: 'creation site web' }
    expect(hasCannibalization(12, map)).toBe(true)
    expect(hasCannibalization(15, map)).toBe(true)
  })

  it('comparaison case-insensitive', () => {
    const map = { 12: 'Creation Site Web', 15: 'creation site web' }
    expect(hasCannibalization(12, map)).toBe(true)
    expect(hasCannibalization(15, map)).toBe(true)
  })

  it('returns false sur un article unique parmi des doublons d\'autres', () => {
    const map = { 12: 'creation site web', 15: 'creation site web', 18: 'refonte site web' }
    expect(hasCannibalization(18, map)).toBe(false)
  })

  it('exclut l\'article lui-même (pas d\'auto-match)', () => {
    const map = { 12: 'seo local' }
    expect(hasCannibalization(12, map)).toBe(false)
  })

  it('returns false pour un articleId invalide (0 ou négatif)', () => {
    const map = { 12: 'seo local', 15: 'seo local' }
    expect(hasCannibalization(0, map)).toBe(false)
    expect(hasCannibalization(-1, map)).toBe(false)
  })

  // GARDE ANTI-RÉGRESSION : si quelqu'un repasse à une indexation par slug
  // (string), ce test casse car on lui passe un id invalide (NaN après cast).
  it('régression : appel avec un slug string ne doit JAMAIS retourner true', () => {
    const map = { 12: 'seo local', 15: 'seo local' }
    // @ts-expect-error — passage volontairement incorrect pour reproduire le bug
    expect(hasCannibalization('article-12', map)).toBe(false)
  })
})
