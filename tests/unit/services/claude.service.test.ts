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

import { streamChatCompletion } from '../../../server/services/claude.service'

function createMockStream(events: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event
      }
    },
    finalMessage: vi.fn().mockResolvedValue({
      usage: { input_tokens: 150, output_tokens: 250 },
    }),
  }
}

beforeEach(() => {
  mockStreamFn.mockReset()
})

describe('claude.service — streamChatCompletion', () => {
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
