/**
 * Communes de la région toulousaine (Haute-Garonne principalement + voisines).
 * Utilisée par shared/utils/keyword-modifiers.ts pour détecter les termes "local".
 *
 * Le projet cible la région toulousaine → liste volontairement restreinte
 * (Toulouse + communes limitrophes + départements et régions pertinents).
 * À élargir si le périmètre géographique change.
 */

export const FRENCH_CITIES: readonly string[] = [
  // Toulouse et agglomération (communes principales de Toulouse Métropole)
  'toulouse',
  'blagnac', 'colomiers', 'tournefeuille', 'cugnaux', 'balma', 'saint-orens', 'saint-orens-de-gameville',
  'ramonville', 'ramonville-saint-agne', 'l-union', 'union', 'launaguet', 'beauzelle', 'aucamville',
  'fenouillet', 'fonbeauzard', 'saint-jean', 'pibrac', 'plaisance', 'plaisance-du-touch',
  'villeneuve-tolosane', 'portet', 'portet-sur-garonne', 'roques', 'seysses', 'castanet', 'castanet-tolosan',
  'labege', 'escalquens', 'auzeville', 'auzeville-tolosane', 'quint-fonsegrives', 'flourens',
  'mondonville', 'cornebarrieu', 'gagnac', 'lespinasse', 'bruguieres', 'castelginest',
  'villeneuve', 'villeneuve-les-bouloc', 'saint-alban', 'saint-jory',

  // Haute-Garonne — autres communes notables
  'muret', 'saint-gaudens', 'revel', 'villefranche', 'villefranche-de-lauragais', 'frouzins',
  'leguevin', 'montastruc-la-conseillere', 'lherm', 'carbonne', 'rieumes',

  // Départements/régions proches
  'haute-garonne', 'ariege', 'tarn', 'tarn-et-garonne', 'gers', 'aude', 'hautes-pyrenees', 'lot',
  'occitanie', 'midi-pyrenees',

  // Pays (au cas où)
  'france',
]

/** Set pour lookup O(1). Tous en lowercase, accents retirés où pertinent. */
export const FRENCH_CITIES_SET: ReadonlySet<string> = new Set(FRENCH_CITIES)
