/**
 * Recette réelle C8 (2026-09-25) : le pilier s'arrêtait sur un chapitre trop
 * long, et ses passages « à sourcer » n'étaient jamais traités. Le mode
 * automatique fait désormais ce que ferait l'utilisateur : réécrire un chapitre
 * hors budget, puis passer « sources » — sans jamais retenir une proposition
 * qui porte une alerte ⛔ ou 🔴.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  offBudgetChapters,
  budgetInstruction,
  chaptersToSource,
  isAcceptable,
  fitChapterBudgets,
  sourcePassages,
} from '../../../../scripts/auto-article/phases/redaction-passes'
import type { PhaseDeps } from '../../../../scripts/auto-article/deps'

const ARTICLE = [
  '<h1>SEO local</h1><p>Chapeau.</p>',
  '<h2>Les listings locaux</h2><p>Très long chapitre.</p>',
  '<h2>Les avis clients</h2><p><mark data-a-sourcer>[à sourcer : part des clients qui lisent les avis]</mark></p>',
  '<h2>Conclusion</h2><p>Fin.</p>',
].join('\n')

const OFF_BUDGET = { rule: 'draft-section-off-budget', level: 'risque', message: 'Le chapitre « Les listings locaux » fait 487 mots pour environ 268 prévus.', excerpt: 'Les listings locaux' }

function deps(opts: { gateIssues?: unknown[]; proposals: Record<string, { html: string; blocked?: boolean; issues?: unknown[] }> }) {
  const bodies: Array<{ path: string; body: Record<string, unknown> }> = []
  const client = {
    apiGet: vi.fn(async () => ({ issues: opts.gateIssues ?? [] })),
    consumeSse: vi.fn(async (path: string, body: Record<string, unknown>, onEvent: (ev: { event: string; data: unknown }) => void) => {
      bodies.push({ path, body })
      const p = opts.proposals[path]!
      onEvent({ event: 'done', data: { html: p.html, blocked: p.blocked ?? false, issues: p.issues ?? [], usage: null } })
    }),
  }
  const logger = { step: vi.fn(), warn: vi.fn(), dim: vi.fn(), success: vi.fn(), info: vi.fn(), error: vi.fn(), phase: vi.fn() }
  const report = { addStep: vi.fn(), addUsage: vi.fn() }
  return { deps: { client, logger, report } as unknown as PhaseDeps, bodies, client, logger }
}

const CTX = { articleId: 1030, keyword: 'seo local', keywords: ['seo local', 'fiche google'] }

describe('redaction-passes — outils purs', () => {
  it('offBudgetChapters lit la porte du premier jet : chapitre, mots, budget', () => {
    expect(offBudgetChapters([OFF_BUDGET, { rule: 'unsourced-figure', level: 'risque', message: 'x' }], ARTICLE))
      .toEqual([{ index: 0, title: 'Les listings locaux', words: 487, budget: 268 }])
  })

  it('budgetInstruction : réduire un chapitre trop long, développer un chapitre trop court', () => {
    expect(budgetInstruction({ index: 0, title: 'A', words: 487, budget: 268 })).toMatch(/^Ramène ce chapitre à environ 268 mots/)
    expect(budgetInstruction({ index: 0, title: 'A', words: 90, budget: 268 })).toMatch(/^Développe ce chapitre jusqu'à environ 268 mots/)
    expect(budgetInstruction({ index: 0, title: 'A', words: 487, budget: 268 }).length).toBeLessThanOrEqual(600)
  })

  it('chaptersToSource : les chapitres qui portent un passage à sourcer', () => {
    expect(chaptersToSource(ARTICLE).map(c => c.title)).toEqual(['Les avis clients'])
  })

  it('isAcceptable : aucune alerte ⛔ ni 🔴 ; une 🟠 ne bloque pas', () => {
    expect(isAcceptable({ html: 'x', blocked: false, issues: [{ rule: 'r', level: 'attention', message: 'm' }] })).toBe(true)
    expect(isAcceptable({ html: 'x', blocked: false, issues: [{ rule: 'r', level: 'risque', message: 'm' }] })).toBe(false)
    expect(isAcceptable({ html: 'x', blocked: true, issues: [] })).toBe(false)
  })
})

describe('redaction-passes — réécrire un chapitre hors budget', () => {
  it('réécrit le chapitre avec la consigne de longueur, et le remplace seul', async () => {
    const { deps: d, bodies } = deps({ gateIssues: [OFF_BUDGET], proposals: { '/generate/section-rewrite': { html: '<h2>Les listings locaux</h2><p>Chapitre resserré.</p>' } } })
    const html = await fitChapterBudgets(d, CTX, ARTICLE)
    expect(bodies[0]).toMatchObject({ path: '/generate/section-rewrite', body: { articleId: 1030, chapterIndex: 0, instruction: expect.stringMatching(/environ 268 mots/) } })
    expect(html).toContain('<p>Chapitre resserré.</p>')
    expect(html).not.toContain('Très long chapitre')
    expect(html).toContain('Les avis clients')
  })

  it('une proposition qui porte une alerte 🔴 est écartée : le texte ne change pas', async () => {
    const { deps: d, logger } = deps({ gateIssues: [OFF_BUDGET], proposals: { '/generate/section-rewrite': { html: '<h2>Autre</h2>', issues: [{ rule: 'headings-changed', level: 'risque', message: 'titres modifiés' }] } } })
    expect(await fitChapterBudgets(d, CTX, ARTICLE)).toBe(ARTICLE)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('titres modifiés'))
  })
})

describe('redaction-passes — passe « sources »', () => {
  it('ne traite que les chapitres à sourcer, et retient une proposition sans alerte', async () => {
    const sourced = '<h2>Les avis clients</h2><p>Selon <a href="https://www.insee.fr/a">l’Insee (2025)</a>, 70 % des clients lisent les avis.</p>'
    const { deps: d, bodies } = deps({ proposals: { '/generate/enrich/sources': { html: sourced } } })
    const html = await sourcePassages(d, CTX, ARTICLE)
    expect(bodies.map(b => b.body.chapterIndex)).toEqual([1])
    expect(html).toContain('Selon <a href="https://www.insee.fr/a">')
    expect(html).not.toContain('data-a-sourcer')
  })
})
