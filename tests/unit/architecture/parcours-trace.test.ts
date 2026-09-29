// @vitest-environment node
/**
 * NFR-TEST-PARCOURS-TRACE — les parcours utilisateur restent reliés aux
 * exigences, à la recette et aux tests.
 *
 * Un parcours (`spec/parcours/PU-0N-*.md`) décrit un but réel de l'utilisateur
 * et le chemin qu'il suit. Il vieillit en silence dès qu'une exigence change de
 * statut ou qu'un test disparaît. Ce test garde :
 *   - l'en-tête : `id` du front-matter = préfixe du fichier = préfixe du titre,
 *     et les lignes But, Quand, Départ, Arrivée, Recette, Test automatique ;
 *   - chaque section `### …` (étape ou situation) : une ligne « **Exigences :** »
 *     qui cite au moins une exigence existante ;
 *   - « ⚠ » qui suit le statut, et chaque exigence non tenue citée reprise dans
 *     « ## Défauts connus sur ce parcours » ;
 *   - la cohérence avec les tests : un parcours cité par un test dans `tests/`
 *     ne dit pas « aucun » test automatique, et inversement.
 * Les blocs de code (```) sont ignorés.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  readRequirementStatuses, withoutCodeBlocks, idsOfRequirementsLine, warningMismatch,
} from '../../helpers/spec-requirements'

const ROOT = join(__dirname, '..', '..', '..')
const DIR = join(ROOT, 'spec/parcours')
const HEADER_FIELDS = ['But', 'Quand', 'Départ', 'Arrivée', 'Recette', 'Test automatique'] as const

interface Section { title: string; ids: Array<{ id: string; warned: boolean }>; exigencesLines: number }
interface Journey {
  file: string
  id: string
  frontMatterId: string | null
  titleId: string | null
  fields: Map<string, string>
  sections: Section[]
  defectBullets: Set<string>
}

function readJourney(name: string): Journey {
  const raw = readFileSync(join(DIR, name), 'utf8')
  const frontMatterId = /^id:\s*(PU-\d+)\s*$/m.exec(raw)?.[1] ?? null
  const text = withoutCodeBlocks(raw)
  const journey: Journey = {
    file: `spec/parcours/${name}`,
    id: /^(PU-\d+)-/.exec(name)?.[1] ?? name,
    frontMatterId,
    titleId: /^# (PU-\d+) — /m.exec(text)?.[1] ?? null,
    fields: new Map(),
    sections: [],
    defectBullets: new Set(),
  }
  let part = ''
  let section: Section | null = null
  for (const line of text.split(/\r?\n/)) {
    const field = /^\*\*([^*]+) :\*\*\s*(.*)$/.exec(line)
    if (field && (HEADER_FIELDS as readonly string[]).includes(field[1]!)) journey.fields.set(field[1]!, field[2]!.trim())
    if (line.startsWith('## ')) { part = line.slice(3).trim(); section = null; continue }
    if (line.startsWith('### ') && (part === 'Les étapes' || part === 'Ce qui peut mal tourner')) {
      section = { title: `${part} › ${line.slice(4).trim()}`, ids: [], exigencesLines: 0 }
      journey.sections.push(section)
      continue
    }
    if (part.startsWith('Défauts connus')) {
      const bullet = /^- `?((?:N?FR)-[A-Z0-9]+(?:-[A-Z0-9]+)+)`?/.exec(line)
      if (bullet) journey.defectBullets.add(bullet[1]!)
      continue
    }
    if (section && line.startsWith('**Exigences :**')) {
      section.exigencesLines += 1
      section.ids.push(...idsOfRequirementsLine(line))
    }
  }
  return journey
}

/** Les fichiers de `tests/` (hors ce test) qui citent un identifiant de parcours. */
function journeysCitedByTests(): Map<string, string[]> {
  const cited = new Map<string, string[]>()
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'parcours-trace.test.ts') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (!/\.(ts|js)$/.test(entry.name)) continue
      for (const id of new Set(readFileSync(full, 'utf8').match(/\bPU-\d{2}\b/g) ?? [])) {
        cited.set(id, [...(cited.get(id) ?? []), relative(ROOT, full).replace(/\\/g, '/')])
      }
    }
  }
  walk(join(ROOT, 'tests'))
  return cited
}

const requirements = readRequirementStatuses(ROOT)
const journeys = readdirSync(DIR).filter(n => /^PU-\d+-.+\.md$/.test(n)).sort().map(readJourney)
const citedByTests = journeysCitedByTests()

describe('Parcours utilisateur — reliés aux exigences, à la recette et aux tests (NFR-TEST-PARCOURS-TRACE)', () => {
  it('l’identifiant du fichier, de l’en-tête et du titre concordent', () => {
    const wrong = journeys
      .filter(j => j.frontMatterId !== j.id || j.titleId !== j.id)
      .map(j => `  ${j.file} : fichier ${j.id}, front-matter ${j.frontMatterId}, titre ${j.titleId}`)
    expect(wrong, 'Identifiants de parcours discordants :').toEqual([])
  })

  it('chaque parcours a son but, sa situation, son départ, son arrivée, sa recette et son test', () => {
    const missing = journeys.flatMap(j => HEADER_FIELDS
      .filter(f => !(j.fields.get(f) ?? '').trim())
      .map(f => `  ${j.file} : « **${f} :** » absent ou vide`))
    expect(missing, 'En-tête incomplet :').toEqual([])
  })

  it('chaque étape et chaque situation cite au moins une exigence, sur une seule ligne', () => {
    const wrong = journeys.flatMap(j => j.sections
      .filter(s => s.exigencesLines !== 1 || s.ids.length === 0)
      .map(s => `  ${j.file}, « ${s.title} » : ${s.exigencesLines} ligne(s) Exigences, ${s.ids.length} identifiant(s)`))
    expect(wrong, 'Ajoute une ligne « **Exigences :** FR-… » (une seule) à :').toEqual([])
  })

  it('toute exigence citée existe', () => {
    const unknown = journeys.flatMap(j => j.sections.flatMap(s => s.ids
      .filter(i => !requirements.has(i.id))
      .map(i => `  ${i.id} ← ${j.file}, « ${s.title} »`)))
    expect(unknown, 'Identifiant(s) inconnu(s) de spec/requirements.md :').toEqual([])
  })

  it('« ⚠ » suit le statut de l’exigence', () => {
    const wrong = journeys.flatMap(j => j.sections.flatMap(s => s.ids.flatMap(({ id, warned }) => {
      const problem = warningMismatch(id, warned, requirements.get(id))
      return problem ? [`  ${problem} (${j.file}, « ${s.title} »)`] : []
    })))
    expect(wrong, 'La marque ⚠ ne correspond plus au statut de spec/requirements.md :').toEqual([])
  })

  it('chaque exigence non tenue citée figure dans « Défauts connus sur ce parcours »', () => {
    const missing = journeys.flatMap(j => {
      const nonTenues = new Set(j.sections.flatMap(s => s.ids.map(i => i.id)).filter(id => requirements.get(id) === 'non-tenue'))
      return [...nonTenues].filter(id => !j.defectBullets.has(id)).map(id => `  ${id} ← ${j.file}`)
    })
    expect(missing, 'Ajoute une puce « - ID — ce qui manque » dans « ## Défauts connus sur ce parcours » :').toEqual([])
  })

  it('« Test automatique » dit vrai : un parcours cité par un test n’écrit pas « aucun », et inversement', () => {
    const wrong = journeys.flatMap(j => {
      const says = (j.fields.get('Test automatique') ?? '').toLowerCase()
      const none = says.startsWith('aucun')
      const tests = citedByTests.get(j.id) ?? []
      if (none && tests.length > 0) return [`  ${j.id} dit « aucun » mais est cité par : ${tests.join(', ')}`]
      if (!none && tests.length === 0) return [`  ${j.id} annonce un test automatique, mais aucun fichier de tests/ ne cite « ${j.id} »`]
      return []
    })
    expect(wrong, 'Test automatique incohérent :').toEqual([])
  })

  it('sentinelle : les parcours et les exigences sont bien lus', () => {
    expect(journeys.length, 'parcours lus').toBeGreaterThanOrEqual(5)
    expect(journeys.every(j => j.sections.length >= 5), 'au moins 5 sections par parcours').toBe(true)
    expect(requirements.size, 'exigences lues').toBeGreaterThan(200)
  })
})
