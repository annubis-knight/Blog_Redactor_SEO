// @vitest-environment node
/**
 * FR-HN-LOCK-GATE (NFR-TEST-BEHAVIORAL) — la structure simulée ressemble à une
 * bonne structure : rendue sur la phrase exacte de la route, elle passe la porte
 * « valider la structure » sans défaut ⛔ ni risque 🔴, pour chaque type.
 * L'ancienne simulation ajoutait une FAQ en H2 et un H1 « (mock) ».
 */
import { describe, it, expect } from 'vitest'
import { streamFixtures } from '../../../server/services/external/mock-registry'
import '../../../server/services/external/mock-fixtures/index'
import { verifyStructure } from '../../../shared/verifiers/structure'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types'

const CAPTAIN = 'création site vitrine artisan'
const LIEUTENANTS = ['prix site vitrine', 'délai création site', 'site vitrine responsive']

describe.each<ArticleLevel>(['pilier', 'intermediaire', 'specifique'])('structure simulée — %s', (level) => {
  it('passe la porte sans ⛔ ni 🔴', () => {
    const userPrompt = `Recommande une structure Hn pour un article "${CAPTAIN}" de niveau ${level} utilisant ces Lieutenants: ${LIEUTENANTS.join(', ')}`
    const fixture = streamFixtures.find(f => f.matcher({ systemPrompt: '', userPrompt }))
    expect(fixture?.name).toBe('lieutenants-hn-structure')
    const { hnStructure } = JSON.parse(fixture!.builder({ systemPrompt: '', userPrompt }) as string) as { hnStructure: unknown[] }
    const issues = verifyStructure({ level, captain: CAPTAIN, structure: hnStructure, lockedLieutenants: LIEUTENANTS, cocoonArticles: [], zone: null })
    expect(issues.filter(i => i.level !== 'attention')).toEqual([])
  })
})
