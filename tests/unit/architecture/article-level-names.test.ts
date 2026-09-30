// @vitest-environment node
/**
 * M12 (épopée qualité SEO) — le Moteur traduisait le type d'article avec une
 * table `{ Pilier, Cluster, Support }`. Aucun article n'a jamais porté ces
 * noms : la table ne reconnaissait rien et chaque pilier recevait des
 * lieutenants proposés comme pour un intermédiaire.
 *
 * Règle : un niveau d'article se lit avec `parseArticleLevel`
 * (`shared/utils/article-level.ts`), jamais avec une table écrite à la main.
 * Ce garde refuse le retour des noms fantômes « Cluster » et « Support ».
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')
const SCANNED = ['src', 'shared', 'server']
const PHANTOM = /\b(Cluster|Support)\s*:\s*'(pilier|intermediaire|specifique)'/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name.startsWith('_') ? [] : sourceFiles(path)
    return /\.(ts|vue)$/.test(entry.name) ? [path] : []
  })
}

describe('Niveaux d’article — pas de table de traduction fantôme', () => {
  it('aucun fichier ne traduit « Cluster » ou « Support » en niveau', () => {
    const files = SCANNED.flatMap(d => sourceFiles(join(ROOT, d)))
    expect(files.length).toBeGreaterThan(100)
    const offenders = files
      .filter(f => PHANTOM.test(readFileSync(f, 'utf8')))
      .map(f => relative(ROOT, f))
    expect(offenders).toEqual([])
  })

  it('le motif reconnaît bien l’ancienne table (le garde peut échouer)', () => {
    expect(PHANTOM.test(`{ Pilier: 'pilier', Cluster: 'intermediaire', Support: 'specifique' }`)).toBe(true)
  })
})

/**
 * FR-CER-AIGUILLAGE — le niveau s'affiche en toutes lettres, jamais sous son
 * code. Recette du 2026-09-30, rejeu du 30/09 au soir : le Lexique montrait le
 * badge « INTERMEDIAIRE » (la valeur `intermediaire` mise en capitales). Un
 * template n'écrit jamais `{{ … articleLevel }}` brut : il passe par
 * `articleLevelToDisplayLabel`.
 */
const RAW_LEVEL = /\{\{\s*[\w.?]*\barticleLevel\s*\}\}/

describe('FR-CER-AIGUILLAGE — le niveau d’un article ne s’affiche jamais sous son code', () => {
  it('aucun template n’affiche `articleLevel` brut', () => {
    const offenders = sourceFiles(join(ROOT, 'src'))
      .filter(f => f.endsWith('.vue'))
      .flatMap(f => readFileSync(f, 'utf8').split('\n')
        .map((line, i) => (RAW_LEVEL.test(line) ? `${relative(ROOT, f)}:${i + 1} — ${line.trim()}` : null))
        .filter((x): x is string => x !== null))
    expect(offenders, `Niveau affiché sous son code : passe par articleLevelToDisplayLabel.\n${offenders.join('\n')}`).toEqual([])
  })

  it('sentinelle : repère l’affichage brut, pas le libellé', () => {
    expect(RAW_LEVEL.test('<span class="level-badge">{{ articleLevel }}</span>')).toBe(true)
    expect(RAW_LEVEL.test('Niveau : <strong>{{ currentResult.articleLevel }}</strong>')).toBe(true)
    expect(RAW_LEVEL.test('{{ articleLevelToDisplayLabel(articleLevel) }}')).toBe(false)
  })
})
