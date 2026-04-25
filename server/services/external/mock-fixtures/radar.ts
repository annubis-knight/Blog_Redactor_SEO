/**
 * Mock fixture: generate_radar_keywords
 * Tool utilisé par keyword-radar.service.ts::generateRadarKeywords pour
 * proposer ~20 mots-clés short-tail liés à un pain point article.
 */
import { registerToolFixture } from '../mock.service.js'

registerToolFixture('generate_radar_keywords', ({ userPrompt }) => {
  // Le prompt Radar contient "Mot-clé principal** : <kw>" ou similaire.
  // On extrait la valeur en s'arrêtant aux délimiteurs propres.
  const kwMatch = userPrompt.match(/mot[-\s]cl[eé][^:]*:\s*\**\s*["«]?\s*([a-z0-9À-ÿ][^\n"»*]{2,60}?)\s*\**\s*["»\n]/i)
  const baseKeyword = (kwMatch?.[1] ?? 'sujet article').trim()

  // 15 mots-clés réalistes dérivés. On varie les angles : urgence, prix,
  // comparaison, géo, longue-traîne.
  const angles = [
    { suffix: 'urgent', reasoning: 'Intention transactionnelle immédiate (besoin pressant)' },
    { suffix: 'pas cher', reasoning: 'Sensibilité prix — angle conversion' },
    { suffix: 'avis', reasoning: 'Phase considération, recherche de réassurance' },
    { suffix: 'comment choisir', reasoning: 'Intention informationnelle, top of funnel' },
    { suffix: 'devis', reasoning: 'Intention transactionnelle commerciale' },
    { suffix: 'comparatif', reasoning: 'Phase considération, comparaison concurrentielle' },
    { suffix: 'témoignage', reasoning: 'Besoin de preuve sociale' },
    { suffix: 'prix moyen', reasoning: 'Recherche de fourchette budgétaire' },
    { suffix: 'erreurs à éviter', reasoning: 'Article pilier/guide — contenu éditorial' },
    { suffix: 'guide', reasoning: 'Intention informationnelle, ressource complète' },
    { suffix: 'forum', reasoning: 'Discussion communautaire, longue-traîne question' },
    { suffix: 'service rapide', reasoning: 'Attente de réactivité' },
    { suffix: 'professionnel', reasoning: 'Qualification de l\'offre (vs particulier)' },
    { suffix: 'gratuit', reasoning: 'Recherche de version freemium / essai' },
    { suffix: 'local', reasoning: 'Proximité géographique (SEO local)' },
  ]

  return {
    keywords: angles.map(a => ({
      keyword: `${baseKeyword} ${a.suffix}`,
      reasoning: a.reasoning,
    })),
  }
})
