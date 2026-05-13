/**
 * Types internes au composable `useArticleProposals` et à ses helpers.
 * Ne pas exposer en dehors du dossier `article-proposals/` ni de `useArticleProposals.ts`.
 *
 * Le type canonique d'un article dans la hiérarchie cocon est `ArticleLevel`
 * (kebab-case ASCII : `'pilier' | 'intermediaire' | 'specifique'`).
 * Cf. TD-DRIFT-004 — l'ancien `ArticleType` PascalCase a été retiré 2026-05-13.
 */
export type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
