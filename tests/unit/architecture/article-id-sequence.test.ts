// @vitest-environment node
/**
 * NFR-INT-ARTICLE-ID-NEVER-REUSED — le numéro d'un article supprimé n'est jamais redonné.
 *
 * Le numéro d'un article était calculé à la main : le plus grand existant, plus un.
 * Supprimer le dernier article créé rendait donc son numéro au suivant, et tout ce
 * qui arrivait en retard pour l'ancien (un scan du Capitaine encore en cours, par
 * exemple) s'enregistrait sur le nouveau. C'est ce qui faisait échouer au premier
 * essai, en CI, le test navigateur « liste vide » du Capitaine : il affichait le
 * mot-clé du test précédent.
 *
 * Le numéro vient désormais d'une séquence de la base, qui ne revient jamais en
 * arrière. Trois gardes :
 *  - le schéma (`schema.sql`) donne à `articles.id` la séquence pour défaut ;
 *  - le schéma rejouable (`bootstrap.sql`, bases de CI et des tests navigateur) la crée ;
 *  - aucun code ne calcule plus lui-même le numéro d'un article.
 * Le comportement réel (suppression puis création) est vérifié en intégration :
 * `tests/integration/data.service.test.ts`.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

/** Le bloc `CREATE TABLE "articles" (…);` du snapshot. */
function articlesTable(schema: string): string {
  const start = schema.indexOf('CREATE TABLE "articles" (')
  expect(start, 'la table articles doit figurer dans schema.sql').toBeGreaterThanOrEqual(0)
  return schema.slice(start, schema.indexOf(');', start))
}

function tsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '_archive') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) tsFiles(full, out)
    else if (entry.name.endsWith('.ts')) out.push(full)
  }
  return out
}

describe('NFR-INT-ARTICLE-ID-NEVER-REUSED — numéro d’article tiré d’une séquence', () => {
  it('schema.sql : articles.id a pour défaut la séquence articles_id_seq', () => {
    expect(articlesTable(read('server/db/schema.sql')))
      .toMatch(/"id" INTEGER NOT NULL DEFAULT nextval\('articles_id_seq'::regclass\)/)
  })

  it('bootstrap.sql : la séquence est créée, attachée à articles.id et posée en défaut', () => {
    const bootstrap = read('server/db/bootstrap.sql')
    expect(bootstrap).toMatch(/CREATE SEQUENCE public\.articles_id_seq\b/)
    expect(bootstrap).toContain('ALTER SEQUENCE public.articles_id_seq OWNED BY public.articles.id;')
    expect(bootstrap).toContain(
      "ALTER TABLE ONLY public.articles ALTER COLUMN id SET DEFAULT nextval('public.articles_id_seq'::regclass);",
    )
  })

  it('aucun code ne calcule le numéro d’un article à la main', () => {
    const self = relative(ROOT, __filename)
    const fautifs: string[] = []
    for (const dir of ['server', 'scripts', 'tests', 'shared']) {
      for (const file of tsFiles(join(ROOT, dir))) {
        const rel = relative(ROOT, file)
        if (rel === self) continue
        const src = readFileSync(file, 'utf8')
        if (/MAX\(\s*id\s*\)[\s\S]{0,60}?FROM\s+articles\b/i.test(src)) fautifs.push(`${rel} (plus grand numéro + 1)`)
        if (/INSERT INTO articles\s*\(\s*id\s*,/i.test(src)) fautifs.push(`${rel} (numéro imposé à l’insertion)`)
      }
    }
    expect(fautifs.map(f => f.split(sep).join('/')), 'le numéro d’un article vient de la séquence de la base').toEqual([])
  })
})
