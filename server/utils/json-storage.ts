import { readFile, writeFile, rename, mkdir } from 'fs/promises'
import { dirname, basename } from 'path'
import { log } from './logger.js'

export async function readJson<T>(filePath: string): Promise<T> {
  log.debug(`readJson: ${basename(filePath)}`)
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  const tmpPath = `${filePath}.tmp`
  await ensureDir(dirname(filePath))
  await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  await rename(tmpPath, filePath)
  log.debug(`writeJson: ${basename(filePath)} saved`)
}

async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true })
}
