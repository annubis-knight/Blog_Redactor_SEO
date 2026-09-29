/**
 * Empreinte du texte sur lequel porte un score (FR-RED-SEO-SCORE-PERSIST).
 *
 * Le score SEO note le contenu ET la méta (meta title, meta description) : son
 * empreinte les réunit. Le score GEO ne dépend que du contenu : son empreinte
 * est le contenu lui-même. Deux empreintes égales = le même texte noté.
 */
export function seoScoreKey(content: string, metaTitle: string | null, metaDescription: string | null): string {
  return `${content}\u0000${metaTitle ?? ''}\u0000${metaDescription ?? ''}`
}
