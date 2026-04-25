import { describe, it, expect } from 'vitest'
import { detectModifiers } from '../../../shared/utils/keyword-modifiers'

describe('detectModifiers', () => {
  it('détecte une ville (Toulouse)', () => {
    expect(detectModifiers('plombier toulouse')).toEqual([null, 'local'])
  })

  it('détecte une ville dans une phrase complète', () => {
    expect(detectModifiers('plombier urgence a toulouse')).toEqual([null, null, null, 'local'])
  })

  it('détecte un persona après "pour"', () => {
    expect(detectModifiers('outil seo pour freelance')).toEqual([null, null, null, 'persona'])
  })

  it('détecte un persona après "pour les"', () => {
    expect(detectModifiers('outil seo pour les pme')).toEqual([null, null, null, null, 'persona'])
  })

  it('détecte un persona après "pour la"', () => {
    expect(detectModifiers('conseil pour la TPE')).toEqual([null, null, null, 'persona'])
  })

  it('détecte local + persona dans le même keyword', () => {
    expect(detectModifiers('plombier toulouse pour entreprise')).toEqual([null, 'local', null, 'persona'])
  })

  it('retourne que des null si aucun modificateur', () => {
    expect(detectModifiers('meilleur outil seo gratuit')).toEqual([null, null, null, null])
  })

  it('gère les accents et la casse', () => {
    expect(detectModifiers('Plombier TOULOUSE')).toEqual([null, 'local'])
  })

  it('gère une région (Occitanie)', () => {
    expect(detectModifiers('artisan occitanie')).toEqual([null, 'local'])
  })

  it('commune toulousaine (Blagnac)', () => {
    expect(detectModifiers('restaurant blagnac')).toEqual([null, 'local'])
  })
})
