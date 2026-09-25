/**
 * Budget de mots de chaque chapitre (H2) d'un article — source unique pour le
 * prompt du premier jet et pour sa porte (FR-RED-DRAFT-SINGLE-PASS).
 *
 * Répartition : 15 % pour le premier chapitre (introduction), 10 % pour le
 * dernier (conclusion), 75 % partagés entre les autres ; 40 / 60 pour deux
 * chapitres ; tout pour un seul. Le texte placé avant le premier H2 (chapeau)
 * compte dans le premier chapitre.
 */
type SectionRole = 'introduction' | 'corps' | 'conclusion'

interface SectionBudget {
  role: SectionRole
  budget: number
}

export function sectionBudgets(totalGroups: number, targetWords: number): SectionBudget[] {
  if (totalGroups <= 0) return []
  if (totalGroups === 1) return [{ role: 'corps', budget: targetWords }]
  if (totalGroups === 2) {
    return [
      { role: 'introduction', budget: Math.ceil(targetWords * 0.4) },
      { role: 'conclusion', budget: Math.ceil(targetWords * 0.6) },
    ]
  }
  const middle = Math.ceil((targetWords * 0.75) / (totalGroups - 2))
  return Array.from({ length: totalGroups }, (_, i) => {
    if (i === 0) return { role: 'introduction' as const, budget: Math.ceil(targetWords * 0.15) }
    if (i === totalGroups - 1) return { role: 'conclusion' as const, budget: Math.ceil(targetWords * 0.10) }
    return { role: 'corps' as const, budget: middle }
  })
}
