/**
 * Valideur du nettoyage des fixtures : les mots-clés dérivés par le produit
 * doivent rester rattrapables.
 *
 * Le Capitaine construit des variantes racines en retirant des mots du mot-clé
 * de départ. `[test:1790124412964-ow4udh] Specifique site vitrine artisan`
 * devient `ow4udh specifique` — plus de préfixe `test-`, plus d'horodatage.
 * L'ancien nettoyage ne cherchait que `%test-<runId>-%` et laissait donc des
 * lignes derrière lui : 1303 mots-clés de test accumulés dans `keyword_metrics`
 * (relevé du 2026-09-23), remplis des données factices du bac à sable dans un
 * cache pourtant permanent.
 */
import { describe, it, expect } from 'vitest'
import { makeTestRunId, testKeywordPatterns } from '../../helpers/db-fixtures'

/** Vrai si l'un des motifs SQL `LIKE` attrape cette valeur. */
function attrape(patterns: string[], valeur: string): boolean {
  return patterns.some(p => {
    const re = new RegExp('^' + p.split('%').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$')
    return re.test(valeur)
  })
}

describe('testKeywordPatterns — rattraper les mots-clés dérivés', () => {
  const runId = '1790124412964-ow4udh'
  const patterns = testKeywordPatterns(runId)

  it('attrape le mot-clé étiqueté tel qu’il est semé', () => {
    expect(attrape(patterns, 'creation site internet toulouse test-1790124412964-ow4udh-kw')).toBe(true)
  })

  it('attrape le titre étiqueté entre crochets', () => {
    expect(attrape(patterns, '[test:1790124412964-ow4udh] Specifique site vitrine artisan')).toBe(true)
  })

  it('attrape une variante racine réduite au suffixe du runId', () => {
    expect(attrape(patterns, 'ow4udh specifique')).toBe(true)
    expect(attrape(patterns, ' ow4udh intermediaire')).toBe(true)
  })

  it('épargne un vrai mot-clé métier', () => {
    for (const vrai of [
      'creation site internet toulouse',
      'prix site vitrine artisan',
      'agence web toulouse tarif',
      'referencement naturel local',
    ]) {
      expect(attrape(patterns, vrai), `« ${vrai} » ne doit pas être supprimé`).toBe(false)
    }
  })

  it('produit un suffixe distinctif pour un runId fraîchement généré', () => {
    const suffixe = makeTestRunId().split('-').pop() ?? ''
    expect(suffixe.length, 'six caractères base36, assez pour ne croiser aucun mot français').toBeGreaterThanOrEqual(4)
    expect(suffixe).toMatch(/^[a-z0-9]+$/)
  })
})
