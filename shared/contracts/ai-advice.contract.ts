/**
 * Contrats d'affichage — « Conseil IA rédigé » (lot 7).
 *
 * Le conseil arrive en morceaux de texte Markdown (événements `chunk`) puis un
 * événement `done` ; AiAdviceMarkdown l'affiche (onglet Capitaine : panneau
 * manuel et carrousel, texte relu en base compris).
 *
 * Forme attendue :
 *   - le texte complet n'est pas vide : sinon l'événement `error` part et
 *     l'écran propose « Régénérer » au lieu d'un panneau blanc (frontière serveur) ;
 *   - le Markdown n'est pas emballé dans un bloc de code « ```markdown … ``` »,
 *     que l'écran afficherait en texte brut (mise en forme à l'affichage, même
 *     fonction au premier chargement et au rechargement) ;
 *   - l'événement `done` porte le mot-clé et le niveau (frontière client).
 *
 * AUTHORITY: réponse du fournisseur IA (ai-provider.service), PostgreSQL
 *            `captain_explorations.ai_panel_markdown` (relecture)
 * READS FROM: POST /keywords/:keyword/ai-panel (SSE), POST /keywords/:keyword/ai-lexique (SSE)
 * CONSUMERS: CaptainPanel (panneau manuel et carrousel), CaptainSidePanel, AiAdviceMarkdown
 * RELATED FR: NFR-INT-DISPLAY-CONTRACTS, FR-CAP-AI-PANEL
 */
import { z } from 'zod'
import { defineContract, text } from './core.js'

const FENCE_OPEN = /^```(?:markdown|md)?[ \t]*\r?\n/i
const FENCE_CLOSE = /\r?\n?```\s*$/

/**
 * Retire l'emballage « ```markdown … ``` » ajouté par certaines IA. Sans
 * emballage, le texte est rendu tel quel (aussi pendant le flux, morceau par morceau).
 */
export function adviceMarkdown(markdown: string): string {
  const trimmed = markdown.trimStart()
  if (!FENCE_OPEN.test(trimmed)) return markdown
  return trimmed.replace(FENCE_OPEN, '').replace(FENCE_CLOSE, '')
}

/** Texte complet du conseil, vérifié avant l'événement `done` (frontière serveur). */
export const aiAdviceContract = defineContract<string>(
  'ai-advice',
  z.string().transform(adviceMarkdown).refine(value => value.trim() !== '', 'conseil vide'),
)

interface AiAdviceDone {
  keyword: string
  level: string
}

/** Événement `done` d'un conseil (frontière client) : le texte, lui, est déjà arrivé en morceaux. */
export const aiAdviceDoneContract = defineContract<AiAdviceDone>(
  'ai-advice-done',
  z.looseObject({
    keyword: text('keyword', ''),
    level: text('level', ''),
  }),
)
