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

/**
 * Mot-clé de travail des onglets Lieutenants, Structure et Lexique du Moteur :
 * le Capitaine enregistré de l'article, à défaut le mot-clé de l'article (le
 * mot-clé suggéré). Une valeur vide ne compte pas : après un déverrouillage, ou
 * pour un article jamais étudié, le Capitaine enregistré vaut `''`, et « Analyser
 * SERP » comme « Extraire le Lexique » restaient grisés (recette du 2026-09-30,
 * FIN-4). `null` quand il n'y en a aucun.
 */
export function moteurWorkingKeyword(storedCaptain: string | null | undefined, articleKeyword: string | null | undefined): string | null {
  return storedCaptain?.trim() || articleKeyword?.trim() || null
}

/**
 * Mot-clé sur lequel porte l'analyse IA du brief (FR-RED-BRIEF) : le capitaine
 * enregistré de l'article, à défaut son capitaine verrouillé, à défaut son
 * mot-clé suggéré, à défaut son titre. Une valeur vide ne compte pas : un
 * capitaine enregistré `''` passait tel quel et le serveur refusait la demande
 * (recette du 2026-09-30, RED-1).
 */
export function articleBriefKeyword(input: {
  storedCaptain?: string | null
  captainKeywordLocked?: string | null
  suggestedKeyword?: string | null
  title: string
}): string {
  return input.storedCaptain?.trim()
    || input.captainKeywordLocked?.trim()
    || input.suggestedKeyword?.trim()
    || input.title
}
