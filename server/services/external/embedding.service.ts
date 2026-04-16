import { log } from '../../utils/logger.js'

// Lazy-loaded singleton embedding model (multilingual sentence embeddings)
const MODEL_ID = 'Xenova/multilingual-e5-small'
const LOAD_TIMEOUT_MS = 60_000

let embedder: unknown = null
let loading = false
let loadFailed = false

/**
 * Ensure the embedding model is loaded. Lazy-loads on first call.
 * Returns false if model can't be loaded (graceful fallback).
 */
async function ensureModel(): Promise<boolean> {
  if (embedder) return true
  if (loadFailed) return false
  if (loading) {
    // Wait for ongoing load with timeout
    const start = Date.now()
    while (loading && Date.now() - start < LOAD_TIMEOUT_MS) {
      await new Promise(r => setTimeout(r, 200))
    }
    return !!embedder
  }

  loading = true
  try {
    log.info(`[Embedding] Loading model ${MODEL_ID}...`)
    const startLoad = Date.now()
    const { pipeline } = await import('@huggingface/transformers')

    const loadPromise = pipeline('feature-extraction', MODEL_ID)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Model load timeout')), LOAD_TIMEOUT_MS),
    )

    embedder = await Promise.race([loadPromise, timeoutPromise])
    log.info(`[Embedding] Model loaded successfully in ${Date.now() - startLoad}ms`)
    return true
  } catch (err) {
    loadFailed = true
    log.warn(`[Embedding] Failed to load model: ${(err as Error).message}`)
    return false
  } finally {
    loading = false
  }
}

/**
 * Embed an array of texts into dense vectors using the multilingual e5 model.
 * Returns null if model is unavailable (graceful degradation).
 * E5 models require a prefix: "query: " for search queries, "passage: " for documents.
 * Processes in batches of BATCH_SIZE for memory efficiency.
 */
async function embedTexts(texts: string[], prefix: 'query' | 'passage' = 'query'): Promise<number[][] | null> {
  if (!await ensureModel()) return null

  const totalBatches = Math.ceil(texts.length / 32)
  log.debug(`[Embedding] Embedding ${texts.length} texts (prefix="${prefix}", batches=${totalBatches})`)
  const startEmbed = Date.now()

  try {
    const BATCH_SIZE = 32
    const results: number[][] = []
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE).map(t => `${prefix}: ${t}`)
      const startBatch = Date.now()
      const output = await (embedder as CallableFunction)(
        batch,
        { pooling: 'mean', normalize: true },
      )
      // Output tensor shape [N, hidden_dim] — tolist() returns number[][]
      results.push(...(output.tolist() as number[][]))
      log.debug(`[Embedding] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${totalBatches}: ${batch.length} texts in ${Date.now() - startBatch}ms`)
    }
    log.info(`[Embedding] Embedded ${results.length} texts in ${Date.now() - startEmbed}ms`)
    return results
  } catch (err) {
    log.warn(`[Embedding] Embedding failed after ${Date.now() - startEmbed}ms: ${(err as Error).message}`)
    return null
  }
}

/**
 * Cosine similarity between two normalized vectors.
 * If vectors are already L2-normalized (which e5 + normalize:true does),
 * cosine similarity = dot product.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
  }
  return dot
}

/**
 * Compute semantic similarity scores between a topic and a list of texts.
 * Uses "query:" prefix for the topic and "passage:" for texts (required by e5 models).
 * Returns an array of similarity scores (0-1), or null if embeddings unavailable.
 */
export async function computeSemanticScores(
  topic: string,
  texts: string[],
): Promise<number[] | null> {
  if (texts.length === 0) return []

  log.info(`[Embedding] Computing semantic scores: topic="${topic.slice(0, 60)}" vs ${texts.length} texts`)
  const startScores = Date.now()

  const topicEmbedding = await embedTexts([topic], 'query')
  if (!topicEmbedding) return null

  const textEmbeddings = await embedTexts(texts, 'passage')
  if (!textEmbeddings) return null

  const topicVec = topicEmbedding[0]
  const scores = textEmbeddings.map(vec => cosineSimilarity(topicVec, vec))

  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length
  log.info(`[Embedding] Semantic scores computed in ${Date.now() - startScores}ms: min=${min.toFixed(3)}, max=${max.toFixed(3)}, avg=${avg.toFixed(3)}`)

  return scores
}
