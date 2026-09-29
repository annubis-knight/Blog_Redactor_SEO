// @vitest-environment node
/**
 * NFR-COST-AI-MOCK — en mode simulé, le conseil IA du Capitaine reçoit sa
 * réponse préparée (un avis rédigé), pas la réponse par défaut.
 *
 * La réponse préparée `captain-ai-panel` cherchait « capitaine », « verdict »
 * ou « 6 KPI » dans le message utilisateur. Or la route du conseil envoie
 * seulement `Analyse le mot-clé "…" pour un article de niveau …` : la réponse
 * préparée ne répondait jamais, et l'écran affichait « [Mock provider] Réponse
 * simulée. ». Le parcours navigateur du conseil ne passait que par hasard.
 *
 * On rejoue ici l'appel réel : la consigne `capitaine-ai-panel.md` rendue, et le
 * message utilisateur tel que `server/routes/keyword-ai-panel.routes.ts` l'écrit.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { streamFixtures } from '../../../server/services/external/mock-registry'
import '../../../server/services/external/mock-fixtures/index'
import { renderPromptTemplate } from '../../../server/utils/prompt-loader.js'

const TEMPLATE = readFileSync(join(__dirname, '..', '..', '..', 'server', 'prompts', 'capitaine-ai-panel.md'), 'utf8')

/** L'appel du conseil, comme la route le construit. */
function conseil(keyword: string, level: string) {
  const systemPrompt = renderPromptTemplate(TEMPLATE, {
    keyword,
    level,
    painPoint: 'Les artisans ne sont pas trouvés sur Google',
    marketScore: '72/100',
    relevanceScore: '—',
  }).text
  const userPrompt = `Analyse le mot-clé "${keyword}" pour un article de niveau ${level}.`
  const fixture = streamFixtures.find(f => f.matcher({ systemPrompt, userPrompt }))
  return { systemPrompt, userPrompt, fixture }
}

describe('NFR-COST-AI-MOCK — le conseil IA du Capitaine a sa réponse préparée', () => {
  it.each(['pilier', 'intermediaire', 'specifique'])('niveau %s : la réponse préparée du Capitaine répond', (level) => {
    const { systemPrompt, userPrompt, fixture } = conseil('rénovation énergétique toulouse', level)
    expect(fixture?.name, 'la réponse préparée qui répond au conseil du Capitaine').toBe('captain-ai-panel')

    const text = fixture!.builder({ systemPrompt, userPrompt }) as string
    expect(text, 'le conseil nomme le mot-clé analysé').toContain('rénovation énergétique toulouse')
    expect(text, 'jamais la réponse par défaut').not.toContain('[Mock provider]')
  })
})
