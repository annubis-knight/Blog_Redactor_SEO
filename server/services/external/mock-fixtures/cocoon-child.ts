/**
 * Mock fixture pour POST /api/cocoons/:cocoonId/child-candidates
 * (prompt `cocoon-child-keywords.md`, FR-CER-KEYWORD-REAL-DATA).
 *
 * Rejoue 4 candidats plausibles, dérivés de la section du parent dont l'article
 * naît (ou, pour un pilier, du nom du cocon) : une formulation large, une plus
 * précise, une orientée prix, une orientée erreurs. Mots-clés en minuscules,
 * forme nominative, titres qui les contiennent en entier — comme le prompt le
 * demande. Enregistrée avant les fixtures génériques (`index.ts`).
 */
import { registerStreamFixture } from '../mock-registry.js'

function baseTopic(userPrompt: string): string {
  const section = userPrompt.match(/naît de la section « ([^»]+) »/)?.[1]
  const cocoon = userPrompt.match(/## Cocon « ([^»]+) »/)?.[1]
  return (section ?? cocoon ?? 'site internet')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\b(le|la|les|un|une|des|du|de|d|l|et|pour|son|sa|ses)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

registerStreamFixture(
  'cocoon-child-keywords',
  ({ userPrompt }) => /proposer le mot-clé d'un nouvel article/i.test(userPrompt),
  ({ userPrompt }) => {
    const base = baseTopic(userPrompt)
    const capitalized = base.charAt(0).toUpperCase() + base.slice(1)
    return JSON.stringify({
      candidates: [
        { keyword: base, title: `${capitalized} : le guide complet`, rationale: 'La formulation la plus large du sujet (mock).', painPoint: 'Le lecteur ne sait pas par où commencer.' },
        { keyword: `${base} etapes`, title: `${capitalized} etapes : la méthode pas à pas`, rationale: 'Une intention pratique, plus précise (mock).', painPoint: 'Le lecteur veut un déroulé clair.' },
        { keyword: `${base} prix`, title: `${capitalized} prix : ce qu’il faut prévoir`, rationale: 'Une intention commerciale : le budget (mock).', painPoint: 'Le lecteur craint un budget qui dérape.' },
        { keyword: `${base} erreurs`, title: `${capitalized} erreurs : les pièges à éviter`, rationale: 'Une longue traîne sur les erreurs courantes (mock).', painPoint: 'Le lecteur a peur de mal faire.' },
      ],
    })
  },
)
