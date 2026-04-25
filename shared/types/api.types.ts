/** Standard API success response */
export interface ApiSuccess<T> {
  data: T
}

/** Standard API error response */
export interface ApiError {
  error: {
    code: string
    message: string
  }
}

/** SSE stream event types */
export interface SseChunkEvent {
  content: string
}

export interface SseDoneEvent {
  metadata: Record<string, unknown>
}

export interface SseErrorEvent {
  code: string
  message: string
}

/** API usage metrics from Claude API calls */
export interface ApiUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  model: string
  estimatedCost: number
}

/** DB CRUD telemetry event — surfaced to the activity pile to make persistence visible. */
export interface DbOp {
  operation: 'insert' | 'update' | 'delete' | 'upsert' | 'select'
  table: string
  rowCount: number
  ms: number
}
