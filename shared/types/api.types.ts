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
