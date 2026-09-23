/**
 * Mock fixtures pour le workflow Cerveau · Stratégie cocon.
 *
 * Streams couverts :
 *   - cocoon-strategy/suggest (par step : cible/douleur/aiguillage/angle/promesse/cta)
 *   - cocoon-strategy/deepen (génère une sous-question)
 *   - cocoon-strategy/enrich (fusionne sous-question dans la réponse principale)
 *   - cocoon-strategy/topics (propose 5-10 topics complémentaires)
 */
import { registerStreamFixture } from '../mock-registry.js'

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

// ---------------------------------------------------------------------------
// Étape 6 du Cerveau — proposition d'articles
//
// Le pipeline enchaîne trois appels IA (structure → requêtes PAA → spécialisés).
// Sans fixture, le mode simulé retombait sur la réponse générique, le parseur
// n'y trouvait aucun JSON et l'écran affichait « Erreur lors de la génération
// des articles » : l'étape 6 du Cerveau était donc intestable gratuitement.
//
// Les champs suivis sont ceux que lit `buildSingleArticle` :
// title, type, parentTitle, rationale, painPoint, painIntentExpected,
// suggestedKeyword, suggestedSlug.
// ---------------------------------------------------------------------------

const PILIER = {
  title: 'Création de site internet à Toulouse : le guide pour les TPE',
  type: 'pilier',
  parentTitle: null,
  rationale: 'Tête de cocon : couvre la requête générique et distribue vers les intermédiaires.',
  painPoint: 'Le dirigeant ne sait pas par où commencer ni combien cela va lui coûter.',
  painIntentExpected: 'commercial',
  suggestedKeyword: 'creation site internet toulouse',
  suggestedSlug: 'creation-site-internet-toulouse',
}

const INTERMEDIAIRES = [
  {
    title: 'Prix d\'un site internet pour une TPE : ce qui fait varier la facture',
    type: 'intermediaire',
    parentTitle: PILIER.title,
    rationale: 'Répond à l\'objection budgétaire, première cause d\'abandon.',
    painPoint: 'Peur de payer trop cher sans savoir ce qui est facturé.',
    painIntentExpected: 'commercial',
    suggestedKeyword: 'prix creation site internet',
    suggestedSlug: 'prix-creation-site-internet',
  },
  {
    title: 'Site vitrine ou site qui convertit : la différence qui change tout',
    type: 'intermediaire',
    parentTitle: PILIER.title,
    rationale: 'Porte l\'angle différenciant du cocon.',
    painPoint: 'Le site existe mais n\'amène aucune demande de devis.',
    painIntentExpected: 'informational',
    suggestedKeyword: 'site vitrine qui convertit',
    suggestedSlug: 'site-vitrine-qui-convertit',
  },
]

const SPECIALISES = [
  {
    title: 'Site vitrine pour artisan à Toulouse : ce qu\'il faut y mettre',
    type: 'specifique',
    parentTitle: INTERMEDIAIRES[1].title,
    rationale: 'Décline l\'angle sur le métier le plus représenté dans la cible.',
    painPoint: 'L\'artisan ne sait pas quoi montrer sur son site pour rassurer.',
    painIntentExpected: 'commercial',
    suggestedKeyword: 'site vitrine artisan toulouse',
    suggestedSlug: 'site-vitrine-artisan-toulouse',
  },
  {
    title: 'Combien de temps pour créer un site internet professionnel ?',
    type: 'specifique',
    parentTitle: INTERMEDIAIRES[0].title,
    rationale: 'Question de délai posée systématiquement avant l\'engagement.',
    painPoint: 'Le dirigeant a besoin du site pour une échéance précise.',
    painIntentExpected: 'informational',
    suggestedKeyword: 'delai creation site internet',
    suggestedSlug: 'delai-creation-site-internet',
  },
]

registerStreamFixture(
  'cocoon-articles-structure',
  ({ systemPrompt }) => /Mission — G[eé]n[eé]ration de la structure \(Pilier \+ Interm/i.test(systemPrompt),
  () => JSON.stringify([PILIER, ...INTERMEDIAIRES], null, 2),
)

registerStreamFixture(
  'cocoon-articles-paa-queries',
  ({ systemPrompt }) => /requ[eê]tes de recherche Google r[eé]alistes pour r[eé]cup[eé]rer/i.test(systemPrompt),
  () => JSON.stringify(
    [PILIER, ...INTERMEDIAIRES].map(a => ({
      title: a.title,
      searchQueries: [a.suggestedKeyword, `${a.suggestedKeyword} avis`],
    })),
    null,
    2,
  ),
)

registerStreamFixture(
  'cocoon-articles-spe',
  ({ systemPrompt }) => /Mission — G[eé]n[eé]ration des Sp[eé]cialis[eé]s/i.test(systemPrompt),
  () => JSON.stringify(SPECIALISES, null, 2),
)

registerStreamFixture(
  'cocoon-add-article',
  ({ systemPrompt }) => /Mission — G[eé]n[eé]rer UN SEUL article compl[eé]mentaire/i.test(systemPrompt),
  () => JSON.stringify({
    title: 'Référencement local : apparaître sur Google Maps à Toulouse',
    type: 'specifique',
    parentTitle: PILIER.title,
    rationale: 'Complète le cocon sur le levier local, absent des propositions initiales.',
    painPoint: 'L\'entreprise est invisible sur les recherches géolocalisées.',
    painIntentExpected: 'commercial',
    suggestedKeyword: 'referencement local toulouse',
    suggestedSlug: 'referencement-local-toulouse',
  }, null, 2),
)
