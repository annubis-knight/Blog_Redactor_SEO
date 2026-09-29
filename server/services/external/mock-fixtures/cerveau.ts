/**
 * Mock fixtures pour les étapes de stratégie du Cerveau (cocon et article).
 *
 * Streams couverts, chacun reconnu à sa CONSIGNE (le message utilisateur est
 * souvent le texte saisi, qui peut citer « radar », « lexique »…) :
 *   - suggestion d'une étape (`cocoon-brainstorm.md`, `strategy-suggest.md`),
 *     sous-questions comprises ;
 *   - fusion « Fusionner les deux » (`strategy-merge.md`) ;
 *   - approfondir : une sous-question (`strategy-deepen.md`) ;
 *   - enrichir le texte validé d'une sous-réponse (`strategy-enrich.md`) ;
 *   - consolider (`strategy-consolidate.md`) ;
 *   - sujets suggérés (`cocoon-articles-topics.md`) : un tableau de textes ;
 *   - régénérer le titre, le mot-clé ou le slug d'une ligne de la carte.
 *
 * Importé AVANT `strategy.ts` (la régénération partage la consigne de la carte
 * complète) et AVANT `streams.ts` et `generate.ts`, dont certaines réponses se
 * reconnaissent à un mot du message utilisateur : une saisie qui citait
 * « radar » tombait sur la réponse du Radar (NFR-COST-AI-MOCK).
 * Gardé par tests/unit/services/mock-cerveau.test.ts.
 */
import { registerStreamFixture } from '../mock-registry.js'
import { capitalize, mergeTexts, promptField, promptSection } from './prompt-fields.js'

/** Étape courante (« ## Étape actuelle : cible », « ## Étape : cible »). */
function etapeDe(prompt: string): string {
  return /^## Étape(?: actuelle)? : (\S+)/m.exec(prompt)?.[1] ?? 'cible'
}

const sansPonctuationFinale = (text: string) => text.trim().replace(/[.!?…\s]+$/u, '')

// ---------------------------------------------------------------------------
// Suggestion d'une étape (FR-CER-STEPS-COCOON, FR-CER-STEPS-ARTICLE)
// ---------------------------------------------------------------------------

const REPONSES_ETAPE: Record<string, (sujet: string) => string> = {
  cible: s => `Pour « ${s} », visez les dirigeants de TPE et de PME qui cherchent ce service près de chez eux, sans équipe marketing en interne. Ils décident seuls et veulent comprendre avant de s’engager.`,
  douleur: s => `Le lecteur de « ${s} » a peur de mal choisir et de payer pour rien : il ne sait ni comparer les offres ni juger un devis. Ce doute lui fait repousser sa décision.`,
  aiguillage: s => `« ${s} » sert de porte d’entrée : il répond à la question générale du lecteur, puis renvoie vers les articles plus précis du cocon.`,
  angle: s => `Traitez « ${s} » par l’expérience du terrain : des cas concrets, des prix réels et les erreurs vues chez les clients. Là où les concurrents restent théoriques, vous montrez.`,
  promesse: s => `Après lecture, le lecteur sait comment réussir « ${s} » : quoi demander, combien prévoir, quels pièges éviter. Il décide en confiance.`,
  cta: s => `Proposez un échange de 30 minutes offert pour étudier le projet « ${s} », avec un devis clair sous 48 heures.`,
}

registerStreamFixture(
  'cocoon-strategy-suggest',
  ({ systemPrompt }) => /Propose une suggestion concise et actionnable pour cette étape/i.test(systemPrompt),
  ({ systemPrompt }) => {
    const sujet = promptField(systemPrompt, 'Article') ?? promptField(systemPrompt, 'Cocon sémantique') ?? promptField(systemPrompt, 'Cocon') ?? 'ce sujet'
    const reponse = (REPONSES_ETAPE[etapeDe(systemPrompt)] ?? REPONSES_ETAPE.cible!)(sujet)
    const saisie = promptSection(systemPrompt, 'Input utilisateur') ?? ''
    // Suggestion pour une sous-question : « [Sous-question : "…"] réponse en cours ».
    const sousQuestion = /^\[Sous-question : "([^"]*)"\]\s*([\s\S]*)$/.exec(saisie)
    if (sousQuestion) {
      const brouillon = sansPonctuationFinale(sousQuestion[2] ?? '')
      return `À la question « ${sousQuestion[1]} » : ${brouillon ? `${brouillon}. ` : ''}${reponse}`
    }
    return saisie ? `Votre piste « ${sansPonctuationFinale(saisie)} » est une bonne base. ${reponse}` : reponse
  },
)

// ---------------------------------------------------------------------------
// « Fusionner les deux » (strategy-merge.md) : la saisie et la suggestion en un
// texte ; s'il existe déjà un texte validé, il reste la base.
// ---------------------------------------------------------------------------

registerStreamFixture(
  'strategy-merge',
  ({ systemPrompt }) => /^## Suggestion IA précédente$/m.test(systemPrompt) && /^## Texte de l'utilisateur$/m.test(systemPrompt),
  ({ systemPrompt }) => mergeTexts([
    promptSection(systemPrompt, 'Texte déjà validé pour cette étape') ?? '',
    promptSection(systemPrompt, 'Texte de l\'utilisateur') ?? '',
    promptSection(systemPrompt, 'Suggestion IA précédente') ?? '',
  ], 6),
)

// ---------------------------------------------------------------------------
// Approfondir : UNE sous-question, jamais une déjà posée (strategy-deepen.md).
// ---------------------------------------------------------------------------

const SOUS_QUESTIONS: Record<string, Array<{ question: string; description: string }>> = {
  cible: [
    { question: 'Qui prend la décision d’achat chez ce lecteur, et qui l’influence ?', description: 'Savoir qui décide oriente le ton des articles et les preuves à apporter.' },
    { question: 'Où ce lecteur cherche-t-il de l’information avant de contacter un prestataire ?', description: 'Les lieux de recherche disent quels mots et quels formats il attend.' },
    { question: 'Quel budget ce lecteur est-il prêt à engager ?', description: 'Le budget cadre les offres et les exemples à mettre en avant.' },
  ],
  douleur: [
    { question: 'Qu’a déjà essayé le lecteur pour régler ce problème, et pourquoi cela n’a pas marché ?', description: 'Les échecs passés montrent les objections à lever dans les articles.' },
    { question: 'Que lui coûte ce problème chaque mois, en temps ou en argent ?', description: 'Chiffrer la douleur rend la promesse concrète.' },
    { question: 'Quel événement le pousse à chercher une solution maintenant ?', description: 'Le déclencheur indique le bon moment et le bon message.' },
  ],
  angle: [
    { question: 'Quelle idée reçue du secteur vos articles peuvent-ils contredire, preuves à l’appui ?', description: 'Un angle qui contredit une idée reçue se remarque et se partage.' },
    { question: 'Quel exemple client illustre le mieux votre approche ?', description: 'Un cas réel rend l’angle crédible.' },
    { question: 'Que font vos concurrents que vous refusez de faire ?', description: 'Ce refus dessine votre différence.' },
  ],
  promesse: [
    { question: 'Quel résultat mesurable le lecteur peut-il constater, et en combien de temps ?', description: 'Une promesse mesurable se vérifie, donc se croit.' },
    { question: 'Quelle preuve rend cette promesse crédible ?', description: 'Sans preuve, la promesse reste un slogan.' },
    { question: 'Que doit faire le lecteur de son côté pour obtenir ce résultat ?', description: 'Dire sa part d’effort évite la déception.' },
  ],
  cta: [
    { question: 'Que reçoit concrètement le lecteur quand il clique sur votre appel à l’action ?', description: 'Un bénéfice clair lève l’hésitation au moment du clic.' },
    { question: 'Quel frein l’empêche de vous contacter aujourd’hui ?', description: 'Nommer le frein permet d’y répondre juste avant l’appel à l’action.' },
  ],
}

registerStreamFixture(
  'cocoon-strategy-deepen',
  ({ systemPrompt }) => /Génère UNE SEULE sous-question pertinente/i.test(systemPrompt),
  ({ systemPrompt }) => {
    const pool = SOUS_QUESTIONS[etapeDe(systemPrompt)] ?? SOUS_QUESTIONS.cible!
    const existantes = promptSection(systemPrompt, 'Sous-questions existantes (à NE PAS répéter ni reformuler)') ?? ''
    const libre = pool.find(sq => !existantes.includes(sq.question))
      ?? { question: `${pool[0]!.question.replace(/ \?$/, '')}, avec un exemple récent ?`, description: pool[0]!.description }
    return JSON.stringify(libre, null, 2)
  },
)

// ---------------------------------------------------------------------------
// Enrichir le texte validé d'une sous-réponse (strategy-enrich.md) : le texte
// validé reste la base. L'ancienne réponse cherchait ses données dans le
// message utilisateur, qui n'en contient pas : « Réponse enrichie via mock… »
// devenait le texte validé.
// ---------------------------------------------------------------------------

registerStreamFixture(
  'cocoon-strategy-enrich',
  ({ systemPrompt }) => /^## Réponse à la sous-question$/m.test(systemPrompt) && /^## Texte validé actuel$/m.test(systemPrompt),
  ({ systemPrompt }) => mergeTexts([
    promptSection(systemPrompt, 'Texte validé actuel') ?? '',
    promptSection(systemPrompt, 'Réponse à la sous-question') ?? '',
  ], 8),
)

// ---------------------------------------------------------------------------
// Consolider la réponse principale et les sous-réponses (strategy-consolidate.md).
// ---------------------------------------------------------------------------

registerStreamFixture(
  'strategy-consolidate',
  ({ systemPrompt }) => /Consolide la réponse principale et toutes les sous-réponses/i.test(systemPrompt),
  ({ systemPrompt }) => {
    const sousReponses = [...(promptSection(systemPrompt, 'Sous-questions et réponses') ?? '').matchAll(/\*\*R :\*\*\s*([^\n]+)/g)]
      .map(m => m[1]!.trim())
    return mergeTexts([promptSection(systemPrompt, 'Réponse principale') ?? '', ...sousReponses], 6)
  },
)

// ---------------------------------------------------------------------------
// « Sujets suggérés » (cocoon-articles-topics.md) : un tableau JSON de textes,
// la forme que lit `parseTopicsFromSuggestion`. L'ancienne réponse
// `{ topics: [...] }` ne se lisait pas : « Aucun sujet retourné ».
// ---------------------------------------------------------------------------

registerStreamFixture(
  'cocoon-strategy-topics',
  ({ systemPrompt }) => /Mission — Génération des sujets du cocon/i.test(systemPrompt),
  ({ systemPrompt }) => {
    const cocon = capitalize((promptField(systemPrompt, 'Cocon sémantique') ?? 'ce cocon').toLowerCase())
    return JSON.stringify([
      `${cocon} : les bases à connaître`,
      `${cocon} : budget et prix`,
      `${cocon} : choisir son prestataire`,
      `${cocon} : étapes et délais`,
      `${cocon} : erreurs fréquentes`,
      `${cocon} : mesurer les résultats`,
    ])
  },
)

// ---------------------------------------------------------------------------
// Régénérer le titre, le mot-clé ou le slug d'une ligne de la carte
// (FR-CER-COCOON-PROGRESSIVE). Même consigne que la carte complète
// (`cocoon-articles.md`) : sans cette réponse, enregistrée AVANT celle de la
// carte, la carte entière en JSON devenait le titre, le mot-clé ou l'adresse.
// La réponse est une seule valeur, différente de celles déjà générées.
// ---------------------------------------------------------------------------

const MOTS_VIDES = new Set(['de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'pour', 'en', 'et', 'ou', 'avec', 'sur', 'dans', 'par',
  'd', 'l', 'à', 'au', 'aux', 'son', 'sa', 'ses', 'votre', 'vos', 'comment', 'pourquoi', 'quel', 'quelle', 'quels', 'quelles'])

const motsUtiles = (text: string): string[] => text.toLowerCase().split(/[^\p{L}\d]+/u).filter(w => w && !MOTS_VIDES.has(w))
const sansAccent = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '')
const deja = (precedents: string[], valeur: string) => precedents.some(p => p.trim().toLowerCase() === valeur.trim().toLowerCase())

function regenererTitre(demande: string): string {
  const kw = /Mot-clé technique : "([^"]*)"/.exec(demande)?.[1] ?? 'ce sujet'
  const precedents = /Titres déjà générés à NE PAS réutiliser : "([\s\S]*?)"\. Propose/.exec(demande)?.[1]?.split('" / "') ?? []
  const K = capitalize(kw)
  const candidats = [`${K} : ce qui fait vraiment la différence`, `${K} : le guide pour bien décider`,
    `${K} : les questions à se poser avant de se lancer`, `${K} : erreurs à éviter et bons réflexes`, `${K} en pratique : étapes, délais et budget`]
  return candidats.find(t => !deja(precedents, t)) ?? `${K} : le point complet (${precedents.length + 1})`
}

function regenererMotCle(demande: string): string {
  const precedents = (/Mots-clés déjà générés à NE PAS réutiliser : ([\s\S]*?)\. Propose/.exec(demande)?.[1] ?? '').split(',').map(k => k.trim()).filter(Boolean)
  const titre = /Titre actuel : "([^"]*)"/.exec(demande)?.[1] ?? ''
  const base = precedents[0] ?? motsUtiles(titre).slice(0, 3).join(' ')
  const candidats = [motsUtiles(titre).slice(0, 4).join(' '), `${base} tarif`, `${base} devis`, `${base} guide`, `${base} conseils`]
    .filter(k => k.includes(' '))
  return candidats.find(k => !deja(precedents, k)) ?? `${base} ${precedents.length + 1}`
}

function regenererSlug(demande: string): string {
  const kw = /Mot-clé technique : "([^"]*)"/.exec(demande)?.[1] ?? 'article'
  const precedents = (/Slugs déjà générés à NE PAS réutiliser : ([\s\S]*?)\. Le slug/.exec(demande)?.[1] ?? '').split(',').map(s => s.trim())
  const segments = motsUtiles(sansAccent(kw)).map(w => w.replace(/[^a-z0-9]/g, '')).filter(Boolean).slice(0, 6)
  const variantes = ['', 'guide', 'conseils', 'prix', 'etapes', 'tarifs']
  for (const suffixe of variantes) {
    const slug = (suffixe ? [...segments.slice(0, 5), suffixe] : segments).join('-')
    if (slug && !deja(precedents, slug)) return slug
  }
  return [...segments.slice(0, 5), String(precedents.length + 1)].join('-')
}

registerStreamFixture(
  'cocoon-regenerate-field',
  ({ systemPrompt, userPrompt }) =>
    /Mission — G[eé]n[eé]ration de la structure \(Pilier \+ Interm/i.test(systemPrompt)
    && /^Régénère uniquement le (titre|mot-clé|slug)/i.test(userPrompt),
  ({ userPrompt }) => {
    const champ = /^Régénère uniquement le (titre|mot-clé|slug)/i.exec(userPrompt)?.[1]?.toLowerCase()
    if (champ === 'slug') return regenererSlug(userPrompt)
    if (champ === 'mot-clé') return regenererMotCle(userPrompt)
    return regenererTitre(userPrompt)
  },
)
