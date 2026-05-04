/**
 * Branded types — discipline data-flow.
 *
 * Pourquoi : un identifiant est une string, mais TOUTES les strings ne sont pas
 * des identifiants. Un cocoonId passé à une fonction qui attend un articleId
 * compile sans erreur en TypeScript classique. Les branded types empêchent
 * cette confusion à la compilation.
 *
 * Migration progressive : on ne migre pas tout d'un coup. On utilise les branded
 * types pour TOUT NOUVEAU code et on convertit l'existant à l'occasion (lors
 * d'une modif d'un store/service touchant à un identifiant).
 *
 * Cast explicite (échappatoire) :
 *   const id = rawString as ArticleId  // accepté mais signale intention
 *
 * Constructeur typé (recommandé) :
 *   const id = ArticleId(rawString)
 *
 * Le type Score est déjà défini dans `shared/score/types.ts` — ne pas dupliquer ici.
 * Importer depuis `shared/score/index.ts` pour les helpers de comparaison/agrégation.
 */

// ============================================================================
// Identifiants opaques
// ============================================================================

export type ArticleId = string & { readonly __brand: 'ArticleId' }
export type CocoonId = string & { readonly __brand: 'CocoonId' }
export type SiloId = string & { readonly __brand: 'SiloId' }
export type StrategyId = string & { readonly __brand: 'StrategyId' }
// Ajouter ici les identifiants métier au fur et à mesure (KeywordId si pertinent, etc.)

// Constructeurs typés (préférés au cast)
export const ArticleId = (s: string): ArticleId => s as ArticleId
export const CocoonId = (s: string): CocoonId => s as CocoonId
export const SiloId = (s: string): SiloId => s as SiloId
export const StrategyId = (s: string): StrategyId => s as StrategyId
