// @vitest-environment node
/**
 * FR-CER-TYPE-TOLERANT — le prompt « ajouter un article » garde les règles du
 * niveau demandé, quel que soit le format dans lequel le front l'envoie.
 *
 * Deux défauts réunis ici (épopée qualité SEO, checklist K3 et K4) :
 *   - le front envoie le niveau canonique en minuscules (`'pilier'`) alors que
 *     la route comparait à `'Pilier'` : les blocs `{{#isPilier}}` etc. étaient
 *     tous retirés, et l'IA rédigeait sans les règles du type demandé ;
 *   - `'$1'.replace(/\{\{userInput\}\}/g, …)` remplaçait dans le texte littéral
 *     « $1 » : le repère `{{userInput}}` restait brut dans le prompt.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildAddArticlePrompt } from '../../../server/services/strategy/cocoon-add-article-prompt.js'

const TEMPLATE = [
  'Type : {{articleType}}',
  'Existants : {{existingArticles}}',
  '{{#userInput}}Consigne :',
  '> {{userInput}}',
  '{{/userInput}}',
  '{{#isPilier}}REGLES PILIER{{/isPilier}}',
  '{{#isIntermediaire}}REGLES INTER{{/isIntermediaire}}',
  '{{#isSpecialise}}REGLES SPE{{/isSpecialise}}',
].join('\n')

const base = { existingArticlesDetail: '[]' }

describe('buildAddArticlePrompt — les règles du niveau demandé arrivent jusqu’à l’IA', () => {
  it('garde les règles du Pilier quand le front envoie le niveau en minuscules', () => {
    const prompt = buildAddArticlePrompt(TEMPLATE, { ...base, articleType: 'pilier' })
    expect(prompt).toContain('REGLES PILIER')
    expect(prompt).not.toContain('REGLES INTER')
    expect(prompt).not.toContain('REGLES SPE')
    expect(prompt, 'le type est nommé comme un humain le lit').toContain('Type : Pilier')
  })

  it('accepte aussi le format de la base et les accents', () => {
    expect(buildAddArticlePrompt(TEMPLATE, { ...base, articleType: 'Intermédiaire' })).toContain('REGLES INTER')
    expect(buildAddArticlePrompt(TEMPLATE, { ...base, articleType: 'specifique' })).toContain('REGLES SPE')
  })

  it('refuse un niveau inconnu au lieu de retirer toutes les règles en silence', () => {
    expect(() => buildAddArticlePrompt(TEMPLATE, { ...base, articleType: 'chapitre' })).toThrow(/niveau/i)
  })

  it('injecte la consigne de l’utilisateur à la place du repère', () => {
    const prompt = buildAddArticlePrompt(TEMPLATE, { ...base, articleType: 'pilier', userInput: '  Parler des artisans  ' })
    expect(prompt).toContain('> Parler des artisans')
    expect(prompt).not.toContain('{{userInput}}')
  })

  it('retire le bloc de consigne quand l’utilisateur n’en a pas donné', () => {
    const prompt = buildAddArticlePrompt(TEMPLATE, { ...base, articleType: 'pilier', userInput: '   ' })
    expect(prompt).not.toContain('Consigne')
  })

  it('recopie telle quelle une consigne qui contient des motifs de remplacement ($1, $&)', () => {
    const prompt = buildAddArticlePrompt(TEMPLATE, { ...base, articleType: 'pilier', userInput: 'Budget $1 000 et $& de marge' })
    expect(prompt).toContain('> Budget $1 000 et $& de marge')
  })

  it('injecte la liste des articles existants', () => {
    const prompt = buildAddArticlePrompt(TEMPLATE, { articleType: 'pilier', existingArticlesDetail: '[{"title":"A"}]' })
    expect(prompt).toContain('Existants : [{"title":"A"}]')
  })

  it('ne laisse aucun repère de ce prompt dans le vrai modèle, quel que soit le niveau', () => {
    const vrai = readFileSync(join(__dirname, '..', '..', '..', 'server', 'prompts', 'cocoon-add-article.md'), 'utf8')
    for (const articleType of ['pilier', 'intermediaire', 'specifique']) {
      const prompt = buildAddArticlePrompt(vrai, { ...base, articleType, userInput: 'Une consigne' })
      expect(prompt, `repère restant pour ${articleType}`).not.toMatch(
        /\{\{[#/]?(articleType|existingArticles|userInput|isPilier|isIntermediaire|isSpecialise)\}\}/,
      )
    }
  })
})
