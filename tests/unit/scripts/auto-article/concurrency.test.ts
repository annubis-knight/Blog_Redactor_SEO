import { describe, it, expect } from 'vitest'
import { mapLimit } from '../../../../scripts/auto-article/concurrency.js'

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

describe('auto:concurrency — mapLimit', () => {
  it('préserve l\'ordre d\'entrée malgré des durées inégales', async () => {
    const out = await mapLimit([30, 5, 20, 1], 2, async (ms, i) => {
      await sleep(ms)
      return i
    })
    expect(out).toEqual([0, 1, 2, 3])
  })

  it('ne dépasse jamais la concurrence demandée', async () => {
    let active = 0
    let peak = 0
    await mapLimit(Array.from({ length: 10 }, (_, i) => i), 3, async () => {
      active++
      peak = Math.max(peak, active)
      await sleep(5)
      active--
      return null
    })
    expect(peak).toBeLessThanOrEqual(3)
  })

  it('traite bien tous les éléments', async () => {
    const out = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => n * 2)
    expect(out).toEqual([2, 4, 6, 8, 10])
  })

  it('gère une liste vide', async () => {
    expect(await mapLimit([], 3, async (n) => n)).toEqual([])
  })

  it('tolère une limite absurde', async () => {
    expect(await mapLimit([1, 2], 0, async (n) => n)).toEqual([1, 2])
  })

  it('propage une erreur', async () => {
    await expect(
      mapLimit([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom')
        return n
      }),
    ).rejects.toThrow('boom')
  })
})
