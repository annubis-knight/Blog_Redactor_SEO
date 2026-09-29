/**
 * Mock fixtures du contexte éditorial : la configuration du thème (« Remplir
 * les champs avec Claude ») et le micro-contexte d'un article (« Suggerer par
 * IA »).
 *
 * Les deux demandes embarquent un texte saisi (description libre, titre
 * d'article) : elles se reconnaissent à leur CONSIGNE, et ce fichier est importé
 * avant `streams.ts` et `generate.ts`, dont certaines réponses se reconnaissent
 * à un mot du message utilisateur (NFR-COST-AI-MOCK).
 * Gardé par tests/unit/services/mock-cerveau.test.ts et mock-redaction.test.ts.
 */
import { registerStreamFixture } from '../mock-registry.js'
import { parseArticleLevel } from '../../../../shared/utils/article-level.js'
import type { ArticleLevel } from '../../../../shared/types/keyword-validate.types.js'
import { capitalize, promptField } from './prompt-fields.js'

// ---------------------------------------------------------------------------
// theme-parse — « Remplir les champs avec Claude » (FR-CER-THEME-CONFIG)
//
// POST /api/theme/config/parse : consigne `theme-parse.md`, message utilisateur
// = la description libre saisie. La route lit le premier objet JSON et le passe
// à `themeConfigSchema` : tous les champs du gabarit, rien d'autre. L'ancienne
// réponse (`usp`, `brandVoice`…) ne reconnaissait pas la consigne, et le schéma
// l'aurait refusée (500).
// ---------------------------------------------------------------------------

const ARTICLE_EN_TETE = /^(?:(?:les|le|la|des|du|une|un|de la)\s+|(?:de l|l)['’]\s*)/iu

function sansArticle(text: string): string {
  return text.trim().replace(ARTICLE_EN_TETE, '').trim()
}

/** Ville citée (« à Toulouse », « basée à Bordeaux »), ou vide. */
function lieuCite(texte: string): string {
  return /(?:^|[\s,(])(?:à|sur|près de)\s+(\p{Lu}[\p{L}]+(?:-[\p{L}]+)*)/u.exec(texte)?.[1] ?? ''
}

/** Activité (« Je suis plombier… », « Nous sommes une agence de… »), sans lieu ni article. */
function activiteCitee(texte: string): string {
  const brut = /(?:je suis|nous sommes|entreprise de|société de)\s+([^.,;:!?]+)/iu.exec(texte)?.[1]
    ?? texte.split(/[.!?]/)[0]
    ?? ''
  const sansLieu = brut.split(/\s+(?:à|sur|depuis|pour|basée?s?|installée?s?|implantée?s?)\s/iu)[0] ?? ''
  return sansArticle(sansLieu).slice(0, 80)
}

/** Services énumérés (« Nous proposons A, B et C »). */
function servicesCites(texte: string): string[] {
  const liste = /(?:nous proposons|je propose|nous offrons|nous réalisons|je réalise|nos services\s*:|nos prestations\s*:)\s*([^.!?]+)/iu.exec(texte)?.[1]
  if (!liste) return []
  return liste.split(/,|\s+et\s+/u).map(sansArticle).filter(Boolean).slice(0, 5)
}

/** Clientèle citée (« Nos clients sont… »), ou vide. */
function clienteleCitee(texte: string): string {
  const brut = /(?:nos clients sont|notre clientèle est|nous travaillons pour|nous intervenons auprès de|j['’]interviens auprès de)\s*([^.!?]+)/iu.exec(texte)?.[1]
  return brut ? sansArticle(brut) : ''
}

function themeConfigDepuisDescription(texte: string) {
  const location = lieuCite(texte)
  const sector = activiteCitee(texte)
  const services = servicesCites(texte)
  const clientele = clienteleCitee(texte)
  const anciennete = /depuis\s+(\d+)\s+ans/iu.exec(texte)?.[1]
  const effectif = /(\d+)\s+(?:salariés|employés|collaborateurs)/iu.exec(texte)?.[1]
  const parleEnJe = /(?:^|\s)je\s/iu.test(texte)
  return {
    avatar: {
      sector,
      companySize: effectif ? `${effectif} salariés` : parleEnJe ? '1 (indépendant)' : '',
      location,
      budget: '',
      digitalMaturity: '',
    },
    positioning: {
      targetAudience: clientele || (location ? `Particuliers et professionnels de ${location} et alentours` : 'Particuliers et professionnels'),
      mainPromise: `${capitalize(sector || 'Notre métier')}${location ? ` à ${location}` : ''} : un travail soigné, des délais tenus et un prix annoncé à l’avance.`,
      differentiators: [
        ...(anciennete ? [`${anciennete} ans d’expérience`] : []),
        ...(location ? [`Ancrage local à ${location}`] : []),
        'Un interlocuteur unique, du premier contact au suivi',
      ],
      painPoints: [
        `Trouver le bon prestataire (${sector || 'ce métier'}) sans perdre de temps`,
        'Comprendre le prix avant de s’engager',
        'Être rassuré sur la qualité du travail',
      ],
    },
    offerings: {
      services: services.length > 0 ? services : sector ? [sector] : [],
      mainCTA: 'Demander un devis',
      ctaTarget: '/contact',
    },
    toneOfVoice: {
      style: parleEnJe ? 'Proche et rassurant, à la première personne' : 'Professionnel, clair et chaleureux',
      vocabulary: [...new Set([...services.slice(0, 3), sector].filter(Boolean))],
    },
  }
}

registerStreamFixture(
  'theme-parse',
  // Reconnu à la consigne : le message utilisateur n'est que la description
  // libre, qui peut parler de n'importe quoi (« radar », « lexique »…).
  ({ systemPrompt }) =>
    /extraire et structurer ces informations dans un format JSON précis correspondant à la configuration d['’]un thème/i.test(systemPrompt),
  ({ userPrompt }) => JSON.stringify(themeConfigDepuisDescription(userPrompt), null, 2),
)

// ---------------------------------------------------------------------------
// Micro-contexte d'un article (FR-CER-MICRO-CONTEXT) — POST
// /api/generate/micro-context-suggest. Suit `micro-context-suggest.md` :
// `{ angle, tone, directives }`, trois TEXTES, que « Appliquer » enregistre tels
// quels (`updateMicroContextSchema`). L'ancienne réponse donnait les consignes
// en liste : l'enregistrement était refusé sans message.
// ---------------------------------------------------------------------------

const MICRO_CONTEXTE: Record<ArticleLevel, { ton: string; mots: string; lien: string }> = {
  pilier: { ton: 'Pédagogique et exhaustif : des exemples concrets, aucun jargon sans explication.', mots: '2 500', lien: 'chaque article intermédiaire du cocon' },
  intermediaire: { ton: 'Accessible et pratique : phrases courtes, conseils directement applicables.', mots: '1 800', lien: 'le pilier et les articles spécialisés qui en dépendent' },
  specifique: { ton: 'Expert et précis : réponses nettes, vocabulaire du métier expliqué au passage.', mots: '1 200', lien: 'l’article intermédiaire parent' },
}

registerStreamFixture(
  'micro-context-suggest',
  ({ systemPrompt }) => /Tu dois suggérer un micro-contexte pour un article de blog/i.test(systemPrompt),
  ({ systemPrompt }) => {
    const titre = promptField(systemPrompt, 'Article') ?? 'cet article'
    const kw = promptField(systemPrompt, 'Mot-clé principal') ?? titre
    const cocon = promptField(systemPrompt, 'Cocon SEO')
    const niveau = parseArticleLevel(promptField(systemPrompt, 'Type d\'article')) ?? 'specifique'
    const regles = MICRO_CONTEXTE[niveau]
    return JSON.stringify({
      angle: `Traiter « ${kw} » par les situations réelles du lecteur : ce qu’il vit avant de chercher, puis la réponse concrète que « ${titre} » lui apporte, là où les concurrents restent généraux.`,
      tone: regles.ton,
      directives: `Viser environ ${regles.mots} mots et répondre à « ${kw} » dès le premier paragraphe. `
        + `Illustrer chaque partie par un cas concret${cocon ? ` tiré du cocon « ${cocon} »` : ''}. `
        + `Prévoir un lien vers ${regles.lien} et terminer par un appel à l’action clair.`,
    }, null, 2)
  },
)
