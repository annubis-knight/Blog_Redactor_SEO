// @vitest-environment node
/**
 * Cliquet de frontière des contrats d'affichage (NFR-INT-DISPLAY-CONTRACTS).
 *
 * Toute réponse que le Moteur affiche doit passer un contrat d'affichage :
 *   - côté serveur, la route appelle `parseContract` (ou passe un `contract`
 *     au moteur de flux SSE) avant de répondre ;
 *   - côté client, l'appel `apiGet/apiPost…` passe l'option `{ contract }`.
 *
 * Deux règles :
 *   1. Une famille terminée (`DONE_FAMILIES`) ne peut plus perdre son contrat.
 *   2. Le nombre d'appels et de routes encore sans contrat ne peut que baisser
 *      (baselines ci-dessous) : quand un lot est livré, abaisser la baseline.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')

/** Familles dont le contrat est posé partout (client et serveur). */
const DONE_FAMILIES = new Set(['captain-scan', 'article-keywords', 'paa-judge', 'radar-scan', 'radar-generate', 'radar-exploration', 'long-tail'])

/** Cliquet : ces nombres ne peuvent que baisser. */
const BASELINE_CLIENT_UNCOVERED = 11
const BASELINE_SERVER_UNCOVERED = 13

// ---------------------------------------------------------------------------
// Frontière client : appels du front vers les réponses affichées au Moteur
// ---------------------------------------------------------------------------

interface ClientEndpoint {
  family: string
  method: 'Get' | 'Post' | 'Put' | 'Patch'
  path: RegExp
}

const V = '\\$\\{[^}]+\\}' // un segment dynamique `${...}` dans un chemin

const CLIENT_ENDPOINTS: ClientEndpoint[] = [
  { family: 'captain-scan', method: 'Post', path: new RegExp(`^/keywords/${V}/scan$`) },
  { family: 'article-keywords', method: 'Get', path: new RegExp(`^/articles/${V}/keywords$`) },
  { family: 'paa-judge', method: 'Post', path: new RegExp(`^/articles/${V}/captain/judge-paa$`) },
  { family: 'radar-scan', method: 'Post', path: /^\/keywords\/radar\/scan$/ },
  { family: 'radar-generate', method: 'Post', path: /^\/keywords\/radar\/generate$/ },
  { family: 'radar-exploration', method: 'Get', path: new RegExp(`^/articles/${V}/radar-exploration$`) },
  { family: 'long-tail', method: 'Post', path: new RegExp(`^/articles/${V}/radar-exploration/long-tail$`) },
  { family: 'serp-analysis', method: 'Post', path: /^\/serp\/analyze$/ },
  { family: 'tfidf', method: 'Post', path: /^\/serp\/tfidf$/ },
  { family: 'discovery', method: 'Post', path: /^\/keywords\/(suggest-all|discover|discover-from-site|analyze-discovery|relevance-score)$/ },
  { family: 'explorations', method: 'Get', path: new RegExp(`^/articles/${V}/explorations$`) },
]

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|vue)$/.test(entry.name)) out.push(full)
  }
  return out
}

/** Texte complet d'un appel, de la parenthèse ouvrante à la fermante. */
function callText(source: string, openIndex: number): string {
  let depth = 0
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i]
    if (ch === '(') depth++
    else if (ch === ')') {
      depth--
      if (depth === 0) return source.slice(openIndex, i + 1)
    }
  }
  return source.slice(openIndex)
}

interface Site {
  family: string
  where: string
  covered: boolean
}

function clientSites(): Site[] {
  const sites: Site[] = []
  const call = /\bapi(Get|Post|Put|Patch)\s*(?:<[^()]*?>)?\s*(\()\s*([`'"])([^`'"]*)\3/g
  for (const file of walk(join(ROOT, 'src'))) {
    const source = readFileSync(file, 'utf8')
    let m: RegExpExecArray | null
    while ((m = call.exec(source))) {
      const endpoint = CLIENT_ENDPOINTS.find(e => e.method === m![1] && e.path.test(m![4]!))
      if (!endpoint) continue
      const open = m.index + m[0].indexOf('(')
      const line = source.slice(0, m.index).split('\n').length
      sites.push({
        family: endpoint.family,
        where: `${relative(ROOT, file).replace(/\\/g, '/')}:${line} ${m[1]!.toUpperCase()} ${m[4]}`,
        covered: /\bcontract\s*:/.test(callText(source, open)),
      })
    }
  }
  return sites
}

// ---------------------------------------------------------------------------
// Frontière serveur : routes qui servent ces réponses
// ---------------------------------------------------------------------------

interface ServerRoute {
  family: string
  file: string
  method: 'get' | 'post'
  path: string
}

const SERVER_ROUTES: ServerRoute[] = [
  { family: 'captain-scan', file: 'keyword-scan.routes.ts', method: 'post', path: '/keywords/:keyword/scan' },
  { family: 'article-keywords', file: 'keywords.routes.ts', method: 'get', path: '/articles/:id/keywords' },
  { family: 'paa-judge', file: 'keywords.routes.ts', method: 'post', path: '/articles/:id/captain/judge-paa' },
  { family: 'radar-scan', file: 'intent-scan.routes.ts', method: 'post', path: '/keywords/radar/scan' },
  { family: 'radar-generate', file: 'intent-scan.routes.ts', method: 'post', path: '/keywords/radar/generate' },
  { family: 'radar-exploration', file: 'radar-exploration.routes.ts', method: 'get', path: '/articles/:id/radar-exploration' },
  { family: 'long-tail', file: 'long-tail-suggest.routes.ts', method: 'post', path: '/articles/:id/radar-exploration/long-tail' },
  { family: 'serp-analysis', file: 'serp-analysis.routes.ts', method: 'post', path: '/serp/analyze' },
  { family: 'tfidf', file: 'serp-analysis.routes.ts', method: 'post', path: '/serp/tfidf' },
  { family: 'discovery', file: 'keywords.routes.ts', method: 'post', path: '/keywords/suggest-all' },
  { family: 'discovery', file: 'keywords.routes.ts', method: 'post', path: '/keywords/discover' },
  { family: 'discovery', file: 'keywords.routes.ts', method: 'post', path: '/keywords/discover-from-site' },
  { family: 'discovery', file: 'keywords.routes.ts', method: 'post', path: '/keywords/analyze-discovery' },
  { family: 'discovery', file: 'keywords.routes.ts', method: 'post', path: '/keywords/relevance-score' },
  { family: 'explorations', file: 'article-explorations.routes.ts', method: 'get', path: '/articles/:id/explorations' },
  { family: 'ai-advice', file: 'keyword-ai-panel.routes.ts', method: 'post', path: '/keywords/:keyword/ai-panel' },
  { family: 'lieutenants-ai', file: 'keyword-ai-panel.routes.ts', method: 'post', path: '/keywords/:keyword/propose-lieutenants' },
  { family: 'lieutenants-ai', file: 'keyword-ai-panel.routes.ts', method: 'post', path: '/keywords/:keyword/ai-hn-structure' },
  { family: 'lexique-ai', file: 'keyword-ai-panel.routes.ts', method: 'post', path: '/keywords/:keyword/ai-lexique-upfront' },
  { family: 'lexique-ai', file: 'keyword-ai-panel.routes.ts', method: 'post', path: '/keywords/:keyword/ai-lexique' },
]

function serverSites(): Site[] {
  return SERVER_ROUTES.map(route => {
    const source = readFileSync(join(ROOT, 'server', 'routes', route.file), 'utf8')
    const marker = `router.${route.method}('${route.path}'`
    const start = source.indexOf(marker)
    if (start < 0) throw new Error(`Route introuvable : ${route.file} ${marker}`)
    const next = source.indexOf('\nrouter.', start + marker.length)
    const handler = source.slice(start, next < 0 ? undefined : next)
    return {
      family: route.family,
      where: `server/routes/${route.file} ${route.method.toUpperCase()} ${route.path}`,
      covered: /parseContract(List)?\(|\bcontract\s*:\s*\w+Contract\b/.test(handler),
    }
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Contrats d’affichage — cliquet de frontière (NFR-INT-DISPLAY-CONTRACTS)', () => {
  const client = clientSites()
  const server = serverSites()

  it('le scanner trouve bien les appels du Moteur (sentinelle)', () => {
    expect(client.length).toBeGreaterThanOrEqual(20)
    expect(server.length).toBe(SERVER_ROUTES.length)
  })

  it('une famille terminée garde son contrat partout, côté client', () => {
    const lost = client.filter(s => DONE_FAMILIES.has(s.family) && !s.covered).map(s => s.where)
    expect(lost, `Appels sans contrat dans une famille terminée :\n${lost.join('\n')}`).toEqual([])
  })

  it('une famille terminée garde son contrat partout, côté serveur', () => {
    const lost = server.filter(s => DONE_FAMILIES.has(s.family) && !s.covered).map(s => s.where)
    expect(lost, `Routes sans contrat dans une famille terminée :\n${lost.join('\n')}`).toEqual([])
  })

  it(`le nombre d’appels client sans contrat ne peut que baisser (baseline ${BASELINE_CLIENT_UNCOVERED})`, () => {
    const uncovered = client.filter(s => !s.covered).map(s => s.where)
    expect(
      uncovered.length,
      `Appels client sans contrat (${uncovered.length}) :\n${uncovered.join('\n')}\n` +
        '→ Passer { contract } à l’appel. Si un lot vient d’être livré, abaisser la baseline.',
    ).toBeLessThanOrEqual(BASELINE_CLIENT_UNCOVERED)
  })

  it(`le nombre de routes sans contrat ne peut que baisser (baseline ${BASELINE_SERVER_UNCOVERED})`, () => {
    const uncovered = server.filter(s => !s.covered).map(s => s.where)
    expect(
      uncovered.length,
      `Routes sans contrat (${uncovered.length}) :\n${uncovered.join('\n')}\n` +
        '→ Appeler parseContract avant de répondre. Si un lot vient d’être livré, abaisser la baseline.',
    ).toBeLessThanOrEqual(BASELINE_SERVER_UNCOVERED)
  })
})
