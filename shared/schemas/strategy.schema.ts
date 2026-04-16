import { z } from 'zod/v4'
import { articleTypeSchema } from './shared-enums.schema.js'

const subQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  description: z.string(),
  input: z.string(),
  suggestion: z.string().nullable(),
  validated: z.string(),
})

const strategyStepDataSchema = z.object({
  input: z.string(),
  suggestion: z.string().nullable(),
  validated: z.string(),
  subQuestions: z.array(subQuestionSchema).optional(),
})

const aiguillageDataSchema = z.object({
  suggestedType: articleTypeSchema.nullable(),
  suggestedParent: z.string().nullable(),
  suggestedChildren: z.array(z.string()),
  validated: z.boolean(),
})

const ctaDataSchema = z.object({
  type: z.enum(['service', 'formulaire', 'guide', 'autre']),
  target: z.string(),
  suggestion: z.string().nullable(),
})

export const articleStrategySchema = z.object({
  id: z.number().int().positive(),
  cible: strategyStepDataSchema,
  douleur: strategyStepDataSchema,
  aiguillage: aiguillageDataSchema,
  angle: strategyStepDataSchema,
  promesse: strategyStepDataSchema,
  cta: ctaDataSchema,
  completedSteps: z.number().int().min(0).max(6),
  updatedAt: z.string(),
})

export const batchStrategyStatusRequestSchema = z.object({
  ids: z.array(z.number().int().positive()),
})

const themeContextSchema = z.object({
  themeName: z.string().optional(),
  themeDescription: z.string().optional(),
  siloDescription: z.string().optional(),
  cocoonArticles: z.array(z.string()).optional(),
  cocoonStrategy: z.record(z.string(), z.string()).optional(),
  themeConfig: z.object({
    mainPromise: z.string().optional(),
    differentiators: z.array(z.string()).optional(),
    services: z.array(z.string()).optional(),
    mainCTA: z.string().optional(),
    location: z.string().optional(),
    targetAudience: z.string().optional(),
    sector: z.string().optional(),
    companySize: z.string().optional(),
    budget: z.string().optional(),
    digitalMaturity: z.string().optional(),
    painPoints: z.array(z.string()).optional(),
    toneStyle: z.string().optional(),
    vocabulary: z.array(z.string()).optional(),
  }).optional(),
})

export const strategySuggestRequestSchema = z.object({
  step: z.enum(['cible', 'douleur', 'aiguillage', 'angle', 'promesse', 'cta']),
  currentInput: z.string(),
  mergeWith: z.string().optional(),
  existingValidated: z.string().optional(),
  context: z.object({
    articleTitle: z.string(),
    cocoonName: z.string(),
    siloName: z.string(),
    existingArticles: z.array(z.string()).optional(),
    previousAnswers: z.record(z.string(), z.string()).optional(),
    themeContext: themeContextSchema.optional(),
  }),
})

export const proposedArticleSchema = z.object({
  id: z.string().default(''),
  title: z.string(),
  suggestedTitles: z.array(z.string()).default([]),
  type: articleTypeSchema,
  parentTitle: z.string().nullable(),
  rationale: z.string(),
  painPoint: z.string().default(''),
  suggestedKeyword: z.string(),
  suggestedKeywords: z.array(z.string()).default([]),
  suggestedSlug: z.string().default(''),
  suggestedSlugs: z.array(z.string()).default([]),
  validatedSearchQuery: z.string().nullable().default(null),
  keywordValidated: z.boolean().default(false),
  searchQueryValidated: z.boolean().default(false),
  titleValidated: z.boolean().default(false),
  accepted: z.boolean(),
  createdInDb: z.boolean().default(false),
  dbId: z.number().default(0),
})

export const suggestedTopicSchema = z.object({
  id: z.string(),
  topic: z.string(),
  checked: z.boolean(),
})

export const cocoonStrategySchema = z.object({
  cocoonSlug: z.string(),
  cible: strategyStepDataSchema,
  douleur: strategyStepDataSchema,
  angle: strategyStepDataSchema,
  promesse: strategyStepDataSchema,
  cta: strategyStepDataSchema,
  proposedArticles: z.array(proposedArticleSchema),
  suggestedTopics: z.array(suggestedTopicSchema).default([]),
  topicsUserContext: z.string().default(''),
  completedSteps: z.number().int().min(0).max(6),
  updatedAt: z.string(),
})

const paaQuestionSchema = z.object({
  question: z.string(),
  answer: z.string().nullable(),
})

export const cocoonSuggestRequestSchema = z.object({
  step: z.enum(['cible', 'douleur', 'angle', 'promesse', 'cta', 'articles', 'articles-structure', 'articles-topics', 'articles-paa-queries', 'articles-spe', 'add-article']),
  currentInput: z.string(),
  mergeWith: z.string().optional(),
  existingValidated: z.string().optional(),
  context: z.object({
    cocoonName: z.string(),
    siloName: z.string(),
    previousAnswers: z.record(z.string(), z.string()).optional(),
    existingArticles: z.array(z.string()).optional(),
    themeContext: themeContextSchema.optional(),
    paaContext: z.record(z.string(), z.array(paaQuestionSchema)).optional(),
    topicSuggestions: z.array(z.string()).optional(),
    topicUserContext: z.string().optional(),
  }),
})

const deepenContextSchema = z.object({
  articleTitle: z.string().optional(),
  cocoonName: z.string(),
  siloName: z.string(),
  previousAnswers: z.record(z.string(), z.string()).optional(),
  themeContext: themeContextSchema.optional(),
})

export const strategyDeepenRequestSchema = z.object({
  step: z.enum(['cible', 'douleur', 'angle', 'promesse']),
  mainQuestion: z.string(),
  mainAnswer: z.string(),
  existingSubQuestions: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })),
  context: deepenContextSchema,
})

export const strategyEnrichRequestSchema = z.object({
  step: z.enum(['cible', 'douleur', 'angle', 'promesse']),
  existingValidated: z.string(),
  subQuestion: z.string(),
  subAnswer: z.string(),
  context: deepenContextSchema,
})

export const strategyConsolidateRequestSchema = z.object({
  step: z.enum(['cible', 'douleur', 'angle', 'promesse']),
  mainAnswer: z.string(),
  subAnswers: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })),
  context: deepenContextSchema,
})
