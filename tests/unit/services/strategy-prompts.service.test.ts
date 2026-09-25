// @vitest-environment node
/**
 * K5 / FR-INFRA-PROMPT-LAYERS — les prompts du Cerveau, rendus sur les VRAIS
 * modèles `server/prompts/*.md` avec les variables que la route fournit.
 *
 * Avant (lecture à la main + `.replace`), deux marqueurs partaient tels quels
 * chez l'IA : `{{#stepDescription}}…{{/stepDescription}}` à chaque suggestion
 * d'article, et `{{#topicSuggestions}}…{{topicSuggestions}}…` à l'étape
 * `articles` du cocon. Aucun de ces modèles n'était testé.
 */
import { describe, it, expect } from 'vitest'
import {
  articleStrategyPrompt,
  cocoonStrategyPrompt,
  deepenPrompt,
  consolidatePrompt,
  enrichPrompt,
} from '../../../server/services/strategy/strategy-prompts.service'
import {
  strategySuggestRequestSchema,
  cocoonSuggestRequestSchema,
  strategyDeepenRequestSchema,
  strategyConsolidateRequestSchema,
  strategyEnrichRequestSchema,
} from '../../../shared/schemas/strategy.schema'

const PLACEHOLDER = /\{\{[#/]?[A-Za-z_]\w*\}\}/

const themeContext = {
  themeName: 'Croissance digitale',
  themeConfig: { mainPromise: 'Plus de demandes de devis', location: 'Toulouse, France' },
}

function articleRequest(extra: Record<string, unknown> = {}) {
  return strategySuggestRequestSchema.parse({
    step: 'cible',
    currentInput: 'Des artisans du bâtiment',
    context: { articleTitle: 'Guide du site artisan', cocoonName: 'Sites artisans', siloName: 'Création', themeContext },
    ...extra,
  })
}

function cocoonRequest(step: string, extra: Record<string, unknown> = {}, context: Record<string, unknown> = {}) {
  return cocoonSuggestRequestSchema.parse({
    step,
    currentInput: '',
    context: { cocoonName: 'Sites artisans', siloName: 'Création', themeContext, ...context },
    ...extra,
  })
}

describe('articleStrategyPrompt — suggestion et fusion (niveau article)', () => {
  it('suggestion : la description de l’étape arrive, sans ses marqueurs', async () => {
    const prompt = await articleStrategyPrompt(articleRequest())
    expect(prompt).toContain('Décris le persona du lecteur idéal')
    expect(prompt).not.toMatch(PLACEHOLDER)
  })

  it('suggestion : contexte enrichi et réponses validées quand il y en a', async () => {
    const prompt = await articleStrategyPrompt(articleRequest({
      context: {
        articleTitle: 'Guide', cocoonName: 'C', siloName: 'S', themeContext,
        previousAnswers: { douleur: 'Pas de visibilité' }, existingArticles: ['Article A'],
      },
    }))
    expect(prompt).toContain('## Contexte enrichi')
    expect(prompt).toContain('Promesse : Plus de demandes de devis')
    expect(prompt).toContain('**douleur** : Pas de visibilité')
    expect(prompt).toContain('Article A')
  })

  it('suggestion : blocs facultatifs retirés quand ils sont vides', async () => {
    const prompt = await articleStrategyPrompt(strategySuggestRequestSchema.parse({
      step: 'angle', currentInput: '', context: { articleTitle: 'Guide', cocoonName: 'C', siloName: 'S' },
    }))
    expect(prompt).not.toContain('Contexte enrichi')
    expect(prompt).not.toContain('Réponses stratégiques déjà validées')
    expect(prompt).not.toMatch(PLACEHOLDER)
  })

  it('suggestion : le texte de l’utilisateur est recopié tel quel, motifs $ compris', async () => {
    const prompt = await articleStrategyPrompt(articleRequest({ currentInput: 'Budget $1 000 et $& de marge' }))
    expect(prompt).toContain('Budget $1 000 et $& de marge')
  })

  it('fusion sans texte validé : consigne de fusion, pas d’enrichissement', async () => {
    const prompt = await articleStrategyPrompt(articleRequest({ mergeWith: 'Suggestion IA' }))
    expect(prompt).toContain('Fusionne le texte de l\'utilisateur et la suggestion IA')
    expect(prompt).not.toContain('Un texte validé existe déjà')
    expect(prompt).not.toMatch(PLACEHOLDER)
  })

  it('fusion avec texte validé : consigne d’enrichissement et texte validé', async () => {
    const prompt = await articleStrategyPrompt(articleRequest({ mergeWith: 'Suggestion IA', existingValidated: 'Texte validé' }))
    expect(prompt).toContain('Un texte validé existe déjà')
    expect(prompt).toContain('## Texte déjà validé pour cette étape\nTexte validé')
    expect(prompt).not.toContain('Fusionne le texte de l\'utilisateur et la suggestion IA')
  })
})

describe('cocoonStrategyPrompt — une étape = un modèle, rendu complet', () => {
  it.each(['cible', 'douleur', 'angle', 'promesse', 'cta', 'articles', 'articles-structure', 'articles-topics', 'articles-paa-queries', 'articles-spe'])(
    'étape %s : aucun repère ni marqueur ne reste',
    async (step) => {
      const prompt = await cocoonStrategyPrompt(cocoonRequest(step, { currentInput: '[{"title":"Inter A"}]' }))
      expect(prompt).not.toMatch(PLACEHOLDER)
    },
  )

  it('étape articles : la section des pistes disparaît (elle partait brute)', async () => {
    const prompt = await cocoonStrategyPrompt(cocoonRequest('articles', {}, { topicSuggestions: ['Prix'] }))
    expect(prompt).not.toContain('Pistes thématiques')
    expect(prompt).not.toContain('Prix')
  })

  it('étape articles-structure : les pistes arrivent sous leur titre', async () => {
    const prompt = await cocoonStrategyPrompt(cocoonRequest('articles-structure', {}, { topicSuggestions: ['Prix d’un site'], topicUserContext: 'Clients pressés' }))
    expect(prompt).toContain('## Pistes thématiques')
    expect(prompt).toContain('- Prix d’un site')
    expect(prompt).toContain('> Clients pressés')
  })

  it('étape articles-spe : les questions PAA arrivent sous leur titre', async () => {
    const prompt = await cocoonStrategyPrompt(cocoonRequest('articles-spe', { currentInput: '[]' }, {
      paaContext: { 'Inter A': [{ question: 'Combien coûte un site ?', answer: null }] },
    }))
    expect(prompt).toContain('Questions réellement posées par les internautes')
    expect(prompt).toContain('### Questions PAA pour "Inter A"\n- Combien coûte un site ?')
  })

  it('étape add-article : les règles du niveau demandé seulement', async () => {
    const prompt = await cocoonStrategyPrompt(cocoonRequest('add-article', {
      currentInput: JSON.stringify({ articleType: 'intermediaire', existingArticlesDetail: '[{"title":"Pilier"}]', userInput: '' }),
    }))
    expect(prompt).toContain('### Règles — Article Intermédiaire')
    expect(prompt).not.toContain('### Règles — Article Pilier')
    expect(prompt).not.toContain('## Consigne de l\'utilisateur')
    expect(prompt).not.toMatch(PLACEHOLDER)
  })

  it('fusion au niveau cocon : le sujet est le cocon', async () => {
    const prompt = await cocoonStrategyPrompt(cocoonRequest('cible', { currentInput: 'Mon texte', mergeWith: 'Suggestion' }))
    expect(prompt).toContain('**Sujet** : Sites artisans')
    expect(prompt).not.toMatch(PLACEHOLDER)
  })
})

describe('approfondir, consolider, enrichir', () => {
  const context = { cocoonName: 'Sites artisans', siloName: 'Création', articleTitle: 'Guide' }

  it('approfondir : sous-questions existantes et défauts lisibles', async () => {
    const prompt = await deepenPrompt(strategyDeepenRequestSchema.parse({
      step: 'cible', mainQuestion: 'Qui ?', mainAnswer: 'Des artisans',
      existingSubQuestions: [{ question: 'Quel métier ?', answer: '' }], context,
    }))
    expect(prompt).toContain('- "Quel métier ?" (réponse : pas encore répondu)')
    expect(prompt).toContain('Aucune étape validée.')
    expect(prompt).not.toMatch(PLACEHOLDER)
  })

  it('consolider : questions et réponses mises en forme', async () => {
    const prompt = await consolidatePrompt(strategyConsolidateRequestSchema.parse({
      step: 'douleur', mainAnswer: 'Pas de clients', subAnswers: [{ question: 'Depuis quand ?', answer: 'Un an' }], context,
    }))
    expect(prompt).toContain('**Q :** Depuis quand ?\n**R :** Un an')
    expect(prompt).not.toMatch(PLACEHOLDER)
  })

  it('enrichir : contexte de l’article, du cocon et du silo', async () => {
    const prompt = await enrichPrompt(strategyEnrichRequestSchema.parse({
      step: 'angle', existingValidated: 'Angle validé', subQuestion: 'Et le prix ?', subAnswer: 'Transparent', context,
    }))
    expect(prompt).toContain('- **Article** : Guide')
    expect(prompt).toContain('- **Cocon** : Sites artisans')
    expect(prompt).not.toMatch(PLACEHOLDER)
  })
})
