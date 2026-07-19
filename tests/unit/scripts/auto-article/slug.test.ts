import { describe, it, expect } from 'vitest'
import { slugify } from '../../../../scripts/auto-article/slug.js'

describe('auto:slug — slugify', () => {
  it('minuscule, retire accents et ponctuation', () => {
    expect(slugify('Référencement local : rendre votre TPE visible'))
      .toBe('referencement-local-rendre-votre-tpe-visible')
  })

  it('trim les tirets de bord', () => {
    expect(slugify('  !Bonjour!  ')).toBe('bonjour')
  })
})
