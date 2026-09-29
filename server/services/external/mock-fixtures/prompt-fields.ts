/**
 * Lecture des consignes rendues (`server/prompts/*.md`) par les réponses
 * préparées du mode simulé (NFR-COST-AI-MOCK).
 *
 * Une réponse simulée réaliste part de la demande : mot-clé, niveau, termes,
 * texte saisi… Ces valeurs arrivent dans la consigne, sous la forme que lui
 * donnent les gabarits : une ligne « - **Libellé** : valeur » ou une section
 * « ## Titre ». Ce module n'est pas une réponse préparée : `index.ts` ne
 * l'importe pas.
 */

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

/** Valeur d'une ligne « - **Libellé** : valeur » de la consigne, ou `null`. */
export function promptField(prompt: string, label: string): string | null {
  const match = new RegExp(`^- \\*\\*${escapeRegExp(label)}\\*\\* : ([^\\n]*)$`, 'm').exec(prompt)
  const value = match?.[1]?.trim()
  return value ? value : null
}

/** Contenu d'une section « ## Titre », jusqu'à la section suivante, ou `null`. */
export function promptSection(prompt: string, title: string): string | null {
  const marker = `## ${title}\n`
  const start = prompt.indexOf(marker)
  if (start < 0) return null
  const rest = prompt.slice(start + marker.length)
  const end = rest.search(/\n## /)
  const value = (end < 0 ? rest : rest.slice(0, end)).trim()
  return value ? value : null
}

/** Première lettre en majuscule. */
export function capitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

/** Phrases d'un texte (coupe après « . ! ? … » suivis d'une majuscule). */
export function sentences(text: string): string[] {
  return text.trim().split(/(?<=[.!?…])\s+(?=[\p{Lu}«"(])/u).map(s => s.trim()).filter(Boolean)
}

/**
 * Fusion de plusieurs textes en un seul : les phrases dans l'ordre des textes,
 * sans doublon, au plus `max` phrases, chacune terminée par une ponctuation.
 */
export function mergeTexts(texts: string[], max: number): string {
  const seen = new Set<string>()
  const kept: string[] = []
  for (const text of texts) {
    for (const sentence of sentences(text)) {
      const key = sentence.toLowerCase().replace(/[^\p{L}\d]+/gu, ' ').trim()
      if (!key || seen.has(key)) continue
      seen.add(key)
      kept.push(/[.!?…]$/.test(sentence) ? sentence : `${sentence}.`)
    }
  }
  return kept.slice(0, max).join(' ')
}
