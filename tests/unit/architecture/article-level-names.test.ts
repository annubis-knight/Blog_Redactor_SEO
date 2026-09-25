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
