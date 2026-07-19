/**
 * Chargement d'un run non-interactif depuis un fichier JSON (`--config`).
 * `parseConfigInput` est pure et testée ; `loadConfigInput` lit le fichier.
 *
 * Forme attendue :
 *   { "topic": "...", "cocoonName": "...", "businessContext"?: "...", "articleType"?: "Pilier|Intermédiaire|Spécialisé" }
 */

import { readFile } from 'node:fs/promises'
import { resolveArticleType } from './prompts.js'
import type { InitialInput } from './types.js'

export function parseConfigInput(raw: unknown): InitialInput {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Config invalide : objet JSON attendu')
  }
  const o = raw as Record<string, unknown>

  const topic = typeof o.topic === 'string' ? o.topic.trim() : ''
  if (!topic) throw new Error('Config : champ "topic" requis (string non vide)')

  // `cocoonName` est facultatif depuis l'ajout du gate d'emplacement : le script
  // propose lui-même le cocon. S'il est fourni, il sert d'indice.
  const cocoonName = typeof o.cocoonName === 'string' ? o.cocoonName.trim() : ''

  const businessContext = typeof o.businessContext === 'string' ? o.businessContext.trim() : ''
  const articleType = typeof o.articleType === 'string'
    ? resolveArticleType(o.articleType)
    : 'Intermédiaire'

  return { topic, cocoonName, businessContext, articleType }
}

export async function loadConfigInput(path: string): Promise<InitialInput> {
  const text = await readFile(path, 'utf8')
  return parseConfigInput(JSON.parse(text))
}
