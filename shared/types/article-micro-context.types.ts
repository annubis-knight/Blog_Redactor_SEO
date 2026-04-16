export interface ArticleMicroContext {
  id: number
  slug: string
  angle: string           // Obligatoire — angle différenciant de cet article
  tone: string            // Ton/style spécifique (défaut: '')
  directives: string      // Consignes libres pour la rédaction (défaut: '')
  targetWordCount?: number // Nombre de mots cible ajusté par l'utilisateur
  updatedAt: string       // ISO timestamp
}
