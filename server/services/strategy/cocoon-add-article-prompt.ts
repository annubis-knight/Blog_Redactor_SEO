/**
 * Variables du prompt « ajouter un article au cocon » du Cerveau.
 *
 * Le modèle `server/prompts/cocoon-add-article.md` contient des sections par
 * niveau (`{{#isPilier}}…{{/isPilier}}`) et une section de consigne libre
 * (`{{#userInput}}…{{/userInput}}`). Le rendu est celui de `loadPrompt` : une
 * passe, sans interprétation des `$1` / `$&` de la consigne tapée.
 */
import { parseArticleLevel, articleLevelToDisplayLabel } from '../../../shared/utils/article-level.js'

export interface AddArticlePromptInput {
  /** Niveau demandé, dans n'importe quel format (`'pilier'`, `'Pilier'`, `'Intermédiaire'`…). */
  articleType: string
  /** Articles déjà proposés dans le cocon, sérialisés pour l'IA. */
  existingArticlesDetail: string
  userInput?: string
}

export function addArticlePromptVariables(input: AddArticlePromptInput): Record<string, string> {
  const level = parseArticleLevel(input.articleType)
  if (!level) {
    throw new Error(`Niveau d'article inconnu pour l'ajout au cocon : « ${input.articleType} »`)
  }
  const on = (yes: boolean): string => (yes ? 'oui' : '')
  return {
    articleType: articleLevelToDisplayLabel(level),
    existingArticles: input.existingArticlesDetail,
    userInput: input.userInput?.trim() ?? '',
    isPilier: on(level === 'pilier'),
    isIntermediaire: on(level === 'intermediaire'),
    isSpecialise: on(level === 'specifique'),
  }
}
