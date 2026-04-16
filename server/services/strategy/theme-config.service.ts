import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { themeConfigSchema } from '../../../shared/schemas/theme-config.schema.js'
import { log } from '../../utils/logger.js'
import type { ThemeConfig } from '../../../shared/types/index.js'

const DATA_DIR = join(process.cwd(), 'data')
const CONFIG_FILE = join(DATA_DIR, 'theme-config.json')

const DEFAULT_CONFIG: ThemeConfig = {
  avatar: {
    sector: '',
    companySize: '',
    location: '',
    budget: '',
    digitalMaturity: '',
  },
  positioning: {
    targetAudience: '',
    mainPromise: '',
    differentiators: [],
    painPoints: [],
  },
  offerings: {
    services: [],
    mainCTA: '',
    ctaTarget: '',
  },
  toneOfVoice: {
    style: '',
    vocabulary: [],
  },
}

export async function getThemeConfig(): Promise<ThemeConfig> {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    log.debug('getThemeConfig: loaded')
    return themeConfigSchema.parse(parsed)
  } catch {
    log.warn('getThemeConfig: not found, using defaults')
    return { ...DEFAULT_CONFIG }
  }
}

export async function saveThemeConfig(config: ThemeConfig): Promise<ThemeConfig> {
  const validated = themeConfigSchema.parse(config)
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(CONFIG_FILE, JSON.stringify(validated, null, 2), 'utf-8')
  log.info('saveThemeConfig: saved')
  return validated
}
