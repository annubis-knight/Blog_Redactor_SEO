/**
 * Identité web du site PropulSite — une seule source de vérité.
 *
 * Avant le 2026-09-21, trois adresses coexistaient dans le code : les liens
 * internes pointaient vers `/<slug>`, les données structurées vers
 * `https://propulsite.fr/pages/<slug>`, et le fil d'Ariane vers
 * `https://propulsite.fr/blog/<cocon>` — sur un domaine qui n'est même pas
 * celui du site (audit 2026-09-19).
 *
 * Domaine validé par l'utilisateur : www.propulsitetoulouse.website.
 * Côté serveur, `SITE_URL` dans `.env` peut le remplacer (pré-production).
 */

/** Origine du site, sans barre oblique finale. */
export const SITE_ORIGIN = 'https://www.propulsitetoulouse.website'

/** Préfixe des articles de blog, sans barre oblique finale. */
export const BLOG_PATH = '/blog'

/** Chemin absolu d'un article : `/blog/<slug>`. */
export function blogPath(slug: string): string {
  return `${BLOG_PATH}/${slug.replace(/^\/+/, '')}`
}

/** URL complète d'un article, pour les données structurées et le canonical. */
export function blogUrl(slug: string, origin: string = SITE_ORIGIN): string {
  return `${origin.replace(/\/+$/, '')}${blogPath(slug)}`
}
