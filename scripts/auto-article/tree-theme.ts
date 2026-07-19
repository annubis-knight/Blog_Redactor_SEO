/**
 * Habillage coloré de l'arbre SEO (chalk). Séparé de `tree.ts` pour que le
 * rendu reste pur et testable en texte brut.
 *
 * Code couleur : le niveau se lit à la couleur autant qu'à la lettre —
 * Pilier = magenta (la fondation), Intermédiaire = bleu (le corps),
 * Spécialisé = cyan (les feuilles). Un cocon vide est jaune : ce n'est pas une
 * erreur, c'est une opportunité.
 */

import chalk from 'chalk'
import type { ArticleLevel, TreeTheme } from './tree.js'

const LEVEL_COLOR: Record<ArticleLevel, (s: string) => string> = {
  pilier: (s) => chalk.magenta.bold(s),
  intermediaire: (s) => chalk.blue(s),
  specifique: (s) => chalk.cyan(s),
}

export const COLOR_TREE_THEME: TreeTheme = {
  silo: (s) => chalk.bold.white(s),
  cocoon: (s) => chalk.white(s),
  empty: (s) => chalk.yellow.dim(s),
  level: (level, s) => LEVEL_COLOR[level](s),
  article: (s) => chalk.dim(s),
  dim: (s) => chalk.dim(s),
  marker: (s) => chalk.green.bold(s),
}
