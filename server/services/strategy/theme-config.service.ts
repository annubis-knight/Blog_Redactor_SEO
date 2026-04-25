import { pool } from '../../db/client.js'
import { themeConfigSchema } from '../../../shared/schemas/theme-config.schema.js'
import { log } from '../../utils/logger.js'
import type { ThemeConfig } from '../../../shared/types/index.js'

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
  const res = await pool.query(`SELECT data FROM theme_config WHERE id = 1`)
  if (res.rows.length === 0) {
    log.warn('getThemeConfig: not found, using defaults')
    return { ...DEFAULT_CONFIG }
  }
  log.debug('getThemeConfig: loaded')
  return themeConfigSchema.parse(res.rows[0].data)
}

export async function saveThemeConfig(config: ThemeConfig): Promise<ThemeConfig> {
  const validated = themeConfigSchema.parse(config)
  await pool.query(`
    INSERT INTO theme_config (id, data) VALUES (1, $1)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
  `, [JSON.stringify(validated)])
  log.info('saveThemeConfig: saved')
  return validated
}
