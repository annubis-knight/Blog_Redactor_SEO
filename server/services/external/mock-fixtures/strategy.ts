/**
 * Mock fixtures pour l'étape « Articles » du Cerveau : la carte du cocon
 * (structure, requêtes PAA, spécialisés) et l'ajout d'un article à la carte.
 *
 * Les étapes de stratégie (suggestion, fusion, sous-questions, sujets,
 * régénération d'une ligne) vivent dans `cerveau.ts`, importé avant.
 */
import { registerStreamFixture } from '../mock-registry.js'
import { parseArticleLevel } from '../../../../shared/utils/article-level.js'
import type { ArticleLevel } from '../../../../shared/types/keyword-validate.types.js'

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
    suggestedKeyword: 'combien de temps creer un site internet',
    suggestedSlug: 'combien-de-temps-creer-un-site-internet',
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

// ---------------------------------------------------------------------------
// Ajouter UN article à la carte (« + Ajouter … › Article complémentaire », et
// le menu « Générer avec Claude » qui fait grandir la carte, U7 révisé).
//
// La réponse suit la demande, comme le ferait Claude : le niveau demandé, un
// parent pris dans la carte (le pilier pour un intermédiaire, l'intermédiaire
// qui a le moins de spécialisés pour un spécialisé), et un titre absent de la
// carte. L'ancienne réponse était toujours un spécialisé : en MOCK, « Le
// pilier » n'ajoutait jamais de pilier.
// ---------------------------------------------------------------------------

type MockArticle = typeof PILIER | (typeof INTERMEDIAIRES)[number] | (typeof SPECIALISES)[number]

const AJOUT_SPECIALISE = {
  title: 'Référencement local : apparaître sur Google Maps à Toulouse',
  type: 'specifique',
  parentTitle: PILIER.title,
  rationale: 'Complète le cocon sur le levier local, absent des propositions initiales.',
  painPoint: 'L\'entreprise est invisible sur les recherches géolocalisées.',
  painIntentExpected: 'commercial',
  suggestedKeyword: 'referencement local toulouse',
  suggestedSlug: 'referencement-local-toulouse',
}

const AJOUTS: Record<ArticleLevel, MockArticle[]> = {
  pilier: [PILIER],
  intermediaire: INTERMEDIAIRES,
  specifique: [AJOUT_SPECIALISE, ...SPECIALISES],
}

interface ArticleSurLaCarte {
  title?: string
  type?: string
  parentTitle?: string | null
}

/** Relit la demande du front : `{ articleType, existingArticlesDetail }`. */
function lireDemandeAjout(userPrompt: string): { level: ArticleLevel; carte: ArticleSurLaCarte[] } {
  try {
    const demande = JSON.parse(userPrompt) as { articleType?: string; existingArticlesDetail?: string }
    const carte = JSON.parse(demande.existingArticlesDetail ?? '[]') as ArticleSurLaCarte[]
    return { level: parseArticleLevel(demande.articleType) ?? 'specifique', carte: Array.isArray(carte) ? carte : [] }
  } catch {
    return { level: 'specifique', carte: [] }
  }
}

/** Le parent que Claude choisirait sur la carte, ou `null` pour un pilier. */
function parentSurLaCarte(level: ArticleLevel, carte: ArticleSurLaCarte[]): string | null {
  const titresDuNiveau = (niveau: ArticleLevel): string[] =>
    carte.filter(a => parseArticleLevel(a.type) === niveau && a.title).map(a => a.title!)
  if (level === 'pilier') return null
  if (level === 'intermediaire') return titresDuNiveau('pilier')[0] ?? PILIER.title
  const inters = titresDuNiveau('intermediaire')
  if (inters.length === 0) return INTERMEDIAIRES[0].title
  const enfants = (titre: string): number => carte.filter(a => a.parentTitle === titre).length
  return inters.reduce((moinsFourni, titre) => (enfants(titre) < enfants(moinsFourni) ? titre : moinsFourni))
}

registerStreamFixture(
  'cocoon-add-article',
  ({ systemPrompt }) => /Mission — G[eé]n[eé]rer UN SEUL article compl[eé]mentaire/i.test(systemPrompt),
  ({ userPrompt }) => {
    const { level, carte } = lireDemandeAjout(userPrompt)
    const titres = new Set(carte.map(a => a.title))
    const pool = AJOUTS[level]
    const libre = pool.find(a => !titres.has(a.title))
    const base = libre ?? { ...pool[0], title: `${pool[0].title} (${carte.length + 1})` }
    return JSON.stringify({ ...base, type: level, parentTitle: parentSurLaCarte(level, carte) }, null, 2)
  },
)
