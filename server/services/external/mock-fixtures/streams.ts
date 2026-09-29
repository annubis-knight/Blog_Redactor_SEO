/**
 * Mock stream fixtures.
 *
 * Simule les réponses des streams du Moteur (captain AI panel,
 * propose-lieutenants, ai-lexique-upfront, etc.). Chaque fixture a un matcher
 * qui identifie le contexte et un builder qui retourne soit une chaîne
 * complète, soit des chunks pré-découpés. La configuration du thème
 * (theme-parse) vit dans `contexte.ts`.
 *
 * Une réponse suit le format du prompt ET le contrat que le code applique à la
 * réponse (NFR-COST-AI-MOCK), et part de la demande : mot-clé, niveau, termes
 * ou texte reçus. Gardé par tests/unit/services/mock-*.test.ts (`npm run verify`).
 */
import { registerStreamFixture } from '../mock-registry.js'
import { ARTICLE_TYPE_RULES } from '../../../../shared/constants/article-type-rules.js'
import { parseArticleLevel } from '../../../../shared/utils/article-level.js'
import type { ArticleLevel } from '../../../../shared/types/keyword-validate.types.js'
import { capitalize, promptField } from './prompt-fields.js'

// ---------------------------------------------------------------------------
// captain AI panel — avis d'expert sur un candidat Capitaine (FR-CAP-AI-PANEL)
//
// Suit `capitaine-ai-panel.md` : trois parties (potentiel éditorial,
// opportunités et risques, recommandation), adaptées au niveau, la douleur en
// fil rouge, sans recopier les scores bruts ; deux scores qui divergent de 20
// points ou plus donnent le profil « piège trafic » ou « longue-traîne
// pertinente ». L'ancienne réponse rendait un verdict et six KPI aux chiffres
// figés (« 6 600/mois »), quel que soit le mot-clé.
// ---------------------------------------------------------------------------

const AVIS_PAR_NIVEAU: Record<ArticleLevel, { nom: string; potentiel: (kw: string) => string; opportunite: string; risque: string }> = {
  pilier: {
    nom: 'pilier',
    potentiel: kw => `En article pilier, « ${kw} » peut porter un guide de référence : couvrir la question dans toute sa largeur, puis renvoyer vers les articles plus précis du cocon.`,
    opportunite: 'reprendre les questions « Autres questions » de Google en sections, qui captent la longue traîne et visent l’extrait optimisé',
    risque: 'descendre trop dans le détail et cannibaliser les articles intermédiaires du cocon',
  },
  intermediaire: {
    nom: 'intermédiaire',
    potentiel: kw => `En article intermédiaire, « ${kw} » se prête à un contenu de support pratique : méthodes, comparaisons et bénéfices concrets, rattachés au pilier.`,
    opportunite: 'un tableau comparatif ou une liste d’étapes, formats souvent repris en extrait optimisé',
    risque: 'empiéter sur le pilier ; gardez un sous-thème net et renvoyez vers lui pour la vue d’ensemble',
  },
  specifique: {
    nom: 'spécifique',
    potentiel: kw => `En article spécifique, « ${kw} » appelle une réponse précise et experte à une question de terrain, sans s’éparpiller.`,
    opportunite: 'répondre en deux phrases dès le début de l’article, ce que Google reprend en extrait optimisé',
    risque: 'une demande trop faible si la question est trop étroite ; élargissez d’un cran si les données le confirment',
  },
}

/** Intention de recherche devinée d'après les mots du mot-clé. */
function intentionDe(keyword: string): string {
  if (/prix|tarif|co[uû]t|devis|pas cher/i.test(keyword)) return 'plutôt transactionnelle : le lecteur compare des prix avant d’acheter'
  if (/meilleur|avis|comparatif|versus/i.test(keyword)) return 'plutôt commerciale : le lecteur compare les solutions'
  if (/comment|pourquoi|quel|guide|d[eé]finition/i.test(keyword)) return 'plutôt informationnelle : le lecteur veut comprendre avant d’agir'
  return 'mixte : le lecteur s’informe et compare en même temps'
}

/** Score « 72/100 (…) » de la consigne → 72 ; absent ou illisible → `null`. */
function scoreDe(value: string | null): number | null {
  const match = /(\d+(?:[.,]\d+)?)\s*\/\s*100/.exec(value ?? '')
  return match ? Number(match[1]!.replace(',', '.')) : null
}

function recommandation(kw: string, niveau: string, marche: number | null, pertinence: number | null): string {
  if (marche === null || pertinence === null) {
    return `Je le recommande avec prudence : ${marche === null && pertinence === null ? 'les deux scores manquent' : 'un des deux scores manque'}, vérifiez-le avant de verrouiller.`
  }
  if (marche - pertinence >= 20) {
    return `Profil « piège trafic » : le marché est porteur, mais « ${kw} » colle mal à la douleur de l’article. Je le garderais comme lieutenant plutôt que comme capitaine d’un article ${niveau}.`
  }
  if (pertinence - marche >= 20) {
    return `Profil « longue-traîne pertinente » : peu de demande, mais « ${kw} » répond exactement à la douleur. Je le recommande pour un article ${niveau} qui convertit plus qu’il n’attire.`
  }
  if (marche >= 60 && pertinence >= 60) return `Je recommande « ${kw} » : le marché et la pertinence vont dans le même sens pour un article ${niveau}.`
  if (marche < 40 && pertinence < 40) return `Je ne le recommande pas en l’état : ni le marché ni la pertinence ne le portent ; cherchez une variante plus demandée et plus proche de la douleur.`
  return `Je le recommande avec prudence : le potentiel est correct sans être évident ; comparez-le aux autres candidats avant de verrouiller.`
}

registerStreamFixture(
  'captain-ai-panel',
  // Le conseil du Capitaine (`capitaine-ai-panel.md`) se reconnaît à sa consigne
  // système : son message utilisateur dit seulement « Analyse le mot-clé "…" pour
  // un article de niveau … », sans « capitaine » ni « verdict ». Sans ce critère,
  // l'écran recevait la réponse par défaut (NFR-COST-AI-MOCK).
  ({ systemPrompt, userPrompt }) =>
    /analyser un mot-cl[eé] candidat pour un article de blog/i.test(systemPrompt)
    || (
      /capitaine|panel.*analyse|6 KPI|verdict/i.test(userPrompt)
      // Le gabarit de rédaction d'une section contient lui aussi le mot
      // « capitaine » (le mot-clé de l'article y est injecté) et arrivait ici en
      // premier : l'article généré tenait alors en dix caractères.
      && !/Section [aà] r[eé]diger|Sommaire complet de l'article/i.test(userPrompt)
    ),
  ({ systemPrompt, userPrompt }) => {
    const kw = promptField(systemPrompt, 'Mot-clé analysé') ?? userPrompt.match(/["«]([^"»]{3,60})["»]/)?.[1] ?? 'ce mot-clé'
    const level = parseArticleLevel(promptField(systemPrompt, 'Niveau d\'article') ?? /de niveau (\S+?)\.?$/m.exec(userPrompt)?.[1]) ?? 'intermediaire'
    const avis = AVIS_PAR_NIVEAU[level]
    const douleur = promptField(systemPrompt, 'Douleur de l\'article')
    const douleurDefinie = douleur && !/non d[eé]fini/i.test(douleur)
    const marche = scoreDe(promptField(systemPrompt, 'Score KPI / Marché'))
    const pertinence = scoreDe(promptField(systemPrompt, 'Score de Pertinence'))

    const filRouge = douleurDefinie
      ? `L’angle le plus utile part de la douleur « ${douleur} » : chaque section doit aider le lecteur à en sortir.`
      : `Sans douleur définie, partez de l’intention de recherche, ${intentionDe(kw)}.`
    return [
      '### 1. Potentiel éditorial',
      `${avis.potentiel(kw)} ${filRouge}`,
      '',
      '### 2. Opportunités et risques',
      `**Opportunité** : ${avis.opportunite}. **Risque** : ${avis.risque}.`,
      '',
      '### 3. Recommandation',
      recommandation(kw, avis.nom, marche, pertinence),
    ].join('\n')
  },
)

// ---------------------------------------------------------------------------
// lieutenants-hn-structure — JSON { hnStructure: [...], justification }
// IMPORTANT : enregistré AVANT 'propose-lieutenants' pour priorité de match.
// Le user prompt commence par "Recommande une structure Hn".
// ---------------------------------------------------------------------------
registerStreamFixture(
  'lieutenants-hn-structure',
  ({ userPrompt }) => /Recommande une structure Hn/i.test(userPrompt),
  ({ userPrompt }) => {
    // Extrait les lieutenants pour les inclure naturellement dans la HN.
    const ltMatch = userPrompt.match(/Lieutenants?:\s*(.+?)$/im)
    const lieutenants = ltMatch
      ? ltMatch[1].split(',').map(s => s.trim()).filter(Boolean)
      : ['lieutenant exemple 1', 'lieutenant exemple 2']

    const kwMatch = userPrompt.match(/article "([^"]+)"/i)
    const captain = kwMatch?.[1] ?? 'sujet principal'
    const levelMatch = /de niveau (pilier|intermediaire|specifique)/i.exec(userPrompt)?.[1]?.toLowerCase() as ArticleLevel | undefined
    const rules = ARTICLE_TYPE_RULES[levelMatch ?? 'intermediaire']

    // Une structure qui passe la porte « valider la structure » : H1 qui porte
    // le capitaine en entier, un H2 par lieutenant retenu, complétée par des H2
    // thématiques jusqu'au minimum du type, ni introduction ni conclusion (le
    // sommaire les ajoute), pas de FAQ (passe d'enrichissement).
    const fillers = ['Les erreurs à éviter', 'Les étapes pour bien démarrer', 'Le budget à prévoir',
      'Les questions à se poser avant de choisir', 'Mesurer les résultats', 'Aller plus loin']
    const h2Titles = [...lieutenants.map(capitalize), ...fillers].slice(0, Math.max(rules.h2Min, Math.min(lieutenants.length, rules.h2Max)))
    const json = {
      hnStructure: [
        { level: 1, text: `${capitalize(captain)} : le guide pratique` },
        ...h2Titles.map((title, i) => ({
          level: 2,
          text: title,
          children: i === 0 ? [{ level: 3, text: `${title} : ce qu’il faut savoir` }] : undefined,
        })),
      ],
      justification: 'Structure simulée : chaque lieutenant retenu en H2, complétée jusqu’au minimum du type.',
    }
    return JSON.stringify(json, null, 2)
  },
)

// ---------------------------------------------------------------------------
// propose-lieutenants — candidats Lieutenants (FR-LIE-PROPOSE-AI)
// Matcher resserré sur "Propose les meilleurs lieutenants" (user prompt
// exact dans la route) pour éviter les collisions avec d'autres fixtures
// qui mentionnent le mot "lieutenants" (ex: lieutenants-hn-structure).
//
// Suit le schéma du prompt `propose-lieutenants.md` et le contrat
// `propose-lieutenants-ai` : `{ lieutenants: [{ keyword, reasoning, sources,
// suggestedHnLevel, score }], contentGapInsights }`. Le tri et la séparation
// « retenus / Autres candidats » sont faits par la route : la réponse propose
// autant de candidats que le type en demande (`lieutenantCandidatesMin`), sans
// liste « eliminated » (personne ne la lisait).
// ---------------------------------------------------------------------------

interface CandidatLieutenant {
  keyword: string
  reasoning: string
  sources: Array<'paa' | 'serp' | 'group' | 'root' | 'content-gap'>
  suggestedHnLevel: 2 | 3
}

/** Lignes « - … » d'un bloc de la consigne, entre un titre et le suivant. */
function lignesDuBloc(prompt: string, debut: RegExp): string[] {
  const match = debut.exec(prompt)
  if (!match) return []
  const suite = prompt.slice(match.index + match[0].length)
  const fin = suite.search(/\n#{2,4} /)
  return (fin < 0 ? suite : suite.slice(0, fin)).split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).trim())
}

/** Liste « a, b, c » placée sous un intitulé de la consigne ; une phrase « Aucun… » → vide. */
function listeSous(prompt: string, intitule: RegExp): string[] {
  const valeur = new RegExp(`${intitule.source}[^\\n]*\\n(?:[^\\n]*\\n)?\\n([^\\n]*)`).exec(prompt)?.[1]?.trim() ?? ''
  if (!valeur || /^aucun/i.test(valeur)) return []
  return valeur.split(',').map(v => v.trim()).filter(Boolean)
}

function candidatsDerives(captain: string): CandidatLieutenant[] {
  return [
    { keyword: `prix ${captain}`, reasoning: 'Question de budget posée avant tout achat : forte intention, présente chez les concurrents.', sources: ['serp', 'paa'], suggestedHnLevel: 2 },
    { keyword: `${captain} avis`, reasoning: 'Recherche de réassurance, présente dans les questions « Autres questions ».', sources: ['paa'], suggestedHnLevel: 2 },
    { keyword: `comment choisir ${captain}`, reasoning: 'Longue traîne de décision, titres récurrents chez les concurrents.', sources: ['serp'], suggestedHnLevel: 2 },
    { keyword: `${captain} étapes`, reasoning: 'Déroulé attendu par le lecteur, peu détaillé par les concurrents listés.', sources: ['serp', 'content-gap'], suggestedHnLevel: 3 },
    { keyword: `erreurs ${captain}`, reasoning: 'Angle absent des pages concurrentes : ce qu’il ne faut pas faire.', sources: ['content-gap'], suggestedHnLevel: 3 },
    { keyword: `${captain} délai`, reasoning: 'Variante de la racine, souvent tapée avant de s’engager.', sources: ['root'], suggestedHnLevel: 3 },
    { keyword: `${captain} conseils`, reasoning: 'Variante de la racine, intention d’information large.', sources: ['root'], suggestedHnLevel: 3 },
    { keyword: `${captain} gratuit`, reasoning: 'Intention de gratuité, peu utile pour ce site : score bas.', sources: ['root'], suggestedHnLevel: 3 },
  ]
}

registerStreamFixture(
  'propose-lieutenants',
  ({ userPrompt }) => /Propose les meilleurs lieutenants|propose.*mots-clés.*support/i.test(userPrompt),
  ({ systemPrompt, userPrompt }) => {
    // Les lieutenants dérivent du capitaine demandé (T4, épopée qualité SEO) :
    // une proposition figée « plombier » rendait les parcours incohérents et
    // aveugles aux portes (cannibalisation, lieutenant = capitaine).
    const captain = (userPrompt.match(/"([^"]+)"/)?.[1] ?? 'mot-clé principal').trim().toLowerCase()
    const level = parseArticleLevel(/de niveau (\S+?)\.?(?:\s|$)/.exec(userPrompt)?.[1]) ?? 'pilier'

    // Les données de la consigne d'abord (les PAA sont la source n°1), puis des
    // variantes du capitaine ; ni le capitaine lui-même, ni les interdits du cocon.
    const paa = lignesDuBloc(systemPrompt, /#### Questions PAA Capitaine[^\n]*\n/)
      .map(ligne => ligne.split(' → ')[0]!.trim())
    const depuisPaa: CandidatLieutenant[] = paa.map(question => ({
      keyword: question.replace(/\s*\?$/, '').replace(/^\p{Lu}/u, c => c.toLowerCase()),
      reasoning: `Question posée dans les « Autres questions » de Google : « ${question} ».`,
      sources: ['paa'],
      suggestedHnLevel: 2,
    }))
    const depuisGroupes: CandidatLieutenant[] = listeSous(systemPrompt, /### C\. Groupes de mots-cles/).map(groupe => ({
      keyword: groupe.toLowerCase(),
      reasoning: `Groupe de mots validé par le volume en Découverte, voisin de « ${captain} ».`,
      sources: ['group'],
      suggestedHnLevel: 3,
    }))
    const interdits = new Set(listeSous(systemPrompt, /Ces mots-cles sont INTERDITS/).map(k => k.toLowerCase()))
    const vus = new Set<string>([captain])
    const candidats = [...depuisPaa, ...depuisGroupes, ...candidatsDerives(captain)].filter(c => {
      if (vus.has(c.keyword) || interdits.has(c.keyword)) return false
      vus.add(c.keyword)
      return true
    }).slice(0, ARTICLE_TYPE_RULES[level].lieutenantCandidatesMin)

    const concurrents = [...systemPrompt.matchAll(/^#\d+ (\S+) — /gm)].map(m => m[1]!)
    const json = {
      lieutenants: candidats.map((c, i) => ({ ...c, score: Math.max(30, 88 - i * 7) })),
      contentGapInsights: concurrents.length > 0
        ? `Les concurrents analysés (${concurrents.slice(0, 3).join(', ')}) détaillent peu les erreurs à éviter et le déroulé d’un projet « ${captain} » : deux angles à prendre.`
        : `Sans données concurrentes, les angles « erreurs à éviter » et « étapes » restent à vérifier sur la page de résultats de « ${captain} ».`,
    }
    return JSON.stringify(json, null, 2)
  },
)

// ---------------------------------------------------------------------------
// ai-lexique-upfront — avis de l'IA sur chaque terme extrait (FR-LEX-AI-PANEL)
//
// Suit `lexique-analysis-upfront.md` et le contrat `lexique-ai` :
// `{ recommendations: [{ term, aiRecommended, aiReason }], missingTerms, summary }`,
// un avis par terme reçu. L'ancienne réponse (`category`, `reasoning`, `missing`,
// termes de plomberie) voyait toutes ses recommandations écartées : aucun badge.
// ---------------------------------------------------------------------------

/** Termes d'un niveau (« **Obligatoires (…)** : » puis la liste), ou vide. */
function termesDuNiveau(prompt: string, niveau: string): string[] {
  const valeur = new RegExp(`\\*\\*${niveau}[^\\n]*\\*\\* :\\n([^\\n]*)`).exec(prompt)?.[1]?.trim() ?? ''
  return !valeur || valeur === 'aucun' ? [] : valeur.split(', ').map(t => t.trim()).filter(Boolean)
}

const motsPleins = (text: string): string[] => text.toLowerCase().split(/[^\p{L}\d]+/u).filter(w => w.length >= 4)

registerStreamFixture(
  'ai-lexique-upfront',
  // Reconnu à la consigne (ou à la phrase exacte de la route) : un simple
  // « lexique » dans un message captait d'autres demandes (description du
  // thème, section d'article à réduire…).
  ({ systemPrompt, userPrompt }) =>
    /analyser TOUS les termes TF-IDF extraits des concurrents/i.test(systemPrompt)
    || /^Analyse tous les termes TF-IDF pour l'article/i.test(userPrompt),
  ({ systemPrompt, userPrompt }) => {
    const kw = promptField(systemPrompt, 'Mot-cle principal (Capitaine)') ?? userPrompt.match(/"([^"]+)"/)?.[1] ?? 'le sujet'
    const sujet = new Set(motsPleins(kw))
    const lie = (term: string) => motsPleins(term).some(w => sujet.has(w))
    const obligatoires = termesDuNiveau(systemPrompt, 'Obligatoires')
    const differenciateurs = termesDuNiveau(systemPrompt, 'Differenciateurs')
    const optionnels = termesDuNiveau(systemPrompt, 'Optionnels')

    const recommendations = [
      ...obligatoires.map(term => ({ term, aiRecommended: true, aiReason: `Présent chez la plupart des concurrents : Google l’attend sur « ${kw} ».` })),
      ...differenciateurs.map((term, i) => {
        const garde = lie(term) || i % 2 === 0
        return { term, aiRecommended: garde, aiReason: garde ? 'Angle que tous les concurrents n’ont pas : il démarque l’article.' : `Trop générique pour démarquer l’article sur « ${kw} ».` }
      }),
      ...optionnels.map(term => {
        const garde = lie(term)
        return { term, aiRecommended: garde, aiReason: garde ? 'Rare chez les concurrents mais lié au sujet : un plus pour la couverture.' : 'Peu employé et sans lien direct avec la douleur : à écarter.' }
      }),
    ]
    const recus = new Set(recommendations.map(r => r.term.toLowerCase()))
    const tete = motsPleins(kw)[0] ?? kw
    const missingTerms = [`prix ${tete}`, `devis ${tete}`, 'garantie', 'avis clients', 'délai d’intervention']
      .filter(t => !recus.has(t.toLowerCase()))
      .slice(0, 3)
    const retenus = recommendations.filter(r => r.aiRecommended).length
    const json = {
      recommendations,
      missingTerms,
      summary: `${recommendations.length} termes analysés pour « ${kw} » : ${retenus} recommandés, ${recommendations.length - retenus} écartés. `
        + `Les termes obligatoires sont couverts ; ajoutez ${missingTerms.slice(0, 2).map(t => `« ${t} »`).join(' et ')} pour compléter le champ lexical.`,
    }
    return JSON.stringify(json, null, 2)
  },
)

// ---------------------------------------------------------------------------
// intent-keywords (Radar generate prompt fallback, si passait en stream)
// ---------------------------------------------------------------------------
registerStreamFixture(
  'intent-keywords-fallback',
  ({ userPrompt }) => /radar|résonance|short-?tail.*20/i.test(userPrompt),
  () => {
    const json = {
      keywords: Array.from({ length: 10 }, (_, i) => ({
        keyword: `mot-clé résonance ${i + 1}`,
        reasoning: `Angle ${i + 1} : simulation mock provider.`,
      })),
    }
    return JSON.stringify(json, null, 2)
  },
)


/**
 * `POST /keywords/lexique-suggest` — la route fait `JSON.parse(...) as string[]`
 * et son prompt réclame explicitement `["terme1", "terme2", …]`. La fixture des
 * recommandations de Lexique captait ce prompt et rendait un objet : le contrat
 * de l'endpoint n'était jamais respecté en mode simulé.
 */
registerStreamFixture(
  'lexique-suggest-array',
  ({ userPrompt }) => /g[eé]n[eè]re le lexique LSI/i.test(userPrompt),
  () => JSON.stringify([
    'intervention rapide',
    'devis gratuit',
    'artisan certifié',
    'dépannage urgence',
    'tarif transparent',
    'garantie décennale',
    'déplacement offert',
    'intervention 24h',
    'diagnostic gratuit',
    'entreprise locale',
  ]),
)
