// @vitest-environment node
/**
 * Contexte transmis à la rédaction (épopée qualité SEO, R5 et R8).
 *
 * R5 — le Cerveau valide la stratégie au niveau du cocon (`cocoon_strategies`).
 * La rédaction ne lisait que la stratégie propre à l'article
 * (`article_strategies`), vide pour tout article créé par le Cerveau : le
 * pilier 1013 a été écrit sans cible, sans douleur, sans angle.
 *
 * R8 — quand un fournisseur d'IA en remplace un autre en cours de route, seul
 * le modèle de la dernière section était enregistré : impossible de savoir
 * quel modèle avait écrit quoi.
 */
import { describe, it, expect } from 'vitest'
import { pickStrategyContext, describeModelsUsed } from '../../../server/routes/generate/_helpers.js'
import type { ArticleStrategy, CocoonStrategy } from '../../../shared/types/index.js'

const step = (validated: string) => ({ input: validated, suggestion: null, validated })

const cocoon = {
  cible: step('Dirigeants de TPE toulousaines'),
  douleur: step('Leur site ne leur amène aucun client'),
  angle: step('Exemples locaux chiffrés'),
  promesse: step('Comprendre pourquoi en une lecture'),
  cta: step('Audit gratuit de 20 minutes'),
} as unknown as CocoonStrategy

describe('pickStrategyContext — la rédaction reçoit toujours la stratégie validée', () => {
  it('prend la stratégie du cocon quand l’article n’a pas la sienne', () => {
    const block = pickStrategyContext(null, cocoon)
    expect(block).toContain('Dirigeants de TPE toulousaines')
    expect(block).toContain('Leur site ne leur amène aucun client')
    expect(block).toContain('Audit gratuit de 20 minutes')
  })

  it('préfère la stratégie propre à l’article quand elle existe', () => {
    const article = {
      completedSteps: 2,
      cible: { input: '', suggestion: null, validated: 'Artisans du bâtiment' },
      douleur: { input: '', suggestion: null, validated: 'Pas de demandes de devis' },
      angle: { input: '', suggestion: null, validated: '' },
      promesse: { input: '', suggestion: null, validated: '' },
      cta: { type: 'audit', target: '' },
    } as unknown as ArticleStrategy
    const block = pickStrategyContext(article, cocoon)
    expect(block).toContain('Artisans du bâtiment')
    expect(block).not.toContain('Dirigeants de TPE toulousaines')
  })

  it('renvoie une chaîne vide quand il n’y a aucune stratégie', () => {
    expect(pickStrategyContext(null, null)).toBe('')
  })
})

describe('describeModelsUsed — on sait quel modèle a écrit l’article', () => {
  it('liste chaque modèle une fois, dans l’ordre d’apparition', () => {
    expect(describeModelsUsed(['claude-haiku-4-5', 'claude-haiku-4-5', 'llama-3.3-70b', undefined, 'claude-haiku-4-5']))
      .toBe('claude-haiku-4-5 + llama-3.3-70b')
  })

  it('garde un seul modèle tel quel', () => {
    expect(describeModelsUsed(['claude-haiku-4-5'])).toBe('claude-haiku-4-5')
  })
})
