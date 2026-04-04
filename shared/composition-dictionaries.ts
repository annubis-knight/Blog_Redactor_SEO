/**
 * Dictionnaires français pour la détection de localisation et d'audience
 * dans les mots-clés SEO.
 *
 * Utilisé par composition-rules.ts — jamais d'appel API, lookup O(1) via Set.
 */

/** Normalise un terme : minuscule + retrait des accents */
function normalize(term: string): string {
  return term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Construit un Set avec les termes originaux + versions normalisées (sans accent) */
function buildNormalizedSet(terms: string[]): Set<string> {
  const set = new Set<string>()
  for (const term of terms) {
    const lower = term.toLowerCase()
    set.add(lower)
    const stripped = normalize(lower)
    if (stripped !== lower) set.add(stripped)
  }
  return set
}

/** Construit un Set de localisation avec pluriels automatiques (ajoute 's' si absent) */
function buildLocationSet(terms: string[]): Set<string> {
  const expanded: string[] = []
  for (const term of terms) {
    expanded.push(term)
    // Ajouter le pluriel si le mot ne finit pas déjà par 's' ou 'x'
    if (!term.endsWith('s') && !term.endsWith('x')) {
      expanded.push(term + 's')
    }
  }
  return buildNormalizedSet(expanded)
}

// ---------------------------------------------------------------------------
// LOCALISATION — villes, adjectifs, régions, départements
// ---------------------------------------------------------------------------

const CITIES_AND_ADJECTIVES = [
  // Top 40 villes + formes adjectivales
  'paris', 'parisien', 'parisienne',
  'marseille', 'marseillais', 'marseillaise',
  'lyon', 'lyonnais', 'lyonnaise',
  'toulouse', 'toulousain', 'toulousaine',
  'nice', 'niçois', 'niçoise',
  'nantes', 'nantais', 'nantaise',
  'montpellier', 'montpelliérain', 'montpelliéraine',
  'strasbourg', 'strasbourgeois', 'strasbourgeoise',
  'bordeaux', 'bordelais', 'bordelaise',
  'lille', 'lillois', 'lilloise',
  'rennes', 'rennais', 'rennaise',
  'reims', 'rémois', 'rémoise',
  'toulon', 'toulonnais', 'toulonnaise',
  'grenoble', 'grenoblois', 'grenobloise',
  'dijon', 'dijonnais', 'dijonnaise',
  'angers', 'angevin', 'angevine',
  'nîmes', 'nîmois', 'nîmoise',
  'clermont-ferrand', 'clermontois', 'clermontoise',
  'brest', 'brestois', 'brestoise',
  'tours', 'tourangeau', 'tourangelle',
  'amiens', 'amiénois', 'amiénoise',
  'limoges', 'limougeaud', 'limougeaude',
  'perpignan', 'perpignanais', 'perpignanaise',
  'metz', 'messin', 'messine',
  'besançon', 'bisontin', 'bisontine',
  'orléans', 'orléanais', 'orléanaise',
  'rouen', 'rouennais', 'rouennaise',
  'caen', 'caennais', 'caennaise',
  'mulhouse', 'mulhousien', 'mulhousienne',
  'nancy', 'nancéien', 'nancéienne',
  'avignon', 'avignonnais', 'avignonnaise',
  'poitiers', 'poitevin', 'poitevine',
  'pau', 'palois', 'paloise',
  'calais', 'calaisien', 'calaisienne',
  'bayonne', 'bayonnais', 'bayonnaise',
  'colmar', 'colmarien', 'colmarienne',
  'troyes', 'troyen', 'troyenne',
  'valence', 'valentinois', 'valentinoise',
  'saint-étienne', 'stéphanois', 'stéphanoise',
  'le-havre', 'havrais', 'havraise',
  'aix-en-provence', 'aixois', 'aixoise',
]

const REGIONS = [
  // 13 régions métropolitaines actuelles
  'auvergne', 'rhône-alpes',
  'bourgogne', 'franche-comté',
  'bretagne',
  'centre',
  'corse',
  'grand-est',
  'normandie',
  'occitanie',
  'provence',
  'alpes',
  // Adjectifs de régions
  'auvergnat', 'auvergnate',
  'bourguignon', 'bourguignonne',
  'breton', 'bretonne',
  'corse',
  'francilien', 'francilienne',
  'normand', 'normande',
  'aquitain', 'aquitaine',
  'occitan', 'occitane',
  'provençal', 'provençale',
  'alpin', 'alpine',
  'alsacien', 'alsacienne',
  'lorrain', 'lorraine',
  'picard', 'picarde',
  'gascon', 'gasconne',
  'basque',
  'catalan', 'catalane',
  'savoyard', 'savoyarde',
]

const DEPARTMENTS = [
  'haute-garonne', 'gironde', 'hérault', 'bouches-du-rhône',
  'nord', 'rhône', 'bas-rhin', 'haut-rhin', 'loire',
  'var', 'seine', 'essonne', 'yvelines', 'marne',
  'isère', 'finistère', 'morbihan',
]

export const LOCATION_TERMS = buildLocationSet([
  ...CITIES_AND_ADJECTIVES,
  ...REGIONS,
  ...DEPARTMENTS,
])

/** Localisations multi-mots (testées avec includes sur le keyword normalisé) */
export const LOCATION_MULTIWORD = [
  'ile de france', 'ile-de-france',
  'val de loire', 'val-de-loire',
  'pays de la loire', 'pays-de-la-loire',
  "cote d'azur", 'cote d azur', 'cote-d-azur',
  'rhone alpes', 'rhone-alpes',
  'franche comte', 'franche-comte',
  'hauts de france', 'hauts-de-france',
  'centre val de loire', 'centre-val-de-loire',
  'bourgogne franche comte', 'bourgogne-franche-comte',
  'auvergne rhone alpes', 'auvergne-rhone-alpes',
  'provence alpes cote d azur', 'provence-alpes-cote-d-azur',
  'grand est',
  'nouvelle aquitaine', 'nouvelle-aquitaine',
  'clermont ferrand', 'clermont-ferrand',
  'saint etienne', 'saint-etienne',
  'aix en provence', 'aix-en-provence',
  'le havre',
]

// ---------------------------------------------------------------------------
// AUDIENCE / CIBLE
// ---------------------------------------------------------------------------

export const AUDIENCE_TERMS = buildNormalizedSet([
  // Termes directs (recommandés par les règles de composition)
  'entreprise', 'entreprises',
  'dirigeant', 'dirigeants', 'dirigeante', 'dirigeantes',
  'professionnel', 'professionnels', 'professionnelle', 'professionnelles',
  // Synonymes recommandés
  'activité', 'activités',
  'structure', 'structures',
  'équipe', 'équipes',
  // Vocabulaire élargi (termes courants)
  'entrepreneur', 'entrepreneurs',
  'gérant', 'gérants', 'gérante', 'gérantes',
  'artisan', 'artisans', 'artisane', 'artisanes',
  'commerçant', 'commerçants', 'commerçante', 'commerçantes',
  'indépendant', 'indépendants', 'indépendante', 'indépendantes',
  'société', 'sociétés',
  'commerce', 'commerces',
  'patron', 'patrons', 'patronne', 'patronnes',
  'responsable', 'responsables',
  'décideur', 'décideurs', 'décideuse', 'décideuses',
  'manager', 'managers',
  'cabinet', 'cabinets',
  'association', 'associations',
  'startup', 'startups', 'start-up',
  'freelance', 'freelances',
  'auto-entrepreneur', 'auto-entrepreneurs',
])

/**
 * Termes audience DÉCONSEILLÉS — ne comptent PAS comme audience valide.
 * Présence déclenchera un message spécifique suggérant des alternatives.
 */
export const DISCOURAGED_AUDIENCE = buildNormalizedSet([
  'pme', 'tpe', 'pmi', 'eti',
])
