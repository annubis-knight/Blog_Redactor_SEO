import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStartStream = vi.fn()
const mockAbort = vi.fn()

vi.mock('../../../src/composables/useStreaming', () => ({
  useStreaming: vi.fn(() => ({
    chunks: { value: '' },
    isStreaming: { value: false },
    error: { value: null },
    result: { value: null },
    startStream: mockStartStream,
    abort: mockAbort,
  })),
}))

import { useContextualActions } from '../../../src/composables/useContextualActions'

function createMockEditor() {
  const run = vi.fn()
  return {
    state: {
      selection: { from: 10, to: 25 },
    },
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        setTextSelection: vi.fn(() => ({
          insertContent: vi.fn(() => ({ run })),
        })),
      })),
    })),
    _run: run,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockStartStream.mockResolvedValue(undefined)
})

describe('useContextualActions', () => {
  it('executeAction calls startStream with correct parameters', async () => {
    const { executeAction } = useContextualActions()
    const editor = createMockEditor()

    await executeAction('reformulate', 'selected text', {
      articleSlug: 'test-slug',
      keyword: 'seo',
    }, editor as any)

    expect(mockStartStream).toHaveBeenCalledWith(
      '/api/generate/action',
      {
        actionType: 'reformulate',
        selectedText: 'selected text',
        articleSlug: 'test-slug',
        keyword: 'seo',
        keywords: undefined,
      },
      expect.objectContaining({
        onChunk: expect.any(Function),
        onDone: expect.any(Function),
        onError: expect.any(Function),
      }),
    )
  })

  it('acceptResult inserts content into editor at saved selection', () => {
    const { acceptResult, streamedResult } = useContextualActions()
    const editor = createMockEditor()

    // Simulate streamed result
    streamedResult.value = 'New reformulated text'

    acceptResult(editor as any)

    expect(editor.chain).toHaveBeenCalled()
    expect(editor._run).toHaveBeenCalled()
  })

  it('rejectResult resets state without modifying editor', () => {
    const { rejectResult, streamedResult, actionError, currentAction } = useContextualActions()

    streamedResult.value = 'Some result'
    actionError.value = null
    currentAction.value = 'reformulate'

    rejectResult()

    expect(streamedResult.value).toBe('')
    expect(currentAction.value).toBeNull()
  })

  it('handles error from streaming', async () => {
    mockStartStream.mockImplementationOnce(async (_url: string, _body: unknown, callbacks: any) => {
      callbacks.onError('API error occurred')
    })

    const { executeAction, actionError } = useContextualActions()
    const editor = createMockEditor()

    await executeAction('simplify', 'text', { articleSlug: 'slug' }, editor as any)

    expect(actionError.value).toBe('API error occurred')
  })
})
