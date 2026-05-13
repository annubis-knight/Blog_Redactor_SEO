/**
 * Vague 2 — Tests visuels (snapshot HTML) ProposedArticleRow.
 *
 * Référence FR PRD : FR-CER-STEPS-ARTICLE.
 *
 * Ces snapshots verrouillent la STRUCTURE HTML rendue dans 3 états critiques.
 * Une régression CSS qui n'aurait pas cassé un test architectural (ex: padding
 * supprimé, border qui disparaît, ordre d'éléments changé) sera détectée ici.
 *
 * RÈGLE DE RÉGÉNÉRATION (cf. tech-spec V2 risque 2.1) :
 * - Toute modification d'un snapshot DOIT être justifiée dans le PR.
 * - Lecture diff par un humain obligatoire.
 * - Screenshot avant/après si diff > 5 lignes.
 *
 * Si la régénération devient routine, le scope du snapshot est mauvais —
 * revoir le périmètre testé.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProposedArticleRow from '../../../src/components/strategy/ProposedArticleRow.vue'
import type { ProposedArticle, CompositionCheckResult } from '@shared/types/index.js'

function makeArticle(overrides: Partial<ProposedArticle> = {}): ProposedArticle {
  return {
    title: 'Comment optimiser le SEO local pour PME',
    suggestedTitles: ['Comment optimiser le SEO local pour PME', 'SEO local : guide PME'],
    type: 'pilier',
    parentTitle: null,
    rationale: 'Article pilier pour le cocon SEO local.',
    painPoint: 'Manque de visibilité Google Maps',
    suggestedKeyword: 'seo local pme',
    suggestedKeywords: ['seo local pme', 'référencement local entreprise'],
    suggestedSlug: 'seo-local-pme',
    suggestedSlugs: ['seo-local-pme'],
    accepted: false,
    ...overrides,
  } as ProposedArticle
}

const compositionWithWarnings: CompositionCheckResult = {
  allPass: false,
  warningCount: 2,
  results: [
    { rule: 'length', pass: true, message: 'Longueur OK' },
    { rule: 'localizer', pass: false, message: 'Manque un localizer' },
    { rule: 'persona', pass: false, message: 'Pas de persona explicite' },
  ],
}

describe('ProposedArticleRow — snapshots HTML (Vague 2)', () => {
  it('renders collapsed default state', () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0 },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders expanded state with all details', async () => {
    const wrapper = mount(ProposedArticleRow, {
      props: { article: makeArticle(), index: 0 },
    })
    await wrapper.find('.proposal-item').trigger('click')
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders with composition warnings (badge + tooltip-eligible)', () => {
    const wrapper = mount(ProposedArticleRow, {
      props: {
        article: makeArticle(),
        index: 0,
        compositionResult: compositionWithWarnings,
        structuralWarnings: [{ type: 'orphan', message: 'Article spécialisé orphelin' }],
      },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })
})
