// @vitest-environment node
/**
 * NFR-UX-SCREEN-TEXT — un texte d'écran porte ses accents.
 *
 * Recette du 2026-09-30 : des dizaines de textes fixes de l'interface étaient
 * écrits sans accents (« Resultats SERP », « Suggerer par IA », « Rafraichir »,
 * « Lieutenants proposes par l'IA »…). Ce valideur léger, sans dépendance et
 * sans réseau, lit le texte que l'utilisateur voit — texte des `<template>`,
 * chaînes de caractères des composants et du code de l'écran (`src/`) — et
 * refuse les formes qui n'existent jamais sans accent en français.
 *
 * Il ne touche pas au texte des articles, écrit par l'IA et jugé par la porte
 * de publication. Les mots qui existent aussi sans accent (« a » / « à »,
 * « valide » / « validé ») ne peuvent pas être jugés ainsi : ils ont été relus
 * à la main le 2026-09-30.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')
const BACKSLASH = String.fromCharCode(92)

/**
 * Formes sans accent qui ne sont jamais correctes en français, et qui ne sont
 * pas des mots anglais courants dans le code (« selection », « element »,
 * « generation », « resume »… n'y figurent pas). Comparées en minuscules, mot
 * entier ; les mots composés gardent leur trait d'union.
 */
export const NEVER_WITHOUT_ACCENT: Record<string, string> = {
  resultat: 'résultat', resultats: 'résultats', deja: 'déjà', ete: 'été', etre: 'être', tres: 'très', apres: 'après',
  requete: 'requête', requetes: 'requêtes', suggerer: 'suggérer', suggere: 'suggéré', suggeree: 'suggérée', suggerees: 'suggérées', suggeres: 'suggérés',
  generer: 'générer', generez: 'générez', genere: 'généré', generee: 'générée', generees: 'générées', generes: 'générés',
  regenerer: 'régénérer', regenere: 'régénéré',
  strategie: 'stratégie', strategies: 'stratégies', strategique: 'stratégique', strategiques: 'stratégiques',
  differenciateur: 'différenciateur', differenciateurs: 'différenciateurs', differenciant: 'différenciant', differenciante: 'différenciante',
  specifique: 'spécifique', specifiques: 'spécifiques', specialise: 'spécialisé', specialises: 'spécialisés',
  semantique: 'sémantique', semantiques: 'sémantiques', thematique: 'thématique', thematiques: 'thématiques',
  reinitialiser: 'réinitialiser', reinitialise: 'réinitialisé', deverrouiller: 'déverrouiller', deverrouille: 'déverrouillé',
  rafraichir: 'rafraîchir', rafraichi: 'rafraîchi', derniere: 'dernière', dernieres: 'dernières',
  etape: 'étape', etapes: 'étapes', etat: 'état', etats: 'états', donnee: 'donnée', donnees: 'données',
  reponse: 'réponse', reponses: 'réponses', creer: 'créer', cree: 'créé', creee: 'créée', creees: 'créées', crees: 'créés',
  selectionnez: 'sélectionnez', selectionner: 'sélectionner', selectionne: 'sélectionné', selectionnee: 'sélectionnée',
  selectionnes: 'sélectionnés', selectionnees: 'sélectionnées',
  prealable: 'préalable', categorie: 'catégorie', categories: 'catégories', critere: 'critère', criteres: 'critères',
  periode: 'période', periodes: 'périodes', pedagogique: 'pédagogique', intermediaire: 'intermédiaire', intermediaires: 'intermédiaires',
  'mot-cle': 'mot-clé', 'mots-cles': 'mots-clés', cle: 'clé', cles: 'clés', 'longue-traine': 'longue traîne', traine: 'traîne', traines: 'traînes',
  scrapees: 'récupérées', reperer: 'repérer', renvoye: 'renvoyé', renvoyee: 'renvoyée', 
  trouvee: 'trouvée', trouvees: 'trouvées', ecosysteme: 'écosystème', verifier: 'vérifier', verifie: 'vérifié', verifiee: 'vérifiée',
  echec: 'échec', echecs: 'échecs', echoue: 'échoué', echouee: 'échouée',
  reessayer: 'réessayer', precedente: 'précédente', precedemment: 'précédemment', telecharger: 'télécharger', telecharge: 'téléchargé',
  presente: 'présente', reel: 'réel', reels: 'réels', reelle: 'réelle', reelles: 'réelles', numero: 'numéro', modele: 'modèle',
  systeme: 'système', memoire: 'mémoire', equipe: 'équipe', resumer: 'résumer', reduire: 'réduire', reecrire: 'réécrire',
  reecriture: 'réécriture', identifiee: 'identifiée', proposee: 'proposée', proposees: 'proposées',
  validee: 'validée', validees: 'validées', affichee: 'affichée', affichees: 'affichées', enregistree: 'enregistrée', enregistrees: 'enregistrées',
  sauvegardee: 'sauvegardée', ajustee: 'ajustée', mesuree: 'mesurée', mesurees: 'mesurées', analysee: 'analysée', analysees: 'analysées',
  presentes: 'présentes', recu: 'reçu', recus: 'reçus', recue: 'reçue', recues: 'reçues', detecte: 'détecté', detectes: 'détectés',
  detectee: 'détectée', detectees: 'détectées', resonance: 'résonance', ecrase: 'écrase', ecraser: 'écraser', cochee: 'cochée', cochees: 'cochées',
  precis: 'précis', defaut: 'défaut', theme: 'thème', themes: 'thèmes', 'sous-theme': 'sous-thème', 'sous-themes': 'sous-thèmes',
  apparait: 'apparaît', regeneration: 'régénération', ecrire: 'écrire', ecrit: 'écrit', ecrite: 'écrite',
  succes: 'succès', acces: 'accès', controle: 'contrôle', controler: 'contrôler', frequence: 'fréquence',
  priorite: 'priorité', qualite: 'qualité', quantite: 'quantité', densite: 'densité', difficulte: 'difficulté', visibilite: 'visibilité',
  verite: 'vérité', entite: 'entité', entites: 'entités', activite: 'activité', proximite: 'proximité',
}

/**
 * Valeurs de données, pas des libellés : le type d'un mot-clé (`KeywordType`,
 * `shared/types/keyword.types.ts`) est enregistré en base sous ces formes. Les
 * accentuer casserait les données existantes ; leur libellé affiché passe par
 * les composants.
 */
const DATA_VALUES = ['Moyenne traine', 'Longue traine']

function files(dir: string, exts: string[], out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files(full, exts, out)
    else if (exts.some(e => entry.name.endsWith(e))) out.push(full)
  }
  return out
}

/**
 * Une chaîne d'un seul mot en minuscules (`'intermediaire'`, `'reecriture'`,
 * `` `reecriture:${i}` ``, `'/theme/:themeId'`) est une valeur du code — niveau
 * d'article, identifiant d'onglet, clé, chemin d'API — et non un libellé : ces
 * valeurs sont enregistrées ou comparées telles quelles, leur libellé affiché
 * passe par une table de correspondance.
 */
export function isCodeValue(s: string): boolean {
  return /^\/?[a-z][A-Za-z0-9_:./-]*$/.test(s.replace(/\$\{[^}]*\}/g, ''))
}

const LETTER = /[A-Za-zÀ-ÿ]/

/** Apostrophe entre deux lettres : une élision (« l'IA », « n'a »), pas un guillemet. */
function isElision(line: string, i: number): boolean {
  return line[i] === "'" && LETTER.test(line[i - 1] ?? '') && LETTER.test(line[i + 1] ?? '')
}

/** Chaînes entre apostrophes ou accents graves, appariées dans l'ordre (apostrophe échappée comprise), hors valeurs du code. */
function quoted(line: string, quotes: string): string[] {
  const out: string[] = []
  let quote: string | null = null
  let current = ''
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!
    if (isElision(line, i)) { if (quote) current += c; continue }
    if (quote) {
      if (c === BACKSLASH) { current += line[i + 1] ?? ''; i++; continue }
      if (c === quote) { if (!isCodeValue(current)) out.push(current); quote = null; current = ''; continue }
      current += c
    } else if (quotes.includes(c)) {
      quote = c
    }
  }
  return out
}

/** Texte affiché d'une ligne de `<template>` : texte entre balises, chaînes, attributs de libellé. */
export function templateVisibleText(line: string): string[] {
  const parts: string[] = []
  const text = (s: string): string => s.replace(/\{\{.*?\}\}/g, ' ')
  // texte fixe entre balises (hors interpolations), y compris celui qui commence
  // ou finit sur une autre ligne (`<span>Scraping SERP Google` … `</span>`)
  // (la flèche `=>` d'un attribut n'est pas une fin de balise)
  for (const m of line.matchAll(/(?<!=)>([^<>]+)</g)) parts.push(text(m[1]!))
  const opening = line.match(/(?<!=)>([^<>]+)$/)
  if (opening && !/^\s*[\w-]+=/.test(opening[1]!)) parts.push(text(opening[1]!))
  const closing = line.match(/^([^<>="]+)<\//)
  if (closing) parts.push(text(closing[1]!))
  // libellés d'attributs fixes : title, placeholder, alt, et ceux dont le nom finit
  // par label, title, text, message, hint ou description (`empty-label="…"`)
  for (const m of line.matchAll(/(?:^|\s)(?:placeholder|alt|[\w-]*(?:label|title|text|message|hint|description))="([^"]*)"/gi)) parts.push(m[1]!)
  // chaînes des interpolations et des attributs liés (`{{ a ? 'Réessayer' : '…' }}`, `:title="'…'"`)
  parts.push(...quoted(line, "'`"))
  // ligne de texte seule (sans balise ni code ; les élisions « l'IA » et les parenthèses restent du texte)
  const plain = text(line).replace(/([A-Za-zÀ-ÿ])'(?=[A-Za-zÀ-ÿ])/g, '$1 ')
  if (!/[<>{}=;'`"]|=>|^\s*[:@#]|^\s*v-/.test(plain) && plain.trim()) parts.push(plain)
  return parts
}

/** Chaînes d'une ligne de code (script, `.ts`), hors journaux et commentaires. */
export function codeVisibleText(line: string): string[] {
  if (/\blog\.(debug|info|warn|error)\(|console\.|^\s*(\*|\/\/|\/\*|import )/.test(line)) return []
  return quoted(line.replace(/\/\/.*$/, ''), "'`\"").filter(s => !s.startsWith('['))
}

export function unaccentedWords(text: string): string[] {
  const found: string[] = []
  // Le code d'une chaîne à trous (`${objet.propriete}`) n'est pas du texte affiché.
  let visible = text.replace(/\$\{[^}]*\}/g, ' ')
  for (const value of DATA_VALUES) visible = visible.split(value).join(' ')
  for (const m of visible.matchAll(/[A-Za-zÀ-ÿ]+(?:-[A-Za-zÀ-ÿ]+)*/g)) {
    if (m[0].toLowerCase() in NEVER_WITHOUT_ACCENT) found.push(m[0])
  }
  return found
}

function offendersOf(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const lines = source.split('\n')
  const out: string[] = []
  const rel = relative(ROOT, file).replaceAll(BACKSLASH, '/')
  let inTemplate = false
  let inStyle = false
  let inHtmlComment = false
  lines.forEach((raw, i) => {
    const t = raw.trimStart()
    if (file.endsWith('.vue')) {
      if (t.startsWith('<template')) inTemplate = true
      if (t.startsWith('<style')) inStyle = true
      if (t.startsWith('</style>')) { inStyle = false; return }
    }
    if (inStyle) return
    // Un commentaire HTML ne s'affiche pas.
    let text = raw
    if (inTemplate) {
      if (inHtmlComment) {
        const end = text.indexOf('-->')
        if (end < 0) return
        inHtmlComment = false
        text = text.slice(end + 3)
      }
      text = text.replace(/<!--.*?-->/g, ' ')
      const open = text.indexOf('<!--')
      if (open >= 0) { inHtmlComment = true; text = text.slice(0, open) }
    }
    const parts = inTemplate ? templateVisibleText(text) : codeVisibleText(text)
    for (const word of parts.flatMap(unaccentedWords)) {
      out.push(`${rel}:${i + 1} — « ${word} » → « ${NEVER_WITHOUT_ACCENT[word.toLowerCase()]} » : ${text.trim().slice(0, 100)}`)
    }
    if (file.endsWith('.vue') && t.startsWith('</template>')) inTemplate = false
  })
  return out
}

describe('NFR-UX-SCREEN-TEXT — les textes d\'écran portent leurs accents', () => {
  it('aucun texte fixe de l\'interface (src/) n\'est écrit sans ses accents', () => {
    const offenders = files(join(ROOT, 'src'), ['.vue', '.ts']).flatMap(offendersOf)
    expect(
      offenders,
      `Texte d'écran sans accent : écris le mot avec ses accents.\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('sentinelle : repère un mot sans accent, pas sa forme correcte ni un identifiant', () => {
    expect(unaccentedWords('Resultats SERP : 10')).toEqual(['Resultats'])
    expect(unaccentedWords('Résultats SERP : 10')).toEqual([])
    expect(unaccentedWords('Lexique semantique des mots-cles')).toEqual(['semantique', 'mots-cles'])
    expect(unaccentedWords('derniereAnalyse')).toEqual([])
    expect(unaccentedWords('selection generation element')).toEqual([])
    expect(unaccentedWords('il se calcule au Capitaine, tu identifies')).toEqual([])
  })

  it('sentinelle : les valeurs de données et le code des chaînes à trous ne sont pas jugés', () => {
    expect(unaccentedWords("k.type === 'Longue traine' || k.type === 'Moyenne traine'")).toEqual([])
    expect(unaccentedWords('Differenciateur : ${selectedByLevel.differenciateur}')).toEqual(['Differenciateur'])
  })

  it('sentinelle : lit le texte affiché, pas les journaux ni les classes', () => {
    expect(templateVisibleText('<button title="Rafraichir">Rafraichir</button>').flatMap(unaccentedWords)).toEqual(['Rafraichir', 'Rafraichir'])
    expect(templateVisibleText('<div class="etape-carte" data-testid="etape">x</div>').flatMap(unaccentedWords)).toEqual([])
    expect(templateVisibleText('  empty-label="Aucun terme differenciateur"').flatMap(unaccentedWords)).toEqual(['differenciateur'])
    expect(codeVisibleText("notify.error('Echec de la generation des donnees')").flatMap(unaccentedWords)).toEqual(['Echec', 'donnees'])
    expect(codeVisibleText("log.info('[x] donnees recues')")).toEqual([])
  })

  it('sentinelle : une élision n\'ouvre pas de chaîne, un texte sur plusieurs lignes est lu', () => {
    const visible = (line: string): string[] => templateVisibleText(line).flatMap(unaccentedWords)
    expect(visible("L'IA genere des mots-cles, scannes dans l'ecosysteme (PAA)")).toEqual(['genere', 'mots-cles', 'ecosysteme'])
    expect(visible('<span class="step-label">Scraping des donnees')).toEqual(['donnees'])
    expect(visible('  des donnees</span>')).toEqual(['donnees'])
    expect(visible(":title=\"ok ? 'Deverrouiller — l\\'IA pourra' : 'Verrouiller'\"")).toEqual(['Deverrouiller'])
    expect(visible('@input="(e) => $emit(\'update\', e)"')).toEqual([])
    expect(visible('@add="(h: string) => emit(\'add-smart\', \'intermediaire\', h)"')).toEqual([])
  })

  it('sentinelle : une valeur du code (un mot en minuscules) n\'est pas un libellé', () => {
    expect(codeVisibleText("if (level === 'intermediaire') return 'specifique'")).toEqual([])
    expect(codeVisibleText('key: `reecriture:${i}:${Date.now()}`')).toEqual([])
    expect(codeVisibleText("apiGet<Theme>('/theme/config')")).toEqual([])
    expect(codeVisibleText("path: '/theme/:themeId/keywords',")).toEqual([])
    expect(templateVisibleText(`<td :class="{ 'td-active': level === 'specifique' }">x</td>`).flatMap(unaccentedWords)).toEqual([])
    expect(codeVisibleText("label: 'Intermediaire'").flatMap(unaccentedWords)).toEqual(['Intermediaire'])
    expect(codeVisibleText("label: 'niveau intermediaire'").flatMap(unaccentedWords)).toEqual(['intermediaire'])
  })
})
