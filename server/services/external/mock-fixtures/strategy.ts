/**
 * Mock fixtures pour le workflow Cerveau · Stratégie cocon.
 *
 * Streams couverts :
 *   - cocoon-strategy/suggest (par step : cible/douleur/aiguillage/angle/promesse/cta)
 *   - cocoon-strategy/deepen (génère une sous-question)
 *   - cocoon-strategy/enrich (fusionne sous-question dans la réponse principale)
 *   - cocoon-strategy/topics (propose 5-10 topics complémentaires)
 */
import { registerStreamFixture } from '../mock.service.js'

const STEP_ANSWERS: Record<string, string> = {
  cible: 'TPE et PME locales (5-50 salariés) en Occitanie, dirigées par un fondateur impliqué dans le digital mais sans expertise SEO interne.',
  douleur: 'Frustration de voir des concurrents moins qualifiés capter les leads via Google. Sentiment de "subir" le digital sans le maîtriser.',
  aiguillage: 'L\'audience nous trouve via des recherches problème ("pourquoi mon site ne convertit pas") plutôt que via le nom de l\'agence.',
  angle: 'Approche pédagogique sans jargon. Chaque article démonte un mécanisme SEO et donne des actions concrètes mesurables.',
  promesse: 'Reprendre la main sur sa visibilité Google en 90 jours sans dépendre d\'un prestataire opaque.',
  cta: 'Audit SEO offert (1h, sans engagement) avec un livrable concret : top 3 actions prioritaires pour les 30 prochains jours.',
}

registerStreamFixture(
  'cocoon-strategy-suggest',
  ({ userPrompt }) => /strat[eé]gie.*cocon|step\s*:\s*(cible|douleur|aiguillage|angle|promesse|cta)/i.test(userPrompt),
  ({ userPrompt }) => {
    const stepMatch = userPrompt.match(/step\s*:\s*(cible|douleur|aiguillage|angle|promesse|cta)/i)
    const step = (stepMatch?.[1] ?? 'cible').toLowerCase()
    return STEP_ANSWERS[step] ?? STEP_ANSWERS.cible
  },
)

registerStreamFixture(
  'cocoon-strategy-deepen',
  ({ userPrompt }) => /approfondir|sous[-\s]question|deepen/i.test(userPrompt),
  () => {
    const json = {
      question: 'Quels indicateurs concrets utilisez-vous aujourd\'hui pour mesurer la rentabilité de votre présence en ligne ?',
      description: 'Cette sous-question creuse la maturité analytique du segment. Elle aide à calibrer le niveau de pédagogie nécessaire dans les articles.',
    }
    return JSON.stringify(json, null, 2)
  },
)

registerStreamFixture(
  'cocoon-strategy-enrich',
  ({ userPrompt }) => /enrichir|enrich.*r[eé]ponse|fusion.*sous[-\s]question/i.test(userPrompt),
  ({ userPrompt }) => {
    // Récupère la réponse principale + la sous-réponse pour les fusionner
    const baseMatch = userPrompt.match(/r[eé]ponse principale\s*:?\s*"?([^"\n]{20,400})/i)
    const subMatch = userPrompt.match(/sous[-\s]r[eé]ponse\s*:?\s*"?([^"\n]{20,400})/i)
    const base = (baseMatch?.[1] ?? '').trim()
    const sub = (subMatch?.[1] ?? '').trim()
    return base
      ? `${base}\n\nÀ noter : ${sub || 'éléments complémentaires intégrés.'}`
      : `Réponse enrichie via mock : ${sub || 'pas de contexte fourni.'}`
  },
)

registerStreamFixture(
  'cocoon-strategy-topics',
  ({ userPrompt }) => /topics?\s+(compl[eé]mentaires?|optionnels?)|sujets?.*compl[eé]mentaires?/i.test(userPrompt),
  () => {
    const json = {
      topics: [
        { topic: 'Outils de mesure SEO accessibles aux non-techniciens', reasoning: 'Renforce la promesse autonomie' },
        { topic: 'Erreurs SEO courantes des PME locales', reasoning: 'Format pédagogique aligné avec l\'angle' },
        { topic: 'Quand faire appel à un prestataire vs faire soi-même', reasoning: 'Lève l\'objection prestataire' },
        { topic: 'Cas d\'études PME toulousaines', reasoning: 'Preuve sociale locale' },
        { topic: 'Roadmap SEO 90 jours', reasoning: 'Concrétise la promesse' },
        { topic: 'Comment auditer son propre site', reasoning: 'Pied dans la porte vers l\'audit offert' },
      ],
    }
    return JSON.stringify(json, null, 2)
  },
)
