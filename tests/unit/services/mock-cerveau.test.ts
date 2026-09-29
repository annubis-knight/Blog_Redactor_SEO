// @vitest-environment node
/**
 * NFR-COST-AI-MOCK — en mode simulé, chaque appel du Cerveau reçoit la réponse
 * préparée qui lui correspond, dans la forme que l'écran lit.
 *
 * Constat (recette manuelle, septembre 2026) :
 *   - FR-CER-THEME-CONFIG : « Remplir les champs avec Claude » ne reconnaissait
 *     pas sa consigne ; la réponse préparée, elle, avait des champs (`usp`,
 *     `brandVoice`…) que `themeConfigSchema` refuse → erreur 500.
 *   - FR-CER-STEPS-COCOON : les suggestions et fusions d'une étape, les
 *     sous-questions, l'enrichissement et la consolidation tombaient sur le
 *     texte générique (« [Mock provider] Réponse simulée… »), qui devenait une
 *     suggestion ou un texte validé ; « Sujets suggérés » attendait
 *     `{ topics: [...] }` que l'écran ne lit pas : liste toujours vide.
 *   - FR-CER-COCOON-PROGRESSIVE : « Régénérer › Titre / Mot-clé / Slug » d'une
 *     ligne de la carte recevait la carte entière en JSON, qui devenait le titre,
 *     le mot-clé ou l'adresse de l'article.
 *
 * Chaque test rejoue l'appel réel : la consigne produite par le service de
 * prompts du Cerveau (celui des routes), le message utilisateur écrit par la
 * route, le choix de la réponse préparée, puis la lecture de l'écran.
 */
import { describe, it, expect } from 'vitest'
import type { z } from 'zod'
import { streamFixtures } from '../../../server/services/external/mock-registry'
import '../../../server/services/external/mock-fixtures/index'
import { loadPrompt } from '../../../server/utils/prompt-loader'
import {
  articleStrategyPrompt,
  cocoonStrategyPrompt,
  consolidatePrompt,
  deepenPrompt,
  enrichPrompt,
} from '../../../server/services/strategy/strategy-prompts.service'
import {
  cocoonSuggestRequestSchema,
  strategyConsolidateRequestSchema,
  strategyDeepenRequestSchema,
  strategyEnrichRequestSchema,
  strategySuggestRequestSchema,
} from '../../../shared/schemas/strategy.schema'
import { themeConfigSchema } from '../../../shared/schemas/theme-config.schema'
import { parseArticlesFromSuggestion, parseTopicsFromSuggestion } from '../../../src/composables/editor/article-proposals/parsers'

/** La réponse préparée choisie pour cet appel, et son texte. */
function repondre(systemPrompt: string, userPrompt: string, attendue: string): string {
  const fixture = streamFixtures.find(f => f.matcher({ systemPrompt, userPrompt }))
  expect(fixture?.name, 'la réponse préparée choisie pour cet appel').toBe(attendue)
  const out = fixture!.builder({ systemPrompt, userPrompt })
  const text = typeof out === 'string' ? out : Array.isArray(out) ? out.join('') : out.text
  expect(text).not.toContain('[Mock provider]')
  return text
}

type CocoonRequest = z.infer<typeof cocoonSuggestRequestSchema>

/** Message utilisateur de POST /strategy/cocoon/:slug/suggest (et /strategy/:id/suggest). */
function messageSuggestion(parsed: { step: string; currentInput: string; mergeWith?: string }): string {
  return parsed.mergeWith
    ? `Fusionne ces deux textes pour l'étape "${parsed.step}"`
    : parsed.currentInput || `Exécute la mission pour l'étape "${parsed.step}"`
}

async function suggestionCocon(request: Record<string, unknown>, attendue: string): Promise<string> {
  const parsed: CocoonRequest = cocoonSuggestRequestSchema.parse(request)
  return repondre(await cocoonStrategyPrompt(parsed), messageSuggestion(parsed), attendue)
}

const CONTEXTE = { cocoonName: 'Création site internet Toulouse', siloName: 'Sites web' }

// ---------------------------------------------------------------------------
// « Remplir les champs avec Claude » — POST /api/theme/config/parse
// ---------------------------------------------------------------------------

async function remplirTheme(description: string) {
  const text = repondre(await loadPrompt('theme-parse'), description, 'theme-parse')
  // Lecture de la route : le premier objet JSON, puis le schéma.
  const json = text.match(/\{[\s\S]*\}/)
  expect(json, 'la réponse contient un objet JSON').not.toBeNull()
  const parsed = themeConfigSchema.safeParse(JSON.parse(json![0]))
  expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
  return parsed.data!
}

describe('FR-CER-THEME-CONFIG — « Remplir les champs avec Claude » en mode simulé', () => {
  it('la description devient une configuration que le schéma accepte, tirée du texte', async () => {
    const config = await remplirTheme('Je suis plombier chauffagiste à Toulouse depuis 15 ans. Nous proposons le dépannage urgent, l’installation de chaudières et l’entretien annuel. Nos clients sont des particuliers et des syndics de copropriété.')
    expect(config.avatar.location).toBe('Toulouse')
    expect(config.avatar.sector).toMatch(/plombier/)
    expect(config.offerings.services).toEqual(['dépannage urgent', 'installation de chaudières', 'entretien annuel'])
    expect(config.positioning.targetAudience).toMatch(/particuliers/)
    expect(config.positioning.differentiators.join(' ')).toMatch(/15 ans/)
  })

  it('une autre description donne une autre configuration', async () => {
    const config = await remplirTheme('Nous sommes une agence de communication basée à Bordeaux. Nous proposons la création de logos, les sites vitrines et la gestion des réseaux sociaux.')
    expect(config.avatar.location).toBe('Bordeaux')
    expect(config.avatar.sector).toBe('agence de communication')
    expect(config.offerings.services).toContain('sites vitrines')
  })

  it('une description qui parle de radar ou de lexique reste une description', async () => {
    const config = await remplirTheme('Je suis consultant SEO à Lyon : audit de lexique, radar de mots-clés et meta description.')
    expect(config.avatar.location).toBe('Lyon')
  })
})

// ---------------------------------------------------------------------------
// Étapes de la stratégie — suggestion, fusion, sous-questions
// ---------------------------------------------------------------------------

describe('FR-CER-STEPS-COCOON — suggestion d’une étape', () => {
  it.each(['cible', 'douleur', 'angle', 'promesse', 'cta'])('étape %s : une suggestion courte, propre au cocon', async (step) => {
    const text = await suggestionCocon({ step, currentInput: '', context: CONTEXTE }, 'cocoon-strategy-suggest')
    expect(text.toLowerCase()).toContain('création site internet toulouse')
    expect(text.match(/[.!?](\s|$)/g)?.length ?? 0, text).toBeLessThanOrEqual(3)
  })

  it('les cinq étapes reçoivent cinq suggestions différentes', async () => {
    const textes = await Promise.all(['cible', 'douleur', 'angle', 'promesse', 'cta'].map(step =>
      suggestionCocon({ step, currentInput: '', context: CONTEXTE }, 'cocoon-strategy-suggest')))
    expect(new Set(textes).size).toBe(5)
  })

  it('la saisie de l’utilisateur est reprise, même si elle cite « radar » ou « trimestre »', async () => {
    const text = await suggestionCocon({ step: 'cible', currentInput: 'Des artisans du bâtiment, vus sur notre radar ce trimestre', context: CONTEXTE }, 'cocoon-strategy-suggest')
    expect(text).toContain('artisans du bâtiment')
  })

  it('une sous-question reçoit une réponse rédigée, pas une nouvelle sous-question', async () => {
    const text = await suggestionCocon({ step: 'cible', currentInput: '[Sous-question : "Quel budget ont-ils pour leur site ?"] ', context: CONTEXTE }, 'cocoon-strategy-suggest')
    expect(text).toContain('Quel budget ont-ils pour leur site ?')
    expect(() => JSON.parse(text)).toThrow()
  })

  it('niveau article : la suggestion parle de l’article', async () => {
    const parsed = strategySuggestRequestSchema.parse({
      step: 'aiguillage', currentInput: '', context: { articleTitle: 'Prix d’un site vitrine', ...CONTEXTE },
    })
    const text = repondre(await articleStrategyPrompt(parsed), messageSuggestion(parsed), 'cocoon-strategy-suggest')
    expect(text).toContain('Prix d’un site vitrine')
  })
})

describe('FR-CER-STEPS-COCOON — « Fusionner les deux »', () => {
  it('la fusion reprend la saisie et la suggestion', async () => {
    const text = await suggestionCocon({
      step: 'cible', currentInput: 'Des artisans du bâtiment qui manquent de temps.', mergeWith: 'Les dirigeants de TPE toulousaines qui veulent plus de devis.', context: CONTEXTE,
    }, 'strategy-merge')
    expect(text).toContain('artisans du bâtiment')
    expect(text).toContain('dirigeants de TPE toulousaines')
  })

  it('avec un texte déjà validé, la fusion part de lui', async () => {
    const text = await suggestionCocon({
      step: 'douleur', currentInput: 'Ils perdent des clients.', mergeWith: 'Ils ne savent pas juger un devis.', existingValidated: 'Leur site ne rapporte aucun contact.', context: CONTEXTE,
    }, 'strategy-merge')
    expect(text.startsWith('Leur site ne rapporte aucun contact.')).toBe(true)
    expect(text).toContain('Ils ne savent pas juger un devis.')
  })
})

describe('FR-CER-STEPS-COCOON — approfondir, enrichir, consolider', () => {
  const contexte = { ...CONTEXTE, previousAnswers: { cible: 'Artisans du bâtiment' } }

  async function sousQuestion(existantes: Array<{ question: string; answer: string }>) {
    const parsed = strategyDeepenRequestSchema.parse({
      step: 'douleur', mainQuestion: 'Quelle douleur ?', mainAnswer: 'Ils ne trouvent pas de clients.', existingSubQuestions: existantes, context: contexte,
    })
    const text = repondre(await deepenPrompt(parsed), `Génère une sous-question pour l'étape "${parsed.step}"`, 'cocoon-strategy-deepen')
    // Lecture de la route : le premier objet JSON.
    return JSON.parse(text.match(/\{[\s\S]*\}/)![0]) as { question: string; description: string }
  }

  it('« + » donne une sous-question et sa raison, jamais une déjà posée', async () => {
    const premiere = await sousQuestion([])
    expect(premiere.question.trim()).not.toBe('')
    expect(premiere.description.trim()).not.toBe('')
    const seconde = await sousQuestion([{ question: premiere.question, answer: '' }])
    expect(seconde.question).not.toBe(premiere.question)
  })

  it('une sous-réponse validée enrichit le texte validé, qui reste la base', async () => {
    const parsed = strategyEnrichRequestSchema.parse({
      step: 'cible', existingValidated: 'Les artisans du bâtiment à Toulouse.', subQuestion: 'Quel budget ?', subAnswer: 'Ils prévoient entre 1 500 et 3 000 euros.', context: contexte,
    })
    const text = repondre(await enrichPrompt(parsed), `Enrichis le texte validé avec la sous-réponse pour l'étape "${parsed.step}"`, 'cocoon-strategy-enrich')
    expect(text.startsWith('Les artisans du bâtiment à Toulouse.')).toBe(true)
    expect(text).toContain('entre 1 500 et 3 000 euros')
  })

  it('la consolidation rassemble la réponse principale et les sous-réponses', async () => {
    const parsed = strategyConsolidateRequestSchema.parse({
      step: 'angle', mainAnswer: 'Parler prix sans détour.', subAnswers: [{ question: 'Quel ton ?', answer: 'Un ton direct et chaleureux.' }], context: contexte,
    })
    const text = repondre(await consolidatePrompt(parsed), `Consolide les réponses pour l'étape "${parsed.step}"`, 'strategy-consolidate')
    expect(text).toContain('Parler prix sans détour.')
    expect(text).toContain('Un ton direct et chaleureux.')
  })
})

// ---------------------------------------------------------------------------
// Étape « Articles » — sujets suggérés, régénération d'une ligne de la carte
// ---------------------------------------------------------------------------

describe('FR-CER-STEPS-COCOON — « Sujets suggérés »', () => {
  it('la liste se lit comme l’écran la lit, et parle du cocon', async () => {
    const text = await suggestionCocon({ step: 'articles-topics', currentInput: 'Propose les sujets du cocon.', context: { ...CONTEXTE, previousAnswers: { cible: 'Artisans' } } }, 'cocoon-strategy-topics')
    const topics = parseTopicsFromSuggestion(text)
    expect(topics.length).toBeGreaterThanOrEqual(3)
    expect(new Set(topics).size).toBe(topics.length)
    expect(topics.join(' | ').toLowerCase()).toContain('site internet')
  })

  it('deux cocons, deux listes', async () => {
    const a = parseTopicsFromSuggestion(await suggestionCocon({ step: 'articles-topics', currentInput: 'Propose les sujets du cocon.', context: CONTEXTE }, 'cocoon-strategy-topics'))
    const b = parseTopicsFromSuggestion(await suggestionCocon({ step: 'articles-topics', currentInput: 'Propose les sujets du cocon.', context: { cocoonName: 'Isolation des combles', siloName: 'Rénovation' } }, 'cocoon-strategy-topics'))
    expect(b).not.toEqual(a)
  })
})

describe('FR-CER-COCOON-PROGRESSIVE — « Régénérer » une ligne de la carte', () => {
  // Messages envoyés par `createRegenerationActions` (regeneration.ts).
  const titre = (precedents: string) => `Régénère uniquement le titre (H1) de cet article de type "Intermédiaire" pour le cocon "${CONTEXTE.cocoonName}". Mot-clé technique : "prix creation site internet". Slug : "prix-creation-site-internet". Titres déjà générés à NE PAS réutiliser : "${precedents}". Propose un titre DIFFÉRENT. Le titre est la couche humaine du H1 : il intègre le mot-clé de façon naturelle, pas mot pour mot. Règle pour ce type : Spécifique métier ou technique. PAS de ville.. Réponds avec un seul nouveau titre, sans guillemets, sans explication.`
  const motCle = (precedents: string) => `Régénère uniquement le mot-clé technique (racine technique) de cet article de type "Intermédiaire" pour le cocon "${CONTEXTE.cocoonName}". Titre actuel : "Prix d'un site internet pour une TPE". Mots-clés déjà générés à NE PAS réutiliser : ${precedents}. Propose un mot-clé DIFFÉRENT. Le mot-clé est une RACINE TECHNIQUE : forme nominative uniquement. Format : mot1 mot2 mot3 (minuscules, espaces simples). Règle pour ce type : 3-4 mots nominatifs. Réponds avec un seul mot-clé, sans guillemets, sans explication.`
  const slug = (precedents: string) => `Régénère uniquement le slug URL de cet article pour le cocon "${CONTEXTE.cocoonName}". Mot-clé technique : "prix création site internet". Slugs déjà générés à NE PAS réutiliser : ${precedents}. Le slug est dérivé du mot-clé : remplacer les espaces par des tirets, tout en minuscules, sans accents, sans mots vides (de, du, des, le, la, les, un, une, pour, en, et, ou, avec, sur, dans, par). Maximum 6 segments. Réponds avec un seul slug, sans guillemets, sans explication.`

  const regenerer = (currentInput: string) => suggestionCocon({ step: 'articles', currentInput, context: CONTEXTE }, 'cocoon-regenerate-field')

  it('le titre : une seule ligne, nouvelle, qui parle du mot-clé', async () => {
    const precedent = 'Prix d’un site internet : ce qui fait varier la facture'
    const text = (await regenerer(titre(precedent))).trim()
    expect(text).not.toContain('\n')
    expect(text).not.toMatch(/^[[{"«]/)
    expect(text).not.toBe(precedent)
    expect(text.toLowerCase()).toMatch(/prix/)
  })

  it('le mot-clé : une racine en minuscules, différente des précédentes', async () => {
    const text = (await regenerer(motCle('prix creation site internet, tarif site internet tpe'))).trim()
    expect(text).toMatch(/^[\p{Ll}\d]+( [\p{Ll}\d]+)+$/u)
    expect(['prix creation site internet', 'tarif site internet tpe']).not.toContain(text)
  })

  it('le slug : minuscules sans accent ni mot vide, 6 segments au plus, nouveau', async () => {
    const text = (await regenerer(slug('prix-creation-site-internet'))).trim()
    expect(text).toMatch(/^[a-z0-9]+(-[a-z0-9]+){0,5}$/)
    expect(text).not.toBe('prix-creation-site-internet')
  })

  it('la carte complète reste servie par sa propre réponse préparée', async () => {
    const text = await suggestionCocon({ step: 'articles-structure', currentInput: 'Génère le Pilier et les Intermédiaires.', context: CONTEXTE }, 'cocoon-articles-structure')
    expect(parseArticlesFromSuggestion(text).length).toBeGreaterThan(0)
  })
})
