// @vitest-environment node
/**
 * NFR-COST-AI-MOCK — en mode simulé, deux appels de la préparation et de la
 * retouche d'un article reçoivent une réponse préparée que le code accepte :
 *
 *   - FR-CER-MICRO-CONTEXT : « Suggérer par IA » rendait des consignes en liste,
 *     alors que l'enregistrement du micro-contexte attend un texte
 *     (`updateMicroContextSchema`) : l'enregistrement était refusé sans message.
 *   - FR-RED-REDUCE-SECTION : la réduction ne reconnaissait pas sa consigne
 *     (`reduce-section.md`) : chaque section devenait le texte générique, sans
 *     ses titres, et l'article était enregistré ainsi.
 *
 * Chaque test rejoue l'appel réel (consigne rendue par `loadPrompt` avec les
 * variables de la route, message utilisateur de la route), puis ce que le code
 * fait de la réponse.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { streamFixtures } from '../../../server/services/external/mock-registry'
import '../../../server/services/external/mock-fixtures/index'
import { loadPrompt, renderPromptTemplate } from '../../../server/utils/prompt-loader'
import { updateMicroContextSchema } from '../../../shared/schemas/article-micro-context.schema'
import { validateHtmlStructurePreserved } from '../../../shared/html-utils'
import { countWordsFromHtml } from '../../../src/utils/text-utils'

/** La réponse préparée choisie pour cet appel, et son texte. */
function repondre(systemPrompt: string, userPrompt: string, attendue: string): string {
  const fixture = streamFixtures.find(f => f.matcher({ systemPrompt, userPrompt }))
  expect(fixture?.name, 'la réponse préparée choisie pour cet appel').toBe(attendue)
  const out = fixture!.builder({ systemPrompt, userPrompt })
  const text = typeof out === 'string' ? out : Array.isArray(out) ? out.join('') : out.text
  expect(text).not.toContain('[Mock provider]')
  return text
}

// ---------------------------------------------------------------------------
// Micro-contexte — POST /api/generate/micro-context-suggest
// ---------------------------------------------------------------------------

async function suggestionMicroContexte(articleTitle: string, keyword: string, articleType: string) {
  const systemPrompt = await loadPrompt('micro-context-suggest', {
    articleTitle,
    articleType,
    keyword,
    cocoonName: 'Isolation de la maison',
    siloName: 'Rénovation',
    themeConfig: 'Non disponible',
  })
  const userPrompt = `Suggère un micro-contexte (angle, ton, consignes) pour l'article "${articleTitle}" (mot-clé: ${keyword}).`
  const text = repondre(systemPrompt, userPrompt, 'micro-context-suggest')
  // Lecture de la route : blocs de code retirés, puis JSON.
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  return JSON.parse(cleaned) as Record<string, unknown>
}

describe('FR-CER-MICRO-CONTEXT — la suggestion simulée du micro-contexte s’enregistre', () => {
  it('angle, ton et consignes sont des textes, et l’enregistrement les accepte', async () => {
    const suggestion = await suggestionMicroContexte('Isoler ses combles perdus', 'isolation combles perdus', 'Pilier')
    expect(Object.keys(suggestion).sort(), 'la forme du prompt').toEqual(['angle', 'directives', 'tone'])
    // Ce que « Appliquer » envoie à PUT /articles/:id/micro-context.
    const saved = updateMicroContextSchema.safeParse({ angle: suggestion.angle, tone: suggestion.tone, directives: suggestion.directives })
    expect(saved.success, JSON.stringify(saved.error?.issues)).toBe(true)
    for (const champ of ['angle', 'tone', 'directives'] as const) expect(String(suggestion[champ]).trim(), champ).not.toBe('')
  })

  it('la suggestion parle de l’article demandé et s’adapte à son type', async () => {
    const pilier = await suggestionMicroContexte('Isoler ses combles perdus', 'isolation combles perdus', 'Pilier')
    const specialise = await suggestionMicroContexte('Quelle épaisseur de laine de verre ?', 'épaisseur laine de verre combles', 'Spécialisé')
    expect(pilier.angle).toContain('isolation combles perdus')
    expect(specialise.angle).toContain('épaisseur laine de verre combles')
    expect(pilier.tone).not.toBe(specialise.tone)
  })

  it('un article dont le titre cite « radar » ou « lexique » reçoit bien son micro-contexte', async () => {
    const suggestion = await suggestionMicroContexte('Radar de recul et lexique du garagiste', 'radar de recul', 'Intermédiaire')
    expect(suggestion.angle).toContain('radar de recul')
  })
})

// ---------------------------------------------------------------------------
// Réduction — POST /api/generate/reduce-section
// ---------------------------------------------------------------------------

const SYSTEM = renderPromptTemplate(readFileSync(join(__dirname, '..', '..', '..', 'server', 'prompts', 'system-propulsite.md'), 'utf8'), {
  today: '29 septembre 2026', year: '2026', zone: 'Toulouse', zone_landmarks: 'Capitole, Compans-Caffarelli',
}).text

async function reduire(sectionHtml: string, sectionTitle: string, targetWordCount: number) {
  const userPrompt = await loadPrompt('reduce-section', {
    sectionHtml,
    sectionTitle,
    targetWordCount: String(targetWordCount),
    currentWordCount: String(countWordsFromHtml(sectionHtml)),
    keyword: 'isolation combles perdus',
    keywords: 'laine de verre, soufflage',
    strategyContext: 'Aucun contexte stratégique disponible.',
  }, { escapeKeys: ['sectionHtml'] })
  return repondre(SYSTEM, userPrompt, 'reduce-section').trim()
}

const SECTION = [
  '<h2>Choisir son isolant</h2>',
  '<p>Il est important de noter que la laine de verre reste l’isolant le plus posé en France. Elle coûte peu et se souffle vite. Par ailleurs, elle résiste bien au feu. Elle tasse pourtant avec les années.</p>',
  '<h3>La laine de verre soufflée</h3>',
  '<p>En effet, le soufflage couvre les recoins difficiles. Un artisan traite 80 m² dans la journée. Le chantier ne salit presque pas la maison. Il faut seulement dégager l’accès aux combles.</p>',
  '<ul><li>Prix contenu</li><li>Pose rapide</li></ul>',
  '<p>Selon <a href="https://www.ademe.fr/isolation">l’Ademe</a>, un comble mal isolé fait perdre 30 % de la chaleur.</p>',
].join('')

describe('FR-RED-REDUCE-SECTION — la réduction simulée condense la section reçue', () => {
  it('les titres, listes et liens restent, et la section raccourcit', async () => {
    const out = await reduire(SECTION, 'Choisir son isolant', 60)
    expect(validateHtmlStructurePreserved(SECTION, out).preserved, out).toBe(true)
    expect(out).toContain('<h2>Choisir son isolant</h2>')
    expect(out).toContain('<h3>La laine de verre soufflée</h3>')
    expect(out).toContain('href="https://www.ademe.fr/isolation"')
    expect(countWordsFromHtml(out)).toBeLessThan(countWordsFromHtml(SECTION))
    expect(out).not.toMatch(/Il est important de noter que|En effet,|Contenu réduit|Version condensée/)
  })

  it('le chapeau (sans titre) se réduit aussi, sans titre inventé', async () => {
    const chapeau = '<p>Vos combles laissent filer la chaleur. Chaque hiver, la facture grimpe. Pourtant, une isolation bien posée se rentabilise vite. Voici comment choisir.</p>'
    const out = await reduire(chapeau, 'Introduction', 12)
    expect(out).not.toMatch(/<h[1-6]/)
    expect(out.startsWith('<p>')).toBe(true)
    expect(countWordsFromHtml(out)).toBeLessThan(countWordsFromHtml(chapeau))
  })

  it('une section qui parle de lexique, de radar ou de méta reste une réduction', async () => {
    const seo = '<h2>Soigner sa méta</h2><p>Le lexique TF-IDF et le radar de mots-clés guident la meta description. Elle doit rester courte. Elle doit aussi donner envie de cliquer.</p>'
    const out = await reduire(seo, 'Soigner sa méta', 15)
    expect(out).toContain('<h2>Soigner sa méta</h2>')
    expect(countWordsFromHtml(out)).toBeLessThan(countWordsFromHtml(seo))
  })
})
