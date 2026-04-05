/** Keyword type classification */
export type KeywordType = 'Pilier' | 'Moyenne traine' | 'Longue traine' | 'Intermédiaire' | 'Spécialisé'

/** Keyword validation status in the moteur workflow */
export type KeywordStatus = 'suggested' | 'validated' | 'rejected'

/** Raw keyword as stored in BDD_Mots_Clefs_SEO.json (snake_case) */
export interface RawKeyword {
  mot_clef: string
  cocon_seo: string
  type_mot_clef: KeywordType
  statut?: KeywordStatus
}

/** Raw keywords database structure */
export interface RawKeywordsDb {
  seo_data: RawKeyword[]
}

/** Keyword in camelCase for API responses */
export interface Keyword {
  keyword: string
  cocoonName: string
  type: KeywordType
  status: KeywordStatus
}

/** Keywords assigned to a specific article with 3-level hierarchy */
export interface ArticleKeywords {
  articleSlug: string
  capitaine: string            // 1 main keyword (Title, H1, URL)
  lieutenants: string[]        // 2-5 secondary variants (H2, H3)
  lexique: string[]            // 10-15 LSI terms (body text)
  rootKeywords?: string[]      // Root variants from Capitaine deconstruction
}

/** Raw storage format for article-keywords.json */
export interface RawArticleKeywordsDb {
  keywords_par_article: ArticleKeywords[]
}
