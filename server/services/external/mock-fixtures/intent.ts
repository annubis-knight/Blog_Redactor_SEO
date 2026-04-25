/**
 * Mock fixture: classify_intent
 *
 * Tool utilisé par intent.service.ts::classifyIntentWithClaude pour déterminer
 * l'intention de recherche (informational / transactional_local / navigational / mixed)
 * à partir des signaux SERP (modules présents + top organic results).
 */
import { registerToolFixture } from '../mock.service.js'

registerToolFixture('classify_intent', ({ userPrompt }) => {
  // On regarde les modules SERP mentionnés dans le prompt pour déduire l'intent
  const lower = userPrompt.toLowerCase()

  let type: 'informational' | 'transactional_local' | 'navigational' | 'mixed' = 'informational'
  let confidence = 0.7
  let reasoning = 'Classification par défaut basée sur modules SERP analysés.'

  if (lower.includes('local_pack')) {
    type = 'transactional_local'
    confidence = 0.88
    reasoning = 'Présence d\'un local pack → intention transactionnelle locale marquée.'
  } else if (lower.includes('featured_snippet') || lower.includes('people_also_ask')) {
    type = 'informational'
    confidence = 0.82
    reasoning = 'Featured snippet et/ou PAA présents → intention informationnelle dominante.'
  } else if (lower.includes('shopping')) {
    type = 'mixed'
    confidence = 0.75
    reasoning = 'Module shopping + résultats organiques → intention mixte (info + achat).'
  }

  return { type, confidence, reasoning }
})
