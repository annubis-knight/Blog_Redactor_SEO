import { Router } from 'express'
import { log } from '../utils/logger.js'
import { getStrategy, saveStrategy } from '../services/strategy.service.js'
import { getCocoonStrategy, saveCocoonStrategy } from '../services/cocoon-strategy.service.js'
import { strategySuggestRequestSchema, batchStrategyStatusRequestSchema, cocoonSuggestRequestSchema, strategyDeepenRequestSchema, strategyConsolidateRequestSchema, strategyEnrichRequestSchema } from '../../shared/schemas/strategy.schema.js'
import { streamChatCompletion, USAGE_SENTINEL } from '../services/claude.service.js'
import { readFile } from 'fs/promises'
import { join } from 'path'

const router = Router()

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

const STEP_DESCRIPTIONS: Record<string, string> = {
  cible: "Qui est la cible de cet article ? Décris le persona du lecteur idéal (métier, taille d'entreprise, situation).",
  douleur: "Quel problème ou frustration cet article adresse-t-il ? Quel est le pain point principal du lecteur ?",
  aiguillage: "Quel type d'article est-ce (Pilier, Intermédiaire, Spécialisé) ? Où se situe-t-il dans l'arborescence du cocon ?",
  angle: "Quel est l'angle unique de cet article ? Ce qui le différencie des contenus concurrents.",
  promesse: "Quelle est la promesse concrète faite au lecteur ? Quel résultat tangible va-t-il obtenir ?",
  cta: "Quel est le call-to-action de cet article ? Où voulons-nous envoyer le lecteur après sa lecture ?",
}

/** POST /api/strategy/batch-status */
router.post('/strategy/batch-status', async (req, res) => {
  try {
    const { slugs } = batchStrategyStatusRequestSchema.parse(req.body)
    const statuses: Record<string, { completedSteps: number }> = {}
    await Promise.all(
      slugs.map(async (slug) => {
        const strategy = await getStrategy(slug)
        statuses[slug] = { completedSteps: strategy?.completedSteps ?? 0 }
      }),
    )
    res.json({ data: statuses })
  } catch (err) {
    log.error(`POST /api/strategy/batch-status — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load strategy statuses' } })
  }
})

/** GET /api/strategy/:slug */
router.get('/strategy/:slug', async (req, res) => {
  try {
    const strategy = await getStrategy(req.params.slug)
    res.json({ data: strategy })
  } catch (err) {
    log.error(`GET /api/strategy/${req.params.slug} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load strategy' } })
  }
})

/** PUT /api/strategy/:slug */
router.put('/strategy/:slug', async (req, res) => {
  try {
    const saved = await saveStrategy(req.params.slug, req.body)
    res.json({ data: saved })
  } catch (err) {
    log.error(`PUT /api/strategy/${req.params.slug} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save strategy' } })
  }
})

/** POST /api/strategy/:slug/suggest (also handles merge when mergeWith is present) */
router.post('/strategy/:slug/suggest', async (req, res) => {
  try {
    const parsed = strategySuggestRequestSchema.parse(req.body)
    const isMerge = !!parsed.mergeWith

    const templateFile = isMerge ? 'strategy-merge.md' : 'strategy-suggest.md'
    const promptTemplate = await readFile(
      join(process.cwd(), 'server', 'prompts', templateFile),
      'utf-8',
    )

    let prompt: string
    if (isMerge) {
      const themeBlock = buildThemeContextBlock(parsed.context.themeContext as Record<string, unknown> | undefined)
      const prevBlock = buildPreviousAnswersBlock(parsed.context.previousAnswers)
      const hasValidated = !!parsed.existingValidated?.trim()

      prompt = promptTemplate
        .replace('{{articleTitle}}', parsed.context.articleTitle)
        .replace('{{cocoonName}}', parsed.context.cocoonName)
        .replace('{{siloName}}', parsed.context.siloName)
        .replace('{{step}}', parsed.step)
        .replace('{{stepDescription}}', STEP_DESCRIPTIONS[parsed.step] ?? '')
        .replace('{{userInput}}', parsed.currentInput)
        .replace('{{aiSuggestion}}', parsed.mergeWith!)
        .replace('{{previousAnswersBlock}}', prevBlock
          ? `## Réponses stratégiques déjà validées\n${prevBlock}`
          : '')
        .replace('{{themeContextBlock}}', themeBlock
          ? `## Contexte enrichi\n${themeBlock}`
          : '')
        .replace('{{existingValidatedBlock}}', hasValidated
          ? `## Texte déjà validé pour cette étape\n${parsed.existingValidated}`
          : '')
        .replace(/\{\{#hasExistingValidated\}\}([\s\S]*?)\{\{\/hasExistingValidated\}\}/,
          hasValidated ? '$1' : '')
        .replace(/\{\{#noExistingValidated\}\}([\s\S]*?)\{\{\/noExistingValidated\}\}/,
          hasValidated ? '' : '$1')
    } else {
      const themeBlock = buildThemeContextBlock(parsed.context.themeContext as Record<string, unknown> | undefined)
      const prevBlock = buildPreviousAnswersBlock(parsed.context.previousAnswers)

      prompt = promptTemplate
        .replace('{{articleTitle}}', parsed.context.articleTitle)
        .replace('{{cocoonName}}', parsed.context.cocoonName)
        .replace('{{siloName}}', parsed.context.siloName)
        .replace('{{step}}', parsed.step)
        .replace('{{stepDescription}}', STEP_DESCRIPTIONS[parsed.step] ?? '')
        .replace('{{currentInput}}', parsed.currentInput)
        .replace(/\{\{#themeContext\}\}[\s\S]*?\{\{\/themeContext\}\}/,
          themeBlock ? `## Contexte enrichi\n${themeBlock}` : '')
        .replace(/\{\{#existingArticles\}\}[\s\S]*?\{\{\/existingArticles\}\}/,
          parsed.context.existingArticles?.length
            ? `- **Articles existants** : ${parsed.context.existingArticles.join(', ')}`
            : '')
        .replace(/\{\{#previousAnswers\}\}[\s\S]*?\{\{\/previousAnswers\}\}/,
          prevBlock
            ? `- **Réponses stratégiques déjà validées** :\n${prevBlock}`
            : '')
    }

    const userMessage = isMerge
      ? `Fusionne ces deux textes pour l'étape "${parsed.step}"`
      : parsed.currentInput

    // Collect the streamed response into a single string
    let suggestion = ''
    for await (const chunk of streamChatCompletion(prompt, userMessage, 1024)) {
      if (chunk.startsWith(USAGE_SENTINEL)) break
      suggestion += chunk
    }

    res.json({ data: { suggestion } })
  } catch (err) {
    log.error(`POST /api/strategy/${req.params.slug}/suggest — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate suggestion' } })
  }
})

// =============================================
// Cocoon-level strategy endpoints
// =============================================

const COCOON_STEP_DESCRIPTIONS: Record<string, string> = {
  cible: "À qui s'adresse ce cocon ? Décris le persona du lecteur idéal pour l'ensemble de cette thématique (métier, taille d'entreprise, maturité digitale).",
  douleur: "Quel problème principal ce cocon adresse-t-il ? Quel est le pain point commun aux lecteurs de cette thématique ?",
  angle: "Quel est l'angle de différenciation de ce cocon ? Qu'est-ce qui rend votre approche unique par rapport aux concurrents ?",
  promesse: "Quelle transformation ce cocon promet-il au lecteur ? Quel résultat concret obtiendra-t-il en parcourant vos articles ?",
  cta: "Quel est le call-to-action principal de ce cocon ? Où voulez-vous guider le lecteur après avoir lu vos contenus ?",
  articles: "Proposez une liste d'articles pour ce cocon avec leur type (Pilier, Intermédiaire, Spécialisé) et leur justification.",
}

/** GET /api/strategy/cocoon/:cocoonSlug */
router.get('/strategy/cocoon/:cocoonSlug', async (req, res) => {
  try {
    const strategy = await getCocoonStrategy(req.params.cocoonSlug)
    res.json({ data: strategy })
  } catch (err) {
    log.error(`GET /api/strategy/cocoon/${req.params.cocoonSlug} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load cocoon strategy' } })
  }
})

/** PUT /api/strategy/cocoon/:cocoonSlug */
router.put('/strategy/cocoon/:cocoonSlug', async (req, res) => {
  try {
    const saved = await saveCocoonStrategy(req.params.cocoonSlug, req.body)
    res.json({ data: saved })
  } catch (err) {
    log.error(`PUT /api/strategy/cocoon/${req.params.cocoonSlug} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save cocoon strategy' } })
  }
})

/** POST /api/strategy/cocoon/:cocoonSlug/suggest (also handles merge when mergeWith is present) */
router.post('/strategy/cocoon/:cocoonSlug/suggest', async (req, res) => {
  try {
    const parsed = cocoonSuggestRequestSchema.parse(req.body)
    const isMerge = !!parsed.mergeWith

    let prompt: string
    if (isMerge) {
      const mergeTemplate = await readFile(
        join(process.cwd(), 'server', 'prompts', 'strategy-merge.md'),
        'utf-8',
      )
      const themeBlock = buildThemeContextBlock(parsed.context.themeContext as Record<string, unknown> | undefined)
      const prevBlock = buildPreviousAnswersBlock(parsed.context.previousAnswers)
      const hasValidated = !!parsed.existingValidated?.trim()

      prompt = mergeTemplate
        .replace('{{articleTitle}}', parsed.context.cocoonName)
        .replace('{{cocoonName}}', parsed.context.cocoonName)
        .replace('{{siloName}}', parsed.context.siloName)
        .replace('{{step}}', parsed.step)
        .replace('{{stepDescription}}', COCOON_STEP_DESCRIPTIONS[parsed.step] ?? '')
        .replace('{{userInput}}', parsed.currentInput)
        .replace('{{aiSuggestion}}', parsed.mergeWith!)
        .replace('{{previousAnswersBlock}}', prevBlock
          ? `## Réponses stratégiques déjà validées\n${prevBlock}`
          : '')
        .replace('{{themeContextBlock}}', themeBlock
          ? `## Contexte enrichi\n${themeBlock}`
          : '')
        .replace('{{existingValidatedBlock}}', hasValidated
          ? `## Texte déjà validé pour cette étape\n${parsed.existingValidated}`
          : '')
        .replace(/\{\{#hasExistingValidated\}\}([\s\S]*?)\{\{\/hasExistingValidated\}\}/,
          hasValidated ? '$1' : '')
        .replace(/\{\{#noExistingValidated\}\}([\s\S]*?)\{\{\/noExistingValidated\}\}/,
          hasValidated ? '' : '$1')
    } else {
      const templateFile = parsed.step === 'articles' ? 'cocoon-articles.md' : 'cocoon-brainstorm.md'
      const promptTemplate = await readFile(
        join(process.cwd(), 'server', 'prompts', templateFile),
        'utf-8',
      )

      const themeBlock = buildThemeContextBlock(parsed.context.themeContext as Record<string, unknown> | undefined)
      const prevBlock = buildPreviousAnswersBlock(parsed.context.previousAnswers)

      prompt = promptTemplate
        .replace('{{cocoonName}}', parsed.context.cocoonName)
        .replace('{{siloName}}', parsed.context.siloName)
        .replace('{{step}}', parsed.step)
        .replace('{{stepDescription}}', COCOON_STEP_DESCRIPTIONS[parsed.step] ?? '')
        .replace('{{currentInput}}', parsed.currentInput)
        .replace(/\{\{#themeContext\}\}[\s\S]*?\{\{\/themeContext\}\}/,
          themeBlock ? `## Contexte enrichi\n${themeBlock}` : '')
        .replace(/\{\{#previousAnswers\}\}[\s\S]*?\{\{\/previousAnswers\}\}/,
          prevBlock
            ? `- **Réponses stratégiques déjà validées** :\n${prevBlock}`
            : '')
        .replace(/\{\{#existingArticles\}\}[\s\S]*?\{\{\/existingArticles\}\}/,
          parsed.context.existingArticles?.length
            ? `- **Articles existants** : ${parsed.context.existingArticles.join(', ')}`
            : '')
    }

    const userMessage = isMerge
      ? `Fusionne ces deux textes pour l'étape "${parsed.step}"`
      : parsed.currentInput

    const maxTokens = parsed.step === 'articles' ? 4096 : 1024

    let suggestion = ''
    for await (const chunk of streamChatCompletion(prompt, userMessage, maxTokens)) {
      if (chunk.startsWith(USAGE_SENTINEL)) break
      suggestion += chunk
    }

    res.json({ data: { suggestion } })
  } catch (err) {
    log.error(`POST /api/strategy/cocoon/${req.params.cocoonSlug}/suggest — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate cocoon suggestion' } })
  }
})

// =============================================
// Deepen & Consolidate (shared by article + cocoon)
// =============================================

async function handleDeepen(req: import('express').Request, res: import('express').Response, label: string) {
  try {
    const parsed = strategyDeepenRequestSchema.parse(req.body)
    const promptTemplate = await readFile(
      join(process.cwd(), 'server', 'prompts', 'strategy-deepen.md'),
      'utf-8',
    )

    const themeBlock = buildThemeContextBlock(parsed.context.themeContext as Record<string, unknown> | undefined)
    const prevBlock = buildPreviousAnswersBlock(parsed.context.previousAnswers)

    const existingBlock = parsed.existingSubQuestions.length
      ? parsed.existingSubQuestions
          .map(sq => `- "${sq.question}" (réponse : ${sq.answer || 'pas encore répondu'})`)
          .join('\n')
      : 'Aucune sous-question existante.'

    const prompt = promptTemplate
      .replace('{{step}}', parsed.step)
      .replace('{{mainQuestion}}', parsed.mainQuestion)
      .replace('{{mainAnswer}}', parsed.mainAnswer)
      .replace('{{existingSubQuestions}}', existingBlock)
      .replace('{{previousAnswers}}', prevBlock || 'Aucune étape validée.')
      .replace('{{contextBlock}}', themeBlock || 'Pas de contexte supplémentaire.')

    let result = ''
    for await (const chunk of streamChatCompletion(prompt, `Génère une sous-question pour l'étape "${parsed.step}"`, 512)) {
      if (chunk.startsWith(USAGE_SENTINEL)) break
      result += chunk
    }

    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const obj = JSON.parse(jsonMatch[0])
      res.json({ data: { question: obj.question, description: obj.description } })
    } else {
      res.json({ data: { question: result.trim(), description: '' } })
    }
  } catch (err) {
    log.error(`${label} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate sub-question' } })
  }
}

async function handleConsolidate(req: import('express').Request, res: import('express').Response, label: string) {
  try {
    const parsed = strategyConsolidateRequestSchema.parse(req.body)
    const promptTemplate = await readFile(
      join(process.cwd(), 'server', 'prompts', 'strategy-consolidate.md'),
      'utf-8',
    )

    const themeBlock = buildThemeContextBlock(parsed.context.themeContext as Record<string, unknown> | undefined)

    const subAnswersBlock = parsed.subAnswers
      .map(sa => `**Q :** ${sa.question}\n**R :** ${sa.answer}`)
      .join('\n\n')

    const prompt = promptTemplate
      .replace('{{step}}', parsed.step)
      .replace('{{mainAnswer}}', parsed.mainAnswer)
      .replace('{{subAnswers}}', subAnswersBlock)
      .replace('{{contextBlock}}', themeBlock || 'Pas de contexte supplémentaire.')

    let consolidated = ''
    for await (const chunk of streamChatCompletion(prompt, `Consolide les réponses pour l'étape "${parsed.step}"`, 1024)) {
      if (chunk.startsWith(USAGE_SENTINEL)) break
      consolidated += chunk
    }

    res.json({ data: { consolidated } })
  } catch (err) {
    log.error(`${label} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to consolidate answers' } })
  }
}

async function handleEnrich(req: import('express').Request, res: import('express').Response, label: string) {
  try {
    const parsed = strategyEnrichRequestSchema.parse(req.body)
    const promptTemplate = await readFile(
      join(process.cwd(), 'server', 'prompts', 'strategy-enrich.md'),
      'utf-8',
    )

    const themeBlock = buildThemeContextBlock(parsed.context.themeContext as Record<string, unknown> | undefined)
    const prevBlock = buildPreviousAnswersBlock(parsed.context.previousAnswers)

    const contextLines: string[] = []
    if (parsed.context.articleTitle) contextLines.push(`- **Article** : ${parsed.context.articleTitle}`)
    contextLines.push(`- **Cocon** : ${parsed.context.cocoonName}`)
    contextLines.push(`- **Silo** : ${parsed.context.siloName}`)
    if (prevBlock) contextLines.push(`- **Réponses précédentes** :\n${prevBlock}`)
    if (themeBlock) contextLines.push(themeBlock)

    const prompt = promptTemplate
      .replace('{{step}}', parsed.step)
      .replace('{{existingValidated}}', parsed.existingValidated)
      .replace('{{subQuestion}}', parsed.subQuestion)
      .replace('{{subAnswer}}', parsed.subAnswer)
      .replace('{{contextBlock}}', contextLines.join('\n'))

    let enriched = ''
    for await (const chunk of streamChatCompletion(prompt, `Enrichis le texte validé avec la sous-réponse pour l'étape "${parsed.step}"`, 1024)) {
      if (chunk.startsWith(USAGE_SENTINEL)) break
      enriched += chunk
    }

    res.json({ data: { enriched } })
  } catch (err) {
    log.error(`${label} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to enrich answer' } })
  }
}

/** POST /api/strategy/:slug/deepen */
router.post('/strategy/:slug/deepen', (req, res) =>
  handleDeepen(req, res, `POST /api/strategy/${req.params.slug}/deepen`))

/** POST /api/strategy/:slug/consolidate */
router.post('/strategy/:slug/consolidate', (req, res) =>
  handleConsolidate(req, res, `POST /api/strategy/${req.params.slug}/consolidate`))

/** POST /api/strategy/cocoon/:cocoonSlug/deepen */
router.post('/strategy/cocoon/:cocoonSlug/deepen', (req, res) =>
  handleDeepen(req, res, `POST /api/strategy/cocoon/${req.params.cocoonSlug}/deepen`))

/** POST /api/strategy/cocoon/:cocoonSlug/consolidate */
router.post('/strategy/cocoon/:cocoonSlug/consolidate', (req, res) =>
  handleConsolidate(req, res, `POST /api/strategy/cocoon/${req.params.cocoonSlug}/consolidate`))

/** POST /api/strategy/:slug/enrich */
router.post('/strategy/:slug/enrich', (req, res) =>
  handleEnrich(req, res, `POST /api/strategy/${req.params.slug}/enrich`))

/** POST /api/strategy/cocoon/:cocoonSlug/enrich */
router.post('/strategy/cocoon/:cocoonSlug/enrich', (req, res) =>
  handleEnrich(req, res, `POST /api/strategy/cocoon/${req.params.cocoonSlug}/enrich`))

export default router
