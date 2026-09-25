/**
 * Fixture prioritaire — premier jet de l'article en un appel (FR-RED-DRAFT-SINGLE-PASS).
 *
 * Importée EN PREMIER dans `index.ts` : le prompt du premier jet rassemble tout
 * le contexte (stratégie du cocon, capitaine, lexique…) et déclencherait les
 * matchers des autres fixtures (« stratégie… cocon » répondait à sa place). Elle
 * se reconnaît au titre que ce gabarit possède en propre.
 *
 * Elle produit ce qu'un bon premier jet doit être, pour que les parcours simulés
 * passent la porte « premier jet » sans dérogation : un H1 qui porte le
 * capitaine, un chapeau qui le cite, un H2 par chapitre du plan (H3 compris),
 * chacun à son budget, un texte varié qui ne se répète pas, aucun chiffre.
 * L'ancienne simulation écrivait le même texte à chaque section, sous le titre
 * du premier H2.
 */
import { registerStreamFixture } from '../mock-registry.js'
import { keywordCoverage } from '../../../../shared/seo-validators.js'

const MARKER = /##\s*Premier jet — article complet/

interface PlanChapter { title: string; budget: number; h3: string[] }

const SUJETS = ['votre site', 'une page claire', 'chaque visiteur', 'votre équipe', 'un prospect pressé', 'le lecteur',
  'une offre lisible', 'votre fiche', 'un formulaire simple', 'votre activité', 'un client fidèle', 'la page d’accueil',
  'un texte précis', 'votre réputation', 'une photo soignée', 'le bouton d’appel']
const VERBES = ['gagne', 'construit', 'renforce', 'clarifie', 'mérite', 'appelle', 'prépare', 'rassure', 'simplifie',
  'soutient', 'éclaire', 'valorise', 'accompagne', 'oriente', 'protège', 'nourrit']
const COMPLEMENTS = ['la confiance des habitants du quartier', 'un premier contact sans détour', 'des demandes mieux qualifiées',
  'une image professionnelle durable', 'le bouche-à-oreille numérique', 'des rendez-vous réguliers', 'un parcours sans friction',
  'la preuve de votre savoir-faire', 'une réponse aux questions fréquentes', 'des horaires faciles à trouver',
  'une lecture agréable sur mobile', 'la comparaison avec vos concurrents', 'un devis compris du premier coup',
  'des avis mis en valeur', 'une promesse tenue', 'les réalisations les plus parlantes', 'une adresse bien visible',
  'la décision du client', 'un message cohérent', 'des pages rapides à charger', 'la curiosité du lecteur',
  'une relation suivie après la vente', 'des conseils utiles avant l’achat', 'un ton chaleureux et direct']
const LIENS = ['Concrètement,', 'En pratique,', 'Dans les faits,', 'Pour commencer,', 'À l’usage,', 'Au quotidien,',
  'Sur le terrain,', 'Très vite,', 'De cette façon,', 'Avec le temps,', 'Dès le départ,', 'Pas à pas,']

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Un paragraphe d'environ `words` mots, propre à (chapitre, rang). */
function paragraph(seed: number, words: number, topic: string): string {
  const out: string[] = []
  for (let i = 0; out.length < words; i++) {
    const k = seed * 5 + i
    const sentence = `${LIENS[k % LIENS.length]} ${SUJETS[(seed * 3 + i * 7) % SUJETS.length]} ${VERBES[(seed * 7 + i * 3) % VERBES.length]} ${COMPLEMENTS[(seed * 11 + i * 5) % COMPLEMENTS.length]}${i % 3 === 0 ? `, pour ${topic}` : ''}.`
    out.push(...sentence.split(' '))
  }
  const text = out.slice(0, Math.max(words, 8)).join(' ').replace(/[,.]?$/, '.')
  return `<p>${text}</p>`
}

function parsePlan(prompt: string): PlanChapter[] {
  const chapters: PlanChapter[] = []
  for (const line of prompt.split('\n')) {
    const h2 = /^- H2: (.+?)(?: \[annotation: [^\]]+\])? \(≈ (\d+) mots\)$/.exec(line)
    if (h2) { chapters.push({ title: h2[1]!.trim(), budget: Number(h2[2]), h3: [] }); continue }
    const h3 = /^ {2}- H3: (.+?)(?: \[annotation: [^\]]+\])?$/.exec(line)
    if (h3 && chapters.length) chapters.at(-1)!.h3.push(h3[1]!.trim())
  }
  return chapters
}

/** Le premier jet simulé, en paquets comme un vrai flux (exporté pour ses tests). */
export function buildDraftChunks(prompt: string): string[] {
  const title = /- \*\*Titre\*\* : (.+)/.exec(prompt)?.[1]?.trim() ?? 'Article'
  const keyword = /- \*\*Mot-clé pilier\*\* : (.+)/.exec(prompt)?.[1]?.trim() ?? title
  const plan = parsePlan(prompt)
  const restart = /il s'arrête avant le chapitre « (.+?) »/.exec(prompt)?.[1]
  const from = restart ? Math.max(0, plan.findIndex(c => c.title === restart)) : 0

  const parts: string[] = []
  let chapeauWords = 0
  if (!restart) {
    const h1 = keywordCoverage(keyword, title) >= 1 ? title : `${capitalize(keyword)} : ${title}`
    const chapeau = `Vous cherchez comment réussir votre projet de ${keyword} sans perdre de temps ni d’argent. Ce guide vous montre, étape par étape, ce qui fait la différence pour vos clients.`
    chapeauWords = chapeau.split(' ').length
    parts.push(`<h1>${h1}</h1>\n`, `<p>${chapeau}</p>\n`)
  }
  plan.slice(from).forEach((chapter, offset) => {
    const index = from + offset
    const topic = chapter.title.toLowerCase()
    let remaining = chapter.budget - chapter.title.split(' ').length - (index === 0 ? chapeauWords : 0)
    parts.push(`<h2>${chapter.title}</h2>\n`)
    const blocks = chapter.h3.length ? chapter.h3 : ['']
    blocks.forEach((h3, b) => {
      if (h3) { parts.push(`<h3>${h3}</h3>\n`); remaining -= h3.split(' ').length }
      const share = Math.max(16, Math.floor(remaining / (blocks.length - b)))
      remaining -= share
      const first = Math.ceil(share / 2)
      parts.push(paragraph(index * 13 + b * 2 + 1, first, topic) + '\n', paragraph(index * 13 + b * 2 + 2, share - first, topic) + '\n')
    })
  })
  // Des paquets de taille fixe : les <h2> tombent au fil des paquets, parfois coupés.
  const text = parts.join('')
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += 180) chunks.push(text.slice(i, i + 180))
  return chunks
}

registerStreamFixture(
  'article-draft-priority',
  ({ userPrompt }) => MARKER.test(userPrompt),
  ({ userPrompt }) => buildDraftChunks(userPrompt),
)
