import { describe, it, expect } from 'vitest'
import { parseConfigInput } from '../../../../scripts/auto-article/config-file.js'

describe('auto:config — parseConfigInput', () => {
  it('parse un config complet', () => {
    expect(parseConfigInput({
      topic: 'sujet',
      cocoonName: 'cocon',
      businessContext: 'ctx',
      articleType: 'Pilier',
    })).toEqual({
      topic: 'sujet',
      cocoonName: 'cocon',
      businessContext: 'ctx',
      articleType: 'Pilier',
    })
  })

  it('défauts : businessContext vide, type Intermédiaire', () => {
    expect(parseConfigInput({ topic: 'a', cocoonName: 'b' })).toEqual({
      topic: 'a',
      cocoonName: 'b',
      businessContext: '',
      articleType: 'Intermédiaire',
    })
  })

  it('rejette topic manquant', () => {
    expect(() => parseConfigInput({ cocoonName: 'b' })).toThrow(/topic/)
  })

  it('cocoonName est optionnel — le script propose l\'emplacement', () => {
    expect(parseConfigInput({ topic: 'a' }).cocoonName).toBe('')
  })

  it('rejette une entrée non-objet', () => {
    expect(() => parseConfigInput('nope')).toThrow(/objet/)
    expect(() => parseConfigInput(null)).toThrow(/objet/)
  })
})
