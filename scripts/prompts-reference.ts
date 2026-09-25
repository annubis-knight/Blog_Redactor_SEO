/**
 * Génère docs/prompts-reference.md depuis les prompts eux-mêmes (D3).
 *
 * La référence écrite à la main citait des routes et des fichiers disparus
 * (`generate-reduce.md`, `/keywords/translate-pain`). Elle est désormais
 * produite ici : variables, sections et variables globales lues dans chaque
 * `.md`, fichiers qui le chargent trouvés dans `server/`. Seul le rôle est
 * écrit à la main (ROLES) ; un prompt sans rôle fait échouer la génération.
 *
 *   npm run docs:prompts
 *
 * Test : tests/unit/architecture/prompts-reference.test.ts (le fichier commité
 * doit être égal à la sortie de ce script).
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { templateKeys, PROMPT_GLOBALS } from '../server/utils/prompt-loader.js'

type Domain = 'Système' | 'Cerveau — stratégie et cocon' | 'Moteur — mots-clés' | 'Rédaction' | 'Actions contextuelles' | 'Mode automatique'

const ROLES: Record<string, { domain: Domain; role: string }> = {
  'system-propulsite': { domain: 'Système', role: 'Identité et règles d’écriture (ton, SEO, GEO, liste noire) ; prompt système des générations de texte' },
  'strategy-suggest': { domain: 'Cerveau — stratégie et cocon', role: 'Suggestion pour une étape de la stratégie d’article (cible, douleur, angle…)' },
  'strategy-merge': { domain: 'Cerveau — stratégie et cocon', role: 'Fusionne le texte de l’utilisateur et la suggestion IA (article ou cocon)' },
  'strategy-deepen': { domain: 'Cerveau — stratégie et cocon', role: 'Propose une sous-question pour approfondir une étape' },
  'strategy-consolidate': { domain: 'Cerveau — stratégie et cocon', role: 'Consolide la réponse principale et les sous-réponses' },
  'strategy-enrich': { domain: 'Cerveau — stratégie et cocon', role: 'Enrichit le texte validé avec une sous-réponse' },
  'cocoon-brainstorm': { domain: 'Cerveau — stratégie et cocon', role: 'Suggestion pour une étape de la stratégie du cocon' },
  'cocoon-articles': { domain: 'Cerveau — stratégie et cocon', role: 'Structure du cocon : le Pilier et les Intermédiaires' },
  'cocoon-articles-topics': { domain: 'Cerveau — stratégie et cocon', role: 'Sujets et sous-thèmes à couvrir dans le cocon' },
  'cocoon-paa-queries': { domain: 'Cerveau — stratégie et cocon', role: 'Requêtes Google pour récupérer les PAA de chaque Intermédiaire' },
  'cocoon-articles-spe': { domain: 'Cerveau — stratégie et cocon', role: 'Articles Spécialisés, nourris des PAA récupérées' },
  'cocoon-add-article': { domain: 'Cerveau — stratégie et cocon', role: 'Un seul article complémentaire, du type demandé' },
  'theme-parse': { domain: 'Cerveau — stratégie et cocon', role: 'Transforme une description libre de l’entreprise en configuration structurée' },
  'intent-keywords': { domain: 'Moteur — mots-clés', role: 'Mots-clés courts pour chercher les PAA (Radar)' },
  'radar-long-tail-suggest': { domain: 'Moteur — mots-clés', role: 'Longues traînes scorées à partir des racines du Radar' },
  'capitaine-ai-panel': { domain: 'Moteur — mots-clés', role: 'Avis d’expert sur le candidat capitaine' },
  'captain-paa-judge': { domain: 'Moteur — mots-clés', role: 'Juge la pertinence des PAA du capitaine face à la douleur' },
  'propose-lieutenants': { domain: 'Moteur — mots-clés', role: 'Candidats lieutenants depuis SERP, PAA, racines et groupes de mots' },
  'lieutenants-hn-structure': { domain: 'Moteur — mots-clés', role: 'Structure H2/H3 à partir des lieutenants retenus' },
  'lexique-suggest': { domain: 'Moteur — mots-clés', role: 'Champ sémantique du capitaine (termes attendus)' },
  'lexique-ai-panel': { domain: 'Moteur — mots-clés', role: 'Avis d’expert sur les termes TF-IDF' },
  'lexique-analysis-upfront': { domain: 'Moteur — mots-clés', role: 'Recommande ou écarte chaque terme TF-IDF, avec une raison' },
  'micro-context-suggest': { domain: 'Rédaction', role: 'Angle, ton et consignes proposés pour l’article' },
  'brief-ia-panel': { domain: 'Rédaction', role: 'Lecture critique du brief complet' },
  'generate-outline': { domain: 'Rédaction', role: 'Sommaire H1/H2/H3 en JSON (prompt système du sommaire)' },
  'generate-article-draft': { domain: 'Rédaction', role: 'Premier jet de l’article entier en un appel, sans recherche web ; chiffres posés « à sourcer »' },
  'generate-meta': { domain: 'Rédaction', role: 'Meta title et meta description' },
  'reduce-section': { domain: 'Rédaction', role: 'Raccourcit une section en gardant structure et SEO' },
  'humanize-section': { domain: 'Rédaction', role: 'Retire les tics d’écriture IA d’une section' },
  'actions/reformulate': { domain: 'Actions contextuelles', role: 'Reformuler la sélection' },
  'actions/simplify': { domain: 'Actions contextuelles', role: 'Simplifier le vocabulaire' },
  'actions/convert-list': { domain: 'Actions contextuelles', role: 'Convertir un paragraphe en liste' },
  'actions/pme-example': { domain: 'Actions contextuelles', role: 'Exemple « grande marque → PME »' },
  'actions/keyword-optimize': { domain: 'Actions contextuelles', role: 'Intégrer le mot-clé naturellement' },
  'actions/add-statistic': { domain: 'Actions contextuelles', role: 'Ajouter une statistique sourcée' },
  'actions/answer-capsule': { domain: 'Actions contextuelles', role: 'Capsule réponse pour l’extraction par les IA' },
  'actions/question-heading': { domain: 'Actions contextuelles', role: 'Transformer un titre en question' },
  'actions/sources-chiffrees': { domain: 'Actions contextuelles', role: 'Bloc « Sources chiffrées » (recherche web)' },
  'actions/exemples-reels': { domain: 'Actions contextuelles', role: 'Bloc « Exemples réels » (recherche web)' },
  'actions/ce-quil-faut-retenir': { domain: 'Actions contextuelles', role: 'Bloc « Ce qu’il faut retenir »' },
  'auto-intake': { domain: 'Mode automatique', role: 'Brief éditorial structuré à partir d’une idée' },
  'auto-placement': { domain: 'Mode automatique', role: 'Place un nouvel article dans l’arborescence' },
}

const DOMAIN_ORDER: Domain[] = ['Système', 'Cerveau — stratégie et cocon', 'Moteur — mots-clés', 'Rédaction', 'Actions contextuelles', 'Mode automatique']

function walk(dir: string, ext: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '_archive') walk(full, ext, out)
    } else if (entry.name.endsWith(ext)) {
      out.push(full)
    }
  }
  return out
}

const code = (items: string[]): string => (items.length ? items.map(i => `\`${i}\``).join(', ') : '—')

export function buildPromptsReference(root: string): string {
  const promptsDir = join(root, 'server', 'prompts')
  const names = walk(promptsDir, '.md')
    .map(f => relative(promptsDir, f).replaceAll('\\', '/').replace(/\.md$/, ''))
    .sort()

  const missingRole = names.filter(n => !ROLES[n])
  const staleRole = Object.keys(ROLES).filter(n => !names.includes(n))
  if (missingRole.length || staleRole.length) {
    throw new Error(`ROLES à mettre à jour — sans rôle : ${missingRole.join(', ') || 'aucun'} ; rôle d'un prompt disparu : ${staleRole.join(', ') || 'aucun'}`)
  }

  const loaders = walk(join(root, 'server'), '.ts')
    .filter(f => !f.endsWith('prompt-loader.ts'))
    .map(f => ({ file: relative(root, f).replaceAll('\\', '/'), source: readFileSync(f, 'utf8') }))
    .filter(({ source }) => source.includes('loadPrompt('))
  const loadedBy = (name: string): string[] => loaders
    .filter(({ source }) => source.includes(`'${name}'`) || source.includes(`"${name}"`)
      || (name.startsWith('actions/') && source.includes('`actions/${')))
    .map(({ file }) => file)

  const globals = new Set<string>(PROMPT_GLOBALS)
  const lines: string[] = [
    '# Référence des prompts — Blog Redactor SEO',
    '',
    '> **Fichier généré** par `npm run docs:prompts` (`scripts/prompts-reference.ts`) : ne pas l’éditer à la main.',
    '> Un test (`tests/unit/architecture/prompts-reference.test.ts`) vérifie qu’il est à jour.',
    '> Architecture (couches, chargeur strict, variables globales) : [`prompts-architecture.md`](./prompts-architecture.md).',
    '',
    `${names.length} prompts. Variables globales, fournies par le chargeur quand un prompt les cite : ${code([...PROMPT_GLOBALS])}.`,
    '',
    'Colonnes : **Variables** = à fournir par l’appelant, exactement (le chargeur refuse une variable manquante ou en trop) ; **Sections** = blocs `{{#clé}}…{{/clé}}` gardés si la valeur n’est pas vide.',
  ]
  for (const domain of DOMAIN_ORDER) {
    const inDomain = names.filter(n => ROLES[n]!.domain === domain)
    if (!inDomain.length) continue
    lines.push('', `## ${domain}`, '', '| Prompt | Rôle | Variables | Sections | Globales | Chargé par |', '|---|---|---|---|---|---|')
    for (const name of inDomain) {
      const keys = templateKeys(readFileSync(join(promptsDir, `${name}.md`), 'utf8'))
      const own = keys.variables.filter(k => !globals.has(k)).sort()
      const used = keys.variables.filter(k => globals.has(k)).sort()
      lines.push(`| \`${name}.md\` | ${ROLES[name]!.role} | ${code(own)} | ${code([...keys.sections].sort())} | ${code(used)} | ${code(loadedBy(name))} |`)
    }
  }
  return lines.join('\n') + '\n'
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = join(fileURLToPath(import.meta.url), '..', '..')
  const target = join(root, 'docs', 'prompts-reference.md')
  writeFileSync(target, buildPromptsReference(root), 'utf8')
  console.log(`docs/prompts-reference.md régénéré`)
}
