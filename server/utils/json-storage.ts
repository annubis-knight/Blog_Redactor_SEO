import { readFile, writeFile, rename, mkdir, unlink } from 'fs/promises'
import { dirname, basename } from 'path'
import { randomBytes } from 'crypto'
import { log } from './logger.js'

export async function readJson<T>(filePath: string): Promise<T> {
  log.debug(`readJson: ${basename(filePath)}`)
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  const suffix = randomBytes(6).toString('hex')
  const tmpPath = `${filePath}.${suffix}.tmp`
  await ensureDir(dirname(filePath))
  await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  try {
    await rename(tmpPath, filePath)
  } catch (err) {
    // Clean up orphaned tmp file on rename failure
    await unlink(tmpPath).catch(() => {})
    throw err
  }
  log.debug(`writeJson: ${basename(filePath)} saved`)
}

async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true })
}
