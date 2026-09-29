// @vitest-environment node
/**
 * D5 — les repères locaux (`{{zone_landmarks}}`) suivent la zone du client.
 *
 * Le référentiel `local_entities` décrit une zone (ses entités de type
 * « region » la nomment : Toulouse, Haute-Garonne…). Un client ailleurs ne
 * reçoit pas ces repères : mieux vaut aucun exemple local qu'un quartier
 * toulousain dans un article bordelais.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LocalEntity } from '../../../shared/types/local.types'

let location = ''
let entities: LocalEntity[] = []
vi.mock('../../../server/services/strategy/theme-config.service', () => ({
  getThemeConfig: async () => ({ avatar: { location } }),
}))
vi.mock('../../../server/services/infra/local-entities.service', () => ({
  getEntities: async () => entities,
}))

import { loadZoneContext } from '../../../server/services/strategy/prompt-context.service'

const TOULOUSE: LocalEntity[] = [
  { name: 'Toulouse', type: 'region', aliases: ['la Ville rose'] },
  { name: 'Haute-Garonne', type: 'region', aliases: [] },
  { name: 'Blagnac', type: 'quartier', aliases: [] },
  { name: 'Canal du Midi', type: 'lieu', aliases: [] },
  { name: 'Airbus', type: 'entreprise', aliases: [] },
]

describe('loadZoneContext — repères de la zone du client', () => {
  beforeEach(() => {
    entities = TOULOUSE
  })

  it('client à Toulouse : les repères du référentiel, sans les entreprises', async () => {
    location = 'Toulouse, France'
    const { zone, landmarks } = await loadZoneContext()
    expect(zone).toBe('Toulouse, France')
    expect(landmarks).toContain('Blagnac')
    expect(landmarks).toContain('Canal du Midi')
    expect(landmarks).not.toContain('Airbus')
  })

  it('la zone se reconnaît aussi par un autre nom (alias, accents, casse)', async () => {
    location = 'haute garonne'
    expect((await loadZoneContext()).landmarks).toContain('Blagnac')
  })

  it('client à Bordeaux avec le référentiel toulousain : aucun repère', async () => {
    location = 'Bordeaux, France'
    const { zone, landmarks } = await loadZoneContext()
    expect(zone).toBe('Bordeaux, France')
    expect(landmarks).toBe('')
  })

  it('une entité rattachée à une région n’est gardée que si la zone la nomme', async () => {
    entities = [
      ...TOULOUSE,
      { name: 'Chartrons', type: 'quartier', aliases: [], region: 'Bordeaux' },
    ]
    location = 'Bordeaux, France'
    const bordeaux = (await loadZoneContext()).landmarks
    expect(bordeaux).toContain('Chartrons')
    expect(bordeaux).not.toContain('Blagnac')

    location = 'Toulouse'
    const toulouse = (await loadZoneContext()).landmarks
    expect(toulouse).toContain('Blagnac')
    expect(toulouse).not.toContain('Chartrons')
  })

  it('sans zone configurée : aucun repère', async () => {
    location = ''
    expect((await loadZoneContext()).landmarks).toBe('')
  })
})
