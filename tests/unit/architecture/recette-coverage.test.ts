// @vitest-environment node
/**
 * NFR-TEST-RECETTE-COVERAGE — la recette manuelle couvre chaque exigence
 * fonctionnelle.
 *
 * La recette du 2026-09-25 ne vérifiait qu'une vingtaine des 217 exigences
 * fonctionnelles, sans en citer aucune : Discovery, Radar, Finalisation ou le
 * Dashboard n'y apparaissaient pas (constat d'Arnaud, 2026-09-28). Ce test
 * garde la recette exhaustive dans le temps :
 *   - chaque exigence FR active, non tenue ou prévue est citée par une
 *     vérification (ligne « **Exigences :** ») ou listée dans un tableau
 *     « ## Hors recette » avec sa raison — jamais les deux ;
 *   - « ⚠ » suit le statut : une exigence non tenue le porte, une active non ;
 *     une exigence prévue ne se vérifie pas ;
 *   - une vérification marquée ⚠ décrit son défaut (« **⚠ Défaut connu :** ») ;
 *   - tout identifiant cité par la recette existe dans les exigences.
 *
 * Fichiers lus : `spec/18-recette-manuelle.md` (le parcours express) et tous
 * les modules de `spec/recette/`. Les blocs de code (```) sont ignorés : ils
 * servent aux exemples de format.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { REQUIREMENT_ID as ID, readRequirementStatuses, withoutCodeBlocks } from '../../helpers/spec-requirements'

const ROOT = join(__dirname, '..', '..', '..')

interface Check { file: string; title: string; ids: Array<{ id: string; warned: boolean }>; describesDefect: boolean }
interface Exclusion { file: string; id: string; reason: string }

function recetteFiles(): string[] {
  const modules = readdirSync(join(ROOT, 'spec/recette'))
    .filter(name => name.endsWith('.md'))
    .sort()
    .map(name => `spec/recette/${name}`)
  return ['spec/18-recette-manuelle.md', ...modules]
}

/** Les vérifications (blocs `### …` avec une ligne Exigences) et les exclusions (« ## Hors recette »). */
function readRecette(): { checks: Check[]; exclusions: Exclusion[] } {
  const checks: Check[] = []
  const exclusions: Exclusion[] = []
  const token = new RegExp(`(${ID})(\\s*⚠)?`, 'g')
  const row = new RegExp(`^\\|\\s*\`?(${ID})\`?\\s*\\|\\s*(.*?)\\s*\\|\\s*$`)

  for (const file of recetteFiles()) {
    const text = withoutCodeBlocks(readFileSync(join(ROOT, file), 'utf8'))
    let section = ''
    let block: Check | null = null
    for (const line of text.split(/\r?\n/)) {
      if (line.startsWith('## ')) { section = line.slice(3).trim(); block = null; continue }
      if (line.startsWith('### ')) { block = { file, title: line.slice(4).trim(), ids: [], describesDefect: false }; continue }
      if (section.startsWith('Hors recette')) {
        const match = row.exec(line)
        if (match) exclusions.push({ file, id: match[1]!, reason: match[2]! })
        continue
      }
      if (!block) continue
      if (line.startsWith('**Exigences :**')) {
        for (const m of line.matchAll(token)) block.ids.push({ id: m[1]!, warned: Boolean(m[2]) })
        if (!checks.includes(block)) checks.push(block)
      }
      if (line.startsWith('**⚠ Défaut connu :**')) block.describesDefect = true
    }
  }
  return { checks, exclusions }
}

const requirements = readRequirementStatuses(ROOT)
const { checks, exclusions } = readRecette()
const verified = new Set(checks.flatMap(c => c.ids.map(i => i.id)))
const excluded = new Set(exclusions.map(e => e.id))
const functional = [...requirements.entries()].filter(([id, status]) => id.startsWith('FR-') && status !== 'retiree')

describe('Recette manuelle — chaque exigence fonctionnelle est vérifiée ou exclue (NFR-TEST-RECETTE-COVERAGE)', () => {
  it('aucune exigence FR n’est oubliée', () => {
    const forgotten = functional.filter(([id]) => !verified.has(id) && !excluded.has(id)).map(([id, status]) => `  ${id} (${status})`)
    expect(
      forgotten,
      `Exigence(s) absente(s) de la recette. Ajoute une vérification qui la cite (ligne « **Exigences :** ») ` +
        `dans le module de son domaine (spec/recette/), ou liste-la dans son tableau « ## Hors recette » avec la raison :\n${forgotten.join('\n')}`,
    ).toEqual([])
  })

  it('une exigence est vérifiée ou exclue, jamais les deux', () => {
    const both = [...verified].filter(id => excluded.has(id))
    expect(both, `Exigence(s) à la fois vérifiée(s) et « hors recette » : garde l'une des deux.`).toEqual([])
  })

  it('tout identifiant cité par la recette existe dans les exigences', () => {
    const unknown = [
      ...checks.flatMap(c => c.ids.filter(i => !requirements.has(i.id)).map(i => `  ${i.id} ← ${c.file}, « ${c.title} »`)),
      ...exclusions.filter(e => !requirements.has(e.id)).map(e => `  ${e.id} ← ${e.file}, hors recette`),
    ]
    expect(unknown, `Identifiant(s) inconnu(s) de spec/requirements.md : corrige l'orthographe.`).toEqual([])
  })

  it('« ⚠ » suit le statut de l’exigence', () => {
    const wrong = checks.flatMap(c => c.ids.flatMap(({ id, warned }) => {
      const status = requirements.get(id)
      const where = `${c.file}, « ${c.title} »`
      if (status === 'non-tenue' && !warned) return [`  ${id} est non tenue : écris « ${id} ⚠ » (${where})`]
      if (status === 'active' && warned) return [`  ${id} est active : retire son « ⚠ » et son « Défaut connu » (${where})`]
      if (status === 'prevue') return [`  ${id} est prévue, pas livrée : liste-la hors recette (${where})`]
      return []
    }))
    expect(wrong, `La marque ⚠ ne correspond plus au statut de spec/requirements.md :`).toEqual([])
  })

  it('une vérification marquée ⚠ décrit le défaut attendu', () => {
    const silent = checks
      .filter(c => c.ids.some(i => i.warned) && !c.describesDefect)
      .map(c => `  ${c.file}, « ${c.title} »`)
    expect(silent, `Ajoute une ligne « **⚠ Défaut connu :** … » à ces vérifications :`).toEqual([])
  })

  it('chaque exclusion dit pourquoi', () => {
    const unexplained = exclusions.filter(e => e.reason.length < 15).map(e => `  ${e.id} ← ${e.file}`)
    expect(unexplained, `Exclusion(s) sans raison claire (15 caractères au moins) :`).toEqual([])
  })

  it('sentinelle : les exigences et la recette sont bien lues', () => {
    expect(functional.length, 'exigences fonctionnelles lues').toBeGreaterThan(150)
    expect(checks.length, 'vérifications lues').toBeGreaterThan(50)
  })
})
