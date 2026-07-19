/**
 * Slugification identique à celle du backend (`addArticlesToCocoon`) :
 * minuscules → NFD → retrait diacritiques → non-alphanum en tirets → trim.
 * Permet de retrouver un article par slug quand la création tombe sur un
 * conflit (ON CONFLICT (slug) DO NOTHING).
 */

const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
