import { describe, it, expect } from 'vitest'
import { renderGateRecap } from '../../../../scripts/auto-article/gate-interactive.js'
import { createContext } from '../../../../scripts/auto-article/context.js'
import type { AutoRunConfig, AutoRunContext } from '../../../../scripts/auto-article/types.js'

function makeCtx(): AutoRunContext {
  const config: AutoRunConfig = {
    mode: 'mock',
    baseUrl: 'http://localhost:3400/api',
    verbose: false,
    configPath: null,
    resumeArticleId: null,
    nonInteractive: false,
  }
  return createContext(config, {
    topic: 'visibilité locale artisans',
    cocoonName: 'SEO local',
    businessContext: '',
    articleType: 'Pilier',
  })
}

describe('auto:gate — renderGateRecap', () => {
  it('gate1 affiche titre, mot-clé et stratégie', () => {
    const ctx = makeCtx()
    ctx.articleTitle = 'Mon titre'
    ctx.pilierKeyword = 'seo local'
    ctx.strategy = { angle: 'proximité', cta: 'devis' }
    const out = renderGateRecap('gate1', ctx)
    expect(out).toContain('Gate 1')
    expect(out).toContain('Mon titre')
    expect(out).toContain('seo local')
    expect(out).toContain('proximité')
  })

  it('gate1 affiche l\'arbre et l\'emplacement proposé', () => {
    const ctx = makeCtx()
    ctx.treeRender = 'Silo A\n  └─ Cocon X  [P1 I0 S0]'
    ctx.placement = {
      siloName: 'Silo A',
      cocoonName: 'Cocon X',
      level: 'pilier',
      rationale: 'cocon sans pilier',
      createCocoon: false,
    }
    const out = renderGateRecap('gate1', ctx)
    expect(out).toContain('Arbre SEO actuel')
    expect(out).toContain('Cocon X')
    expect(out).toContain('Pilier')
    expect(out).toContain('cocon sans pilier')
  })

  it('gate1 affiche les alternatives avec leurs scores et marque la retenue', () => {
    const ctx = makeCtx()
    ctx.placement = {
      siloName: 'Silo A',
      cocoonName: 'Stratégie de croissance',
      level: 'pilier',
      rationale: 'cocon vide pertinent',
      createCocoon: false,
    }
    ctx.placementOptions = [
      { siloName: 'Silo A', cocoonName: 'Stratégie de croissance', level: 'pilier', score: 0.85, isEmpty: true, summary: 'vide' },
      { siloName: 'Silo A', cocoonName: 'Croissance digitale', level: 'specifique', score: 0.33, isEmpty: false, summary: 'P1 · I6 · S9' },
    ]
    const out = renderGateRecap('gate1', ctx)
    expect(out).toContain('Alternatives évaluées')
    expect(out).toContain('85 %')
    expect(out).toContain('33 %')
    expect(out).toContain('▸ Stratégie de croissance')
    expect(out).toContain('vide')
  })

  it('gate1 affiche un bandeau explicite en mode mock', () => {
    const ctx = makeCtx()
    expect(renderGateRecap('gate1', ctx)).toContain('MODE MOCK')
  })

  it('gate1 signale un cocon à créer', () => {
    const ctx = makeCtx()
    ctx.placement = {
      siloName: 'Silo A',
      cocoonName: 'Nouveau cocon',
      level: 'intermediaire',
      rationale: 'hors champ des candidats',
      createCocoon: true,
    }
    expect(renderGateRecap('gate1', ctx)).toContain('à créer')
  })

  it('gate2 liste les collisions de cannibalisation', () => {
    const ctx = makeCtx()
    ctx.capitaine = 'seo pme'
    ctx.cannibalization = [
      { articleId: 42, keyword: 'seo pour pme', similarity: 0.9, similarityPercent: 90 },
    ]
    const out = renderGateRecap('gate2', ctx)
    expect(out).toContain('Proximité détectée')
    expect(out).toContain('seo pour pme')
    expect(out).toContain('#42')
    expect(out).toContain('90')
  })

  it('gate2 affiche capitaine, lieutenants et lexique', () => {
    const ctx = makeCtx()
    ctx.capitaine = 'référencement local'
    ctx.lieutenants = ['google business', 'avis clients']
    ctx.lexique = ['fiche', 'zone de chalandise']
    const out = renderGateRecap('gate2', ctx)
    expect(out).toContain('Gate 2')
    expect(out).toContain('référencement local')
    expect(out).toContain('google business')
    expect(out).toContain('zone de chalandise')
  })

  it('affiche — pour les champs absents', () => {
    const out = renderGateRecap('gate2', makeCtx())
    expect(out).toContain('—')
  })
})
