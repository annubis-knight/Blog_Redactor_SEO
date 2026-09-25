/**
 * Porte « publier l'article » (FR-RED-PUBLISH-GATE).
 *
 * Le pilier 1013 a été publié avec une méta tronquée, un H1 sans capitaine et
 * un texte six fois trop long : la publication ne vérifiait rien. Cette porte
 * rejoue les valideurs existants (`content-validators`, `seo-validators`), avec
 * une règle de conversion simple :
 *
 *   ⛔ technique — défauts de structure et de méta (contenu vide, bloc tronqué,
 *                  monologue d'IA, méta absente, trop longue ou coupée), image
 *                  encore « à fournir » ;
 *   🔴 risque    — écarts SEO (capitaine absent d'un emplacement clé, texte trop
 *                  court…), chiffres invérifiables, marqueurs « à sourcer » restants ;
 *   🟠 attention — avertissements, et chaque dérogation déjà posée sur l'article,
 *                  réaffichée pour être reconfirmée.
 */
import { validateArticleContent, validateArticleMeta, type ContentIssue } from '../content-validators.js'
import { validateArticleSeo, type SeoInput } from '../seo-validators.js'
import type { GateIssue, GateLevel, GateWaiver } from './gate.js'
import { ARTICLE_TYPE_RULES } from '../constants/article-type-rules.js'
import { detectNonFrenchSentences, detectRepeatedParagraphs, detectUnsourcedFigures } from '../text-quality.js'
import { IMAGE_TO_PROVIDE_SRC } from '../constants/image-placeholder.js'

/** Règles tolérées à la publication : l'export les corrige lui-même. */
const TOLERATED_AT_PUBLISH = new Set(['hn-h1-in-body'])

/**
 * Avertissements qui deviennent 🔴 à la publication : un chiffre invérifiable
 * engage la crédibilité, et le capitaine absent du titre affiché par Google
 * prive la page de son signal le plus visible (épopée qualité SEO, P5).
 */
const RISKY_CONTENT_WARNINGS = new Set(['unverifiable-claim', 'seo-capitaine-not-in-meta-title'])

export interface PublishGateInput extends SeoInput {
  /** Dérogations déjà posées sur l'article, aux autres portes. */
  existingWaivers: GateWaiver[]
}

const GATE_LABELS: Record<string, string> = {
  'captain-lock': 'verrouillage du capitaine',
  'lieutenants-lock': 'verrouillage des lieutenants',
  'lexique-lock': 'validation du lexique',
  'hn-lock': 'verrouillage de la structure',
  'draft': 'premier jet',
}

export function fromContentIssue(issue: ContentIssue, errorLevel: GateLevel): GateIssue | null {
  if (TOLERATED_AT_PUBLISH.has(issue.rule)) return null
  const level: GateLevel = issue.severity === 'error'
    ? errorLevel
    : RISKY_CONTENT_WARNINGS.has(issue.rule) ? 'risque' : 'attention'
  return { rule: issue.rule, level, message: issue.message, excerpt: issue.excerpt }
}

/**
 * Une règle peut viser plusieurs endroits du texte (deux chiffres invérifiables,
 * deux blocs coupés) : chaque alerte reçoit alors son propre identifiant, tiré
 * de l'extrait visé, pour qu'une dérogation n'en couvre qu'une seule
 * (FR-INFRA-GATE-WAIVER) et que l'écran les affiche toutes.
 */
export function distinctRules(issues: GateIssue[]): GateIssue[] {
  const counts = new Map<string, number>()
  for (const issue of issues) counts.set(issue.rule, (counts.get(issue.rule) ?? 0) + 1)
  const used = new Set<string>()
  return issues.map((issue, index) => {
    if ((counts.get(issue.rule) ?? 0) < 2) return issue
    const slug = (issue.excerpt ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
    let rule = `${issue.rule}:${slug || index + 1}`
    if (used.has(rule)) rule = `${rule}-${index + 1}`
    used.add(rule)
    return { ...issue, rule }
  })
}

/** Mots du texte visible (balises retirées). */
function countWords(html: string): number {
  return html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length
}

/**
 * Marqueurs « à sourcer » posés par le premier jet (FR-RED-DRAFT-TO-SOURCE) :
 * chaque `<mark data-a-sourcer>` compte une fois (il contient lui-même le texte
 * « [à sourcer… »), plus chaque texte « [à sourcer… » resté sans sa balise.
 */
export function countToSourceMarkers(html: string): number {
  let marks = 0
  const rest = html.replace(/<mark\b[^>]*data-a-sourcer[^>]*>[\s\S]*?<\/mark>/gi, () => {
    marks++
    return ' '
  })
  return marks + (rest.match(/\[à sourcer/gi) ?? []).length
}

/** Images dont la place a été réservée par la passe images, pas encore fournies. */
function countImagesToProvide(html: string): number {
  return (html.match(/<img\b[^>]*>/gi) ?? []).filter(img => img.includes(IMAGE_TO_PROVIDE_SRC)).length
}

export function verifyPublish(input: PublishGateInput): GateIssue[] {
  const issues: GateIssue[] = []
  const push = (i: GateIssue | null) => { if (i) issues.push(i) }

  const found: GateIssue[] = []
  const collect = (i: GateIssue | null) => { if (i) found.push(i) }
  validateArticleContent(input.content).forEach(i => collect(fromContentIssue(i, 'technique')))
  validateArticleMeta({ metaTitle: input.metaTitle, metaDescription: input.metaDescription })
    .forEach(i => collect(fromContentIssue(i, 'technique')))
  validateArticleSeo(input).forEach(i => collect(fromContentIssue(i, 'risque')))
  // Qualité du texte (FR-RED-DRAFT-SINGLE-PASS) : déjà jugée au premier jet,
  // rejugée ici parce que le texte a pu changer depuis (retouches, passes).
  for (const sentence of detectUnsourcedFigures(input.content)) {
    collect({ rule: 'unsourced-figure', level: 'risque', message: `Chiffre sans source : « ${sentence.slice(0, 120)} ».`, risk: 'Un chiffre sans source peut être inventé ; il fragilise la confiance du lecteur, et celle de Google.', excerpt: sentence })
  }
  for (const sentence of detectNonFrenchSentences(input.content)) {
    collect({ rule: 'non-french-sentence', level: 'risque', message: `Phrase qui n’est pas en français : « ${sentence.slice(0, 120)} ».`, risk: 'Un passage en anglais trahit un texte recopié et perd le lecteur.', excerpt: sentence })
  }
  for (const paragraph of detectRepeatedParagraphs(input.content)) {
    collect({ rule: 'repeated-paragraph', level: 'risque', message: `Paragraphe répété : « ${paragraph}… ».`, risk: 'Un texte qui se répète lasse le lecteur et ressemble à du remplissage.', excerpt: paragraph })
  }
  distinctRules(found).forEach(push)

  // Le plancher de longueur est déjà vérifié (`seo-thin-content`) ; le plafond
  // vient des règles par type : le pilier 1013 faisait 15 601 mots pour 2 500 visés.
  const rules = ARTICLE_TYPE_RULES[input.level]
  const words = countWords(input.content)
  if (words > rules.wordsMax) {
    issues.push({
      rule: 'article-too-long',
      level: 'risque',
      message: `${words.toLocaleString('fr-FR')} mots pour un ${rules.label.toLowerCase()} : au plus ${rules.wordsMax.toLocaleString('fr-FR')} (cible ${rules.targetWords.toLocaleString('fr-FR')}).`,
      risk: 'Un texte démesuré dilue le sujet, se lit mal et empiète sur les articles enfants du cocon.',
    })
  }

  const markers = countToSourceMarkers(input.content)
  if (markers > 0) {
    issues.push({
      rule: 'draft-to-source-remaining',
      level: 'risque',
      message: `${markers} passage${markers > 1 ? 's' : ''} « à sourcer » ${markers > 1 ? 'restent' : 'reste'} dans l’article.`,
      risk: 'Un chiffre ou une affirmation sans source fragilise la confiance du lecteur, et celle de Google.',
    })
  }

  const toProvide = countImagesToProvide(input.content)
  if (toProvide > 0) {
    issues.push({
      rule: 'image-to-provide',
      level: 'technique',
      message: `${toProvide} image${toProvide > 1 ? 's' : ''} encore à fournir (place réservée par la passe images).`,
      risk: 'Le lecteur verrait « Image à fournir » : remplacez l’image ou retirez-la.',
    })
  }

  for (const waiver of input.existingWaivers.filter(w => w.gateId !== 'publish')) {
    issues.push({
      rule: `waiver-reconfirm:${waiver.gateId}:${waiver.rule}`,
      level: 'attention',
      message: `Dérogation posée au ${GATE_LABELS[waiver.gateId] ?? waiver.gateId} (« ${waiver.rule} »)${waiver.reason ? ` : ${waiver.reason}` : ''}.`,
      risk: 'Vérifiez que ce choix tient toujours au moment de publier.',
    })
  }
  return issues
}
