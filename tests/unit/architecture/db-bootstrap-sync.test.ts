// @vitest-environment node
/**
 * La CI crée sa base à partir de server/db/bootstrap.sql (schéma rejouable,
 * produit par pg_dump). Elle bouclait auparavant sur des migrations archivées
 * depuis mai : plus aucune table n'était créée, et la CI était rouge à chaque
 * passage (épopée qualité SEO, réparation de la CI).
 *
 * Règles :
 *   - bootstrap.sql porte l'empreinte de schema.sql : si le schéma change sans
 *     que `npm run db:snapshot` soit relancé (il régénère les deux), ce test le
 *     dit — colonnes et index compris, pas seulement les noms de tables ;
 *   - mêmes tables des deux côtés ;
 *   - aucune méta-commande `\restrict` (pg_dump récents) que le psql du runner
 *     ne connaît pas.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanDump, readFingerprint } from '../../../scripts/db-bootstrap-clean.js'

const ROOT = join(__dirname, '..', '..', '..')
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8')

function tables(sql: string, pattern: RegExp): string[] {
  return [...sql.matchAll(pattern)].map(m => m[1]!).sort()
}

describe('Schéma rejouable de la CI', () => {
  const snapshot = read('server/db/schema.sql')
  const bootstrap = read('server/db/bootstrap.sql')

  it('bootstrap.sql a été généré depuis le schema.sql actuel (même empreinte)', () => {
    const attendue = readFingerprint(snapshot)
    expect(attendue, 'empreinte absente de schema.sql').toBeTruthy()
    expect(readFingerprint(bootstrap), 'relancer `npm run db:snapshot` (qui régénère bootstrap.sql)').toBe(attendue)
  })

  it('bootstrap.sql déclare exactement les tables de schema.sql', () => {
    const attendues = tables(snapshot, /^CREATE TABLE "(\w+)"/gm)
    expect(attendues.length, 'la lecture de schema.sql doit trouver des tables').toBeGreaterThan(10)
    expect(tables(bootstrap, /^CREATE TABLE public\.(\w+) \(/gm)).toEqual(attendues)
  })

  it('bootstrap.sql ne contient aucune méta-commande \\restrict', () => {
    expect(bootstrap).not.toMatch(/^\\(un)?restrict\b/m)
  })

  it('cleanDump retire \\restrict, \\unrestrict et les lignes de version', () => {
    const dump = '\\restrict abc\n-- Dumped from database version 18.1\nCREATE TABLE public.x (id integer);\n\\unrestrict abc\n'
    expect(cleanDump(dump)).toBe('CREATE TABLE public.x (id integer);\n')
  })

  it('cleanDump normalise les fins de ligne Windows et compresse les lignes vides', () => {
    const dump = 'SET a = 0;\r\n\r\n\r\n\r\nCREATE TABLE public.x (id integer);\r\n'
    expect(cleanDump(dump)).toBe('SET a = 0;\n\nCREATE TABLE public.x (id integer);\n')
  })

  it('readFingerprint lit l’empreinte des deux en-têtes', () => {
    expect(readFingerprint('-- Empreinte schéma : sha256:abc123\n')).toBe('abc123')
    expect(readFingerprint('-- Empreinte schéma (schema.sql) : sha256:abc123\n')).toBe('abc123')
    expect(readFingerprint('rien')).toBeNull()
  })
})
