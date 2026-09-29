// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockStreamFn } = vi.hoisted(() => ({
  mockStreamFn: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { stream: mockStreamFn }
  },
}))

import { streamChatCompletion, webSearchTool, webSourcesOf } from '../../../server/services/external/claude.service'

function createMockStream(events: unknown[], stopReason = 'end_turn') {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event
      }
    },
    finalMessage: vi.fn().mockResolvedValue({
      usage: { input_tokens: 150, output_tokens: 250 },
      stop_reason: stopReason,
    }),
  }
}

async function usageOf(stream: AsyncGenerator<string>): Promise<Record<string, unknown>> {
  let usage = ''
  for await (const chunk of stream) if (chunk.startsWith('__USAGE__')) usage = chunk.slice('__USAGE__'.length)
  return JSON.parse(usage) as Record<string, unknown>
}

beforeEach(() => {
  mockStreamFn.mockReset()
})

describe('claude.service — streamChatCompletion', () => {
  // FR-RED-DRAFT-SINGLE-PASS — une coupure au plafond de jetons se voyait
  // seulement après coup (bloc tronqué) : la raison d'arrêt est désormais lue.
  it('remonte la raison d’arrêt : fin normale ou plafond de jetons', async () => {
    mockStreamFn.mockReturnValueOnce(createMockStream([]))
    expect((await usageOf(streamChatCompletion('s', 'u'))).stopReason).toBe('end')
    mockStreamFn.mockReturnValueOnce(createMockStream([], 'max_tokens'))
    expect((await usageOf(streamChatCompletion('s', 'u'))).stopReason).toBe('max_tokens')
  })

  it('yields text chunks from Claude stream events', async () => {
    mockStreamFn.mockReturnValueOnce(createMockStream([
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } },
      { type: 'message_stop' },
    ]))

    const chunks: string[] = []
    for await (const chunk of streamChatCompletion('system', 'user')) {
      chunks.push(chunk)
    }

    expect(chunks[0]).toBe('Hello')
    expect(chunks[1]).toBe(' world')
    expect(chunks[2]).toMatch(/^__USAGE__/)
  })

  it('calls messages.stream with correct params', async () => {
    mockStreamFn.mockReturnValueOnce(createMockStream([]))

    for await (const _ of streamChatCompletion('my system prompt', 'my user prompt')) {
      /* consume */
    }

    expect(mockStreamFn).toHaveBeenCalledWith(
      expect.objectContaining({
        system: [{ type: 'text', text: 'my system prompt', cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: 'my user prompt' }],
      }),
    )
  })

  it('passes custom maxTokens to messages.stream', async () => {
    mockStreamFn.mockReturnValueOnce(createMockStream([]))

    for await (const _ of streamChatCompletion('sys', 'usr', 16384)) {
      /* consume */
    }

    expect(mockStreamFn).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 16384 }),
    )
  })

  it('uses default maxTokens of 4096', async () => {
    mockStreamFn.mockReturnValueOnce(createMockStream([]))

    for await (const _ of streamChatCompletion('sys', 'usr')) {
      /* consume */
    }

    expect(mockStreamFn).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 4096 }),
    )
  })

  it('ignores non-text_delta events', async () => {
    mockStreamFn.mockReturnValueOnce(createMockStream([
      { type: 'message_start', message: {} },
      { type: 'content_block_start', content_block: {} },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } },
      { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{}' } },
      { type: 'message_stop' },
    ]))

    const chunks: string[] = []
    for await (const chunk of streamChatCompletion('s', 'u')) {
      chunks.push(chunk)
    }

    expect(chunks[0]).toBe('ok')
    expect(chunks[1]).toMatch(/^__USAGE__/)
  })
})

// FR-RED-ENRICH-SOURCES (R6) — la recherche web partait sans lieu ni date, et
// ses URL étaient jetées : le pilier 1013 citait la Vendée et des liens que
// personne ne pouvait rapprocher d'un résultat réel.
describe('claude.service — recherche web', () => {
  it('se localise en France, à l’heure de Paris, dans la ville de la zone', () => {
    expect(webSearchTool('Toulouse, Occitanie')).toMatchObject({
      type: 'web_search_20250305',
      max_uses: 3,
      user_location: { type: 'approximate', country: 'FR', timezone: 'Europe/Paris', city: 'Toulouse' },
    })
    expect((webSearchTool(null) as unknown as { user_location: Record<string, string> }).user_location).not.toHaveProperty('city')
  })

  it('garde les URL réellement trouvées, sans doublon', () => {
    const content = [
      { type: 'text', text: 'x' },
      { type: 'web_search_tool_result', content: [
        { type: 'web_search_result', url: 'https://www.insee.fr/a', title: 'Insee', page_age: '2026-03-01' },
        { type: 'web_search_result', url: 'https://www.insee.fr/a', title: 'Insee (bis)' },
      ] },
      { type: 'web_search_tool_result', content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' } },
      { type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: 'https://bpifrance.fr/b', title: 'Bpi' }] },
    ]
    expect(webSourcesOf(content)).toEqual([
      { url: 'https://www.insee.fr/a', title: 'Insee', pageAge: '2026-03-01' },
      { url: 'https://bpifrance.fr/b', title: 'Bpi', pageAge: null },
    ])
  })

  it('renvoie les URL trouvées dans le bilan du flux', async () => {
    const stream = createMockStream([])
    stream.finalMessage.mockResolvedValue({
      usage: { input_tokens: 1, output_tokens: 1 },
      stop_reason: 'end_turn',
      content: [{ type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: 'https://www.insee.fr/a', title: 'Insee' }] }],
    })
    mockStreamFn.mockReturnValueOnce(stream)
    expect((await usageOf(streamChatCompletion('s', 'u', 4096, [webSearchTool('Toulouse')]))).webSources)
      .toEqual([{ url: 'https://www.insee.fr/a', title: 'Insee', pageAge: null }])
  })
})
