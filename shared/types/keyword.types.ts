/** Keyword type classification */
export type KeywordType = 'Pilier' | 'Moyenne traine' | 'Longue traine'

/** Raw keyword as stored in BDD_Mots_Clefs_SEO.json (snake_case) */
export interface RawKeyword {
  mot_clef: string
  cocon_seo: string
  type_mot_clef: KeywordType
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
}
