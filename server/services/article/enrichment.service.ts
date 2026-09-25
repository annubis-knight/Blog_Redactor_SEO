/**
 * AUTHORITY: aucune persistance — propose une nouvelle version d'UN chapitre ;
 *            l'éditeur l'accepte ou la refuse, puis enregistre `articles.content`.
 * READS FROM: chapitre + article envoyés par l'éditeur ; `theme_config` (zone,
 *             pour localiser la recherche web) ; prompts `enrich-*.md`, `section-rewrite.md`
 * WRITES TO: rien
 * CONSUMERS: POST /generate/enrich/:pass, POST /generate/section-rewrite
 *            → enrichment.store (EnrichmentPanel)
 * RELATED FR: FR-RED-ENRICH-PASSES, FR-RED-ENRICH-SOURCES, FR-RED-SECTION-REWRITE
 *
 * Deuxième temps de la rédaction : le premier jet est écrit d'un seul tenant,
 * sans recherche web ; chaque passe l'enrichit ensuite chapitre par chapitre.
 * Seule la passe « sources » cherche sur le web — localisée dans la zone du
 * client, à la date du jour — et ses URL réelles décident des liens gardés.
 */
import { webSearchTool } from '../external/ai-provider.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { collectStreamWithUsage } from '../../utils/stream-usage.js'
import { loadZoneContext } from '../strategy/prompt-context.service.js'
import { articlePlainText } from '../../../shared/chapters.js'
import { verifyEnrichment, keepKnownLinks, knownSources, type EnrichmentPass } from '../../../shared/verifiers/enrichment.js'
import { IMAGE_TO_PROVIDE_SRC } from '../../../shared/constants/image-placeholder.js'
import { describeTypeRules, describeUnknownTypeFaq, CHILD_SUMMARY_WORDS } from '../../../shared/constants/article-type-rules.js'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types.js'
import type { EnrichmentProposal } from '../../../shared/types/enrichment.types.js'

export type ProposalKind = EnrichmentPass | 'reecriture'

export interface ProposalInput {
  pass: ProposalKind
  articleId: number
  chapterIndex: number
  chapterHtml: string
  articleHtml: string
  keyword: string
  keywords: string[]
  /** Consigne de l'auteur (réécriture seulement). */
  instruction?: string
  /** Type de l'article : règles de la FAQ, contrôle du nombre de questions. */
  articleType?: ArticleLevel | null
  /** Stratégie de l'article, sinon celle du cocon (cible, douleur, promesse). */
  strategyContext?: string
  /** Passe « Résumer » (C7) : l'article enfant né de ce chapitre. */
  child?: { title: string; keyword: string | null }
}

/**
 * Contexte de l'article envoyé à chaque passe : un pilier de 3 500 mots tient
 * en ~22 000 caractères. À 12 000, la fin de l'article n'arrivait jamais (R18).
 */
export const ARTICLE_CONTEXT_MAX_CHARS = 30_000

const PROMPT_OF: Record<ProposalKind, string> = {
  sources: 'enrich-sources',
  exemples: 'enrich-exemples',
  tableaux: 'enrich-tableaux',
  images: 'enrich-images',
  faq: 'enrich-faq',
  resumes: 'enrich-resumes',
  reecriture: 'section-rewrite',
}

/** Plafond de jetons : le chapitre réécrit, plus la marge de ce qu'on y ajoute. */
export function proposalMaxTokens(pass: ProposalKind, chapterHtml: string): number {
  if (pass === 'faq') return 3000
  // Un résumé de 250 mots au plus : ~500 jetons, avec de la marge.
  if (pass === 'resumes') return 1200
  const chapterTokens = Math.ceil(chapterHtml.length / 3)
  return Math.min(8192, Math.max(1500, Math.ceil(chapterTokens * 1.5) + 800))
}

async function buildUserPrompt(input: ProposalInput): Promise<string> {
  const variables: Record<string, string> = {
    keyword: input.keyword,
    keywords: input.keywords.join(', ') || '—',
    articleText: articlePlainText(input.articleHtml, ARTICLE_CONTEXT_MAX_CHARS),
    strategyContext: input.strategyContext ?? '',
  }
  if (input.pass === 'faq') variables.type_rules = input.articleType ? describeTypeRules(input.articleType) : describeUnknownTypeFaq()
  if (input.pass !== 'faq') variables.chapterHtml = input.chapterHtml
  if (input.pass === 'images') variables.imageSrc = IMAGE_TO_PROVIDE_SRC
  if (input.pass === 'reecriture') variables.instruction = input.instruction ?? ''
  if (input.pass === 'resumes') {
    if (!input.child) throw new Error('La passe « Résumer » vise un chapitre dont est né un article enfant.')
    variables.childTitle = input.child.title
    variables.childKeyword = input.child.keyword ?? ''
    variables.summaryMin = String(CHILD_SUMMARY_WORDS.min)
    variables.summaryMax = String(CHILD_SUMMARY_WORDS.max)
  }
  // Article, chapitre et consigne viennent de l'utilisateur : toujours échappés.
  return loadPrompt(PROMPT_OF[input.pass], variables, {
    escapeKeys: ['articleText', 'chapterHtml', 'instruction'].filter(key => key in variables),
  })
}

/** Sortie brute → HTML : ni bloc de code, ni phrase d'annonce avant la première balise. */
export function cleanProposal(raw: string): string {
  const text = raw.replace(/^```\w*\n?/gm, '').replace(/\n?```$/gm, '').trim()
  const firstTag = text.indexOf('<')
  return firstTag > 0 ? text.slice(firstTag) : text
}

/**
 * Une image ajoutée pointe toujours vers l'emplacement « à fournir » : un
 * `src` inventé afficherait une image cassée, ou celle d'un autre site.
 */
export function pinNewImages(before: string, after: string): string {
  const existing = new Set([...before.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]))
  return after.replace(/<img\b[^>]*>/gi, (img) => {
    if (existing.has(img)) return img
    const withoutSrc = img.replace(/\s*\bsrc\s*=\s*(["'])[^"']*\1/i, '')
    return withoutSrc.replace(/^<img\b/i, `<img src="${IMAGE_TO_PROVIDE_SRC}"`)
  })
}

export async function proposeChapter(input: ProposalInput): Promise<EnrichmentProposal> {
  const systemPrompt = await loadPrompt('system-propulsite')
  const userPrompt = await buildUserPrompt(input)
  // Seule la passe sources cherche sur le web ; elle exige Claude (pas de repli
  // silencieux vers un fournisseur qui ignorerait l'outil).
  const tools = input.pass === 'sources' ? [webSearchTool((await loadZoneContext()).zone)] : undefined

  const { text, usage } = await collectStreamWithUsage(systemPrompt, userPrompt, proposalMaxTokens(input.pass, input.chapterHtml), tools)

  let after = cleanProposal(text)
  if (input.pass === 'images') after = pinNewImages(input.chapterHtml, after)
  const webSources = usage?.webSources ?? []
  const issues = verifyEnrichment({
    pass: input.pass,
    before: input.chapterHtml,
    after,
    webSources,
    // Plafond atteint, recherche web interrompue, arrêt par sécurité : tout arrêt
    // autre qu'une fin normale laisse une proposition incomplète (R19).
    truncated: usage?.stopReason !== undefined && usage.stopReason !== 'end',
    level: input.articleType ?? undefined,
  })

  return {
    pass: input.pass,
    chapterIndex: input.chapterIndex,
    before: input.chapterHtml,
    html: keepKnownLinks(after, knownSources(input.chapterHtml, webSources)).html,
    issues,
    webSources,
    blocked: issues.some(i => i.level === 'technique'),
    usage,
  }
}
