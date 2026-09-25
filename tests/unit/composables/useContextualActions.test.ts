import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStartStream = vi.fn()
const mockAbort = vi.fn()

vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: vi.fn(() => ({
    chunks: { value: '' },
    isStreaming: { value: false },
    error: { value: null },
    result: { value: null },
    startStream: mockStartStream,
    abort: mockAbort,
  })),
}))

import { useContextualActions } from '../../../src/composables/editor/useContextualActions'

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
          setMark: vi.fn(() => ({ run })),
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
      articleId: 1,
      keyword: 'seo',
    }, editor as any)

    expect(mockStartStream).toHaveBeenCalledWith(
      '/api/generate/action',
      {
        actionType: 'reformulate',
        selectedText: 'selected text',
        articleId: 1,
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

    await executeAction('simplify', 'text', { articleId: 1 }, editor as any)

    expect(actionError.value).toBe('API error occurred')
  })

  // Suite C5b : après une erreur (réponse coupée…), le texte partiel restait
  // acceptable et pouvait remplacer la sélection.
  it('une action en erreur ne laisse rien à accepter', async () => {
    mockStartStream.mockImplementationOnce(async (_url: string, _body: unknown, callbacks: any) => {
      callbacks.onChunk('Un texte coupé au milieu')
      callbacks.onError('La réponse a été coupée avant la fin.')
    })
    const { executeAction, acceptResult, streamedResult } = useContextualActions()
    const editor = createMockEditor()

    await executeAction('reformulate', 'text', { articleId: 1 }, editor as any)
    expect(streamedResult.value).toBe('')
    acceptResult(editor as any)
    expect(editor.chain).not.toHaveBeenCalled()
  })

  // Suite C5b : les liens absents de la recherche web étaient retirés sans
  // que l'utilisateur le sache.
  it('les liens retirés par le serveur sont signalés', async () => {
    mockStartStream.mockImplementationOnce(async (_url: string, _body: unknown, callbacks: any) => {
      callbacks.onDone({ content: '<p>Selon une étude…</p>', removedLinks: ['https://invente.example/x'] })
    })
    const { executeAction, actionNotice, rejectResult } = useContextualActions()

    await executeAction('sources-chiffrees', 'text', { articleId: 1 }, createMockEditor() as any)
    expect(actionNotice.value).toMatch(/1 lien/)
    expect(actionNotice.value).toMatch(/recherche web/)
    rejectResult()
    expect(actionNotice.value).toBeNull()
  })

  it('executeAction for internal-link shows article picker instead of SSE', async () => {
    const { executeAction, showArticlePicker } = useContextualActions()
    const editor = createMockEditor()

    await executeAction('internal-link', 'selected text', { articleId: 1 }, editor as any)

    expect(showArticlePicker.value).toBe(true)
    expect(mockStartStream).not.toHaveBeenCalled()
  })

  it('applyInternalLink applies TipTap mark and closes picker', async () => {
    const { executeAction, applyInternalLink, showArticlePicker } = useContextualActions()
    const editor = createMockEditor()

    await executeAction('internal-link', 'selected text', { articleId: 1 }, editor as any)
    expect(showArticlePicker.value).toBe(true)

    applyInternalLink({ title: 'Article Test', slug: 'article-test', type: 'Pilier', topic: null, status: 'brouillon' })

    expect(editor.chain).toHaveBeenCalled()
    expect(editor._run).toHaveBeenCalled()
    expect(showArticlePicker.value).toBe(false)
  })
})
