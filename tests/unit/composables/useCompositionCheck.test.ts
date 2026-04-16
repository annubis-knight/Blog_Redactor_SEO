import { describe, it, expect } from 'vitest'
import { ref, nextTick } from 'vue'
import { useCompositionCheck } from '../../../src/composables/seo/useCompositionCheck'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types'

describe('useCompositionCheck', () => {
  it('returns null when keyword is empty', () => {
    const keyword = ref('')
    const level = ref<ArticleLevel>('pilier')
    const { compositionResult } = useCompositionCheck(keyword, level)
    expect(compositionResult.value).toBeNull()
  })

  it('returns null when keyword is too short (< 2 chars)', () => {
    const keyword = ref('a')
    const level = ref<ArticleLevel>('pilier')
    const { compositionResult } = useCompositionCheck(keyword, level)
    expect(compositionResult.value).toBeNull()
  })

  it('returns allPass true with no keyword', () => {
    const keyword = ref('')
    const level = ref<ArticleLevel>('pilier')
    const { allPass, warningCount } = useCompositionCheck(keyword, level)
    expect(allPass.value).toBe(true)
    expect(warningCount.value).toBe(0)
  })

  it('returns valid result for a pilier keyword', () => {
    const keyword = ref('stratégie digitale entreprises Toulouse')
    const level = ref<ArticleLevel>('pilier')
    const { compositionResult, allPass, warningCount } = useCompositionCheck(keyword, level)
    expect(compositionResult.value).not.toBeNull()
    expect(allPass.value).toBe(true)
    expect(warningCount.value).toBe(0)
  })

  it('separates warnings from passes correctly', () => {
    const keyword = ref('seo web')
    const level = ref<ArticleLevel>('pilier')
    const { warnings, passes } = useCompositionCheck(keyword, level)
    // 2 mots → word_count fail, pas de location → fail, pas de cible → fail
    expect(warnings.value.length).toBe(3)
    expect(passes.value.length).toBe(0)
  })

  it('updates reactively when keyword changes', async () => {
    const keyword = ref('seo')
    const level = ref<ArticleLevel>('pilier')
    const { allPass } = useCompositionCheck(keyword, level)
    expect(allPass.value).toBe(false)

    keyword.value = 'stratégie digitale entreprises Toulouse'
    await nextTick()
    expect(allPass.value).toBe(true)
  })

  it('updates reactively when level changes', async () => {
    const keyword = ref('design émotionnel site professionnel')
    const level = ref<ArticleLevel>('intermediaire')
    const { allPass } = useCompositionCheck(keyword, level)
    expect(allPass.value).toBe(true)

    // Same keyword as pilier → missing location
    level.value = 'pilier'
    await nextTick()
    expect(allPass.value).toBe(false)
  })

  it('warningCount matches warnings array length', () => {
    const keyword = ref('test keyword')
    const level = ref<ArticleLevel>('pilier')
    const { warnings, warningCount } = useCompositionCheck(keyword, level)
    expect(warningCount.value).toBe(warnings.value.length)
  })
})
