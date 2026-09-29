// @vitest-environment node
/**
 * Cliquet de traçabilité des exigences (épopée qualité SEO, chantier C0).
 *
 * Un test qui cite `FR-…`, `NFR-…` ou `DESIGN-…` promet un lien vers une
 * exigence écrite. Ce lien casse sans bruit quand l'ID est mal orthographié,
 * renommé ou jamais versé au PRD : le test continue de passer, mais on ne sait
 * plus quel besoin il protège.
 *
 * Règle : tout ID cité dans `tests/` existe
 *   - pour un FR/NFR : dans `spec/requirements.md` (la référence depuis le
 *     2026-09-28) ou, pour l'historique, dans `prd.md` ;
 *   - pour un DESIGN : dans un chapitre de `design/` ou dans `design-registry.md` ;
 *   - ou dans l'épopée en cours, qui réserve les IDs pas encore livrés
 *     (ils entrent dans les exigences dans la PR qui les livre).
 *
 * `LEGACY_ORPHANS` fige la dette constatée le 2026-09-24 (29 IDs, 27 après C1, 20 après la
 * consolidation de la documentation) : ces IDs sont cités par des tests mais absents des
 * exigences. La liste ne peut que baisser : dès qu'un ID y devient traçable, le second test
 * demande de le retirer d'ici.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')
const SELF_FILE_NAME = 'requirements-trace.test.ts'

/** Tous les `.md` d'un dossier, sous-dossiers compris, mis bout à bout. */
function readMarkdownTree(dir: string): string {
  return readdirSync(dir, { withFileTypes: true })
    .map(entry => {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) return readMarkdownTree(full)
      return entry.name.endsWith('.md') ? readFileSync(full, 'utf8') : ''
    })
    .join('\n')
}

const REQUIREMENTS = readFileSync(join(ROOT, 'spec/requirements.md'), 'utf8')
const DESIGN = readMarkdownTree(join(ROOT, 'design'))
const PRD = readFileSync(join(ROOT, '_bmad-output/planning-artifacts/prd.md'), 'utf8')
const REGISTRY = readFileSync(join(ROOT, '_bmad-output/planning-artifacts/design-registry.md'), 'utf8')
const EPIC = readFileSync(join(ROOT, '_bmad-output/implementation-artifacts/epic-qualite-seo-garde-fous.md'), 'utf8')

const LEGACY_ORPHANS = new Set([
  'FR-CAP-LOCK-NO-DUPLICATE',
  'FR-CAP-RADAR-CARD',
  'FR-CAP-RELEVANCE-COMPUTED-LIVE',
  'FR-CAP-RELEVANCE-LINEAR-ROOTS',
  'FR-CAP-RELEVANCE-NO-CACHE',
  'FR-CAP-RELEVANCE-NO-DB-WRITE',
  'FR-CAP-RELEVANCE-ROOTS-FROM-DB',
  'FR-CAP-ROOTS-PERSISTED-AT-ENTRY',
  'FR-CAP-SORT-STABLE-ON-ROOT-VARIANT',
  'FR-CAP-VALIDATE',
  'FR-CER-PROPOSE',
  'FR-DIS-AI-PANEL',
  'FR-DIS-DECOUVRIR',
  'FR-INFRA-AI-FALLBACK-CONFIG',
  'FR-INFRA-KPI',
  'FR-INFRA-SSE-EVENT-PERSISTANT',
  'FR-MOT-FINAL-CTA-GATED',
  'FR-MOT-HN-EMPTY-VISIBLE',
  'FR-MOT-HN-REGEN-LOCKED',
  'FR-RAD-SCAN',
])

const ID_PATTERN = /\b(?:N?FR|DESIGN)-[A-Z0-9]+(?:-[A-Z0-9]+)+\b/g

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === SELF_FILE_NAME || entry.name === 'node_modules') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|js|vue)$/.test(entry.name)) out.push(full)
  }
  return out
}

/** Vrai si l'ID figure dans le texte comme un mot entier (pas comme préfixe d'un autre ID). */
function mentions(text: string, id: string): boolean {
  return new RegExp(`(^|[^A-Z0-9-])${id}($|[^A-Z0-9-])`).test(text)
}

function isTraced(id: string): boolean {
  const homes = id.startsWith('DESIGN-') ? [DESIGN, REGISTRY] : [REQUIREMENTS, PRD]
  return homes.some(home => mentions(home, id)) || mentions(EPIC, id)
}

function citedIds(): Map<string, string[]> {
  const cited = new Map<string, string[]>()
  for (const file of walk(join(ROOT, 'tests'))) {
    const rel = relative(ROOT, file).replace(/\\/g, '/')
    for (const id of new Set(readFileSync(file, 'utf8').match(ID_PATTERN) ?? [])) {
      cited.set(id, [...(cited.get(id) ?? []), rel])
    }
  }
  return cited
}

describe('Traçabilité — les IDs cités par les tests existent', () => {
  const cited = citedIds()

  it('aucun nouvel ID orphelin', () => {
    const orphans = [...cited.entries()]
      .filter(([id]) => !isTraced(id) && !LEGACY_ORPHANS.has(id))
      .map(([id, files]) => `  ${id} ← ${files.join(', ')}`)
    expect(
      orphans,
      `ID(s) cité(s) par un test mais absent(s) des exigences (spec/requirements.md), du design et de l'épopée.\n` +
        `Corrige l'orthographe, ou écris l'exigence (épopée si elle n'est pas encore livrée) :\n${orphans.join('\n')}`,
    ).toEqual([])
  })

  it('la dette figée ne contient que des orphelins réels (le cliquet ne fait que baisser)', () => {
    const resolved = [...LEGACY_ORPHANS].filter(id => isTraced(id) || !cited.has(id))
    expect(
      resolved,
      `Ces IDs ne sont plus orphelins (écrits dans un document, ou plus cités) : retire-les de LEGACY_ORPHANS.`,
    ).toEqual([])
  })

  it('sentinelle : le scanner trouve bien des IDs', () => {
    expect(cited.size).toBeGreaterThan(100)
  })
})
