/**
 * Prompt de l'étape « ajouter un article au cocon » du Cerveau.
 *
 * Le modèle `server/prompts/cocoon-add-article.md` contient des blocs
 * conditionnels par niveau (`{{#isPilier}}…{{/isPilier}}`) et un bloc de
 * consigne libre (`{{#userInput}}…{{/userInput}}`). Les remplacements utilisent
 * des fonctions, jamais des chaînes : dans une chaîne de remplacement, `$1` ou
 * `$&` seraient interprétés, y compris quand ils viennent de la consigne tapée
 * par l'utilisateur.
 */
import { parseArticleLevel, articleLevelToDisplayLabel } from '../../../shared/utils/article-level.js'

export interface AddArticlePromptInput {
  /** Niveau demandé, dans n'importe quel format (`'pilier'`, `'Pilier'`, `'Intermédiaire'`…). */
  articleType: string
  /** Articles déjà proposés dans le cocon, sérialisés pour l'IA. */
  existingArticlesDetail: string
  userInput?: string
}

function keepBlock(prompt: string, tag: string, keep: boolean): string {
  return prompt.replace(
    new RegExp(`\\{\\{#${tag}\\}\\}([\\s\\S]*?)\\{\\{/${tag}\\}\\}`, 'g'),
    (_match, body: string) => (keep ? body : ''),
  )
}

export function buildAddArticlePrompt(template: string, input: AddArticlePromptInput): string {
  const level = parseArticleLevel(input.articleType)
  if (!level) {
    throw new Error(`Niveau d'article inconnu pour l'ajout au cocon : « ${input.articleType} »`)
  }
  const userInput = input.userInput?.trim() ?? ''

  let prompt = template
  prompt = keepBlock(prompt, 'isPilier', level === 'pilier')
  prompt = keepBlock(prompt, 'isIntermediaire', level === 'intermediaire')
  prompt = keepBlock(prompt, 'isSpecialise', level === 'specifique')
  prompt = prompt.replace(/\{\{articleType\}\}/g, () => articleLevelToDisplayLabel(level))
  prompt = prompt.replace(/\{\{existingArticles\}\}/g, () => input.existingArticlesDetail)
  // En dernier : le texte de l'utilisateur n'est plus retraité après son injection.
  prompt = prompt.replace(
    /\{\{#userInput\}\}([\s\S]*?)\{\{\/userInput\}\}/g,
    (_match, body: string) => (userInput ? body.replace(/\{\{userInput\}\}/g, () => userInput) : ''),
  )
  return prompt
}
