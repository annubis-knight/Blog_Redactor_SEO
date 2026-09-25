/**
 * Vérification d'une proposition de passe d'enrichissement
 * (FR-RED-ENRICH-PASSES, FR-RED-ENRICH-SOURCES, FR-RED-SECTION-REWRITE).
 *
 * Une passe propose, chapitre par chapitre, une version enrichie ; l'utilisateur
 * accepte ou refuse. Avant de montrer la proposition, on la juge :
 *   ⛔ proposition vide ou coupée, titres modifiés (une passe enrichit, elle ne
 *      restructure pas), tableau sans en-tête, image sans texte alternatif, FAQ
 *      sans titre ni questions — une telle proposition ne s'accepte pas ;
 *   🔴 lien absent des résultats de la recherche web (retiré, texte gardé), chiffre
 *      sans source ou phrase non française ajoutés, question de FAQ mal formée ;
 *   🟠 marqueur « à sourcer » encore présent après la passe Sources, proposition
 *      identique au texte d'origine.
 */
import { detectNonFrenchSentences, detectUnsourcedFigures } from '../text-quality.js'
import { distinctRules } from './publish.js'
import type { GateIssue } from './gate.js'
import { ARTICLE_TYPE_RULES } from '../constants/article-type-rules.js'
import type { ArticleLevel } from '../types/keyword-validate.types.js'

export const ENRICHMENT_PASSES = ['sources', 'exemples', 'tableaux', 'images', 'faq'] as const
export type EnrichmentPass = (typeof ENRICHMENT_PASSES)[number]

/** Un résultat réel de la recherche web (URL, titre, âge de la page). */
export interface WebSource {
  url: string
  title: string
  pageAge: string | null
}

export interface EnrichmentInput {
  pass: EnrichmentPass | 'reecriture'
  before: string
  after: string
  /** Résultats de la recherche web (passe Sources). */
  webSources?: WebSource[]
  /** Le modèle s'est arrêté avant la fin (plafond, recherche interrompue…) : la proposition est coupée. */
  truncated?: boolean
  /** Type de l'article : nombre de questions attendu dans la FAQ. */
  level?: ArticleLevel
}

const plain = (html: string): string => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const normalizeUrl = (url: string): string => url.trim().replace(/#.*$/, '').replace(/\/+$/, '')
const isExternal = (href: string): boolean => /^https?:\/\//i.test(href)

/**
 * Garde les liens externes trouvés par la recherche web ; retire les autres en
 * gardant leur texte. Les liens internes (`/…`, `#…`) ne sont pas touchés.
 */
export function keepKnownLinks(html: string, sources: WebSource[]): { html: string; removed: string[] } {
  const known = new Set(sources.map(s => normalizeUrl(s.url)))
  const removed: string[] = []
  const out = html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (match, attrs: string, text: string) => {
    const href = /\bhref\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] ?? ''
    if (!isExternal(href) || known.has(normalizeUrl(href))) return match
    removed.push(href)
    return text
  })
  return { html: out, removed }
}

/** Liens externes d'un fragment HTML. */
function externalLinks(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']*)["']/gi)].map(m => m[1]!).filter(isExternal)
}

/**
 * Liens qu'une proposition peut citer : ceux que la recherche web vient de
 * trouver, et ceux que le chapitre citait déjà (une passe Exemples ne doit pas
 * retirer la source posée par la passe Sources).
 */
export function knownSources(before: string, webSources: WebSource[] = []): WebSource[] {
  return [...webSources, ...externalLinks(before).map(url => ({ url, title: '', pageAge: null }))]
}

function headings(html: string, levels: string): string[] {
  return [...html.matchAll(new RegExp(`<(h[${levels}])\\b[^>]*>([\\s\\S]*?)<\\/\\1>`, 'gi'))].map(m => `${m[1]!.toLowerCase()}:${plain(m[2] ?? '')}`)
}

const added = (after: string[], before: string[]): string[] => after.filter(x => !before.includes(x))

/**
 * Blocs et liens posés à la main (bloc valeur, capsule, lien interne ou source) :
 * une clé par élément — `a:href` pour un lien, `balise.classe` sinon. Le
 * marqueur « à sourcer » n'en fait pas partie : la passe sources le retire.
 */
function keptElements(html: string): string[] {
  const keys: string[] = []
  for (const m of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    const tag = m[1]!.toLowerCase()
    const attrs = m[2] ?? ''
    if (tag === 'mark') continue
    const href = /\bhref\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1]
    if (tag === 'a' && href) keys.push(`a:${href}`)
    else if (/\b(class|data-[\w-]+)\s*=/i.test(attrs)) keys.push(`${tag}.${/\bclass\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] ?? ''}`)
  }
  return keys
}

/** Éléments de `before` absents de `after` (en tenant compte des doublons). */
function lostElements(before: string, after: string): string[] {
  const remaining = keptElements(after)
  return keptElements(before).filter((key) => {
    const at = remaining.indexOf(key)
    if (at === -1) return true
    remaining.splice(at, 1)
    return false
  })
}

export function verifyEnrichment(input: EnrichmentInput): GateIssue[] {
  const { pass, before, after } = input
  const issues: GateIssue[] = []

  if (!plain(after)) {
    return [{ rule: 'enrich-empty', level: 'technique', message: 'La proposition est vide.', risk: 'Accepter une proposition vide effacerait le chapitre.' }]
  }
  if (input.truncated) {
    issues.push({ rule: 'enrich-truncated', level: 'technique', message: 'La proposition a été coupée avant la fin.', risk: 'Le chapitre accepté perdrait sa fin.' })
  }
  // Le HTML, pas le seul texte : une image ou un tableau ajouté change le chapitre.
  const squash = (html: string): string => html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim()
  if (squash(after) === squash(before)) {
    issues.push({ rule: 'enrich-unchanged', level: 'attention', message: 'La proposition ne change rien à ce chapitre.' })
  }

  // La FAQ ajoute ses propres titres ; une réécriture peut revoir ses H3, pas son
  // H2 ; le H1 (dans le chapeau) ne change jamais (R17).
  if (pass !== 'faq') {
    const levels = pass === 'reecriture' ? '12' : '123'
    if (headings(after, levels).join('|') !== headings(before, levels).join('|')) {
      issues.push({
        rule: 'enrich-headings-changed',
        level: 'technique',
        message: 'La proposition modifie les titres du chapitre.',
        risk: 'Les titres viennent du sommaire validé : une passe d’enrichissement ne les réécrit pas.',
      })
    }
  }

  const lost = lostElements(before, after)
  if (lost.length) {
    issues.push({
      rule: 'enrich-block-lost',
      level: 'technique',
      message: `La proposition perd ${lost.length > 1 ? `${lost.length} blocs ou liens` : 'un bloc ou un lien'} du chapitre : ${lost.join(', ')}.`,
      risk: 'Blocs (valeur, rappel, capsule) et liens sont posés à la main : une passe ne les retire pas.',
    })
  }

  const { removed } = keepKnownLinks(after, knownSources(before, input.webSources))
  for (const url of removed) {
    issues.push({
      rule: 'enrich-unknown-link',
      level: 'risque',
      message: `Lien absent des résultats de la recherche web : ${url}.`,
      risk: 'Une URL que la recherche n’a pas trouvée peut avoir été inventée. Le lien est retiré, son texte gardé.',
      excerpt: url,
    })
  }

  if (pass === 'sources' && /data-a-sourcer|\[à sourcer/i.test(after)) {
    issues.push({ rule: 'enrich-marker-remaining', level: 'attention', message: 'Un passage « à sourcer » reste : la recherche n’a pas trouvé de source fiable.' })
  }

  for (const sentence of added(detectUnsourcedFigures(after), detectUnsourcedFigures(before))) {
    issues.push({ rule: 'enrich-unsourced-figure', level: 'risque', message: `Chiffre ajouté sans source : « ${sentence.slice(0, 120)} ».`, risk: 'Un chiffre sans source peut être inventé.', excerpt: sentence })
  }
  for (const sentence of added(detectNonFrenchSentences(after), detectNonFrenchSentences(before))) {
    issues.push({ rule: 'enrich-non-french', level: 'risque', message: `Phrase ajoutée qui n’est pas en français : « ${sentence.slice(0, 120)} ».`, risk: 'Un passage en anglais trahit un texte recopié.', excerpt: sentence })
  }

  for (const table of after.match(/<table\b[\s\S]*?<\/table>/gi) ?? []) {
    if (!/<th\b/i.test(table)) {
      issues.push({ rule: 'enrich-table-without-header', level: 'technique', message: 'Un tableau n’a pas de ligne d’en-tête.', risk: 'Sans en-tête, le tableau est illisible pour un lecteur d’écran et pour Google.' })
    }
  }
  for (const img of after.match(/<img\b[^>]*>/gi) ?? []) {
    if (!/\balt\s*=\s*["'][^"']*\S[^"']*["']/i.test(img)) {
      issues.push({ rule: 'enrich-image-without-alt', level: 'technique', message: 'Une image n’a pas de texte alternatif.', risk: 'Le texte alternatif décrit l’image à Google et aux personnes qui ne la voient pas.' })
    }
  }

  if (pass === 'faq') {
    if (!/<h2\b/i.test(after) || !/<h3\b/i.test(after)) {
      issues.push({ rule: 'enrich-faq-malformed', level: 'technique', message: 'La FAQ doit commencer par un titre H2 et poser ses questions en H3.', risk: 'Sans H2, la FAQ se fondrait dans le chapitre précédent ; sans H3, Google n’y voit aucune question.' })
    }
    const questions = headings(after, '3')
    const rules = input.level ? ARTICLE_TYPE_RULES[input.level] : null
    if (rules && questions.length > 0 && (questions.length < rules.faqMin || questions.length > rules.faqMax)) {
      issues.push({ rule: 'enrich-faq-count', level: 'attention', message: `${questions.length} questions : ${rules.faqMin} à ${rules.faqMax} pour un ${rules.label.toLowerCase()}.` })
    }
    for (const question of questions.map(h => h.slice(3))) {
      if (!question.endsWith('?')) {
        issues.push({ rule: 'enrich-faq-not-question', level: 'risque', message: `« ${question} » n’est pas formulé en question.`, excerpt: question })
      }
    }
  }

  return distinctRules(issues)
}
