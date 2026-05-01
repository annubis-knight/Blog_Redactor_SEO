import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KeywordWords from '../../../src/components/intent/KeywordWords.vue'

function mountKeywordWords(props: {
  words: string[]
  activeIndices: number[]
  loading?: boolean
}) {
  return mount(KeywordWords, {
    props: { loading: false, ...props },
  })
}

describe('KeywordWords (F4 — suppression arbitraire)', () => {
  const words = ['creation', 'site', 'web', 'entreprise', 'toulouse']

  it('renders all words', () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2, 3, 4] })
    const spans = wrapper.findAll('.kw-word')
    expect(spans).toHaveLength(5)
    expect(spans[0].text()).toBe('creation')
    expect(spans[4].text()).toBe('toulouse')
  })

  it('applies active class to indices in activeIndices', () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2] })
    const spans = wrapper.findAll('.kw-word')
    expect(spans[0].classes()).toContain('kw-word--active')
    expect(spans[1].classes()).toContain('kw-word--active')
    expect(spans[2].classes()).toContain('kw-word--active')
  })

  it('applies inactive class to indices NOT in activeIndices', () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 2, 4] })
    const spans = wrapper.findAll('.kw-word')
    expect(spans[1].classes()).toContain('kw-word--inactive')
    expect(spans[3].classes()).toContain('kw-word--inactive')
  })

  it('clicking an active word emits update:activeIndices without that index', async () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2, 3, 4] })
    const spans = wrapper.findAll('.kw-word')
    // Click "entreprise" (index 3)
    await spans[3].trigger('click')
    expect(wrapper.emitted('update:activeIndices')).toBeTruthy()
    expect(wrapper.emitted('update:activeIndices')![0]).toEqual([[0, 1, 2, 4]])
  })

  it('clicking an inactive word emits update:activeIndices with that index added (sorted)', async () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2] })
    const spans = wrapper.findAll('.kw-word')
    // Click "entreprise" (index 3, inactive)
    await spans[3].trigger('click')
    expect(wrapper.emitted('update:activeIndices')![0]).toEqual([[0, 1, 2, 3]])
  })

  it('F4 — can remove the first word (previously impossible with truncation)', async () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2, 3, 4] })
    const spans = wrapper.findAll('.kw-word')
    // Click "creation" (index 0) — désactivation arbitraire
    await spans[0].trigger('click')
    expect(wrapper.emitted('update:activeIndices')![0]).toEqual([[1, 2, 3, 4]])
  })

  it('F4 — refuse to deactivate if less than 2 significant words would remain', async () => {
    // "site" est un mot significatif; si on retire "creation" et "web", il ne reste que "site" (1 significatif)
    const wrapper = mountKeywordWords({ words: ['creation', 'site', 'web'], activeIndices: [1, 2] })
    const spans = wrapper.findAll('.kw-word')
    // Essayer de désactiver "site" (index 1) → refusé car ne resterait que "web" (1 significatif)
    await spans[1].trigger('click')
    expect(wrapper.emitted('update:activeIndices')).toBeFalsy()
  })

  it('shows loading spinner when loading is true', () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2, 3, 4], loading: true })
    expect(wrapper.find('.kw-loading').exists()).toBe(true)
  })

  it('does not show loading spinner when loading is false', () => {
    const wrapper = mountKeywordWords({ words, activeIndices: [0, 1, 2, 3, 4], loading: false })
    expect(wrapper.find('.kw-loading').exists()).toBe(false)
  })

  it('applies kw-word--locked class when deactivation would violate minimum', () => {
    // 2 mots significatifs actifs : désactiver l'un violerait la règle
    const wrapper = mountKeywordWords({ words: ['creation', 'site'], activeIndices: [0, 1] })
    const spans = wrapper.findAll('.kw-word')
    // Les 2 mots sont considérés "locked" car on ne peut pas les retirer
    expect(spans[0].classes()).toContain('kw-word--locked')
    expect(spans[1].classes()).toContain('kw-word--locked')
  })
})

/**
 * Tests pour la sanctuarisation des N premiers mots significatifs (lockedLeftWords).
 *
 * Différence cruciale avec --locked :
 *   - --locked : garde-fou réactif (ne peut plus désactiver après-coup)
 *   - --sanctuary : visuellement non-cliquable d'emblée (ancrage racine capitaine)
 */
describe('KeywordWords — lockedLeftWords (sanctuarisation)', () => {
  function mountWithLocked(props: {
    words: string[]
    activeIndices: number[]
    lockedLeftWords?: number
  }) {
    return mount(KeywordWords, {
      props: { loading: false, ...props },
    })
  }

  it('lockedLeftWords=0 (défaut) : aucun mot sanctuarisé', () => {
    const wrapper = mountWithLocked({
      words: ['agence', 'referencement', 'naturel', 'paris'],
      activeIndices: [0, 1, 2, 3],
    })
    const spans = wrapper.findAll('.kw-word')
    spans.forEach(s => {
      expect(s.classes()).not.toContain('kw-word--sanctuary')
    })
  })

  it('lockedLeftWords=2 : les 2 premiers mots significatifs ont la classe --sanctuary', () => {
    const wrapper = mountWithLocked({
      words: ['agence', 'referencement', 'naturel', 'paris'],
      activeIndices: [0, 1, 2, 3],
      lockedLeftWords: 2,
    })
    const spans = wrapper.findAll('.kw-word')
    expect(spans[0].classes()).toContain('kw-word--sanctuary')
    expect(spans[1].classes()).toContain('kw-word--sanctuary')
    expect(spans[2].classes()).not.toContain('kw-word--sanctuary')
    expect(spans[3].classes()).not.toContain('kw-word--sanctuary')
  })

  it('REGRESSION GUARD : les stopwords ne consomment pas les slots de sanctuarisation', () => {
    // Cas "agence de seo a paris" : "de" et "a" sont stopwords français.
    // lockedLeftWords=2 doit sanctuariser uniquement les mots significatifs :
    // → "agence" (slot 1) puis "seo" (slot 2). "de" et "a" sont ignorés
    //   (non sanctuarisés mais aussi non comptés). "paris" reste cliquable.
    const wrapper = mountWithLocked({
      words: ['agence', 'de', 'seo', 'a', 'paris'],
      activeIndices: [0, 1, 2, 3, 4],
      lockedLeftWords: 2,
    })
    const spans = wrapper.findAll('.kw-word')
    expect(spans[0].classes()).toContain('kw-word--sanctuary') // agence (slot 1)
    expect(spans[1].classes()).not.toContain('kw-word--sanctuary') // de (stopword)
    expect(spans[2].classes()).toContain('kw-word--sanctuary') // seo (slot 2)
    expect(spans[3].classes()).not.toContain('kw-word--sanctuary') // a (stopword)
    expect(spans[4].classes()).not.toContain('kw-word--sanctuary') // paris (cliquable)
  })

  it('clic sur un mot sanctuarisé → AUCUN emit update:activeIndices', async () => {
    const wrapper = mountWithLocked({
      words: ['agence', 'referencement', 'naturel'],
      activeIndices: [0, 1, 2],
      lockedLeftWords: 2,
    })
    await wrapper.find('[data-testid="kw-word-0"]').trigger('click')
    await wrapper.find('[data-testid="kw-word-1"]').trigger('click')
    expect(wrapper.emitted('update:activeIndices')).toBeFalsy()
  })

  it('clic sur un mot non sanctuarisé → emit normal', async () => {
    const wrapper = mountWithLocked({
      words: ['agence', 'referencement', 'naturel', 'paris'],
      activeIndices: [0, 1, 2, 3],
      lockedLeftWords: 2,
    })
    // "paris" (index 3) n'est pas sanctuarisé → désactivable
    await wrapper.find('[data-testid="kw-word-3"]').trigger('click')
    expect(wrapper.emitted('update:activeIndices')).toBeTruthy()
    expect(wrapper.emitted('update:activeIndices')![0]).toEqual([[0, 1, 2]])
  })

  it('REGRESSION GUARD : data-sanctuary attribut présent pour debugging/CSS hooks', () => {
    // "agence" + "seo" + "paris" : tous significatifs, lockedLeftWords=2
    // → kw-word-0 et kw-word-1 sanctuarisés, kw-word-2 non
    const wrapper = mountWithLocked({
      words: ['agence', 'seo', 'paris'],
      activeIndices: [0, 1, 2],
      lockedLeftWords: 2,
    })
    expect(wrapper.find('[data-testid="kw-word-0"]').attributes('data-sanctuary')).toBe('true')
    expect(wrapper.find('[data-testid="kw-word-1"]').attributes('data-sanctuary')).toBe('true')
    expect(wrapper.find('[data-testid="kw-word-2"]').attributes('data-sanctuary')).toBe('false')
  })

  it('tooltip explicite sur les mots sanctuarisés', () => {
    const wrapper = mountWithLocked({
      words: ['agence', 'seo', 'paris'],
      activeIndices: [0, 1, 2],
      lockedLeftWords: 2,
    })
    expect(wrapper.find('[data-testid="kw-word-0"]').attributes('title'))
      .toContain('ancré dans la racine du capitaine')
  })

  it('lockedLeftWords > nombre de mots significatifs : sanctuarise tout ce qui peut l\'être', () => {
    // Seulement "agence" et "seo" sont significatifs, mais on demande 5 sanctuarisations
    const wrapper = mountWithLocked({
      words: ['agence', 'seo'],
      activeIndices: [0, 1],
      lockedLeftWords: 5,
    })
    const spans = wrapper.findAll('.kw-word')
    expect(spans[0].classes()).toContain('kw-word--sanctuary')
    expect(spans[1].classes()).toContain('kw-word--sanctuary')
    // Aucun crash, aucune sanctuarisation au-delà des mots disponibles.
  })

  it('Alt+clic sur un sanctuarisé → événement consommé mais aucun emit modifier-cycle', async () => {
    const wrapper = mountWithLocked({
      words: ['agence', 'seo', 'paris'],
      activeIndices: [0, 1, 2],
      lockedLeftWords: 2,
    })
    await wrapper.find('[data-testid="kw-word-0"]').trigger('click', { altKey: true })
    expect(wrapper.emitted('modifier-cycle')).toBeFalsy()
    expect(wrapper.emitted('update:activeIndices')).toBeFalsy()
  })
})
