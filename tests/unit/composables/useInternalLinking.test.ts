/**
 * FR-RED-INTERNAL-LINKING — composable useInternalLinking (Option B Vague).
 *
 * Invariants couverts (cf. PRD §8.10) :
 *   - requestSuggestions appelle linkingStore.fetchSuggestions avec articleId + content
 *   - applySuggestion résout l'ancre dans le texte → setTextSelection + setMark
 *     internalLink avec targetId + href computed
 *   - applySuggestion no-op si l'ancre est introuvable dans le texte
 *   - applySuggestion sauve le link via linkingStore.saveLinks (sourceId, targetId,
 *     anchorText, position char-N)
 *   - applySuggestion retire la suggestion appliquée de la liste
 *   - dismissSuggestion retire la suggestion sans appeler editor ni saveLinks
 *   - clearSuggestions vide la liste
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Editor } from '@tiptap/core'
import type { LinkSuggestion } from '../../../shared/types'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}))

import { apiPost, apiPut } from '../../../src/services/api.service'
import { useInternalLinking } from '../../../src/composables/seo/useInternalLinking'
import { useLinkingStore } from '../../../src/stores/keyword/linking.store'
import { useEditorStore } from '../../../src/stores/article/editor.store'

const mockApiPost = vi.mocked(apiPost)
const mockApiPut = vi.mocked(apiPut)

/**
 * Mock TipTap editor that captures setTextSelection + setMark calls.
 * descendants() walks a single text node; anchorIndex est calculé dans le composable.
 */
function createMockEditor(html: string, plainText: string) {
  const run = vi.fn()
  const setMark = vi.fn(() => ({ run }))
  const setTextSelection = vi.fn(() => ({ setMark }))
  const focus = vi.fn(() => ({ setTextSelection }))
  const chain = vi.fn(() => ({ focus }))
  return {
    getHTML: () => html,
    state: {
      doc: {
        textContent: plainText,
        descendants: (cb: (node: { isText: boolean; text: string }, pos: number) => void) => {
          // Simule un seul textNode commençant à pos=1 (paragraphe wrapper)
          cb({ isText: true, text: plainText }, 1)
        },
      },
    },
    chain,
    _captures: { setMark, setTextSelection, run },
  } as unknown as Editor & { _captures: { setMark: ReturnType<typeof vi.fn>; setTextSelection: ReturnType<typeof vi.fn>; run: ReturnType<typeof vi.fn> } }
}

const SUGGESTION: LinkSuggestion = {
  targetId: 42,
  suggestedAnchor: 'référencement local',
  href: '#article-42',
}

describe('useInternalLinking — FR-RED-INTERNAL-LINKING', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('requestSuggestions appelle fetchSuggestions avec articleId + content éditeur', async () => {
    mockApiPost.mockResolvedValue([SUGGESTION])
    const editorStore = useEditorStore()
    editorStore.content = '<p>Le référencement local est crucial.</p>'

    const { requestSuggestions } = useInternalLinking(7)
    await requestSuggestions()

    expect(mockApiPost).toHaveBeenCalledWith('/links/suggest', {
      articleId: 7,
      content: '<p>Le référencement local est crucial.</p>',
    })
  })

  it('requestSuggestions est no-op si editorStore.content est vide', async () => {
    const editorStore = useEditorStore()
    editorStore.content = ''

    const { requestSuggestions } = useInternalLinking(7)
    await requestSuggestions()

    expect(mockApiPost).not.toHaveBeenCalled()
  })

  it('applySuggestion pose le mark internalLink avec targetId + href #article-N', () => {
    const linkingStore = useLinkingStore()
    linkingStore.suggestions = [SUGGESTION]
    mockApiPut.mockResolvedValue({ links: [], cocoonId: 1 } as never)

    const editor = createMockEditor(
      '<p>Le référencement local est crucial.</p>',
      'Le référencement local est crucial.',
    )
    const { applySuggestion } = useInternalLinking(7)
    applySuggestion(SUGGESTION, editor)

    expect(editor._captures.setMark).toHaveBeenCalledWith('internalLink', {
      targetId: 42,
      href: '#article-42',
    })
    expect(editor._captures.run).toHaveBeenCalled()
  })

  it('applySuggestion sauve le link via linkingStore.saveLinks avec position char-N', () => {
    const linkingStore = useLinkingStore()
    linkingStore.suggestions = [SUGGESTION]
    mockApiPut.mockResolvedValue({ links: [], cocoonId: 1 } as never)

    const editor = createMockEditor(
      '<p>Le référencement local est crucial.</p>',
      'Le référencement local est crucial.',
    )
    const { applySuggestion } = useInternalLinking(7)
    applySuggestion(SUGGESTION, editor)

    // anchorIndex de "référencement local" dans "Le référencement local est crucial." = 3
    expect(mockApiPut).toHaveBeenCalledWith('/links', {
      links: [
        {
          sourceId: 7,
          targetId: 42,
          anchorText: 'référencement local',
          position: 'char-3',
        },
      ],
    })
  })

  it('applySuggestion retire la suggestion appliquée de la liste', () => {
    const linkingStore = useLinkingStore()
    linkingStore.suggestions = [SUGGESTION, { targetId: 99, suggestedAnchor: 'autre', href: '#article-99' }]
    mockApiPut.mockResolvedValue({ links: [], cocoonId: 1 } as never)

    const editor = createMockEditor(
      '<p>Le référencement local est crucial.</p>',
      'Le référencement local est crucial.',
    )
    const { applySuggestion } = useInternalLinking(7)
    applySuggestion(SUGGESTION, editor)

    expect(linkingStore.suggestions).toHaveLength(1)
    expect(linkingStore.suggestions[0]?.targetId).toBe(99)
  })

  it('applySuggestion no-op (pas de mark, pas de saveLinks) si l\'ancre est absente du texte', () => {
    const linkingStore = useLinkingStore()
    linkingStore.suggestions = [SUGGESTION]

    const editor = createMockEditor(
      '<p>Texte sans la moindre occurrence de l\'ancre.</p>',
      'Texte sans la moindre occurrence de l\'ancre.',
    )
    const { applySuggestion } = useInternalLinking(7)
    applySuggestion(SUGGESTION, editor)

    expect(editor._captures.setMark).not.toHaveBeenCalled()
    expect(mockApiPut).not.toHaveBeenCalled()
  })

  it('applySuggestion résout la position même si l\'ancre est en MAJ dans le texte', () => {
    const linkingStore = useLinkingStore()
    linkingStore.suggestions = [SUGGESTION]
    mockApiPut.mockResolvedValue({ links: [], cocoonId: 1 } as never)

    const editor = createMockEditor(
      '<p>Le RÉFÉRENCEMENT LOCAL est crucial.</p>',
      'Le RÉFÉRENCEMENT LOCAL est crucial.',
    )
    const { applySuggestion } = useInternalLinking(7)
    applySuggestion(SUGGESTION, editor)

    // suggestedAnchor lowercase matché contre textContent lowercase → match @ index 3
    expect(editor._captures.setMark).toHaveBeenCalled()
  })

  it('dismissSuggestion retire la suggestion SANS appeler editor ni saveLinks', () => {
    const linkingStore = useLinkingStore()
    linkingStore.suggestions = [SUGGESTION]

    const { dismissSuggestion } = useInternalLinking(7)
    dismissSuggestion(SUGGESTION)

    expect(linkingStore.suggestions).toHaveLength(0)
    expect(mockApiPut).not.toHaveBeenCalled()
  })

  it('clearSuggestions vide la liste complètement', () => {
    const linkingStore = useLinkingStore()
    linkingStore.suggestions = [SUGGESTION, { targetId: 99, suggestedAnchor: 'autre', href: '#article-99' }]

    const { clearSuggestions } = useInternalLinking(7)
    clearSuggestions()

    expect(linkingStore.suggestions).toEqual([])
  })
})
