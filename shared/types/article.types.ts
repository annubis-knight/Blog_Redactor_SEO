/** Article type in the cocoon hierarchy */
export type ArticleType = 'Pilier' | 'Intermédiaire' | 'Spécialisé'

/** Article publication status */
export type ArticleStatus = 'à rédiger' | 'brouillon' | 'publié'

/** Article workflow phase */
export type ArticlePhase = 'proposed' | 'moteur' | 'redaction' | 'published'

/** Raw article as stored in BDD_Articles_Blog.json (snake_case) */
export interface RawArticle {
  id: number              // stable unique identifier
  titre: string
  type: ArticleType
  slug: string            // kept for SEO/export
  topic: string | null
  status?: ArticleStatus           // publication status (default: 'à rédiger')
  phase?: ArticlePhase             // workflow phase (default: 'proposed')
  completedChecks?: string[]       // moteur workflow checks
  checkTimestamps?: Record<string, string>  // { checkName: ISO timestamp }
  /** Keyword suggéré par la strategie à la création (copié depuis proposedArticles[].suggestedKeyword) */
  suggestedKeyword?: string | null
  /** Keyword Capitaine locké — miroir de richCaptain.keyword quand richCaptain.status === 'locked' */
  captainKeywordLocked?: string | null
  createdAt?: string      // ISO timestamp
  updatedAt?: string      // ISO timestamp
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
  id: number              // stable unique identifier
  title: string
  type: ArticleType
  slug: string            // kept for SEO/export
  topic: string | null
  status: ArticleStatus
  phase: ArticlePhase
  completedChecks: string[]
  checkTimestamps?: Record<string, string>
  /** Keyword suggéré à la création (hérité de la strategie) */
  suggestedKeyword: string | null
  /** Keyword Capitaine locké (source canonique pour recap-toggle) */
  captainKeywordLocked: string | null
  createdAt?: string      // ISO timestamp
  updatedAt?: string      // ISO timestamp
}

/** Article content (generated, saved per article) */
export interface ArticleContent {
  outline: Record<string, unknown> | string | null
  content: string | null
  metaTitle: string | null
  metaDescription: string | null
  seoScore: number | null
  geoScore: number | null
  updatedAt: string | null
}
