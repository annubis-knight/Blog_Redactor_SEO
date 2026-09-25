// @vitest-environment node
/**
 * FR-INFRA-PROMPT-LAYERS — aucune année ni aucun lieu écrit en dur ; des
 * exemples fictifs qu'on ne peut pas recopier.
 *
 * Le pilier 1013 citait « la Vendée », des chiffres « de 2024 » ; l'IA du
 * Cerveau a recopié deux fois l'exemple de `cocoon-articles.md` (le slug
 * `strategie-digitale-entreprises-toulouse`, celui du 1013). La date du jour
 * et la zone viennent du contexte (`{{year}}`, `{{zone}}`, `{{zone_landmarks}}`).
 *
 * En situation : Arnaud crée un cocon pour un client à Bordeaux. Aucun texte
 * généré ne cite un quartier de Toulouse, et aucun n'annonce « en 2024 ».
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

vi.mock('../../../server/services/strategy/theme-config.service', () => ({
  getThemeConfig: async () => ({ avatar: { location: 'Bordeaux, France' } }),
}))
vi.mock('../../../server/services/infra/local-entities.service', () => ({
  getEntities: async () => [
    { name: 'Chartrons', type: 'quartier', aliases: [] },
    { name: 'Gironde', type: 'region', aliases: [] },
  ],
}))

import { loadPrompt } from '../../../server/utils/prompt-loader'

const ROOT = join(__dirname, '..', '..', '..')
const PROMPTS = join(ROOT, 'server/prompts')

// Lieux de la zone d'origine de l'outil et grandes villes citées en exemple.
const PLACE = /toulous|blagnac|occitanie|haute[- ]garonne|lafourguette|saint[- ]simon|st simon|croix de pierre|zone thibaud|route d'espagne|garonne|capitole|vend[ée]e|\blyon\b|bordeaux|\bparis\b|marseille|nantes|\blille\b/i
const YEAR = /\b20\d{2}\b/

function promptFiles(dir = PROMPTS, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) promptFiles(full, out)
    else if (entry.name.endsWith('.md')) out.push(full)
  }
  return out
}

function offending(pattern: RegExp): string[] {
  return promptFiles().flatMap(file => readFileSync(file, 'utf8').split('\n')
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => pattern.test(line))
    .map(({ line, i }) => `${relative(ROOT, file)}:${i + 1} — ${line.trim().slice(0, 140)}`))
}

describe('aucune année ni aucun lieu écrit en dur dans les prompts', () => {
  it('aucune année', () => {
    const found = offending(YEAR)
    expect(found, found.join('\n')).toEqual([])
  })

  it('aucun lieu', () => {
    const found = offending(PLACE)
    expect(found, found.join('\n')).toEqual([])
  })

  it('le prompt en ligne de l’analyse d’écart ne cite pas de région', () => {
    const source = readFileSync(join(ROOT, 'server/services/article/content-gap.service.ts'), 'utf8')
    expect(source).not.toMatch(/toulous|occitanie/i)
  })
})

describe('la zone et l’année viennent du contexte', () => {
  it('client à Bordeaux : l’identité parle de Bordeaux, jamais de Toulouse, et seulement de l’année en cours', async () => {
    const text = await loadPrompt('system-propulsite')
    expect(text).toContain('Bordeaux, France')
    expect(text).toContain('Chartrons')
    expect(text).not.toMatch(/toulous|blagnac|lafourguette/i)
    const years = [...text.matchAll(/\b20\d{2}\b/g)].map(m => m[0])
    expect(new Set(years)).toEqual(new Set(years.length ? [String(new Date().getFullYear())] : []))
  })
})

describe('les exemples ne se recopient pas', () => {
  it('l’exemple du pilier 1013 a disparu du prompt de structure', () => {
    const text = readFileSync(join(PROMPTS, 'cocoon-articles.md'), 'utf8')
    expect(text).not.toContain('strategie-digitale-entreprises-toulouse')
    expect(text).not.toMatch(/Propulser la croissance digitale/i)
    expect(text, 'la consigne interdit de recopier un exemple').toMatch(/ne recopie jamais/i)
  })
})
