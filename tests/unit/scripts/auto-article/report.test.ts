import { describe, it, expect } from 'vitest'
import { RunReport } from '../../../../scripts/auto-article/report.js'

describe('auto:report — coût IA', () => {
  it('additionne le coût des usages', () => {
    const r = new RunReport()
    r.addUsage({ estimatedCost: 0.01 })
    r.addUsage({ estimatedCost: 0.005 })
    expect(r.aiCost).toBeCloseTo(0.015, 6)
  })

  it('ignore null, undefined et NaN', () => {
    const r = new RunReport()
    r.addUsage(null)
    r.addUsage(undefined)
    r.addUsage({ estimatedCost: Number.NaN })
    r.addUsage({})
    expect(r.aiCost).toBe(0)
  })
})

describe('auto:report — coût SEO (régression audit n°23)', () => {
  it('calcule le delta entre baseline et relevé final', () => {
    const r = new RunReport()
    r.setSeoBaseline(1.2)
    r.setSeoFinal(1.47)
    expect(r.seoCost).toBeCloseTo(0.27, 6)
  })

  it('reste à 0 sans baseline (endpoint absent)', () => {
    const r = new RunReport()
    r.setSeoFinal(5)
    expect(r.seoCost).toBe(0)
  })

  it('ne devient jamais négatif si la fenêtre glissante a purgé', () => {
    const r = new RunReport()
    r.setSeoBaseline(0.9)
    r.setSeoFinal(0.2)
    expect(r.seoCost).toBe(0)
  })

  it('le total additionne IA + SEO', () => {
    const r = new RunReport()
    r.addUsage({ estimatedCost: 0.09 })
    r.setSeoBaseline(0)
    r.setSeoFinal(0.27)
    expect(r.totalCostUsd).toBeCloseTo(0.36, 6)
  })
})

describe('auto:report — étapes & rendu', () => {
  it('compte les étapes', () => {
    const r = new RunReport()
    r.addStep('Cerveau')
    r.addStep('Moteur', 1200)
    expect(r.stepCount).toBe(2)
  })

  it('render affiche les 3 lignes de coût', () => {
    const r = new RunReport()
    r.addStep('Cerveau')
    r.addUsage({ estimatedCost: 0.02 })
    r.setSeoBaseline(0)
    r.setSeoFinal(0.3)
    const out = r.render()
    expect(out).toContain('Cerveau')
    expect(out).toContain('Coût IA')
    expect(out).toContain('$0.0200')
    expect(out).toContain('Coût SEO')
    expect(out).toContain('$0.3000')
    expect(out).toContain('$0.3200')
  })
})
