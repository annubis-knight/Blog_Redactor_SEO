import { describe, it, expect, afterEach } from 'vitest'
import { readJson, writeJson } from '../../../server/utils/json-storage.js'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const TEST_DIR = join(process.cwd(), 'tests', '.tmp')
const TEST_FILE = join(TEST_DIR, 'test-data.json')

afterEach(async () => {
  try {
    if (existsSync(TEST_FILE)) await unlink(TEST_FILE)
    if (existsSync(`${TEST_FILE}.tmp`)) await unlink(`${TEST_FILE}.tmp`)
  } catch {
    // ignore cleanup errors
  }
})

describe('json-storage', () => {
  it('writeJson creates file with correct content', async () => {
    const data = { name: 'test', value: 42 }
    await writeJson(TEST_FILE, data)
    const result = await readJson<typeof data>(TEST_FILE)
    expect(result).toEqual(data)
  })

  it('writeJson overwrites existing file atomically', async () => {
    await writeJson(TEST_FILE, { version: 1 })
    await writeJson(TEST_FILE, { version: 2 })
    const result = await readJson<{ version: number }>(TEST_FILE)
    expect(result.version).toBe(2)
  })

  it('readJson throws on missing file', async () => {
    await expect(readJson('/nonexistent/file.json')).rejects.toThrow()
  })

  it('writeJson creates parent directories if needed', async () => {
    const nestedFile = join(TEST_DIR, 'nested', 'deep', 'file.json')
    await writeJson(nestedFile, { nested: true })
    const result = await readJson<{ nested: boolean }>(nestedFile)
    expect(result.nested).toBe(true)
    // cleanup
    const { rm } = await import('fs/promises')
    await rm(join(TEST_DIR, 'nested'), { recursive: true })
  })

  describe('concurrent writes (mutex)', () => {
    it('serializes 10 parallel writes without data loss — last write wins', async () => {
      // Fire 10 writeJson in parallel on the same path. Without mutex,
      // multiple callers can race on tmp+rename causing lost updates.
      const writes = Array.from({ length: 10 }, (_, i) =>
        writeJson(TEST_FILE, { seq: i }),
      )
      await Promise.all(writes)
      const result = await readJson<{ seq: number }>(TEST_FILE)
      // Last write must win deterministically (not a random intermediate value)
      expect(result.seq).toBe(9)
    })

    it('preserves every writer payload integrity under concurrency', async () => {
      // Each writer stores a unique payload. After all complete, file must
      // parse to ONE valid payload (no interleaved/corrupt JSON).
      const writes = Array.from({ length: 8 }, (_, i) =>
        writeJson(TEST_FILE, { writer: i, data: `payload-${i}` }),
      )
      await Promise.all(writes)
      const result = await readJson<{ writer: number; data: string }>(TEST_FILE)
      // Whatever the final writer is, data field must match its writer index
      expect(result.data).toBe(`payload-${result.writer}`)
    })
  })

})
