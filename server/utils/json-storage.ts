import { readFile, writeFile, rename, mkdir, unlink } from 'fs/promises'
import { dirname, basename } from 'path'
import { randomBytes } from 'crypto'
import { log } from './logger.js'

export async function readJson<T>(filePath: string): Promise<T> {
  log.debug(`readJson: ${basename(filePath)}`)
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

// Per-file write mutex: serialize concurrent writes to the same path.
// Without this, multiple callers can read the same file state, mutate in memory,
// and race on tmp+rename — causing lost updates.
const writeLocks = new Map<string, Promise<unknown>>()

export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  const prev = writeLocks.get(filePath) ?? Promise.resolve()
  const next = prev.then(() => writeJsonImpl(filePath, data))
  // Protect the chain from error propagation: next caller should not see a
  // rejected previous promise, otherwise the entire chain dies.
  const chain = next.catch(() => {})
  writeLocks.set(filePath, chain)
  try {
    await next
  } finally {
    // Clean up only if we're still the tail of the chain.
    if (writeLocks.get(filePath) === chain) writeLocks.delete(filePath)
  }
}

async function writeJsonImpl<T>(filePath: string, data: T): Promise<void> {
  const suffix = randomBytes(6).toString('hex')
  const tmpPath = `${filePath}.${suffix}.tmp`
  await ensureDir(dirname(filePath))
  await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  await renameWithRetry(tmpPath, filePath)
  log.debug(`writeJson: ${basename(filePath)} saved`)
}

// On Windows, fs.rename fails with EPERM/EBUSY/EACCES when the destination file
// is held open by another process (e.g. VS Code editor, antivirus scanner).
// Retry with exponential backoff; total max wait ≈ 1550 ms.
async function renameWithRetry(src: string, dst: string, maxAttempts = 5): Promise<void> {
  const delays = [50, 100, 200, 400, 800]
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await rename(src, dst)
      return
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      const isLock = code === 'EPERM' || code === 'EBUSY' || code === 'EACCES'
      const isLastAttempt = i === maxAttempts - 1
      if (!isLock || isLastAttempt) {
        await unlink(src).catch(() => {})
        if (isLock) {
          log.warn(`writeJson: file locked (${code}) on ${basename(dst)} — is it open in an IDE?`)
        }
        throw err
      }
      await new Promise(r => setTimeout(r, delays[i]))
    }
  }
}

async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true })
}
