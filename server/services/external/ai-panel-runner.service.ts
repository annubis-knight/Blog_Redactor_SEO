import type { Request, Response } from 'express'
import { log } from '../../utils/logger.js'
import { streamChatCompletion, USAGE_SENTINEL } from './ai-provider.service.js'
import type { ApiUsage } from './claude.service.js'

/**
 * Service runner unifié Panels IA Moteur. Séquence SSE :
 * 1. writeHead 2. stream chunks 3. usage Claude 4. parse JSON (opt) 5. hook onSuccess
 * 6. send done 7. errors.
 *
 * **Contrats préservés** : les events SSE émis (`chunk`, `done`, `error`) ont
 * exactement la même forme qu'avant. Le payload `done` est composé par le
 * handler appelant via `buildDonePayload`. Les tests routes existants doivent
 * rester verts.
 */

export interface RunAiPanelStreamOptions<TParsed = unknown> {
  /** Requête / réponse Express (SSE écrit directement sur `res`). */
  req: Request
  res: Response
  /** Identifiant du keyword traité — uniquement pour les logs. */
  keyword: string
  /** Niveau d'article — uniquement pour les logs. */
  level: string
  /** Prompt système chargé via loadPrompt par le caller. */
  systemPrompt: string
  /** Prompt utilisateur (instruction concrète). */
  userPrompt: string
  /** Max tokens custom pour le provider. Défaut : provider default. */
  maxTokens?: number
  /**
   * Si fourni, parse le contenu agrégé (JSON tools) et expose le résultat
   * au callback onSuccess. Doit lever en cas de format invalide pour que
   * la séquence d'erreur SSE prenne le relai.
   */
  parser?: (fullContent: string) => TParsed
  /**
   * Callback async appelé APRÈS le stream complet (et le parsing si parser
   * est défini), AVANT l'event 'done'. Sert à persister en DB. Les erreurs
   * de persistance sont logged mais NE bloquent PAS le done — pattern E2 :
   * mieux vaut envoyer la réponse et logger un warn que perdre le travail
   * IA déjà effectué côté client.
   */
  onSuccess?: (parsed: TParsed | null, fullContent: string, usage: ApiUsage | null) => Promise<void>
  /**
   * Callback synchronisé qui construit le payload de l'event `done`. Permet
   * à chaque route d'inclure son propre `outline`/`metadata`. La forme du
   * retour devient le `data:` du SSE done event.
   */
  buildDonePayload: (parsed: TParsed | null, usage: ApiUsage | null) => Record<string, unknown>
  /** Tag de log pour identifier le panel (capitaine, hn, propose, lexique…). */
  logTag: string
}

interface ConsumeStreamResult {
  fullContent: string
  usage: ApiUsage | null
  chunkCount: number
}

/** Consomme l'async generator du provider, sépare le sentinel d'usage. */
async function consumeStream(
  gen: AsyncGenerator<string>,
  onChunk: (chunk: string) => void,
): Promise<ConsumeStreamResult> {
  const chunks: string[] = []
  let usage: ApiUsage | null = null
  let chunkCount = 0
  for await (const chunk of gen) {
    if (chunk.startsWith(USAGE_SENTINEL)) {
      usage = JSON.parse(chunk.slice(USAGE_SENTINEL.length)) as ApiUsage
    } else {
      chunkCount++
      chunks.push(chunk)
      onChunk(chunk)
    }
  }
  return { fullContent: chunks.join(''), usage, chunkCount }
}

/**
 * Exécute la séquence SSE complète d'un Panel IA. Renvoie void — toute
 * communication passe par `res` directement.
 */
export async function runAiPanelStream<TParsed = unknown>(opts: RunAiPanelStreamOptions<TParsed>): Promise<void> {
  const { res, keyword, level, systemPrompt, userPrompt, maxTokens, parser, onSuccess, buildDonePayload, logTag } = opts
  const startTotal = Date.now()

  try {
    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const startAi = Date.now()
    let chunkCount = 0
    const { fullContent, usage } = await consumeStream(
      maxTokens !== undefined
        ? streamChatCompletion(systemPrompt, userPrompt, maxTokens)
        : streamChatCompletion(systemPrompt, userPrompt),
      (chunk) => {
        chunkCount++
        res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk, chunkIndex: chunkCount })}\n\n`)
      },
    )

    log.debug(`${logTag} stream complete`, { keyword, chunkCount, contentChars: fullContent.length, aiMs: Date.now() - startAi })

    let parsed: TParsed | null = null
    if (parser) {
      parsed = parser(fullContent)
    }

    if (onSuccess) {
      try {
        await onSuccess(parsed, fullContent, usage)
      } catch (persistErr) {
        // Pattern E2 — DB persist échoue ne doit PAS bloquer le done.
        log.warn(`${logTag} onSuccess persistence failed — ${(persistErr as Error).message}`, { keyword, level })
      }
    }

    log.info(`${logTag} done for "${keyword}"`, { length: fullContent.length, chunkCount, totalMs: Date.now() - startTotal })

    const donePayload = buildDonePayload(parsed, usage)
    res.write(`event: done\ndata: ${JSON.stringify(donePayload)}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : `Erreur lors de l'exécution du panel IA ${logTag}`
    log.error(`${logTag} failed for "${keyword}" — ${message}`, { keyword, level })
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } })
    }
  }
}
