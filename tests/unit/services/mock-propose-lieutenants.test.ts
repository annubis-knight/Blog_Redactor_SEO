// @vitest-environment node
/**
 * T4 (épopée qualité SEO) — une simulation qui répond au sujet demandé.
 *
 * La simulation `propose-lieutenants` renvoyait toujours « plombier urgence
 * toulouse », quel que soit le capitaine : un parcours sur « création site
 * internet toulouse » recevait des lieutenants de plomberie, et les tests ne
 * pouvaient rien vérifier de la pertinence ni des portes (cannibalisation,
 * lieutenant identique au capitaine). Les lieutenants simulés dérivent
 * désormais du capitaine demandé.
 */
import { describe, it, expect } from 'vitest'
import { streamFixtures } from '../../../server/services/external/mock-registry.js'
import '../../../server/services/external/mock-fixtures/streams.js'

function proposeFor(captain: string, level = 'pilier'): { lieutenants: Array<{ keyword: string }> } {
  const userPrompt = `Propose les meilleurs lieutenants pour l'article "${captain}" de niveau ${level}. Analyse toutes les données fournies et retourne le JSON structuré.`
  const fixture = streamFixtures.find(f => f.matcher({ systemPrompt: '', userPrompt }))
  expect(fixture?.name).toBe('propose-lieutenants')
  const out = fixture!.builder({ systemPrompt: '', userPrompt })
  return JSON.parse(Array.isArray(out) ? out.join('') : out)
}

describe('simulation propose-lieutenants — elle parle du capitaine demandé', () => {
  it('les lieutenants dérivent du capitaine, jamais de la plomberie en dur', () => {
    const { lieutenants } = proposeFor('creation site internet toulouse')
    expect(lieutenants.length).toBeGreaterThanOrEqual(3)
    for (const lt of lieutenants) {
      expect(lt.keyword).not.toMatch(/plombier/)
      expect(lt.keyword).toMatch(/site internet/)
    }
  })

  it('aucun lieutenant n’est le capitaine lui-même, et tous sont distincts', () => {
    const captain = 'isolation combles perdus'
    const keywords = proposeFor(captain).lieutenants.map(l => l.keyword)
    expect(keywords).not.toContain(captain)
    expect(new Set(keywords).size).toBe(keywords.length)
  })

  it('deux capitaines différents donnent deux propositions différentes', () => {
    const a = proposeFor('creation site internet toulouse').lieutenants.map(l => l.keyword)
    const b = proposeFor('isolation combles perdus').lieutenants.map(l => l.keyword)
    expect(a).not.toEqual(b)
  })
})
