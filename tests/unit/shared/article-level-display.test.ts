// @vitest-environment node
/**
 * FR-CER-AIGUILLAGE — le niveau d'un article s'affiche en toutes lettres.
 *
 * Recette du 2026-09-30 (CER-7, CER-12, CER-24, 01-T4) :
 *   - « Articles du cocon (N) » rangeait tous les articles sous « Autre » :
 *     la liste arrive en « Titre (pilier) », l'écran attendait « (Pilier) » ;
 *   - au Moteur et à la Rédaction, les groupes s'intitulaient « INTERMEDIAIRE »
 *     et « SPECIFIQUE » (le code du niveau), et le badge des spécialisés n'avait
 *     pas de couleur : sa classe `tree-type--specifique` n'avait aucun style.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ARTICLE_LEVELS, articleLevelToDisplayLabel, splitArticleLevelSuffix } from '../../../shared/utils/article-level'

const ROOT = join(__dirname, '..', '..', '..')

describe('FR-CER-AIGUILLAGE — « Titre (niveau) » se lit dans tous les formats', () => {
  it.each([
    ['Création de site : le guide (pilier)', 'pilier'],
    ['Prix d’un site (intermediaire)', 'intermediaire'],
    ['Référencement local (specifique)', 'specifique'],
    ['Création de site (Pilier)', 'pilier'],
    ['Prix d’un site (Intermédiaire)', 'intermediaire'],
    ['Référencement local (Spécialisé)', 'specifique'],
  ])('« %s » → %s', (entry, level) => {
    const parsed = splitArticleLevelSuffix(entry)
    expect(parsed.level).toBe(level)
    expect(parsed.title).not.toMatch(/\(/)
  })

  it('une parenthèse qui n’est pas un niveau reste dans le titre', () => {
    expect(splitArticleLevelSuffix('Le guide (2026)')).toEqual({ title: 'Le guide (2026)', level: null })
    expect(splitArticleLevelSuffix('Offre (spécial Noël)')).toEqual({ title: 'Offre (spécial Noël)', level: null })
    expect(splitArticleLevelSuffix('Sans niveau')).toEqual({ title: 'Sans niveau', level: null })
  })

  it('seule la dernière parenthèse compte', () => {
    expect(splitArticleLevelSuffix('SEO (local) à Toulouse (pilier)')).toEqual({ title: 'SEO (local) à Toulouse', level: 'pilier' })
  })

  it('libellés affichés : accentués, jamais le code', () => {
    expect(ARTICLE_LEVELS.map(articleLevelToDisplayLabel)).toEqual(['Pilier', 'Intermédiaire', 'Spécialisé'])
  })
})

/**
 * Les listes d'articles groupées par niveau (Moteur, Rédaction, « Articles du
 * cocon ») : un badge par niveau, chacun avec sa couleur, et un titre de groupe
 * en toutes lettres.
 */
const LEVEL_BADGE_FILES = [
  'src/components/moteur/MoteurContextRecap.vue',
  'src/components/strategy/ContextRecap.vue',
]

describe('FR-CER-AIGUILLAGE — badges de niveau des listes d’articles', () => {
  for (const file of LEVEL_BADGE_FILES) {
    const source = readFileSync(join(ROOT, file), 'utf8')
    const style = source.slice(source.indexOf('<style'))

    it(`${file} : chaque niveau a la couleur de son badge`, () => {
      const missing = ARTICLE_LEVELS.filter(level => !style.includes(`.tree-type--${level} {`))
      expect(missing, 'classe de badge sans style (fond transparent)').toEqual([])
    })

    it(`${file} : le titre d’un groupe n’affiche pas le code du niveau`, () => {
      expect(source).not.toMatch(/\{\{\s*group\.type\s*\}\}/)
    })
  }
})
