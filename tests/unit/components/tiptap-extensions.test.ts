import { describe, it, expect } from 'vitest'
import { ContentValeur } from '../../../src/components/editor/tiptap/extensions/content-valeur'
import { ContentReminder } from '../../../src/components/editor/tiptap/extensions/content-reminder'
import { AnswerCapsule } from '../../../src/components/editor/tiptap/extensions/answer-capsule'
import { InternalLink } from '../../../src/components/editor/tiptap/extensions/internal-link'

describe('TipTap custom extensions', () => {
  describe('ContentValeur', () => {
    it('parses div.content-valeur HTML', () => {
      expect(ContentValeur.config.name).toBe('contentValeur')

      const parseRules = ContentValeur.config.parseHTML!()
      expect(parseRules).toEqual([{ tag: 'div.content-valeur' }])
    })

    it('renders with correct class', () => {
      const renderResult = ContentValeur.config.renderHTML!({ HTMLAttributes: {} } as any)
      expect(renderResult[0]).toBe('div')
      expect(renderResult[1]).toEqual(expect.objectContaining({ class: 'content-valeur' }))
      expect(renderResult[2]).toBe(0) // content hole
    })
  })

  describe('ContentReminder', () => {
    it('parses div.content-reminder HTML', () => {
      expect(ContentReminder.config.name).toBe('contentReminder')

      const parseRules = ContentReminder.config.parseHTML!()
      expect(parseRules).toEqual([{ tag: 'div.content-reminder' }])
    })
  })

  describe('AnswerCapsule', () => {
    it('parses p.answer-capsule HTML', () => {
      expect(AnswerCapsule.config.name).toBe('answerCapsule')

      const parseRules = AnswerCapsule.config.parseHTML!()
      expect(parseRules).toEqual([{ tag: 'p.answer-capsule' }])
    })
  })

  describe('InternalLink', () => {
    it('is a mark with slug and href attributes', () => {
      expect(InternalLink.config.name).toBe('internalLink')

      const parseRules = InternalLink.config.parseHTML!()
      expect(parseRules).toEqual([{ tag: 'a.internal-link' }])
    })

    it('defines slug and href attributes', () => {
      const attrs = InternalLink.config.addAttributes!.call({} as any)
      expect(attrs).toHaveProperty('slug')
      expect(attrs).toHaveProperty('href')
      expect(attrs.slug.default).toBeNull()
      expect(attrs.href.default).toBeNull()
    })
  })
})
