// @vitest-environment node
/**
 * FR-CER-COCOON-PROGRESSIVE (U7 révisé, recette R1) — en mode simulé, « ajouter
 * un article à la carte » renvoie le niveau demandé, rattaché à un parent
 * présent sur la carte.
 *
 * L'ancienne réponse simulée était toujours un spécialisé : le choix « Le
 * pilier » du menu « Générer avec Claude » n'ajoutait donc jamais de pilier,
 * et le menu restait bloqué en MOCK.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { streamFixtures } from '../../../server/services/external/mock-registry'
import '../../../server/services/external/mock-fixtures/index'
import { addArticlePromptVariables } from '../../../server/services/strategy/cocoon-add-article-prompt.js'
import { renderPromptTemplate } from '../../../server/utils/prompt-loader.js'
import { parseSingleArticle } from '../../../src/composables/editor/article-proposals/parsers'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types'

const TEMPLATE = readFileSync(join(__dirname, '..', '..', '..', 'server', 'prompts', 'cocoon-add-article.md'), 'utf8')

type Existant = { title: string; type: ArticleLevel; parentTitle: string | null; suggestedKeyword: string }

/** Rejoue l'appel du front : le prompt rendu, puis le message utilisateur (le JSON de la demande). */
function ajouter(articleType: ArticleLevel, existants: Existant[]) {
  const existingArticlesDetail = JSON.stringify(existants, null, 2)
  const systemPrompt = renderPromptTemplate(TEMPLATE, addArticlePromptVariables({ articleType, existingArticlesDetail })).text
  const userPrompt = JSON.stringify({ articleType, existingArticlesDetail })
  const fixture = streamFixtures.find(f => f.matcher({ systemPrompt, userPrompt }))
  expect(fixture?.name, 'la réponse simulée d’un ajout d’article').toBe('cocoon-add-article')
  const article = parseSingleArticle(fixture!.builder({ systemPrompt, userPrompt }) as string, 'specifique')
  expect(article, 'la réponse se lit comme un article').not.toBeNull()
  return article!
}

const pilier: Existant = { title: 'Mon pilier', type: 'pilier', parentTitle: null, suggestedKeyword: 'mon pilier toulouse' }
const interA: Existant = { title: 'Inter A', type: 'intermediaire', parentTitle: 'Mon pilier', suggestedKeyword: 'inter a' }
const interB: Existant = { title: 'Inter B', type: 'intermediaire', parentTitle: 'Mon pilier', suggestedKeyword: 'inter b' }

describe('réponse simulée — ajouter un article à la carte', () => {
  it('carte vide : le pilier, sans parent', () => {
    const article = ajouter('pilier', [])
    expect(article.type).toBe('pilier')
    expect(article.parentTitle).toBeNull()
    expect(article.title.trim()).not.toBe('')
  })

  it('un intermédiaire se rattache au pilier de la carte', () => {
    const article = ajouter('intermediaire', [pilier])
    expect(article.type).toBe('intermediaire')
    expect(article.parentTitle).toBe('Mon pilier')
  })

  it('un spécialisé se rattache à l’intermédiaire qui en a le moins', () => {
    const speDeA: Existant = { title: 'Spé de A', type: 'specifique', parentTitle: 'Inter A', suggestedKeyword: 'spe a' }
    const article = ajouter('specifique', [pilier, interA, interB, speDeA])
    expect(article.type).toBe('specifique')
    expect(article.parentTitle).toBe('Inter B')
  })

  it('deux ajouts du même niveau donnent deux titres différents', () => {
    const premier = ajouter('intermediaire', [pilier])
    const second = ajouter('intermediaire', [pilier, { ...interA, title: premier.title }])
    expect(second.title).not.toBe(premier.title)
  })
})
