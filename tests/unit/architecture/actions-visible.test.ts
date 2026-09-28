// @vitest-environment node
/**
 * NFR-UX-ACTIONS-VISIBLE — un bouton utilisable est visible.
 *
 * Les boutons « Plus d'actions » et « Supprimer » d'une carte de la carte
 * indicative partaient à `opacity: 0`, et la règle censée les révéler au survol
 * de la carte, écrite dans le composant des actions, ne s'appliquait jamais :
 * `:deep(.proposal-item:hover) .proposal-action-btn` compile en
 * `[data-v-x] .proposal-item:hover .proposal-action-btn`, qui exige qu'un élément
 * du composant CONTIENNE la carte, alors que la carte est son parent.
 *
 * Deux gardes :
 *  - aucun sélecteur d'un style `scoped` ne commence par `:deep(` (il ne vise que
 *    l'intérieur du composant ; pour réagir à l'état d'un parent, la règle va dans
 *    le parent : `.parent:hover :deep(.enfant)`) ;
 *  - la carte (`ProposedArticleRow.vue`) révèle ses actions au survol et au clavier,
 *    vérifié sur le CSS compilé par Vue.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse, compileStyle } from '@vue/compiler-sfc'

const ROOT = join(__dirname, '..', '..', '..')

function vueFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) vueFiles(full, out)
    else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
}

/** Sélecteurs d'un bloc CSS commençant par `:deep(`, avec leur ligne dans le fichier. */
function leadingDeepSelectors(css: string, firstLine: number): Array<{ line: number; selector: string }> {
  const found: Array<{ line: number; selector: string }> = []
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
  for (const rule of withoutComments.matchAll(/([^{}]+)\{/g)) {
    const prelude = rule[1]!
    if (prelude.trim().startsWith('@')) continue
    let offset = rule.index!
    for (const part of prelude.split(',')) {
      const selector = part.trim()
      if (selector.startsWith(':deep(')) {
        const at = offset + part.indexOf(selector)
        found.push({ line: firstLine + withoutComments.slice(0, at).split('\n').length - 1, selector })
      }
      offset += part.length + 1
    }
  }
  return found
}

function compiledScopedCss(file: string): string {
  const source = readFileSync(join(ROOT, file), 'utf8')
  const { descriptor } = parse(source, { filename: file })
  return descriptor.styles
    .map(style => compileStyle({ source: style.content, id: 'data-v-test', scoped: style.scoped, filename: file }).code)
    .join('\n')
}

describe('NFR-UX-ACTIONS-VISIBLE — un bouton utilisable est visible', () => {
  it('aucun sélecteur d\'un style scoped ne commence par :deep( (il ne s\'appliquerait jamais à un parent)', () => {
    const offenders: string[] = []
    for (const file of vueFiles(join(ROOT, 'src'))) {
      const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file })
      for (const style of descriptor.styles.filter(s => s.scoped)) {
        for (const { line, selector } of leadingDeepSelectors(style.content, style.loc.start.line)) {
          offenders.push(`${relative(ROOT, file).replaceAll('\\', '/')}:${line} — ${selector}`)
        }
      }
    }
    expect(
      offenders,
      'Sélecteur scoped qui commence par :deep( : il ne vise que l\'intérieur du composant. ' +
        'Pour réagir à l\'état d\'un parent, écris la règle dans le parent (.parent:hover :deep(.enfant)).\n' +
        offenders.join('\n'),
    ).toEqual([])
  })

  it('la carte indicative révèle ses actions au survol et au focus clavier', () => {
    const css = compiledScopedCss('src/components/strategy/ProposedArticleRow.vue')
    // Vue place l'attribut de portée avant ou après la pseudo-classe selon la version.
    const reveals = (state: string) =>
      new RegExp(
        `\\.proposal-item(?:\\[data-v-test\\])?:${state}(?:\\[data-v-test\\])? \\.proposal-action-btn[^{]*\\{[^}]*opacity:\\s*1`,
      ).test(css)
    expect(reveals('hover'), 'aucune règle de ProposedArticleRow ne révèle les actions au survol de la carte').toBe(true)
    expect(reveals('focus-within'), 'aucune règle de ProposedArticleRow ne révèle les actions au focus clavier').toBe(true)
  })

  it('sentinelle : un :deep( en tête de sélecteur est repéré, un :deep( après un parent ne l\'est pas', () => {
    const css = '.a { color: red }\n:deep(.b:hover) .c { opacity: 1 }\n.d:hover :deep(.e) { opacity: 1 }\n.f, :deep(.g) .h { x: y }'
    expect(leadingDeepSelectors(css, 1).map(f => f.line)).toEqual([2, 4])
  })
})
