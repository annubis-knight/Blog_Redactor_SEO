import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useCannibalization } from '@/composables/useCannibalization'
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'

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
    const articleSlug = ref('my-article')
    const cocoonName = ref('')

    const { warnings } = useCannibalization(articleSlug, cocoonName)
    await nextTick()

    expect(warnings.value).toEqual([])
    expect(mockedApiGet).not.toHaveBeenCalled()
  })

  it('fetches capitaines and detects no conflict', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleSlug: 'my-article',
      capitaine: 'seo',
      lieutenants: [],
      lexique: [],
    }

    mockedApiGet.mockResolvedValue({
      'my-article': 'seo',
      'other-article': 'marketing',
    })

    const articleSlug = ref('my-article')
    const cocoonName = ref('cocoon-a')

    const { warnings } = useCannibalization(articleSlug, cocoonName)

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
      articleSlug: 'my-article',
      capitaine: 'seo',
      lieutenants: [],
      lexique: [],
    }

    mockedApiGet.mockResolvedValue({
      'my-article': 'seo',
      'other-article': 'seo',
    })

    const articleSlug = ref('my-article')
    const cocoonName = ref('cocoon-a')

    const { warnings } = useCannibalization(articleSlug, cocoonName)

    await vi.waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalled()
    })
    await nextTick()

    expect(warnings.value).toHaveLength(1)
    expect(warnings.value[0].keyword).toBe('seo')
    expect(warnings.value[0].conflictingSlug).toBe('other-article')
  })

  it('is case-insensitive for capitaine comparison', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleSlug: 'my-article',
      capitaine: 'SEO',
      lieutenants: [],
      lexique: [],
    }

    mockedApiGet.mockResolvedValue({
      'my-article': 'SEO',
      'other-article': 'seo',
    })

    const articleSlug = ref('my-article')
    const cocoonName = ref('cocoon-a')

    const { warnings } = useCannibalization(articleSlug, cocoonName)

    await vi.waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalled()
    })
    await nextTick()

    expect(warnings.value).toHaveLength(1)
  })

  it('clears warnings on API error', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleSlug: 'my-article',
      capitaine: 'seo',
      lieutenants: [],
      lexique: [],
    }

    mockedApiGet.mockRejectedValue(new Error('Network error'))

    const articleSlug = ref('my-article')
    const cocoonName = ref('cocoon-a')

    const { warnings } = useCannibalization(articleSlug, cocoonName)

    await vi.waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalled()
    })
    await nextTick()

    expect(warnings.value).toEqual([])
  })

  it('re-fetches when cocoonName changes', async () => {
    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleSlug: 'my-article',
      capitaine: 'seo',
      lieutenants: [],
      lexique: [],
    }

    mockedApiGet.mockResolvedValue({ 'my-article': 'seo' })

    const articleSlug = ref('my-article')
    const cocoonName = ref('cocoon-a')

    useCannibalization(articleSlug, cocoonName)

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
      articleSlug: 'my-article',
      capitaine: 'seo',
      lieutenants: [],
      lexique: [],
    }

    mockedApiGet.mockResolvedValue({})

    const articleSlug = ref('my-article')
    const cocoonName = ref('my-cocoon')

    useCannibalization(articleSlug, cocoonName)

    await vi.waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalledWith('/cocoons/my-cocoon/capitaines')
    })
  })

  it('expose refresh function', () => {
    const articleSlug = ref('my-article')
    const cocoonName = ref('')

    const { refresh } = useCannibalization(articleSlug, cocoonName)
    expect(typeof refresh).toBe('function')
  })
})
