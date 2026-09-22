// @vitest-environment node
/**
 * Noyau des contrats d'affichage (NFR-INT-DISPLAY-CONTRACTS).
 * Temps « mise en format » de la grille en 8 temps : une réponse brute est mise
 * dans la forme attendue par l'écran, ou refusée proprement.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import {
  defineContract,
  parseContract,
  setContractReporter,
  ContractViolationError,
  kpiValue,
  count,
  text,
  oneOf,
  tolerantArray,
  optionalObject,
  type ContractEvent,
} from '../../../../shared/contracts/core.js'

let events: ContractEvent[]

beforeEach(() => {
  events = []
  setContractReporter(e => events.push(e))
})

afterEach(() => {
  setContractReporter(() => {})
})

function parseField<T>(schema: z.ZodType<T, unknown>, value: unknown): T {
  const contract = defineContract('test', z.object({ v: schema }))
  return parseContract(contract, { v: value }, 'client').v
}

describe('kpiValue — une donnée absente reste absente, jamais 0', () => {
  it('garde un nombre fini, y compris un vrai zéro', () => {
    expect(parseField(kpiValue('v'), 480)).toBe(480)
    expect(parseField(kpiValue('v'), 0)).toBe(0)
    expect(events).toHaveLength(0)
  })

  it('null et undefined donnent null, sans alerte (absence légitime)', () => {
    expect(parseField(kpiValue('v'), null)).toBeNull()
    expect(parseField(kpiValue('v'), undefined)).toBeNull()
    expect(events).toHaveLength(0)
  })

  it('convertit une chaîne numérique (colonne NUMERIC de PostgreSQL)', () => {
    expect(parseField(kpiValue('v'), '20.87')).toBe(20.87)
    expect(events).toHaveLength(0)
  })

  it('texte, NaN et Infinity deviennent null et sont signalés', () => {
    expect(parseField(kpiValue('v'), 'abc')).toBeNull()
    expect(parseField(kpiValue('v'), Number.NaN)).toBeNull()
    expect(parseField(kpiValue('v'), Number.POSITIVE_INFINITY)).toBeNull()
    expect(events).toHaveLength(3)
    expect(events[0]).toMatchObject({ contract: 'test', boundary: 'client', kind: 'coerced', field: 'v' })
  })
})

describe('count — un compteur', () => {
  it('garde un entier positif ou nul', () => {
    expect(parseField(count('v'), 3)).toBe(3)
    expect(parseField(count('v'), 0)).toBe(0)
  })

  it('une valeur invalide donne 0 et est signalée', () => {
    expect(parseField(count('v'), -2)).toBe(0)
    expect(parseField(count('v'), 'x')).toBe(0)
    expect(events.map(e => e.kind)).toEqual(['coerced', 'coerced'])
  })
})

describe('text et oneOf — les champs de présentation ont un repli neutre', () => {
  it('text garde une chaîne et replie le reste', () => {
    expect(parseField(text('v', '—'), 'KD 42')).toBe('KD 42')
    expect(parseField(text('v', '—'), 42)).toBe('—')
    expect(events).toHaveLength(1)
  })

  it('oneOf garde une valeur connue et replie une inconnue', () => {
    const color = oneOf(['green', 'red', 'neutral'] as const, 'neutral', 'v')
    expect(parseField(color, 'green')).toBe('green')
    expect(parseField(color, 'purple')).toBe('neutral')
    expect(events).toHaveLength(1)
  })
})

describe('tolerantArray — un élément cassé ne fait pas tomber la liste', () => {
  const item = z.object({ question: z.string().min(1) })

  it('garde les éléments valides et écarte les autres en les signalant', () => {
    const out = parseField(tolerantArray(item, 'v'), [
      { question: 'Combien coûte un site ?' },
      { question: '' },
      42,
      { question: 'Quel délai ?' },
    ])
    expect(out.map(q => q.question)).toEqual(['Combien coûte un site ?', 'Quel délai ?'])
    expect(events.filter(e => e.kind === 'dropped')).toHaveLength(2)
  })

  it('absence → liste vide sans alerte ; autre chose qu’une liste → liste vide signalée', () => {
    expect(parseField(tolerantArray(item, 'v'), undefined)).toEqual([])
    expect(events).toHaveLength(0)
    expect(parseField(tolerantArray(item, 'v'), 'pas une liste')).toEqual([])
    expect(events).toHaveLength(1)
  })
})

describe('optionalObject — un sous-objet cassé devient absent, pas faux', () => {
  const score = z.object({ total: z.number() })

  it('garde un objet conforme, null et undefined tels quels', () => {
    expect(parseField(optionalObject(score, 'v'), { total: 72 })).toEqual({ total: 72 })
    expect(parseField(optionalObject(score, 'v'), null)).toBeNull()
    expect(parseField(optionalObject(score, 'v'), undefined)).toBeUndefined()
    expect(events).toHaveLength(0)
  })

  it('un objet non conforme devient undefined et est signalé', () => {
    expect(parseField(optionalObject(score, 'v'), { total: 'soixante' })).toBeUndefined()
    expect(events).toHaveLength(1)
    expect(events[0]!.kind).toBe('dropped')
  })
})

describe('parseContract — refus propre d’une réponse inutilisable', () => {
  const contract = defineContract('scan', z.object({ keyword: z.string().min(1) }))

  it('renvoie la donnée mise en forme', () => {
    expect(parseContract(contract, { keyword: 'création site web' }, 'server')).toEqual({
      keyword: 'création site web',
    })
  })

  it('lève ContractViolationError avec le détail, et le signale', () => {
    expect(() => parseContract(contract, { keyword: '' }, 'server')).toThrow(ContractViolationError)
    expect(() => parseContract(contract, 'pas un objet', 'server')).toThrow(/scan/)
    expect(events.filter(e => e.kind === 'rejected')).toHaveLength(2)
    expect(events[0]).toMatchObject({ contract: 'scan', boundary: 'server' })
  })

  it('les signalements portent le nom du contrat en cours, même imbriqués', () => {
    const outer = defineContract('outer', z.object({ v: kpiValue('v') }))
    parseContract(outer, { v: 'abc' }, 'db')
    expect(events[0]).toMatchObject({ contract: 'outer', boundary: 'db' })
  })
})

describe('parseContractList — une entrée abîmée ne bloque pas les autres', async () => {
  const { parseContractList } = await import('../../../../shared/contracts/core.js')
  const contract = defineContract('liste', z.object({ keyword: z.string().min(1) }))

  it('garde les entrées conformes, écarte et signale les autres', () => {
    const out = parseContractList(contract, [{ keyword: 'a' }, { keyword: '' }, { keyword: 'b' }], 'db')
    expect(out).toEqual([{ keyword: 'a' }, { keyword: 'b' }])
    expect(events.filter(e => e.kind === 'rejected')).toHaveLength(1)
  })
})

describe('tolerantRecord — un dictionnaire dont une entrée cassée ne fait pas tomber les autres', async () => {
  const { tolerantRecord } = await import('../../../../shared/contracts/core.js')
  const item = z.object({ score: z.number() })

  it('garde les entrées conformes, écarte les autres en les signalant', () => {
    const out = parseField(tolerantRecord(item, 'v'), { a: { score: 1 }, b: { score: 'x' }, c: { score: 3 } })
    expect(out).toEqual({ a: { score: 1 }, c: { score: 3 } })
    expect(events.filter(e => e.kind === 'dropped')).toHaveLength(1)
  })

  it('absence → dictionnaire vide sans alerte ; liste ou texte → vide signalé', () => {
    expect(parseField(tolerantRecord(item, 'v'), undefined)).toEqual({})
    expect(events).toHaveLength(0)
    expect(parseField(tolerantRecord(item, 'v'), [1, 2])).toEqual({})
    expect(events).toHaveLength(1)
  })
})
