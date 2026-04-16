import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useCannibalization } from '@/composables/seo/useCannibalization'
import { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'

vi.mock('@/services/api.service', () => ({
  apiGet: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  log: { warn: vi.fn(), debug: vi.fn() },
}))

import { apiGet } from '@/services/api.service'

const mockedApiGet = vi.mocked(apiGet)

describe('useCannibalization', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('returns empty warnings initially when no cocoon or capitaine', async () => {
    const articleId = ref(1)
    const cocoonName = ref('')

    const { warnings } = useCannibalization(articleId, cocoonName)
    await nextTick()

    expect(warnings.value).toEqual([])
    expect(mockedApiGet).not.toHaveBeenCalled()
  })

  it('fetches capitaines and detects no conflict', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleId: 1,
      capitaine: 'seo',
      lieutenants: [],
      lexique: [],
    }

    mockedApiGet.mockResolvedValue({
      1: 'seo',
      2: 'marketing',
    })

    const articleId = ref(1)
    const cocoonName = ref('cocoon-a')

    const { warnings } = useCannibalization(articleId, cocoonName)

    // Wait for the async fetch triggered by the watch
    await vi.waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalled()
    })
    await nextTick()

    expect(warnings.value).toEqual([])
  })

  it('detects cannibalization when another article has same capitaine', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleId: 1,
      capitaine: 'seo',
      lieutenants: [],
      lexique: [],
    }

    mockedApiGet.mockResolvedValue({
      1: 'seo',
      2: 'seo',
    })

    const articleId = ref(1)
    const cocoonName = ref('cocoon-a')

    const { warnings } = useCannibalization(articleId, cocoonName)

    await vi.waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalled()
    })
    await nextTick()

    expect(warnings.value).toHaveLength(1)
    expect(warnings.value[0].keyword).toBe('seo')
    expect(warnings.value[0].conflictingSlug).toBe('2')
  })

  it('is case-insensitive for capitaine comparison', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleId: 1,
      capitaine: 'SEO',
      lieutenants: [],
      lexique: [],
    }

    mockedApiGet.mockResolvedValue({
      1: 'SEO',
      2: 'seo',
    })

    const articleId = ref(1)
    const cocoonName = ref('cocoon-a')

    const { warnings } = useCannibalization(articleId, cocoonName)

    await vi.waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalled()
    })
    await nextTick()

    expect(warnings.value).toHaveLength(1)
  })

  it('clears warnings on API error', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleId: 1,
      capitaine: 'seo',
      lieutenants: [],
      lexique: [],
    }

    mockedApiGet.mockRejectedValue(new Error('Network error'))

    const articleId = ref(1)
    const cocoonName = ref('cocoon-a')

    const { warnings } = useCannibalization(articleId, cocoonName)

    await vi.waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalled()
    })
    await nextTick()

    expect(warnings.value).toEqual([])
  })

  it('re-fetches when cocoonName changes', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleId: 1,
      capitaine: 'seo',
      lieutenants: [],
      lexique: [],
    }

    mockedApiGet.mockResolvedValue({ 1: 'seo' })

    const articleId = ref(1)
    const cocoonName = ref('cocoon-a')

    useCannibalization(articleId, cocoonName)

    await vi.waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalledTimes(1)
    })

    // Change cocoon
    cocoonName.value = 'cocoon-b'
    await nextTick()

    await vi.waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalledTimes(2)
    })
  })

  it('calls correct API endpoint', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleId: 1,
      capitaine: 'seo',
      lieutenants: [],
      lexique: [],
    }

    mockedApiGet.mockResolvedValue({})

    const articleId = ref(1)
    const cocoonName = ref('my-cocoon')

    useCannibalization(articleId, cocoonName)

    await vi.waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalledWith('/cocoons/my-cocoon/capitaines')
    })
  })

  it('expose refresh function', () => {
    const articleId = ref(1)
    const cocoonName = ref('')

    const { refresh } = useCannibalization(articleId, cocoonName)
    expect(typeof refresh).toBe('function')
  })
})
