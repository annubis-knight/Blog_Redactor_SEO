// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { join } from 'path'

// Controllable mock state shared with the hoisted mock factory below.
// `realRename` holds the actual fs rename so tests can bypass the mock
// when they want to fall through to the real filesystem.
const renameController = vi.hoisted(() => ({
  handler: null as null | ((src: string, dst: string, realRename: (s: string, d: string) => Promise<void>) => Promise<void>),
  callCount: 0,
  realRename: null as null | ((src: string, dst: string) => Promise<void>),
  realUnlink: null as null | ((path: string) => Promise<void>),
}))

// Mock fs/promises so we can intercept rename() — required because the production
// code uses tmp+rename and we need to simulate Windows EPERM/EBUSY locks.
vi.mock('fs/promises', async () => {
  const actual = await vi.importActual<typeof import('fs/promises')>('node:fs/promises')
  renameController.realRename = actual.rename
  renameController.realUnlink = actual.unlink
  const rename = async (src: string, dst: string) => {
    renameController.callCount++
    if (renameController.handler) {
      await renameController.handler(src, dst, actual.rename)
      return
    }
    await actual.rename(src, dst)
  }
  return { ...actual, rename, default: { ...actual, rename } }
})

const TEST_DIR = join(process.cwd(), 'tests', '.tmp')

beforeEach(() => {
  renameController.handler = null
  renameController.callCount = 0
})

describe('json-storage — rename retry under Windows-style locks', () => {
  it('retries rename after EPERM and succeeds on 3rd attempt', async () => {
    const { writeJson, readJson } = await import('../../../server/utils/json-storage.js')
    const file = join(TEST_DIR, `retry-eperm-${Date.now()}.json`)

    renameController.handler = async (src, dst, realRename) => {
      if (renameController.callCount <= 2) {
        const err = new Error('EPERM simulated') as NodeJS.ErrnoException
        err.code = 'EPERM'
        throw err
      }
      await realRename(src, dst)
    }

    await writeJson(file, { retried: true })
    expect(renameController.callCount).toBe(3)
    const result = await readJson<{ retried: boolean }>(file)
    expect(result.retried).toBe(true)

    await renameController.realUnlink?.(file).catch(() => {})
  })

  it('throws after 5 failed attempts on persistent lock', async () => {
    const { writeJson } = await import('../../../server/utils/json-storage.js')
    const file = join(TEST_DIR, `retry-ebusy-${Date.now()}.json`)

    renameController.handler = async () => {
      const err = new Error('EBUSY persistent') as NodeJS.ErrnoException
      err.code = 'EBUSY'
      throw err
    }

    await expect(writeJson(file, { x: 1 })).rejects.toThrow(/EBUSY/)
    expect(renameController.callCount).toBe(5)
  }, 10000)

  it('does not retry on non-lock errors (e.g. ENOSPC)', async () => {
    const { writeJson } = await import('../../../server/utils/json-storage.js')
    const file = join(TEST_DIR, `retry-enospc-${Date.now()}.json`)

    renameController.handler = async () => {
      const err = new Error('No space') as NodeJS.ErrnoException
      err.code = 'ENOSPC'
      throw err
    }

    await expect(writeJson(file, { y: 2 })).rejects.toThrow(/No space/)
    expect(renameController.callCount).toBe(1)
  })
})
