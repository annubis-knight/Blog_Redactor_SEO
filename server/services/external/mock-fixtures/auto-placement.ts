/**
 * Mock fixture pour POST /api/generate/placement-suggest.
 *
 * Rejoue une décision plausible : reprend le PREMIER candidat présélectionné
 * (le plus affine selon l'heuristique) et son niveau conseillé, ce qui rend le
 * run mock déterministe tout en restant cohérent avec l'arbre réel.
 */
import { registerStreamFixture } from '../mock.service.js'

registerStreamFixture(
  'auto-placement',
  ({ userPrompt, systemPrompt }) =>
    /placement-suggest/i.test(userPrompt) || /placer un nouvel article dans une arborescence/i.test(systemPrompt),
  ({ systemPrompt }) => {
    // Le prompt liste les candidats sous la forme :
    //   1. Silo « X » → cocon « Y »
    //      Composition : … / Niveaux manquants : a, b
    const first = systemPrompt.match(/1\.\s*Silo\s*«\s*([^»]+)»\s*→\s*cocon\s*«\s*([^»]+)»/)
    const siloName = first?.[1]?.trim() ?? 'Silo inconnu'
    const cocoonName = first?.[2]?.trim() ?? 'Cocon inconnu'

    // Niveau : premier niveau manquant du 1er candidat, sinon intermédiaire.
    const missing = systemPrompt.match(/Niveaux manquants\s*:\s*([^\n]+)/)?.[1] ?? ''
    const level = /pilier/i.test(missing)
      ? 'pilier'
      : /specifique/i.test(missing) && !/intermediaire/i.test(missing)
        ? 'specifique'
        : 'intermediaire'

    return JSON.stringify({
      siloName,
      cocoonName,
      level,
      rationale: `Cocon le plus proche thématiquement ; niveau « ${level} » retenu au vu de sa composition actuelle (mock).`,
      createCocoon: false,
    })
  },
)
