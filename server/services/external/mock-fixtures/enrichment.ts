/**
 * Fixture prioritaire — passes d'enrichissement et réécriture d'un chapitre
 * (FR-RED-ENRICH-PASSES, FR-RED-ENRICH-SOURCES, FR-RED-SECTION-REWRITE).
 *
 * Importée juste après le premier jet : ces prompts contiennent l'article entier
 * et déclencheraient les matchers d'autres fixtures. Chaque passe rend ce qu'une
 * bonne proposition doit être — titres intacts, rien d'inventé — pour que les
 * parcours simulés passent le vérificateur sans alerte :
 *   - sources : chaque marqueur « à sourcer » devient une attribution liée à un
 *     résultat de la recherche web simulée (renvoyé dans `webSources`) ;
 *   - exemples, tableaux, images : un ajout propre au chapitre (jamais le même
 *     d'un chapitre à l'autre, sinon la porte de publication verrait un
 *     paragraphe répété) ;
 *   - FAQ : autant de vraies questions que le type en demande ; réécriture : le
 *     premier paragraphe revu.
 */
import { registerStreamFixture, type MockWebSource } from '../mock-registry.js'
import { IMAGE_TO_PROVIDE_SRC } from '../../../../shared/constants/image-placeholder.js'

const PASS = /^# Passe d'enrichissement — (sources|exemples|tableaux|images|FAQ|résumé)$/m
const REWRITE = /^# Réécriture d'un chapitre$/m

/** Résultats simulés de la recherche web (domaines réels, pages de simulation). */
export const MOCK_WEB_SOURCES: MockWebSource[] = [
  { url: 'https://www.insee.fr/fr/statistiques/simulation-tic-tpe', title: 'Insee — Le numérique dans les TPE (simulation)', pageAge: '2025-12-04' },
  { url: 'https://www.francenum.gouv.fr/simulation-barometre-tpe', title: 'France Num — Baromètre des TPE (simulation)', pageAge: '2025-10-15' },
]
const SOURCE_NAMES = ['l’Insee, 2025', 'France Num, 2025']

const SCENES = [
  'un menuisier de quartier qui ne recevait des demandes que par le bouche-à-oreille',
  'une kinésithérapeute installée depuis peu, encore inconnue de ses voisins',
  'un plombier chauffagiste qui passait ses soirées à rappeler des prospects',
  'une fleuriste qui voyait ses clients commander ailleurs pour les mariages',
  'un électricien dont les devis restaient sans réponse faute de confiance',
  'une avocate qui voulait être trouvée pour une spécialité précise',
  'un paysagiste dont les plus belles réalisations restaient dans son téléphone',
]

function userContent(prompt: string, heading: RegExp): string {
  const at = prompt.search(heading)
  if (at < 0) return ''
  return /<user-content>\n([\s\S]*?)\n<\/user-content>/.exec(prompt.slice(at))?.[1] ?? ''
}

const keywordOf = (prompt: string): string => /- \*\*Mot-clé pilier\*\* : (.+)/.exec(prompt)?.[1]?.trim() ?? 'votre site'
const titleOf = (chapter: string): string => /<h[12][^>]*>([\s\S]*?)<\/h[12]>/i.exec(chapter)?.[1]?.replace(/<[^>]*>/g, '').trim() ?? 'ce chapitre'
const h3Of = (chapter: string): string[] => [...chapter.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map(m => m[1]!.replace(/<[^>]*>/g, '').trim())
const seedOf = (text: string): number => [...text].reduce((sum, c) => sum + c.charCodeAt(0), 0)

function afterFirstParagraph(chapter: string, addition: string): string {
  const end = chapter.indexOf('</p>')
  return end < 0 ? `${chapter}\n${addition}` : `${chapter.slice(0, end + 4)}\n${addition}${chapter.slice(end + 4)}`
}

function sources(chapter: string): { text: string; webSources: MockWebSource[] } {
  let n = 0
  const text = chapter.replace(/<mark\b[^>]*data-a-sourcer[^>]*>[\s\S]*?<\/mark>/gi, () => {
    const i = n++ % MOCK_WEB_SOURCES.length
    return `(selon <a href="${MOCK_WEB_SOURCES[i]!.url}">${SOURCE_NAMES[i]}</a>)`
  })
  return { text, webSources: n ? MOCK_WEB_SOURCES : [] }
}

function example(chapter: string, keyword: string): string {
  const title = titleOf(chapter)
  const scene = SCENES[seedOf(title) % SCENES.length]
  return afterFirstParagraph(chapter, `<p>Prenons ${scene}. En travaillant « ${title.toLowerCase()} » avec méthode, son projet de ${keyword} a changé de visage : des demandes plus claires, des clients qui arrivent déjà convaincus, et moins de temps perdu au téléphone.</p>`)
}

function table(chapter: string): string {
  const title = titleOf(chapter).toLowerCase()
  const steps = h3Of(chapter)
  const rows = (steps.length >= 2 ? steps : [`Faire le point sur ${title}`, 'Choisir une première action', 'Vérifier le résultat avec vos clients'])
    .map((step, i) => `<tr><td>${step}</td><td>${i === 0 ? 'Dès cette semaine' : i === 1 ? 'Le mois suivant' : 'Au trimestre'}</td></tr>`)
    .join('')
  return afterFirstParagraph(chapter, `<table><thead><tr><th>Étape pour ${title}</th><th>Quand s’y mettre</th></tr></thead><tbody>${rows}</tbody></table>`)
}

function image(chapter: string): string {
  const title = titleOf(chapter).toLowerCase()
  return afterFirstParagraph(chapter, `<img src="${IMAGE_TO_PROVIDE_SRC}" alt="Un artisan montre à un client, sur une tablette, ce que change ${title}">`)
}

function faq(keyword: string, prompt: string): string {
  // Autant de questions que le fixent les règles du type citées par le prompt.
  const wanted = Number(/FAQ : (\d+) à \d+ questions/.exec(prompt)?.[1] ?? 3)
  const qa: Array<[string, string]> = [
    [`Par où commencer avec ${keyword} ?`, 'Commencez par écrire en une phrase ce que vos clients doivent comprendre en arrivant chez vous. Tout le reste en découle : les pages, les textes, les photos. Une base claire évite de refaire le travail deux fois et vous fait gagner des semaines.'],
    [`Combien de temps faut-il pour voir les effets de ${keyword} ?`, 'Les premiers signes arrivent quand vos pages répondent vraiment aux questions de vos clients : des appels mieux préparés, des demandes plus précises. Pour Google, la confiance se construit sur plusieurs mois, au rythme de vos publications et des avis reçus.'],
    [`Faut-il se faire accompagner pour ${keyword} ?`, 'Vous pouvez avancer seul sur les fondations, surtout si vous connaissez bien vos clients. Un accompagnement devient utile pour structurer le message, éviter les erreurs techniques et gagner du temps sur ce qui ne relève pas de votre métier.'],
    ['Quelles pages prévoir en premier ?', 'Une page d’accueil qui dit clairement ce que vous faites, une page par service important et une page de contact simple. Le reste viendra ensuite, quand vous saurez ce que vos visiteurs cherchent vraiment en arrivant chez vous.'],
    ['Comment savoir si le site fonctionne ?', 'Regardez les demandes qu’il vous apporte : leur nombre, mais surtout leur qualité. Un site qui marche attire des clients qui ont déjà compris votre offre, posent moins de questions de base et signent plus facilement.'],
    ['Que faire si les visiteurs repartent vite ?', 'Relisez le haut de vos pages avec les yeux d’un client pressé : comprend-il en quelques secondes ce que vous proposez et comment vous joindre ? Clarifier ce premier écran suffit souvent à retenir l’attention.'],
  ]
  return ['<h2>Questions fréquentes</h2>', ...qa.slice(0, Math.min(qa.length, Math.max(1, wanted))).map(([q, a]) => `<h3>${q}</h3>\n<p>${a}</p>`)].join('\n')
}

const RESUME_OUVERTURES = ['En bref,', 'Retenez d’abord que', 'L’essentiel tient en peu de mots :', 'Autrement dit,', 'Pour résumer,', 'Au fond,']
const RESUME_SUJETS = ['le point de départ', 'la première décision', 'votre priorité', 'le choix décisif', 'la vraie question',
  'le piège courant', 'la bonne habitude', 'le repère utile', 'votre meilleur atout', 'l’erreur à éviter', 'le premier réflexe']
const RESUME_SUITES = ['se prépare avant de dépenser quoi que ce soit', 'dépend de ce que vos clients cherchent vraiment',
  'se vérifie avec deux ou trois clients fidèles', 'change la façon dont on vous contacte', 'évite de refaire le travail plus tard',
  'donne une base solide au reste du projet', 'se décide en une matinée bien préparée', 'rend vos échanges plus simples',
  'protège votre budget des mauvaises surprises', 'aide à comparer les offres sans se perdre', 'se juge sur les demandes reçues',
  'éclaire chaque étape suivante', 'rassure le client dès la première visite']

/**
 * Passe « Résumer » (C7) : le H2 gardé, ses H3 partis, un résumé de 150 à 250
 * mots en phrases entières, propre au chapitre et à l'article enfant, qui finit
 * par une phrase annonçant cet article. Recette du 2026-09-30 : l'ancien résumé
 * recopiait les 170 premiers mots du chapitre — il finissait en plein mot (⛔ à
 * la publication), avalait le texte des cellules d'un tableau, et sa phrase de
 * renvoi, seule dans son paragraphe et presque identique d'un chapitre à
 * l'autre, faisait un 🔴 « Paragraphe répété ».
 */
function summary(chapter: string, prompt: string): string {
  const child = /L'article qui développe ce sujet\*\* : « ([^»]+) »/.exec(prompt)?.[1]?.trim() ?? 'l’article dédié'
  const h2 = /<h2\b[^>]*>[\s\S]*?<\/h2>/i.exec(chapter)?.[0] ?? `<h2>${titleOf(chapter)}</h2>`
  const topic = titleOf(chapter).toLowerCase()
  // Graine bien dispersée (FNV-1a) : deux chapitres voisins ne tirent pas les mêmes phrases.
  const seed = [...`${topic}|${child}`].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261) % 9973
  const paragraphs: string[][] = [[`Ce chapitre fait le tour de « ${topic} », et ce qu’il faut en retenir avant d’aller plus loin.`]]
  let words = paragraphs[0]![0]!.split(' ').length
  for (let i = 0; words < 165; i++) {
    const opening = RESUME_OUVERTURES[(seed + i) % RESUME_OUVERTURES.length]!
    const sentence = `${opening} ${RESUME_SUJETS[(seed * 3 + i * 5) % RESUME_SUJETS.length]} ${RESUME_SUITES[(seed * 7 + i * 3) % RESUME_SUITES.length]}${i % 2 === 0 ? `, quand on parle de ${topic}` : ''}.`
    if (paragraphs.at(-1)!.length >= 5) paragraphs.push([])
    paragraphs.at(-1)!.push(sentence)
    words += sentence.split(' ').length
  }
  paragraphs.at(-1)!.push(`Pour aller au bout du sujet, lisez notre article « ${child} » : il détaille chaque étape.`)
  return [h2, ...paragraphs.map(p => `<p>${p.join(' ')}</p>`)].join('\n')
}

function rewrite(chapter: string): string {
  return chapter.replace(/<p>([\s\S]*?)<\/p>/i, (_m, text: string) => `<p>Allons droit au but. ${text}</p>`)
}

registerStreamFixture(
  'enrichment-priority',
  ({ userPrompt }) => PASS.test(userPrompt) || REWRITE.test(userPrompt),
  ({ userPrompt }) => {
    if (REWRITE.test(userPrompt)) return rewrite(userContent(userPrompt, /^## Le chapitre à réécrire$/m))
    const pass = PASS.exec(userPrompt)![1]!
    const keyword = keywordOf(userPrompt)
    if (pass === 'FAQ') return faq(keyword, userPrompt)
    if (pass === 'résumé') return summary(userContent(userPrompt, /^## Le chapitre à résumer$/m), userPrompt)
    const chapter = userContent(userPrompt, /^## Le chapitre à enrichir$/m)
    if (pass === 'sources') return sources(chapter)
    if (pass === 'exemples') return example(chapter, keyword)
    if (pass === 'tableaux') return table(chapter)
    return image(chapter)
  },
)
