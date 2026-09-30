/**
 * FR-CAP-LOCK-INTEGRITY — une racine n'est jamais un candidat d'office.
 *
 * Recette du 2026-09-30 : afficher une racine l'enregistrait comme candidat, et
 * la liste du Capitaine se reconstruisait avec la racine en carte à part.
 * `candidatesFromHistory` écarte d'un historique d'études celles qui sont la
 * racine d'un autre candidat (valideur lancé par `npm run verify`).
 */
import { describe, it, expect } from 'vitest'
import { candidatesFromHistory } from '../../../shared/captain-candidates.js'
import type { CaptainScanEntry } from '../../../shared/types/keyword.types.js'

const PARENT = 'prix creation site internet toulouse'
const ROOT = 'prix creation site internet'

const HISTORY: CaptainScanEntry[] = [
  { keyword: PARENT, kpis: [{ name: 'volume', rawValue: 673000 }], articleLevel: 'intermediaire', rootKeywords: [ROOT] },
  { keyword: ROOT, kpis: [{ name: 'volume', rawValue: 550000 }], articleLevel: 'intermediaire', rootKeywords: [] },
  { keyword: 'agence web toulouse', kpis: [{ name: 'volume', rawValue: 1200 }], articleLevel: 'intermediaire', rootKeywords: [] },
]

describe('FR-CAP-LOCK-INTEGRITY — candidatesFromHistory', () => {
  it('écarte l’étude qui est la racine d’un autre candidat', () => {
    expect(candidatesFromHistory(HISTORY).map(h => h.keyword)).toEqual([PARENT, 'agence web toulouse'])
  })

  it('compare sans tenir compte de la casse ni des espaces', () => {
    const history: CaptainScanEntry[] = [
      { ...HISTORY[0]!, rootKeywords: [` ${ROOT.toUpperCase()} `] },
      HISTORY[1]!,
    ]
    expect(candidatesFromHistory(history).map(h => h.keyword)).toEqual([PARENT])
  })

  it('garde un candidat qui n’est la racine d’aucun autre, et ne se retire pas lui-même', () => {
    const selfRoot: CaptainScanEntry = { ...HISTORY[2]!, rootKeywords: ['agence web toulouse'] }
    expect(candidatesFromHistory([selfRoot])).toHaveLength(1)
  })
})
