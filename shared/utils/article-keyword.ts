/**
 * Mot-clé principal d'un article : son capitaine verrouillé au Moteur.
 *
 * Le « mot-clé pilier » du pool du cocon n'est pas celui de l'article : pour un
 * intermédiaire, c'est celui du pilier. La rédaction le prenait pour tout
 * article, et retombait sur le titre quand le pool était illisible (épopée
 * qualité SEO, R3). Le titre ne sert que si l'article n'est pas encore passé
 * par le Moteur.
 */
export function articleMainKeyword(article: { captainKeywordLocked?: string | null; title: string }): string {
  return article.captainKeywordLocked?.trim() || article.title
}
