import { describe, it, expect } from 'vitest'
import { findCocoonByName, type CocoonSummary } from '../../../../scripts/auto-article/cocoon.js'

const cocoons: CocoonSummary[] = [
  { id: 1, name: 'SEO local artisans', siloName: 'Silo A' },
  { id: 2, name: 'Création de site', siloName: 'Silo B' },
]

describe('auto:cocoon — findCocoonByName', () => {
  it('trouve par nom exact', () => {
    expect(findCocoonByName(cocoons, 'Création de site')?.id).toBe(2)
  })

  it('insensible à la casse, aux espaces et aux accents', () => {
    expect(findCocoonByName(cocoons, '  creation de site  ')?.id).toBe(2)
    expect(findCocoonByName(cocoons, 'SEO LOCAL ARTISANS')?.id).toBe(1)
  })

  it('retourne null si absent', () => {
    expect(findCocoonByName(cocoons, 'inexistant')).toBeNull()
  })
})
