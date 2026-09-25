// @vitest-environment node
/**
 * FR-RED-LANG-REVIEW (T12) — la relecture de la langue.
 *
 * - Le prompt de relecture demande aussi de corriger la langue (anglicismes,
 *   accords, typographie), sans toucher ni aux chiffres, ni aux liens, ni aux
 *   marqueurs « à sourcer ».
 * - La simulation garde la structure exacte de la section : l'ancienne rendait
 *   le premier paragraphe seul, la route retombait toujours sur l'original, et
 *   la relecture ne faisait rien en mode simulé.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderPromptTemplate, escapePromptContent } from '../../../server/utils/prompt-loader'
import { streamFixtures } from '../../../server/services/external/mock-registry'
import '../../../server/services/external/mock-fixtures/index'
import { validateHtmlStructurePreserved } from '../../../shared/html-utils'

const TEMPLATE = readFileSync(join(__dirname, '..', '..', '..', 'server', 'prompts', 'humanize-section.md'), 'utf8')
const SECTION = '<h2>Trouver des clients</h2><p>En effet, vos leads arrivent par le bouche-à-oreille.</p><ul><li>Un avis</li><li>Un appel</li></ul><p>Selon <a href="https://www.insee.fr/a">l’Insee</a>, <mark data-a-sourcer>[à sourcer : part des TPE]</mark> hésitent.</p>'

function prompt(): string {
  return renderPromptTemplate(TEMPLATE, {
    sectionHtml: escapePromptContent(SECTION), sectionTitle: 'Trouver des clients', keyword: 'site vitrine', keywords: 'artisan', reinforcement: '',
  }).text
}

describe('relecture de la langue', () => {
  it('le prompt demande de corriger la langue, sans toucher aux chiffres, liens ni marqueurs', () => {
    const text = prompt()
    expect(text).toContain('## Relecture de la langue')
    expect(text).toMatch(/Anglicismes/)
    expect(text).toMatch(/Ne modifie ni les chiffres, ni les liens, ni les marqueurs/)
  })

  it('la simulation garde la structure exacte et corrige un anglicisme', () => {
    const fixture = streamFixtures.find(f => f.name === 'humanize-section')!
    const userPrompt = prompt()
    expect(streamFixtures.find(f => f.matcher({ systemPrompt: '', userPrompt }))?.name).toBe('humanize-section')
    const out = fixture.builder({ systemPrompt: '', userPrompt }) as string
    expect(validateHtmlStructurePreserved(SECTION, out).preserved).toBe(true)
    expect(out).toContain('<p>Vos prospects arrivent')
    expect(out).not.toContain('En effet')
    expect(out).toContain('href="https://www.insee.fr/a"')
    expect(out).toContain('data-a-sourcer')
  })
})
