// @vitest-environment node
/**
 * NFR-COST-AI-MOCK, FR-CAP-AI-PANEL — en mode simulé, le conseil IA du
 * Capitaine reçoit sa réponse préparée (un avis rédigé), pas la réponse par
 * défaut, et cet avis suit la consigne : trois parties, construites sur le
 * mot-clé, le niveau, la douleur et les deux scores de la demande.
 *
 * La réponse préparée `captain-ai-panel` cherchait « capitaine », « verdict »
 * ou « 6 KPI » dans le message utilisateur. Or la route du conseil envoie
 * seulement `Analyse le mot-clé "…" pour un article de niveau …` : la réponse
 * préparée ne répondait jamais, et l'écran affichait « [Mock provider] Réponse
 * simulée. ». Une fois déclenchée, elle rendait un « verdict » et six KPI aux
 * chiffres figés (« 6 600/mois », « Bon choix de pilier ») quel que soit le
 * mot-clé ou le niveau, au lieu des trois parties demandées.
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
import { parseContract } from '../../../shared/contracts/core'
import { aiAdviceContract } from '../../../shared/contracts/ai-advice.contract'

const TEMPLATE = readFileSync(join(__dirname, '..', '..', '..', 'server', 'prompts', 'capitaine-ai-panel.md'), 'utf8')

interface Demande {
  keyword: string
  level: string
  painPoint?: string
  marketScore?: string
  relevanceScore?: string
}

/** L'appel du conseil, comme la route le construit. */
function conseil({ keyword, level, painPoint = 'Les artisans ne sont pas trouvés sur Google', marketScore = '72/100', relevanceScore = '(non disponible)' }: Demande) {
  const systemPrompt = renderPromptTemplate(TEMPLATE, { keyword, level, painPoint, marketScore, relevanceScore }).text
  const userPrompt = `Analyse le mot-clé "${keyword}" pour un article de niveau ${level}.`
  const fixture = streamFixtures.find(f => f.matcher({ systemPrompt, userPrompt }))
  return { systemPrompt, userPrompt, fixture }
}

/** Le texte de l'avis, tel que la route le vérifie avant l'événement `done`. */
function avis(demande: Demande): string {
  const { systemPrompt, userPrompt, fixture } = conseil(demande)
  expect(fixture?.name, 'la réponse préparée qui répond au conseil du Capitaine').toBe('captain-ai-panel')
  const out = fixture!.builder({ systemPrompt, userPrompt })
  return parseContract(aiAdviceContract, typeof out === 'string' ? out : Array.isArray(out) ? out.join('') : out.text, 'server')
}

describe('NFR-COST-AI-MOCK — le conseil IA du Capitaine a sa réponse préparée', () => {
  it.each(['pilier', 'intermediaire', 'specifique'])('niveau %s : la réponse préparée du Capitaine répond', (level) => {
    const { systemPrompt, userPrompt, fixture } = conseil({ keyword: 'rénovation énergétique toulouse', level, relevanceScore: '—' })
    expect(fixture?.name, 'la réponse préparée qui répond au conseil du Capitaine').toBe('captain-ai-panel')

    const text = fixture!.builder({ systemPrompt, userPrompt }) as string
    expect(text, 'le conseil nomme le mot-clé analysé').toContain('rénovation énergétique toulouse')
    expect(text, 'jamais la réponse par défaut').not.toContain('[Mock provider]')
  })
})

describe('FR-CAP-AI-PANEL — l’avis simulé suit la consigne et la demande', () => {
  it('trois parties dans l’ordre : potentiel éditorial, opportunités et risques, recommandation', () => {
    const text = avis({ keyword: 'isolation combles perdus', level: 'pilier' })
    const parties = ['Potentiel éditorial', 'Opportunités et risques', 'Recommandation'].map(p => text.indexOf(p))
    expect(parties.every(i => i >= 0), `les trois parties de la consigne :\n${text}`).toBe(true)
    expect([...parties].sort((a, b) => a - b)).toEqual(parties)
  })

  it('aucun chiffre figé ni score brut : l’avis analyse, il ne recopie pas', () => {
    const text = avis({ keyword: 'isolation combles perdus', level: 'pilier', marketScore: '72/100', relevanceScore: '41/100' })
    expect(text).not.toMatch(/6 600|6,91|Bon choix de pilier/)
    expect(text, 'la consigne interdit de citer les scores bruts').not.toMatch(/72|41/)
  })

  it('le niveau change l’avis : un pilier n’est pas un spécifique', () => {
    const pilier = avis({ keyword: 'isolation combles perdus', level: 'pilier' })
    const specifique = avis({ keyword: 'isolation combles perdus', level: 'specifique' })
    expect(pilier).toMatch(/pilier/i)
    expect(specifique).toMatch(/spécifique/i)
    expect(pilier).not.toBe(specifique)
  })

  it('la douleur de l’article est le fil rouge ; sans douleur, l’avis part de l’intention de recherche', () => {
    expect(avis({ keyword: 'prix isolation combles', level: 'intermediaire', painPoint: 'Les propriétaires ont peur de se faire arnaquer' }))
      .toContain('Les propriétaires ont peur de se faire arnaquer')
    expect(avis({ keyword: 'prix isolation combles', level: 'intermediaire', painPoint: '(non défini)' }))
      .toMatch(/intention de recherche/)
  })

  it('les deux scores qui divergent donnent le profil nommé par la consigne', () => {
    expect(avis({ keyword: 'isolation', level: 'pilier', marketScore: '85/100', relevanceScore: '40/100' })).toMatch(/piège trafic/)
    expect(avis({ keyword: 'isolation combles perdus 31', level: 'specifique', marketScore: '30/100', relevanceScore: '80/100' })).toMatch(/longue-traîne pertinente/)
    const proches = avis({ keyword: 'isolation combles perdus', level: 'pilier', marketScore: '70/100', relevanceScore: '75/100' })
    expect(proches).not.toMatch(/piège trafic|longue-traîne pertinente/)
  })
})
