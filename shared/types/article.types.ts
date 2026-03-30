/** Article type in the cocoon hierarchy */
export type ArticleType = 'Pilier' | 'Intermédiaire' | 'Spécialisé'

/** Article publication status */
export type ArticleStatus = 'à rédiger' | 'brouillon' | 'publié'

/** Raw article as stored in BDD_Articles_Blog.json (snake_case) */
export interface RawArticle {
  titre: string
  type: ArticleType
  slug: string
  topic: string | null
}

/** Raw cocoon as stored in BDD_Articles_Blog.json */
export interface RawCocoon {
  nom: string
  articles: RawArticle[]
}

/** Raw silo as stored in BDD_Articles_Blog.json */
export interface RawSilo {
  nom: string
  description: string
  cocons: RawCocoon[]
}

/** Raw theme as stored in BDD_Articles_Blog.json */
export interface RawTheme {
  nom: string
  description: string
}

/** Raw articles database structure (new silo/theme hierarchy) */
export interface RawArticlesDb {
  theme: RawTheme
  silos: RawSilo[]
}

/** Article in camelCase for API responses */
export interface Article {
  title: string
  type: ArticleType
  slug: string
  topic: string | null
  status: ArticleStatus
}

/** Article content (generated, saved per article) */
export interface ArticleContent {
  outline: string | null
  content: string | null
  metaTitle: string | null
  metaDescription: string | null
  seoScore: number | null
  geoScore: number | null
  updatedAt: string | null
}
