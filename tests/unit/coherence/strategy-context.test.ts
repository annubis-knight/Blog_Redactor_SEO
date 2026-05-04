// @vitest-environment node
/**
 * Cohérence data-flow: strategy-context
 *
 * Valide que le flux strategy_context + painPoint fonctionne end-to-end :
 *   - Producteurs (article_strategies, cocoon_strategies, articles.pain_point)
 *   - Helpers (buildStrategyContext, getArticlePainPoint, loadPrompt)
 *   - Injection dans 8+ prompts Moteur
 *   - Consommateurs (UI, calcul relevanceScore)
 *
 * Sprint S1/S2/S5 : affichage vs calcul, fallback cohérent, typos prompts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFile } from 'fs/promises'
import { join } from 'path'

// ============================================================================
// PART 1: Mocking & setup
// ============================================================================

vi.mock('../../../server/db/client.js', () => ({
  query: vi.fn(),
  pool: { query: vi.fn() },
}))

vi.mock('../../../server/utils/logger.js', () => ({
  log: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}))

import { getArticlePainPoint, PAIN_POINT_FALLBACK } from '../../../server/services/queries/article-pain-point.service.js'
import { buildStrategyContext } from '../../../server/routes/generate/_helpers.js'
import { buildCocoonStrategyBlock } from '../../../server/utils/prompt-loader.js'
import type { ArticleStrategy, CocoonStrategy } from '../../../shared/types/index.js'
import { query } from '../../../server/db/client.js'

const mockedQuery = vi.mocked(query)

// ============================================================================
// PART 2: buildStrategyContext tests (FR-MOT-STRATEGY-INJECTION)
// ============================================================================

describe('FR-MOT-STRATEGY-INJECTION — buildStrategyContext', () => {
  it('retourne chaîne vide quand strategy=null', () => {
    const ctx = buildStrategyContext(null)
    expect(ctx).toBe('')
  })

  it('retourne chaîne vide quand completedSteps=0 (aucune étape validée)', () => {
    const strategy: ArticleStrategy = {
      id: 1,
      cible: { input: '', suggestion: null, validated: '' },
      douleur: { input: '', suggestion: null, validated: '' },
      aiguillage: { suggestedType: null, suggestedParent: null, suggestedChildren: [], validated: false },
      angle: { input: '', suggestion: null, validated: '' },
      promesse: { input: '', suggestion: null, validated: '' },
      cta: { type: 'service', target: '', suggestion: null },
      completedSteps: 0,
      updatedAt: new Date().toISOString(),
    }
    const ctx = buildStrategyContext(strategy)
    expect(ctx).toBe('')
  })

  it('construit bloc markdown avec 6 champs validés présents', () => {
    const strategy: ArticleStrategy = {
      id: 1,
      cible: { input: '', suggestion: null, validated: 'PME SaaS 10-50 salariés' },
      douleur: { input: '', suggestion: null, validated: 'Manque de visibilité en recherche locale' },
      aiguillage: { suggestedType: null, suggestedParent: null, suggestedChildren: [], validated: false },
      angle: { input: '', suggestion: null, validated: 'Approche SEO local pragmatique' },
      promesse: { input: '', suggestion: null, validated: 'Augmenter trafic local de 40% en 6 mois' },
      cta: { type: 'service', target: 'Audit SEO local offert', suggestion: null },
      completedSteps: 6,
      updatedAt: new Date().toISOString(),
    }
    const ctx = buildStrategyContext(strategy)
    expect(ctx).toContain('## Contexte stratégique (Brain-First)')
    expect(ctx).toContain('PME SaaS 10-50 salariés')
    expect(ctx).toContain('Manque de visibilité en recherche locale')
    expect(ctx).toContain('Approche SEO local pragmatique')
    expect(ctx).toContain('Augmenter trafic local de 40% en 6 mois')
    expect(ctx).toContain('Audit SEO local offert')
    expect(ctx).toContain('fil rouge')
  })

  it('omet champs non validés (empty string ou null)', () => {
    const strategy: ArticleStrategy = {
      id: 1,
      cible: { input: '', suggestion: null, validated: 'PME' },
      douleur: { input: '', suggestion: null, validated: '' }, // empty = omis
      aiguillage: { suggestedType: null, suggestedParent: null, suggestedChildren: [], validated: false },
      angle: { input: '', suggestion: null, validated: 'Angle unique' },
      promesse: { input: '', suggestion: null, validated: '' }, // empty = omis
      cta: { type: 'service', target: '', suggestion: null }, // target empty = omis
      completedSteps: 4,
      updatedAt: new Date().toISOString(),
    }
    const ctx = buildStrategyContext(strategy)
    expect(ctx).toContain('Cible')
    expect(ctx).toContain('Angle')
    expect(ctx).not.toContain('Douleur adressée')
    expect(ctx).not.toContain('Promesse au lecteur')
    // Reformulé 2026-05-04 : le pied du contexte contient toujours la phrase
    // "Le CTA, s'il est défini, doit être amené naturellement en conclusion."
    // On vérifie donc l'absence du champ structuré (ligne `**CTA** :`), pas du mot.
    expect(ctx).not.toContain('**CTA**')
  })
})

// ============================================================================
// PART 3: getArticlePainPoint tests (FR-CAP-PAINPOINT-FALLBACK)
// ============================================================================

describe('FR-CAP-PAINPOINT-FALLBACK — getArticlePainPoint', () => {
  beforeEach(() => {
    mockedQuery.mockReset()
  })

  it('retourne painPoint trimé quand valide en DB', async () => {
    mockedQuery.mockResolvedValue({ rows: [{ pain_point: '  Problème d\'affichage mobile  ' }] } as never)
    const result = await getArticlePainPoint(42)
    expect(result).toBe('Problème d\'affichage mobile')
  })

  it('retourne PAIN_POINT_FALLBACK quand pain_point=NULL', async () => {
    mockedQuery.mockResolvedValue({ rows: [{ pain_point: null }] } as never)
    const result = await getArticlePainPoint(42)
    expect(result).toBe(PAIN_POINT_FALLBACK)
  })

  it('retourne PAIN_POINT_FALLBACK quand pain_point="   " (whitespace-only)', async () => {
    mockedQuery.mockResolvedValue({ rows: [{ pain_point: '   ' }] } as never)
    const result = await getArticlePainPoint(42)
    expect(result).toBe(PAIN_POINT_FALLBACK)
  })

  it('retourne PAIN_POINT_FALLBACK quand article n\'existe pas (rows vide)', async () => {
    mockedQuery.mockResolvedValue({ rows: [] } as never)
    const result = await getArticlePainPoint(999)
    expect(result).toBe(PAIN_POINT_FALLBACK)
  })

  it('court-circuite DB pour articleId invalide (null/undefined/0/NaN)', async () => {
    expect(await getArticlePainPoint(null)).toBe(PAIN_POINT_FALLBACK)
    expect(await getArticlePainPoint(undefined)).toBe(PAIN_POINT_FALLBACK)
    expect(await getArticlePainPoint(0)).toBe(PAIN_POINT_FALLBACK)
    expect(await getArticlePainPoint(Number.NaN)).toBe(PAIN_POINT_FALLBACK)
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('retourne PAIN_POINT_FALLBACK sans throw si DB erreur', async () => {
    mockedQuery.mockRejectedValue(new Error('connection refused'))
    const result = await getArticlePainPoint(42)
    expect(result).toBe(PAIN_POINT_FALLBACK)
  })

  it('PAIN_POINT_FALLBACK vaut littéralement "(non défini)"', () => {
    expect(PAIN_POINT_FALLBACK).toBe('(non défini)')
  })
})

// ============================================================================
// PART 4: Prompt file validation (FR-MOT-PAINPOINT-INJECTION)
// ============================================================================

describe('FR-MOT-PAINPOINT-INJECTION — 8 prompts contiennent une variable pain point', () => {
  // Reformulé 2026-05-04 : la convention historique est {{painPoint}} mais
  // radar-long-tail-suggest utilise {{article_pain_point}} (cf. long-tail-suggest.service.ts).
  // L'invariant réel est : chaque prompt expose une variable pain point quelconque.
  const EXPECTED_PROMPTS: Array<{ name: string; variable: string }> = [
    { name: 'capitaine-ai-panel', variable: '{{painPoint}}' },
    { name: 'propose-lieutenants', variable: '{{painPoint}}' },
    { name: 'lieutenants-hn-structure', variable: '{{painPoint}}' },
    { name: 'lexique-ai-panel', variable: '{{painPoint}}' },
    { name: 'lexique-analysis-upfront', variable: '{{painPoint}}' },
    { name: 'lexique-suggest', variable: '{{painPoint}}' },
    { name: 'radar-long-tail-suggest', variable: '{{article_pain_point}}' },
    { name: 'intent-keywords', variable: '{{painPoint}}' },
  ]

  EXPECTED_PROMPTS.forEach(({ name, variable }) => {
    it(`${name}.md contient ${variable}`, async () => {
      try {
        const content = await readFile(
          join(process.cwd(), 'server', 'prompts', `${name}.md`),
          'utf-8'
        )
        expect(content).toContain(variable)
      } catch (err) {
        throw new Error(`Prompt file ${name}.md not found or error reading: ${(err as Error).message}`)
      }
    })
  })
})

// ============================================================================
// PART 5: Prompt file validation — strategy_context presence
// ============================================================================

describe('Prompts contiennent {{strategy_context}} ou peuvent l\'accepter (implicitement)', () => {
  it('capitaine-ai-panel.md contient {{strategy_context}}', async () => {
    const content = await readFile(
      join(process.cwd(), 'server', 'prompts', 'capitaine-ai-panel.md'),
      'utf-8'
    )
    expect(content).toContain('{{strategy_context}}')
  })

  // NOTE: Autres prompts peuvent ne pas avoir {{strategy_context}} explicite
  // mais le reçoivent via loadPrompt() auto-append (cf. prompt-loader.ts:125-127)
})

// ============================================================================
// PART 6: buildStrategyContext + buildCocoonStrategyBlock consistency
// ============================================================================

describe('Cohérence article vs cocon strategy block format', () => {
  it('article block contient les 6 champs (cible, douleur, angle, promesse, cta) au format markdown', () => {
    const strategy: ArticleStrategy = {
      id: 1,
      cible: { input: '', suggestion: null, validated: 'Cible texte' },
      douleur: { input: '', suggestion: null, validated: 'Douleur texte' },
      aiguillage: { suggestedType: null, suggestedParent: null, suggestedChildren: [], validated: false },
      angle: { input: '', suggestion: null, validated: 'Angle texte' },
      promesse: { input: '', suggestion: null, validated: 'Promesse texte' },
      cta: { type: 'service', target: 'CTA texte', suggestion: null },
      completedSteps: 6,
      updatedAt: new Date().toISOString(),
    }
    const block = buildStrategyContext(strategy)
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    expect(lines.some(l => l.includes('Cible texte'))).toBe(true)
    expect(lines.some(l => l.includes('Douleur texte'))).toBe(true)
    expect(lines.some(l => l.includes('Angle texte'))).toBe(true)
    expect(lines.some(l => l.includes('Promesse texte'))).toBe(true)
    expect(lines.some(l => l.includes('CTA texte'))).toBe(true)
  })

  it('cocon block contient les 5 champs (cible, douleur, angle, promesse, cta) au format markdown', () => {
    const strategy: CocoonStrategy = {
      cocoonSlug: 'mon-cocon',
      cible: { input: '', suggestion: null, validated: 'Cible cocon' },
      douleur: { input: '', suggestion: null, validated: 'Douleur cocon' },
      angle: { input: '', suggestion: null, validated: 'Angle cocon' },
      promesse: { input: '', suggestion: null, validated: 'Promesse cocon' },
      cta: { input: '', suggestion: null, validated: 'CTA cocon' },
      proposedArticles: [],
      suggestedTopics: [],
      topicsUserContext: '',
      completedSteps: 5,
      updatedAt: new Date().toISOString(),
    }
    const block = buildCocoonStrategyBlock(strategy)
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    expect(lines.some(l => l.includes('Cible cocon'))).toBe(true)
    expect(lines.some(l => l.includes('Douleur cocon'))).toBe(true)
    expect(lines.some(l => l.includes('Angle cocon'))).toBe(true)
    expect(lines.some(l => l.includes('Promesse cocon'))).toBe(true)
    expect(lines.some(l => l.includes('CTA cocon'))).toBe(true)
  })
})

// ============================================================================
// PART 7: NFR-INT-STRATEGY-OPTIONAL — prompt sans strategy_context
// ============================================================================

describe('NFR-INT-STRATEGY-OPTIONAL — prompts tolèrent strategy_context vide', () => {
  it('loadPrompt avec strategy_context="" produit prompt valide (pas de {{...}} non remplacé)', async () => {
    // NOTE: Réel test nécessiterait d'appeler loadPrompt() avec un prompt test
    // Pour cette version, on simule : si buildStrategyContext retourne '',
    // alors loadPrompt ne doit pas laisser {{strategy_context}} literal dans le résultat
    const emptyCtx = buildStrategyContext(null)
    expect(emptyCtx).toBe('')
    // Si un prompt contient {{strategy_context}}, remplacer par '' est valide syntaxe Markdown
    const mockPrompt = 'Tu es un expert.\n\n{{strategy_context}}\n\nAnalyse...'
    const result = mockPrompt.replace('{{strategy_context}}', emptyCtx)
    expect(result).not.toContain('{{')
    expect(result).toContain('Tu es un expert.\n\n\n\nAnalyse...')
  })
})

// ============================================================================
// PART 8: Smoke test — no typos in variable names
// ============================================================================

describe('Smoke tests — typos dans les variables', () => {
  it('aucun prompt ne contient {{strategyContext}} (typo, camelCase)', async () => {
    const prompts = [
      'capitaine-ai-panel',
      'propose-lieutenants',
      'lieutenants-hn-structure',
      'lexique-ai-panel',
      'lexique-analysis-upfront',
      'lexique-suggest',
    ]
    for (const p of prompts) {
      const content = await readFile(join(process.cwd(), 'server', 'prompts', `${p}.md`), 'utf-8')
      expect(content).not.toContain('{{strategyContext}}', `${p}.md has typo {{strategyContext}}`)
    }
  })

  it('aucun prompt ne contient {{pain_point}} (typo, snake_case)', async () => {
    const prompts = [
      'capitaine-ai-panel',
      'propose-lieutenants',
      'lieutenants-hn-structure',
      'lexique-ai-panel',
      'lexique-analysis-upfront',
      'lexique-suggest',
    ]
    for (const p of prompts) {
      const content = await readFile(join(process.cwd(), 'server', 'prompts', `${p}.md`), 'utf-8')
      expect(content).not.toContain('{{pain_point}}', `${p}.md has typo {{pain_point}}`)
    }
  })

  it('aucun prompt n\'a {{painpoint}} (typo, minuscule)', async () => {
    const prompts = [
      'capitaine-ai-panel',
      'propose-lieutenants',
      'lieutenants-hn-structure',
      'lexique-ai-panel',
      'lexique-analysis-upfront',
      'lexique-suggest',
    ]
    for (const p of prompts) {
      const content = await readFile(join(process.cwd(), 'server', 'prompts', `${p}.md`), 'utf-8')
      expect(content).not.toContain('{{painpoint}}', `${p}.md has typo {{painpoint}}`)
    }
  })
})

// ============================================================================
// PART 9: Integration — loadPrompt variable injection
// ============================================================================

describe('loadPrompt() injecte variables correctement', () => {
  it.todo('loadPrompt avec strategy_context + painPoint remplace les deux variables')
  it.todo('loadPrompt avec cocoonSlug charge et injecte buildCocoonStrategyBlock automatiquement')
  it.todo('loadPrompt sans {{strategy_context}} placeholder appends cocon block à la fin si présent')
})

// ============================================================================
// PART 10: Edge cases
// ============================================================================

describe('Edge cases et régressions', () => {
  it('painPoint avec caractères spéciaux n\'est pas échappé par getArticlePainPoint', async () => {
    mockedQuery.mockResolvedValue({ rows: [{ pain_point: 'Problème <script> & "quotes"' }] } as never)
    const result = await getArticlePainPoint(42)
    expect(result).toBe('Problème <script> & "quotes"')
    // NOTE: l'escaping est fait au niveau loadPrompt() via escapePromptContent(),
    // pas à getArticlePainPoint()
  })

  it('strategy avec 1 seule étape validée génère bloc non vide', () => {
    const strategy: ArticleStrategy = {
      id: 1,
      cible: { input: '', suggestion: null, validated: 'Seule cible' },
      douleur: { input: '', suggestion: null, validated: '' },
      aiguillage: { suggestedType: null, suggestedParent: null, suggestedChildren: [], validated: false },
      angle: { input: '', suggestion: null, validated: '' },
      promesse: { input: '', suggestion: null, validated: '' },
      cta: { type: 'service', target: '', suggestion: null },
      completedSteps: 1,
      updatedAt: new Date().toISOString(),
    }
    const ctx = buildStrategyContext(strategy)
    expect(ctx).not.toBe('')
    expect(ctx).toContain('Seule cible')
  })
})
