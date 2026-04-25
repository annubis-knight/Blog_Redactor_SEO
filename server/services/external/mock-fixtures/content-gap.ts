/**
 * Mock fixture: analyze_content_gap
 *
 * Tool utilisé par content-gap.service.ts pour analyser les concurrents et
 * identifier les thèmes partagés + entités locales.
 */
import { registerToolFixture } from '../mock.service.js'

registerToolFixture('analyze_content_gap', ({ userPrompt }) => {
  // Extrait les URLs des concurrents du prompt
  const urlMatches = userPrompt.match(/https?:\/\/[^\s"']+/g) ?? []
  const urls = [...new Set(urlMatches)].slice(0, 5)

  const competitors = urls.map((url, i) => ({
    url,
    headings: [
      `H2: Les points clés à retenir`,
      `H2: Comment bien choisir`,
      `H3: Étape ${i + 1}`,
    ],
    wordCount: 1200 + i * 200,
    localEntities: ['Toulouse', 'Occitanie', i === 0 ? 'Capitole' : 'Compans-Caffarelli'],
    publishDate: `2025-${String(6 + i).padStart(2, '0')}-15`,
    readabilityScore: 60 + i * 5,
    paasCovered: [
      'Quels sont les tarifs ?',
      i > 0 ? 'Comment choisir ?' : 'Quelles certifications ?',
    ],
  }))

  return {
    competitors,
    themes: [
      { theme: 'tarifs et devis', frequency: Math.min(competitors.length, 4) },
      { theme: 'certifications professionnelles', frequency: 3 },
      { theme: 'garanties et assurances', frequency: 2 },
      { theme: 'intervention urgence 24/7', frequency: competitors.length },
    ],
    localEntities: [
      { entity: 'Toulouse', frequency: competitors.length },
      { entity: 'Occitanie', frequency: Math.max(1, competitors.length - 1) },
      { entity: 'Capitole', frequency: 1 },
    ],
  }
})
