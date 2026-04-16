import { Router } from 'express'
import { log } from '../utils/logger.js'
import { getStrategy, saveStrategy } from '../services/strategy/strategy.service.js'
import { getCocoonStrategy, saveCocoonStrategy } from '../services/strategy/cocoon-strategy.service.js'
import { strategySuggestRequestSchema, batchStrategyStatusRequestSchema, cocoonSuggestRequestSchema, strategyDeepenRequestSchema, strategyConsolidateRequestSchema, strategyEnrichRequestSchema } from '../../shared/schemas/strategy.schema.js'
import { streamChatCompletion, USAGE_SENTINEL } from '../services/external/claude.service.js'
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
    const { ids } = batchStrategyStatusRequestSchema.parse(req.body)
    log.info('POST /api/strategy/batch-status', { idCount: ids.length })
    const start = Date.now()
    const statuses: Record<number, { completedSteps: number }> = {}
    await Promise.all(
      ids.map(async (id) => {
        const strategy = await getStrategy(id)
        statuses[id] = { completedSteps: strategy?.completedSteps ?? 0 }
      }),
    )
    log.debug('batch-status done', { idCount: ids.length, ms: Date.now() - start })
    res.json({ data: statuses })
  } catch (err) {
    log.error(`POST /api/strategy/batch-status — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load strategy statuses' } })
  }
})

/** GET /api/strategy/:id */
router.get('/strategy/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    log.info('GET /api/strategy/:id', { id })
    const strategy = await getStrategy(id)
    log.debug('strategy loaded', { id, completedSteps: strategy?.completedSteps ?? 0 })
    res.json({ data: strategy })
  } catch (err) {
    log.error(`GET /api/strategy/${id} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load strategy' } })
  }
})

/** PUT /api/strategy/:id */
router.put('/strategy/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    log.info('PUT /api/strategy/:id', { id })
    const saved = await saveStrategy(id, req.body)
    log.debug('strategy saved', { id, completedSteps: saved?.completedSteps ?? 0 })
    res.json({ data: saved })
  } catch (err) {
    log.error(`PUT /api/strategy/${id} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save strategy' } })
  }
})

/** POST /api/strategy/:id/suggest (also handles merge when mergeWith is present) */
router.post('/strategy/:id/suggest', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    const parsed = strategySuggestRequestSchema.parse(req.body)
    const isMerge = !!parsed.mergeWith

    log.info('POST /api/strategy/:id/suggest', { id, step: parsed.step, isMerge })

    const templateFile = isMerge ? 'strategy-merge.md' : 'strategy-suggest.md'
    const startPrompt = Date.now()
    const promptTemplate = await readFile(
      join(process.cwd(), 'server', 'prompts', templateFile),
      'utf-8',
    )
    log.debug('prompt template loaded', { templateFile, chars: promptTemplate.length, ms: Date.now() - startPrompt })

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
      : parsed.currentInput || `Exécute la mission pour l'étape "${parsed.step}"`

    log.debug('suggest prompt built', { id, step: parsed.step, promptChars: prompt.length })

    // Collect the streamed response into a single string
    const startAi = Date.now()
    let suggestion = ''
    for await (const chunk of streamChatCompletion(prompt, userMessage, 1024)) {
      if (chunk.startsWith(USAGE_SENTINEL)) break
      suggestion += chunk
    }

    log.info('suggest done', { id, step: parsed.step, isMerge, suggestionChars: suggestion.length, ms: Date.now() - startAi })
    res.json({ data: { suggestion } })
  } catch (err) {
    log.error(`POST /api/strategy/${id}/suggest — ${(err as Error).message}`, { id })
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
  'articles-structure': "Génère le Pilier et les Intermédiaires pour ce cocon.",
  'articles-paa-queries': "Propose des requêtes de recherche Google pour récupérer les PAA par Intermédiaire.",
  'articles-spe': "Génère les articles Spécialisés enrichis par les PAA récupérées.",
  'articles-topics': "Propose les sujets et sous-thèmes à couvrir dans ce cocon pour guider la génération d'articles.",
  'add-article': "Génère un seul article complémentaire du type demandé.",
}

/** GET /api/strategy/cocoon/:cocoonSlug */
router.get('/strategy/cocoon/:cocoonSlug', async (req, res) => {
  try {
    log.info('GET /api/strategy/cocoon/:cocoonSlug', { cocoonSlug: req.params.cocoonSlug })
    const strategy = await getCocoonStrategy(req.params.cocoonSlug)
    log.debug('cocoon strategy loaded', { cocoonSlug: req.params.cocoonSlug, completedSteps: strategy?.completedSteps ?? 0 })
    res.json({ data: strategy })
  } catch (err) {
    log.error(`GET /api/strategy/cocoon/${req.params.cocoonSlug} — ${(err as Error).message}`, { cocoonSlug: req.params.cocoonSlug })
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load cocoon strategy' } })
  }
})

/** PUT /api/strategy/cocoon/:cocoonSlug */
router.put('/strategy/cocoon/:cocoonSlug', async (req, res) => {
  try {
    log.info('PUT /api/strategy/cocoon/:cocoonSlug', { cocoonSlug: req.params.cocoonSlug })
    const saved = await saveCocoonStrategy(req.params.cocoonSlug, req.body)
    log.debug('cocoon strategy saved', { cocoonSlug: req.params.cocoonSlug, completedSteps: saved?.completedSteps ?? 0 })
    res.json({ data: saved })
  } catch (err) {
    log.error(`PUT /api/strategy/cocoon/${req.params.cocoonSlug} — ${(err as Error).message}`, { cocoonSlug: req.params.cocoonSlug })
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save cocoon strategy' } })
  }
})

/** POST /api/strategy/cocoon/:cocoonSlug/suggest (also handles merge when mergeWith is present) */
router.post('/strategy/cocoon/:cocoonSlug/suggest', async (req, res) => {
  try {
    const parsed = cocoonSuggestRequestSchema.parse(req.body)
    const isMerge = !!parsed.mergeWith

    log.info('POST /api/strategy/cocoon/:cocoonSlug/suggest', { cocoonSlug: req.params.cocoonSlug, step: parsed.step, isMerge })

    let prompt: string
    if (isMerge) {
      const startPrompt = Date.now()
      const mergeTemplate = await readFile(
        join(process.cwd(), 'server', 'prompts', 'strategy-merge.md'),
        'utf-8',
      )
      log.debug('merge template loaded', { chars: mergeTemplate.length, ms: Date.now() - startPrompt })
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
      // Determine template file based on step
      let templateFile: string
      if (parsed.step === 'articles' || parsed.step === 'articles-structure') {
        templateFile = 'cocoon-articles.md'
      } else if (parsed.step === 'articles-topics') {
        templateFile = 'cocoon-articles-topics.md'
      } else if (parsed.step === 'articles-paa-queries') {
        templateFile = 'cocoon-paa-queries.md'
      } else if (parsed.step === 'articles-spe') {
        templateFile = 'cocoon-articles-spe.md'
      } else if (parsed.step === 'add-article') {
        templateFile = 'cocoon-add-article.md'
      } else {
        templateFile = 'cocoon-brainstorm.md'
      }

      const startPromptLoad = Date.now()
      const promptTemplate = await readFile(
        join(process.cwd(), 'server', 'prompts', templateFile),
        'utf-8',
      )
      log.debug('cocoon prompt template loaded', { templateFile, chars: promptTemplate.length, ms: Date.now() - startPromptLoad })

      const themeBlock = buildThemeContextBlock(parsed.context.themeContext as Record<string, unknown> | undefined)
      const prevBlock = buildPreviousAnswersBlock(parsed.context.previousAnswers)

      prompt = promptTemplate
        .replace('{{cocoonName}}', parsed.context.cocoonName)
        .replace('{{siloName}}', parsed.context.siloName)
        .replace('{{step}}', parsed.step)
        .replace('{{stepDescription}}', COCOON_STEP_DESCRIPTIONS[parsed.step] ?? '')
        .replace('{{currentInput}}', parsed.currentInput)
        .replace('{{articles}}', parsed.currentInput)
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

      // Build topic suggestions block for articles-structure step only
      if (parsed.step === 'articles-structure') {
        let topicBlock = ''
        const topics = parsed.context.topicSuggestions
        const userCtx = parsed.context.topicUserContext?.trim()
        if (topics?.length || userCtx) {
          const parts: string[] = []
          if (topics?.length) {
            parts.push(`L'utilisateur a sélectionné ces sujets comme pistes d'orientation :\n${topics.map(t => `- ${t}`).join('\n')}`)
          }
          if (userCtx) {
            parts.push(`Contexte additionnel de l'utilisateur :\n> ${userCtx}`)
          }
          topicBlock = parts.join('\n\n')
        }
        prompt = prompt.replace(/\{\{#topicSuggestions\}\}[\s\S]*?\{\{\/topicSuggestions\}\}/,
          topicBlock || '')
      }

      // Build add-article context: resolve type conditionals and inject existing articles
      if (parsed.step === 'add-article') {
        const addCtx = JSON.parse(parsed.currentInput) as {
          articleType: string
          existingArticlesDetail: string
          userInput?: string
        }
        const isPilier = addCtx.articleType === 'Pilier'
        const isInter = addCtx.articleType === 'Intermédiaire'
        const isSpe = addCtx.articleType === 'Spécialisé'
        const hasUserInput = !!addCtx.userInput?.trim()

        prompt = prompt
          .replace(/\{\{articleType\}\}/g, addCtx.articleType)
          .replace('{{existingArticles}}', addCtx.existingArticlesDetail)
          .replace(/\{\{#isPilier\}\}([\s\S]*?)\{\{\/isPilier\}\}/, isPilier ? '$1' : '')
          .replace(/\{\{#isIntermediaire\}\}([\s\S]*?)\{\{\/isIntermediaire\}\}/, isInter ? '$1' : '')
          .replace(/\{\{#isSpecialise\}\}([\s\S]*?)\{\{\/isSpecialise\}\}/, isSpe ? '$1' : '')
          .replace(/\{\{#userInput\}\}([\s\S]*?)\{\{\/userInput\}\}/,
            hasUserInput ? '$1'.replace(/\{\{userInput\}\}/g, addCtx.userInput!.trim()) : '')
      }

      // Build PAA context block for articles-spe step
      if (parsed.step === 'articles-spe') {
        const paaCtx = parsed.context.paaContext
        let paaBlock = ''
        if (paaCtx && Object.keys(paaCtx).length > 0) {
          const sections: string[] = []
          for (const [interTitle, questions] of Object.entries(paaCtx)) {
            if (questions.length > 0) {
              const lines = questions.map(q => `- ${q.question}`).join('\n')
              sections.push(`### Questions PAA pour "${interTitle}"\n${lines}`)
            }
          }
          paaBlock = sections.join('\n\n')
        }
        prompt = prompt.replace(/\{\{#paaContext\}\}[\s\S]*?\{\{\/paaContext\}\}/,
          paaBlock || '')
      }
    }

    const userMessage = isMerge
      ? `Fusionne ces deux textes pour l'étape "${parsed.step}"`
      : parsed.currentInput || `Exécute la mission pour l'étape "${parsed.step}"`

    const maxTokens = (parsed.step === 'articles' || parsed.step === 'articles-structure' || parsed.step === 'articles-spe') ? 4096
      : (parsed.step === 'articles-paa-queries' || parsed.step === 'articles-topics') ? 2048
      : 1024

    log.debug('cocoon suggest prompt built', { cocoonSlug: req.params.cocoonSlug, step: parsed.step, promptChars: prompt.length, maxTokens })

    const startAi = Date.now()
    let suggestion = ''
    for await (const chunk of streamChatCompletion(prompt, userMessage, maxTokens)) {
      if (chunk.startsWith(USAGE_SENTINEL)) break
      suggestion += chunk
    }

    log.info('cocoon suggest done', { cocoonSlug: req.params.cocoonSlug, step: parsed.step, isMerge, suggestionChars: suggestion.length, ms: Date.now() - startAi })
    res.json({ data: { suggestion } })
  } catch (err) {
    log.error(`POST /api/strategy/cocoon/${req.params.cocoonSlug}/suggest — ${(err as Error).message}`, { cocoonSlug: req.params.cocoonSlug, step: req.body?.step })
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate cocoon suggestion' } })
  }
})

// =============================================
// Deepen & Consolidate (shared by article + cocoon)
// =============================================

async function handleDeepen(req: import('express').Request, res: import('express').Response, label: string) {
  try {
    const parsed = strategyDeepenRequestSchema.parse(req.body)
    log.info(label, { step: parsed.step, existingSubQuestions: parsed.existingSubQuestions.length })
    const startPrompt = Date.now()
    const promptTemplate = await readFile(
      join(process.cwd(), 'server', 'prompts', 'strategy-deepen.md'),
      'utf-8',
    )
    log.debug('deepen prompt loaded', { chars: promptTemplate.length, ms: Date.now() - startPrompt })

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

    const startAi = Date.now()
    let result = ''
    for await (const chunk of streamChatCompletion(prompt, `Génère une sous-question pour l'étape "${parsed.step}"`, 512)) {
      if (chunk.startsWith(USAGE_SENTINEL)) break
      result += chunk
    }
    log.debug('deepen AI done', { step: parsed.step, resultChars: result.length, ms: Date.now() - startAi })

    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const obj = JSON.parse(jsonMatch[0])
      log.info('deepen parsed JSON sub-question', { step: parsed.step })
      res.json({ data: { question: obj.question, description: obj.description } })
    } else {
      log.warn('deepen fallback — no JSON found, using raw text', { step: parsed.step, resultChars: result.length })
      res.json({ data: { question: result.trim(), description: '' } })
    }
  } catch (err) {
    log.error(`${label} — ${(err as Error).message}`, { step: req.body?.step })
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate sub-question' } })
  }
}

async function handleConsolidate(req: import('express').Request, res: import('express').Response, label: string) {
  try {
    const parsed = strategyConsolidateRequestSchema.parse(req.body)
    log.info(label, { step: parsed.step, subAnswers: parsed.subAnswers.length })
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

    const startAi = Date.now()
    let consolidated = ''
    for await (const chunk of streamChatCompletion(prompt, `Consolide les réponses pour l'étape "${parsed.step}"`, 1024)) {
      if (chunk.startsWith(USAGE_SENTINEL)) break
      consolidated += chunk
    }

    log.info('consolidate done', { step: parsed.step, consolidatedChars: consolidated.length, ms: Date.now() - startAi })
    res.json({ data: { consolidated } })
  } catch (err) {
    log.error(`${label} — ${(err as Error).message}`, { step: req.body?.step })
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to consolidate answers' } })
  }
}

async function handleEnrich(req: import('express').Request, res: import('express').Response, label: string) {
  try {
    const parsed = strategyEnrichRequestSchema.parse(req.body)
    log.info(label, { step: parsed.step, existingValidatedChars: parsed.existingValidated.length })
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

    const startAi = Date.now()
    let enriched = ''
    for await (const chunk of streamChatCompletion(prompt, `Enrichis le texte validé avec la sous-réponse pour l'étape "${parsed.step}"`, 1024)) {
      if (chunk.startsWith(USAGE_SENTINEL)) break
      enriched += chunk
    }

    log.info('enrich done', { step: parsed.step, enrichedChars: enriched.length, ms: Date.now() - startAi })
    res.json({ data: { enriched } })
  } catch (err) {
    log.error(`${label} — ${(err as Error).message}`, { step: req.body?.step })
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to enrich answer' } })
  }
}

/** POST /api/strategy/:id/deepen */
router.post('/strategy/:id/deepen', (req, res) =>
  handleDeepen(req, res, `POST /api/strategy/${req.params.id}/deepen`))

/** POST /api/strategy/:id/consolidate */
router.post('/strategy/:id/consolidate', (req, res) =>
  handleConsolidate(req, res, `POST /api/strategy/${req.params.id}/consolidate`))

/** POST /api/strategy/cocoon/:cocoonSlug/deepen */
router.post('/strategy/cocoon/:cocoonSlug/deepen', (req, res) =>
  handleDeepen(req, res, `POST /api/strategy/cocoon/${req.params.cocoonSlug}/deepen`))

/** POST /api/strategy/cocoon/:cocoonSlug/consolidate */
router.post('/strategy/cocoon/:cocoonSlug/consolidate', (req, res) =>
  handleConsolidate(req, res, `POST /api/strategy/cocoon/${req.params.cocoonSlug}/consolidate`))

/** POST /api/strategy/:id/enrich */
router.post('/strategy/:id/enrich', (req, res) =>
  handleEnrich(req, res, `POST /api/strategy/${req.params.id}/enrich`))

/** POST /api/strategy/cocoon/:cocoonSlug/enrich */
router.post('/strategy/cocoon/:cocoonSlug/enrich', (req, res) =>
  handleEnrich(req, res, `POST /api/strategy/cocoon/${req.params.cocoonSlug}/enrich`))

export default router
