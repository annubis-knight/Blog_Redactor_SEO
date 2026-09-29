/**
 * Structure H1/H2/H3 validée au Moteur → sommaire de la Rédaction (FR-HN-TAB).
 *
 * Partagé entre l'écran (validation de l'onglet Structure) et le mode
 * automatique : les deux font du même sommaire la base du premier jet.
 */
import { isConclusionTitle, isIntroductionTitle } from './verifiers/structure.js'
import type { Outline, OutlineSection } from './types/outline.types.js'
import type { ProposeLieutenantsHnNode } from './types/serp-analysis.types.js'

export function structureToOutline(nodes: ProposeLieutenantsHnNode[], articleTitle: string): Outline {
  const now = Date.now()
  const sections: OutlineSection[] = []

  // H1 — celui du Moteur quand il en propose un : il porte le capitaine. Le
  // rétrograder en H2 faisait un second « titre » dans le corps, et le titre de
  // l'article prenait sa place sans le capitaine (épopée qualité SEO, M8).
  const h1Node = nodes.find(n => n.level === 1 && n.text.trim())
  sections.push({ id: `h1-${now}`, level: 1, title: h1Node ? h1Node.text.trim() : articleTitle, annotation: 'sommaire-cliquable', status: 'suggested' })

  // Introduction et conclusion : ajoutées par le sommaire, sauf si la structure
  // en porte déjà une (sinon deux introductions, deux conclusions).
  const h2Titles = nodes.filter(n => n.level === 2).map(n => n.text)
  if (!h2Titles.some(isIntroductionTitle)) {
    sections.push({ id: `h2-${now}-intro`, level: 2, title: 'Introduction', annotation: 'content-valeur', status: 'suggested' })
  }

  // Niveaux bornés à 2-3 : un article n'a qu'un H1, les suivants deviennent des H2.
  let idx = 0
  for (const node of nodes) {
    if (node !== h1Node) {
      const level = Math.min(3, Math.max(2, node.level)) as 2 | 3
      sections.push({ id: `h${level}-${now}-${idx}`, level, title: node.text, annotation: null, status: 'suggested' })
      idx++
    }
    for (const child of node.children ?? []) {
      const level = Math.min(3, Math.max(2, child.level)) as 2 | 3
      sections.push({ id: `h${level}-${now}-${idx}`, level, title: child.text, annotation: null, status: 'suggested' })
      idx++
    }
  }

  if (!h2Titles.some(isConclusionTitle)) {
    sections.push({ id: `h2-${now}-conclusion`, level: 2, title: 'Conclusion', annotation: 'content-reminder', status: 'suggested' })
  }
  return { sections }
}
