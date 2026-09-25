// @vitest-environment node
/**
 * FR-HN-LOCK-GATE — la structure H1/H2/H3 devient le sommaire de la rédaction :
 * elle est jugée avant de valider l'étape « Structure ».
 *
 * Le pilier 1013 avait un H1 sans son mot-clé et quinze chapitres pour un
 * article qui en demandait six à huit.
 */
import { describe, it, expect } from 'vitest'
import { verifyStructure, bodyH2, structureHeadings, type StructureGateInput } from '../../../shared/verifiers/structure'

const rules = (issues: Array<{ level: string; rule: string }>) => issues.map(i => `${i.level}:${i.rule.split(':')[0]}`)

const h2 = (text: string, h3: string[] = []) => ({ level: 2, text, children: h3.map(t => ({ level: 3, text: t })) })

const sain: StructureGateInput = {
  level: 'pilier',
  captain: 'création site web Toulouse',
  structure: [
    { level: 1, text: 'Création de site web à Toulouse : le guide des TPE' },
    h2('Pourquoi un site vitrine change tout', ['Être trouvé', 'Rassurer']),
    h2('Le prix d’un site vitrine professionnel', ['Les postes', 'Les pièges']),
    h2('Les étapes d’un projet réussi', ['Le message', 'Les pages']),
    h2('Choisir son prestataire à Toulouse', ['Les questions', 'Les signaux']),
    h2('Référencement local : être visible', ['La fiche Google', 'Les avis']),
    h2('Mesurer les résultats', ['Les indicateurs', 'Le suivi']),
  ],
  lockedLieutenants: ['prix site vitrine', 'référencement local'],
  cocoonArticles: [],
  zone: 'Toulouse, Occitanie',
}

describe('verifyStructure — une bonne structure passe', () => {
  it('H1 avec le capitaine, 6 H2 de fond, lieutenants couverts, ville citée avec mesure', () => {
    expect(verifyStructure(sain)).toEqual([])
  })
})

describe('verifyStructure — ⛔ défauts techniques', () => {
  it('aucun H2', () => {
    expect(rules(verifyStructure({ ...sain, structure: [{ level: 1, text: 'Titre' }] }))).toEqual(['technique:hn-empty'])
  })

  it('H1 absent, titre vide, H3 sans H2', () => {
    const structure = [{ level: 3, text: 'Orphelin' }, h2('Un chapitre'), { level: 2, text: '  ' }]
    const found = rules(verifyStructure({ ...sain, structure }))
    expect(found).toContain('technique:hn-h1-missing')
    expect(found).toContain('technique:hn-empty-title')
    expect(found).toContain('technique:hn-h3-without-h2')
  })
})

describe('verifyStructure — 🔴 risques', () => {
  it('le pilier 1013 : H1 sans capitaine, quinze chapitres', () => {
    const structure = [
      { level: 1, text: 'Propulser la croissance digitale des entreprises toulousaines' },
      ...Array.from({ length: 15 }, (_, i) => h2(`Chapitre ${i + 1} sur la croissance`)),
    ]
    const found = rules(verifyStructure({ ...sain, captain: 'stratégie digitale entreprises Toulouse', structure, lockedLieutenants: [] }))
    expect(found).toContain('risque:hn-captain-not-in-h1')
    expect(found).toContain('risque:hn-h2-count')
  })

  it('l’introduction et la conclusion ne comptent pas comme H2 de fond, et sont signalées 🟠', () => {
    const structure = [...(sain.structure as unknown[]), h2('Introduction'), h2('Conclusion : passez à l’action')]
    expect(bodyH2(structureHeadings(structure))).toHaveLength(6)
    const found = rules(verifyStructure({ ...sain, structure }))
    expect(found).not.toContain('risque:hn-h2-count')
    expect(found.filter(r => r === 'attention:hn-intro-conclusion')).toHaveLength(2)
  })

  it('trop de H2 qui citent la ville', () => {
    const structure = (sain.structure as Array<{ level: number; text: string }>).map((n, i) => (n.level === 2 && i < 5 ? { ...n, text: `${n.text} à Toulouse` } : n))
    expect(rules(verifyStructure({ ...sain, structure }))).toContain('risque:hn-local-overuse')
  })

  it('pilier : un H2 qui développe le sujet d’un article du cocon (🔴), ou qui le recoupe seulement (🟠)', () => {
    const cocoonArticles = [{ title: 'Prix d’un site vitrine', captain: 'prix site vitrine' }]
    const developed = [...(sain.structure as unknown[]).slice(0, 2), h2('Le prix d’un site vitrine', ['Devis', 'Options']), ...(sain.structure as unknown[]).slice(3)]
    expect(rules(verifyStructure({ ...sain, structure: developed, cocoonArticles }))).toContain('risque:hn-overlaps-article')
    const summarized = [...(sain.structure as unknown[]).slice(0, 2), h2('Le prix d’un site vitrine'), ...(sain.structure as unknown[]).slice(3)]
    const found = rules(verifyStructure({ ...sain, structure: summarized, cocoonArticles }))
    expect(found).toContain('attention:hn-overlaps-article')
    expect(found).not.toContain('risque:hn-overlaps-article')
  })

  it('un article spécialisé ne juge pas les recoupements du cocon', () => {
    const structure = [{ level: 1, text: 'Prix site vitrine' }, h2('Le prix d’un site vitrine', ['Devis']), h2('Les options'), h2('Les pièges')]
    const found = rules(verifyStructure({ ...sain, level: 'specifique', captain: 'prix site vitrine', structure, lockedLieutenants: [], cocoonArticles: [{ title: 'Autre', captain: 'prix site vitrine' }] }))
    expect(found).not.toContain('risque:hn-overlaps-article')
  })
})

describe('verifyStructure — 🟠 attention', () => {
  it('un lieutenant retenu absent de tous les titres', () => {
    const issues = verifyStructure({ ...sain, lockedLieutenants: ['maintenance wordpress'] })
    expect(rules(issues)).toContain('attention:hn-lieutenant-missing')
    expect(issues[0]!.rule).toBe('hn-lieutenant-missing:maintenance wordpress')
  })

  it('trop de H3 sous un H2', () => {
    const structure = [...(sain.structure as unknown[]).slice(0, 6), h2('Mesurer les résultats', ['a', 'b', 'c', 'd'])]
    expect(rules(verifyStructure({ ...sain, structure }))).toContain('attention:hn-h3-too-many')
  })

  it('lit aussi l’ancien format { level: "H2", title }', () => {
    const old = [{ level: 'H1', title: 'Création de site web à Toulouse' }, { level: 'H2', title: 'Un chapitre' }]
    expect(structureHeadings(old)).toEqual([{ level: 1, text: 'Création de site web à Toulouse' }, { level: 2, text: 'Un chapitre' }])
  })
})
