// @vitest-environment node
/**
 * FR-LIE-LOCK-GATE — des lieutenants en nombre suffisant et sans cannibalisation.
 * Le pilier 1013 n'avait qu'un seul lieutenant.
 */
import { describe, it, expect } from 'vitest'
import { verifyLieutenants } from '../../../shared/verifiers/lieutenants.js'
import { ARTICLE_TYPE_RULES } from '../../../shared/constants/article-type-rules.js'

const base = { captain: 'stratégie digitale pme', cocoonClaims: [] }

describe('verifyLieutenants', () => {
  it('🔴 un seul lieutenant pour un pilier (cas du 1013), avec les candidats non retenus en pistes', () => {
    const issues = verifyLieutenants({
      ...base, level: 'pilier', lieutenants: ['pourquoi mon site ne génère pas de clients'],
      unselectedCandidates: ['audit site web', 'seo local pme'],
    })
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ rule: 'lieutenants-too-few', level: 'risque' })
    expect(issues[0]!.message).toContain(String(ARTICLE_TYPE_RULES.pilier.minLieutenants))
    expect(issues[0]!.alternatives).toEqual(['audit site web', 'seo local pme'])
  })

  it('passe quand le minimum du type est atteint', () => {
    expect(verifyLieutenants({ ...base, level: 'specifique', lieutenants: ['un lieutenant'] })).toEqual([])
  })

  it('🔴 un lieutenant qui est le capitaine d’un autre article du cocon', () => {
    const issues = verifyLieutenants({
      ...base, level: 'specifique', lieutenants: ['Audit Site Web'],
      cocoonClaims: [{ keyword: 'audit site web', articleTitle: 'Auditer son site', role: 'capitaine' }],
    })
    expect(issues).toEqual([expect.objectContaining({ rule: 'lieutenant-cannibalization:audit site web', level: 'risque' })])
    expect(issues[0]!.message).toContain('Auditer son site')
  })

  it('🟠 un lieutenant partagé avec un autre article (courant, moins grave)', () => {
    const issues = verifyLieutenants({
      ...base, level: 'specifique', lieutenants: ['vitesse site'],
      cocoonClaims: [{ keyword: 'vitesse site', articleTitle: 'Performance', role: 'lieutenant' }],
    })
    expect(issues).toEqual([expect.objectContaining({ rule: 'lieutenant-shared:vitesse site', level: 'attention' })])
  })

  it('🟠 un lieutenant identique au capitaine de l’article', () => {
    const issues = verifyLieutenants({ ...base, level: 'specifique', lieutenants: ['Stratégie digitale PME'] })
    expect(issues[0]).toMatchObject({ level: 'attention', rule: 'lieutenant-is-captain:strategie digitale pme' })
  })

  it('une alerte par lieutenant : chaque conflit se déroge séparément', () => {
    const issues = verifyLieutenants({
      ...base, level: 'specifique', lieutenants: ['a b', 'c d'],
      cocoonClaims: [
        { keyword: 'a b', articleTitle: 'X', role: 'capitaine' },
        { keyword: 'c d', articleTitle: 'Y', role: 'capitaine' },
      ],
    })
    expect(new Set(issues.map(i => i.rule)).size).toBe(2)
  })
})
