/**
 * Porte « accepter le premier jet » (FR-RED-DRAFT-SINGLE-PASS, FR-RED-DRAFT-TO-SOURCE).
 *
 * Le pilier 1013 : 15 601 mots pour 2 500 visés, un H1 sans le mot-clé, des
 * phrases en anglais, des paragraphes recopiés d'une section à l'autre, des
 * chiffres de 2024 sans source. Le premier jet est jugé dès sa rédaction, avant
 * les passes d'enrichissement :
 *   ⛔ défauts techniques (texte vide, bloc coupé, texte hors paragraphe, H1 absent…) ;
 *   🔴 longueur hors ±15 % de la cible, chapitre hors de son budget, capitaine
 *      absent du H1 ou de l'introduction, phrase non française, paragraphe
 *      répété, chiffre sans source hors marqueur « à sourcer ».
 *
 * Écart assumé avec l'épopée : un H1 SANS le capitaine est 🔴 (un titre peut
 * intégrer le mot-clé « pas mot pour mot », comme `seo-capitaine-not-in-title`
 * à la publication) ; seul un H1 ABSENT est ⛔.
 */
import { validateArticleContent } from '../content-validators.js'
import { keywordCoverage } from '../seo-validators.js'
import { splitByH2Regex } from '../html-utils.js'
import { sectionBudgets } from '../section-budget.js'
import { countWordsHtml, detectNonFrenchSentences, detectRepeatedParagraphs, detectUnsourcedFigures } from '../text-quality.js'
import { distinctRules, fromContentIssue } from './publish.js'
import type { GateIssue } from './gate.js'

export interface DraftGateInput {
  content: string
  captain: string | null
  /** Longueur visée (micro-contexte, sinon règle du type). */
  targetWords: number
  /** Nombre de chapitres (H2) du sommaire validé. */
  outlineH2Count: number
}

/** Écart toléré sur la longueur totale du premier jet. */
const DRAFT_LENGTH_TOLERANCE = 0.15
/** Un chapitre est hors budget sous la moitié ou au-delà d'une fois et demie. */
const SECTION_MIN_RATIO = 0.5
const SECTION_MAX_RATIO = 1.5

const plain = (html: string): string => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

function h1Text(html: string): string | null {
  const m = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)
  return m ? plain(m[1] ?? '') : null
}

/** Texte avant le premier H2, sans le H1 ; à défaut, les 100 premiers mots. */
function introText(html: string): string {
  const withoutH1 = html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, '')
  const firstH2 = withoutH1.search(/<h2\b/i)
  const intro = plain(firstH2 >= 0 ? withoutH1.slice(0, firstH2) : withoutH1)
  return intro || plain(withoutH1).split(' ').slice(0, 100).join(' ')
}

export function verifyDraft(input: DraftGateInput): GateIssue[] {
  const found: GateIssue[] = []
  const add = (issue: GateIssue) => found.push(issue)

  validateArticleContent(input.content).forEach((i) => {
    const issue = fromContentIssue(i, 'technique')
    if (issue) add(issue)
  })
  if (!input.content.trim()) return distinctRules(found)

  const h1 = h1Text(input.content)
  if (h1 === null) {
    add({ rule: 'draft-h1-missing', level: 'technique', message: 'Le premier jet n’a pas de titre H1.', risk: 'Sans H1, la page n’annonce pas son sujet à Google.' })
  } else if (input.captain && keywordCoverage(input.captain, h1) < 1) {
    add({
      rule: 'draft-captain-not-in-h1',
      level: 'risque',
      message: `Le H1 « ${h1} » ne contient pas le mot-clé principal « ${input.captain} ».`,
      risk: 'Le titre est le signal le plus fort pour Google : sans le mot-clé, la page se positionne mal dessus.',
    })
  }
  if (input.captain && keywordCoverage(input.captain, introText(input.content)) < 0.75) {
    add({
      rule: 'draft-captain-not-in-intro',
      level: 'risque',
      message: `L’introduction ne reprend pas le mot-clé principal « ${input.captain} ».`,
      risk: 'Google et le lecteur jugent le sujet sur les premières lignes.',
    })
  }

  const words = countWordsHtml(input.content)
  const target = input.targetWords
  if (target > 0 && Math.abs(words - target) > target * DRAFT_LENGTH_TOLERANCE) {
    add({
      rule: 'draft-length-off-target',
      level: 'risque',
      message: `${words.toLocaleString('fr-FR')} mots pour ${target.toLocaleString('fr-FR')} visés (écart toléré : ±${Math.round(DRAFT_LENGTH_TOLERANCE * 100)} %).`,
      risk: words > target
        ? 'Un premier jet trop long dilue le sujet et laisse peu de place aux passes d’enrichissement.'
        : 'Un premier jet trop court traite le sujet en surface.',
    })
  }

  const split = splitByH2Regex(input.content)
  const budgets = sectionBudgets(Math.max(input.outlineH2Count, split.sections.length), target)
  split.sections.forEach((section, i) => {
    const budget = budgets[i]?.budget
    if (!budget) return
    // Le chapeau (avant le premier H2) compte dans le premier chapitre.
    const sectionWords = countWordsHtml(section.fullHtml) + (i === 0 ? countWordsHtml(split.intro.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, '')) : 0)
    if (sectionWords < budget * SECTION_MIN_RATIO || sectionWords > budget * SECTION_MAX_RATIO) {
      add({
        rule: 'draft-section-off-budget',
        level: 'risque',
        message: `Le chapitre « ${section.title} » fait ${sectionWords} mots pour environ ${budget} prévus.`,
        risk: 'Un chapitre démesuré (ou vide) déséquilibre l’article et empiète sur les autres.',
        excerpt: section.title,
      })
    }
  })

  for (const sentence of detectNonFrenchSentences(input.content)) {
    add({ rule: 'draft-non-french', level: 'risque', message: `Phrase qui n’est pas en français : « ${sentence.slice(0, 120)} ».`, risk: 'Un passage en anglais trahit un texte recopié et perd le lecteur.', excerpt: sentence })
  }
  for (const paragraph of detectRepeatedParagraphs(input.content)) {
    add({ rule: 'draft-repeated-paragraph', level: 'risque', message: `Paragraphe répété : « ${paragraph}… ».`, risk: 'Un texte qui se répète lasse le lecteur et ressemble à du remplissage.', excerpt: paragraph })
  }
  for (const sentence of detectUnsourcedFigures(input.content)) {
    add({
      rule: 'draft-unsourced-figure',
      level: 'risque',
      message: `Chiffre sans source : « ${sentence.slice(0, 120)} ».`,
      risk: 'Un chiffre sans source peut être inventé. Le premier jet doit le poser « à sourcer » ; la passe « sources » le vérifiera.',
      excerpt: sentence,
    })
  }

  return distinctRules(found)
}
