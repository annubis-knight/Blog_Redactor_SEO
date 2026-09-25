/**
 * AUTHORITY: PostgreSQL `theme_config.data.avatar.location` (zone) + `local_entities` (repères)
 * READS FROM: getThemeConfig, getEntities
 * WRITES TO: rien
 * CONSUMERS: loadPrompt (variables globales {{today}}, {{year}}, {{zone}}, {{zone_landmarks}})
 * RELATED FR: FR-INFRA-PROMPT-LAYERS
 *
 * Couche « contexte » des prompts : ce qui ne doit jamais être écrit en dur
 * dans un `.md` (la date du jour, la zone du client, ses repères locaux).
 */
import { log } from '../../utils/logger.js'
import { getThemeConfig } from './theme-config.service.js'
import { getEntities } from '../infra/local-entities.service.js'

/** « 25 septembre 2026 », heure de Paris. */
export function formatFrenchDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(date)
}

export function currentYear(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { year: 'numeric', timeZone: 'Europe/Paris' }).format(date)
}

// Les entreprises de la table ne sont pas proposées : un exemple qui les cite
// inviterait l'IA à leur prêter des faits qu'elle ne connaît pas.
const LANDMARK_GROUPS: Array<{ type: string; label: string }> = [
  { type: 'region', label: 'Autres noms de la zone' },
  { type: 'quartier', label: 'Quartiers et communes' },
  { type: 'lieu', label: 'Lieux connus' },
]

interface ZoneContext {
  zone: string
  landmarks: string
}

/** Zone du client et repères locaux ; vides si la base ne répond pas. */
export async function loadZoneContext(): Promise<ZoneContext> {
  const [config, entities] = await Promise.all([
    getThemeConfig().catch((err: Error) => {
      log.warn(`loadZoneContext: configuration illisible — ${err.message}`)
      return null
    }),
    getEntities().catch((err: Error) => {
      log.warn(`loadZoneContext: entités locales illisibles — ${err.message}`)
      return []
    }),
  ])
  const zone = config?.avatar?.location?.trim() ?? ''
  const landmarks = LANDMARK_GROUPS
    .map(({ type, label }) => {
      const names = entities.filter(e => e.type === type).map(e => e.name)
      return names.length ? `${label} : ${names.join(', ')}` : ''
    })
    .filter(Boolean)
    .join('\n')
  return { zone, landmarks }
}
