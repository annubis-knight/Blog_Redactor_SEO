/**
 * Prompts du Cerveau (stratégie d'article et de cocon).
 *
 * Chaque fonction charge son modèle par `loadPrompt` avec EXACTEMENT les
 * variables qu'il attend (FR-INFRA-PROMPT-LAYERS) : plus de lecture à la main
 * ni de `.replace` sur la première occurrence (K5). Un bloc facultatif du
 * modèle (`{{#themeContext}}…{{/themeContext}}`) disparaît quand sa variable
 * est vide ; avant, deux marqueurs partaient tels quels chez l'IA
 * (`{{#stepDescription}}`, `{{#topicSuggestions}}` à l'étape `articles`).
 */
import type { z } from 'zod'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { addArticlePromptVariables, type AddArticlePromptInput } from './cocoon-add-article-prompt.js'
import type {
  strategySuggestRequestSchema,
  cocoonSuggestRequestSchema,
  strategyDeepenRequestSchema,
  strategyConsolidateRequestSchema,
  strategyEnrichRequestSchema,
} from '../../../shared/schemas/strategy.schema.js'

type StrategySuggestRequest = z.infer<typeof strategySuggestRequestSchema>
type CocoonSuggestRequest = z.infer<typeof cocoonSuggestRequestSchema>
type DeepenRequest = z.infer<typeof strategyDeepenRequestSchema>
type ConsolidateRequest = z.infer<typeof strategyConsolidateRequestSchema>
type EnrichRequest = z.infer<typeof strategyEnrichRequestSchema>

const STEP_DESCRIPTIONS: Record<string, string> = {
  cible: "Qui est la cible de cet article ? Décris le persona du lecteur idéal (métier, taille d'entreprise, situation).",
  douleur: "Quel problème ou frustration cet article adresse-t-il ? Quel est le pain point principal du lecteur ?",
  aiguillage: "Quel type d'article est-ce (Pilier, Intermédiaire, Spécialisé) ? Où se situe-t-il dans l'arborescence du cocon ?",
  angle: "Quel est l'angle unique de cet article ? Ce qui le différencie des contenus concurrents.",
  promesse: "Quelle est la promesse concrète faite au lecteur ? Quel résultat tangible va-t-il obtenir ?",
  cta: "Quel est le call-to-action de cet article ? Où voulons-nous envoyer le lecteur après sa lecture ?",
}

const COCOON_STEP_DESCRIPTIONS: Record<string, string> = {
  cible: "À qui s'adresse ce cocon ? Décris le persona du lecteur idéal pour l'ensemble de cette thématique (métier, taille d'entreprise, maturité digitale).",
  douleur: "Quel problème principal ce cocon adresse-t-il ? Quel est le pain point commun aux lecteurs de cette thématique ?",
  angle: "Quel est l'angle de différenciation de ce cocon ? Qu'est-ce qui rend votre approche unique par rapport aux concurrents ?",
  promesse: "Quelle transformation ce cocon promet-il au lecteur ? Quel résultat concret obtiendra-t-il en parcourant vos articles ?",
  cta: "Quel est le call-to-action principal de ce cocon ? Où voulez-vous guider le lecteur après avoir lu vos contenus ?",
  articles: "Proposez une liste d'articles pour ce cocon avec leur type (Pilier, Intermédiaire, Spécialisé) et leur justification.",
  'articles-structure': "Génère le Pilier et les Intermédiaires pour ce cocon.",
  'articles-paa-queries': "Propose des requêtes de recherche Google pour récupérer les PAA par Intermédiaire.",
  'articles-spe': "Génère les articles Spécialisés enrichis par les PAA récupérées.",
  'articles-topics': "Propose les sujets et sous-thèmes à couvrir dans ce cocon pour guider la génération d'articles.",
  'add-article': "Génère un seul article complémentaire du type demandé.",
}

/** Build a markdown block from themeContext for prompt injection */
function buildThemeContextBlock(tc: Record<string, unknown> | undefined): string {
  if (!tc) return ''
  const lines: string[] = []
  if (tc.themeName) lines.push(`- **Thème** : ${tc.themeName}`)
  if (tc.themeDescription) lines.push(`  ${tc.themeDescription}`)
  if (tc.siloDescription) lines.push(`- **Description du silo** : ${tc.siloDescription}`)
  const cfg = tc.themeConfig as Record<string, unknown> | undefined
  if (cfg) {
    // Entreprise
    const biz: string[] = []
    if (cfg.mainPromise) biz.push(`Promesse : ${cfg.mainPromise}`)
    if (cfg.location) biz.push(`Lieu : ${cfg.location}`)
    if (Array.isArray(cfg.differentiators) && cfg.differentiators.length) biz.push(`Différenciateurs : ${cfg.differentiators.join(', ')}`)
    if (Array.isArray(cfg.services) && cfg.services.length) biz.push(`Services : ${cfg.services.join(', ')}`)
    if (cfg.mainCTA) biz.push(`CTA principal : ${cfg.mainCTA}`)
    if (biz.length) {
      lines.push(`- **Entreprise** :`)
      biz.forEach(l => lines.push(`  - ${l}`))
    }
    // Client type
    const client: string[] = []
    if (cfg.targetAudience) client.push(`Audience : ${cfg.targetAudience}`)
    if (cfg.sector) client.push(`Secteur : ${cfg.sector}`)
    if (cfg.companySize) client.push(`Taille : ${cfg.companySize}`)
    if (cfg.budget) client.push(`Budget : ${cfg.budget}`)
    if (cfg.digitalMaturity) client.push(`Maturité digitale : ${cfg.digitalMaturity}`)
    if (Array.isArray(cfg.painPoints) && cfg.painPoints.length) client.push(`Douleurs : ${cfg.painPoints.join(', ')}`)
    if (client.length) {
      lines.push(`- **Client type** :`)
      client.forEach(l => lines.push(`  - ${l}`))
    }
    // Communication
    const comm: string[] = []
    if (cfg.toneStyle) comm.push(`Ton : ${cfg.toneStyle}`)
    if (Array.isArray(cfg.vocabulary) && cfg.vocabulary.length) comm.push(`Vocabulaire : ${cfg.vocabulary.join(', ')}`)
    if (comm.length) {
      lines.push(`- **Communication** :`)
      comm.forEach(l => lines.push(`  - ${l}`))
    }
  }
  if (Array.isArray(tc.cocoonArticles) && tc.cocoonArticles.length) {
    lines.push(`- **Articles du cocon** : ${tc.cocoonArticles.join(', ')}`)
  }
  const cocoonStrat = tc.cocoonStrategy as Record<string, string> | undefined
  if (cocoonStrat && Object.keys(cocoonStrat).length) {
    lines.push(`- **Stratégie cocon validée** :`)
    for (const [step, answer] of Object.entries(cocoonStrat)) {
      lines.push(`  - **${step}** : ${answer}`)
    }
  }
  return lines.length ? lines.join('\n') : ''
}

/** Build a markdown block from previousAnswers */
function buildPreviousAnswersBlock(pa: Record<string, string> | undefined): string {
  if (!pa || Object.keys(pa).length === 0) return ''
  return Object.entries(pa)
    .map(([step, answer]) => `  - **${step}** : ${answer}`)
    .join('\n')
}

/** Bloc de contexte enrichi, précédé de son titre, ou vide. */
function themeContextSection(themeContext: unknown): string {
  const block = buildThemeContextBlock(themeContext as Record<string, unknown> | undefined)
  return block ? `## Contexte enrichi\n${block}` : ''
}

/** Drapeau de section : non vide = la section est gardée. */
const flag = (on: boolean): string => (on ? 'oui' : '')

/** Fusion du texte de l'utilisateur et de la suggestion IA (article ou cocon). */
async function mergePrompt(input: {
  subject: string
  cocoonName: string
  siloName: string
  step: string
  stepDescription: string
  currentInput: string
  mergeWith: string
  existingValidated?: string
  themeContext: unknown
  previousAnswers?: Record<string, string>
}): Promise<string> {
  const prevBlock = buildPreviousAnswersBlock(input.previousAnswers)
  const themeBlock = buildThemeContextBlock(input.themeContext as Record<string, unknown> | undefined)
  const validated = input.existingValidated?.trim() ?? ''
  return loadPrompt('strategy-merge', {
    articleTitle: input.subject,
    cocoonName: input.cocoonName,
    siloName: input.siloName,
    step: input.step,
    stepDescription: input.stepDescription,
    userInput: input.currentInput,
    aiSuggestion: input.mergeWith,
    previousAnswersBlock: prevBlock ? `## Réponses stratégiques déjà validées\n${prevBlock}` : '',
    themeContextBlock: themeBlock ? `## Contexte enrichi\n${themeBlock}` : '',
    existingValidatedBlock: validated ? `## Texte déjà validé pour cette étape\n${input.existingValidated}` : '',
    hasExistingValidated: flag(!!validated),
    noExistingValidated: flag(!validated),
  })
}

/** POST /strategy/:id/suggest — suggestion ou fusion, niveau article. */
export async function articleStrategyPrompt(parsed: StrategySuggestRequest): Promise<string> {
  const ctx = parsed.context
  if (parsed.mergeWith) {
    return mergePrompt({
      subject: ctx.articleTitle,
      cocoonName: ctx.cocoonName,
      siloName: ctx.siloName,
      step: parsed.step,
      stepDescription: STEP_DESCRIPTIONS[parsed.step] ?? '',
      currentInput: parsed.currentInput,
      mergeWith: parsed.mergeWith,
      existingValidated: parsed.existingValidated,
      themeContext: ctx.themeContext,
      previousAnswers: ctx.previousAnswers,
    })
  }
  return loadPrompt('strategy-suggest', {
    articleTitle: ctx.articleTitle,
    cocoonName: ctx.cocoonName,
    siloName: ctx.siloName,
    step: parsed.step,
    stepDescription: STEP_DESCRIPTIONS[parsed.step] ?? '',
    currentInput: parsed.currentInput,
    themeContext: themeContextSection(ctx.themeContext),
    existingArticles: ctx.existingArticles?.join(', ') ?? '',
    previousAnswers: buildPreviousAnswersBlock(ctx.previousAnswers),
  })
}

/** Modèle du Cerveau pour une étape de cocon. */
function cocoonTemplateFor(step: string): string {
  switch (step) {
    case 'articles':
    case 'articles-structure': return 'cocoon-articles'
    case 'articles-topics': return 'cocoon-articles-topics'
    case 'articles-paa-queries': return 'cocoon-paa-queries'
    case 'articles-spe': return 'cocoon-articles-spe'
    case 'add-article': return 'cocoon-add-article'
    default: return 'cocoon-brainstorm'
  }
}

function topicSuggestionsBlock(topics: string[] | undefined, userContext: string | undefined): string {
  const parts: string[] = []
  if (topics?.length) parts.push(`L'utilisateur a sélectionné ces sujets comme pistes d'orientation :\n${topics.map(t => `- ${t}`).join('\n')}`)
  const extra = userContext?.trim()
  if (extra) parts.push(`Contexte additionnel de l'utilisateur :\n> ${extra}`)
  return parts.join('\n\n')
}

function paaContextBlock(paaContext: Record<string, Array<{ question: string }>> | undefined): string {
  if (!paaContext) return ''
  return Object.entries(paaContext)
    .filter(([, questions]) => questions.length > 0)
    .map(([interTitle, questions]) => `### Questions PAA pour "${interTitle}"\n${questions.map(q => `- ${q.question}`).join('\n')}`)
    .join('\n\n')
}

/** POST /strategy/cocoon/:slug/suggest — suggestion ou fusion, niveau cocon. */
export async function cocoonStrategyPrompt(parsed: CocoonSuggestRequest): Promise<string> {
  const ctx = parsed.context
  const stepDescription = COCOON_STEP_DESCRIPTIONS[parsed.step] ?? ''
  if (parsed.mergeWith) {
    return mergePrompt({
      subject: ctx.cocoonName,
      cocoonName: ctx.cocoonName,
      siloName: ctx.siloName,
      step: parsed.step,
      stepDescription,
      currentInput: parsed.currentInput,
      mergeWith: parsed.mergeWith,
      existingValidated: parsed.existingValidated,
      themeContext: ctx.themeContext,
      previousAnswers: ctx.previousAnswers,
    })
  }

  const base = {
    cocoonName: ctx.cocoonName,
    siloName: ctx.siloName,
    themeContext: themeContextSection(ctx.themeContext),
    previousAnswers: buildPreviousAnswersBlock(ctx.previousAnswers),
  }
  const existingArticles = ctx.existingArticles?.join(', ') ?? ''
  const template = cocoonTemplateFor(parsed.step)
  switch (template) {
    case 'cocoon-articles':
      return loadPrompt(template, {
        ...base,
        existingArticles,
        // Seule l'étape « structure » reçoit les pistes choisies par l'utilisateur.
        topicSuggestions: parsed.step === 'articles-structure'
          ? topicSuggestionsBlock(ctx.topicSuggestions, ctx.topicUserContext)
          : '',
      })
    case 'cocoon-articles-topics':
      return loadPrompt(template, { ...base, existingArticles })
    case 'cocoon-paa-queries':
      return loadPrompt(template, { ...base, articles: parsed.currentInput })
    case 'cocoon-articles-spe':
      return loadPrompt(template, { ...base, articles: parsed.currentInput, paaContext: paaContextBlock(ctx.paaContext) })
    case 'cocoon-add-article':
      // FR-CER-TYPE-TOLERANT — le front envoie le niveau en minuscules (`'pilier'`).
      return loadPrompt(template, { ...base, ...addArticlePromptVariables(JSON.parse(parsed.currentInput) as AddArticlePromptInput) })
    default:
      return loadPrompt(template, {
        ...base,
        existingArticles,
        step: parsed.step,
        stepDescription,
        currentInput: parsed.currentInput,
      })
  }
}

/** Approfondir : une sous-question pour l'étape. */
export async function deepenPrompt(parsed: DeepenRequest): Promise<string> {
  const themeBlock = buildThemeContextBlock(parsed.context.themeContext as Record<string, unknown> | undefined)
  const prevBlock = buildPreviousAnswersBlock(parsed.context.previousAnswers)
  return loadPrompt('strategy-deepen', {
    step: parsed.step,
    mainQuestion: parsed.mainQuestion,
    mainAnswer: parsed.mainAnswer,
    existingSubQuestions: parsed.existingSubQuestions.length
      ? parsed.existingSubQuestions.map(sq => `- "${sq.question}" (réponse : ${sq.answer || 'pas encore répondu'})`).join('\n')
      : 'Aucune sous-question existante.',
    previousAnswers: prevBlock || 'Aucune étape validée.',
    contextBlock: themeBlock || 'Pas de contexte supplémentaire.',
  })
}

/** Consolider : une réponse unique à partir des sous-réponses. */
export async function consolidatePrompt(parsed: ConsolidateRequest): Promise<string> {
  const themeBlock = buildThemeContextBlock(parsed.context.themeContext as Record<string, unknown> | undefined)
  return loadPrompt('strategy-consolidate', {
    step: parsed.step,
    mainAnswer: parsed.mainAnswer,
    subAnswers: parsed.subAnswers.map(sa => `**Q :** ${sa.question}\n**R :** ${sa.answer}`).join('\n\n'),
    contextBlock: themeBlock || 'Pas de contexte supplémentaire.',
  })
}

/** Enrichir le texte validé avec une sous-réponse. */
export async function enrichPrompt(parsed: EnrichRequest): Promise<string> {
  const themeBlock = buildThemeContextBlock(parsed.context.themeContext as Record<string, unknown> | undefined)
  const prevBlock = buildPreviousAnswersBlock(parsed.context.previousAnswers)
  const contextLines: string[] = []
  if (parsed.context.articleTitle) contextLines.push(`- **Article** : ${parsed.context.articleTitle}`)
  contextLines.push(`- **Cocon** : ${parsed.context.cocoonName}`)
  contextLines.push(`- **Silo** : ${parsed.context.siloName}`)
  if (prevBlock) contextLines.push(`- **Réponses précédentes** :\n${prevBlock}`)
  if (themeBlock) contextLines.push(themeBlock)
  return loadPrompt('strategy-enrich', {
    step: parsed.step,
    existingValidated: parsed.existingValidated,
    subQuestion: parsed.subQuestion,
    subAnswer: parsed.subAnswer,
    contextBlock: contextLines.join('\n'),
  })
}
