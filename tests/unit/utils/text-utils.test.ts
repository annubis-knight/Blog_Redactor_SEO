import { describe, it, expect } from 'vitest'
import {
  stripHtml,
  countWordsFromHtml,
  splitArticleByH2,
  validateHtmlStructurePreserved,
  parseNormalizedTags,
} from '../../../src/utils/text-utils'

// ---------------------------------------------------------------------------
// stripHtml (kept from original file)
// ---------------------------------------------------------------------------

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World')
  })

  it('normalizes whitespace', () => {
    expect(stripHtml('<p>Hello</p>   <p>World</p>')).toBe('Hello World')
  })

  it('handles empty strings', () => {
    expect(stripHtml('')).toBe('')
  })

  it('returns plain text intact when no HTML', () => {
    expect(stripHtml('plain text')).toBe('plain text')
  })

  it('strips attributes from tags', () => {
    expect(stripHtml('<a href="https://example.com" class="link">Link</a>')).toBe('Link')
  })

  it('handles self-closing tags', () => {
    expect(stripHtml('Before<br/>After')).toBe('Before After')
  })
})

// ---------------------------------------------------------------------------
// countWordsFromHtml
// ---------------------------------------------------------------------------

describe('countWordsFromHtml', () => {
  it('counts words in a simple paragraph', () => {
    expect(countWordsFromHtml('<p>Hello world this is a test</p>')).toBe(6)
  })

  it('counts words across nested tags', () => {
    expect(countWordsFromHtml('<p>Hello <strong>bold <em>italic</em></strong> world</p>')).toBe(4)
  })

  it('handles multiple whitespace as separators', () => {
    expect(countWordsFromHtml('<p>Hello    world</p>')).toBe(2)
  })

  it('returns 0 for empty HTML', () => {
    expect(countWordsFromHtml('')).toBe(0)
  })

  it('returns 0 for null-ish falsy input', () => {
    expect(countWordsFromHtml(undefined as unknown as string)).toBe(0)
  })

  it('treats &nbsp; entity as non-separator (regex stripHtml does not decode entities)', () => {
    // stripHtml uses regex, NOT DOMParser, so &nbsp; stays as literal text
    // "Hello&nbsp;World" is treated as a single token.
    expect(countWordsFromHtml('<p>Hello&nbsp;World</p>')).toBe(1)
  })

  it('returns 0 for whitespace-only HTML', () => {
    expect(countWordsFromHtml('<p>   </p>')).toBe(0)
  })

  it('counts words across multiple block elements', () => {
    expect(countWordsFromHtml('<p>One two</p><p>Three four five</p>')).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// splitArticleByH2
// ---------------------------------------------------------------------------

describe('splitArticleByH2', () => {
  it('splits a normal article with intro + 3 H2 sections', () => {
    const html = [
      '<p>Intro paragraph one.</p>',
      '<p>Intro paragraph two.</p>',
      '<h2>Section One</h2>',
      '<p>Content of section one.</p>',
      '<h2>Section Two</h2>',
      '<p>Content of section two.</p>',
      '<h2>Section Three</h2>',
      '<p>Content of section three.</p>',
    ].join('')

    const result = splitArticleByH2(html)

    expect(result.intro).toContain('Intro paragraph one.')
    expect(result.intro).toContain('Intro paragraph two.')
    expect(result.sections).toHaveLength(3)

    expect(result.sections[0]!.index).toBe(0)
    expect(result.sections[0]!.title).toBe('Section One')
    expect(result.sections[0]!.html).toContain('<h2>Section One</h2>')
    expect(result.sections[0]!.html).toContain('Content of section one.')

    expect(result.sections[1]!.index).toBe(1)
    expect(result.sections[1]!.title).toBe('Section Two')
    expect(result.sections[1]!.html).toContain('<h2>Section Two</h2>')
    expect(result.sections[1]!.html).toContain('Content of section two.')

    expect(result.sections[2]!.index).toBe(2)
    expect(result.sections[2]!.title).toBe('Section Three')
    expect(result.sections[2]!.html).toContain('<h2>Section Three</h2>')
    expect(result.sections[2]!.html).toContain('Content of section three.')
  })

  it('returns { intro: fullHtml, sections: [] } when no H2 is present', () => {
    const html = '<p>Just a paragraph.</p><p>Another one.</p>'
    const result = splitArticleByH2(html)

    expect(result.intro).toBe(html)
    expect(result.sections).toEqual([])
  })

  it('returns { intro: "", sections: [] } for empty HTML', () => {
    const result = splitArticleByH2('')
    expect(result.intro).toBe('')
    expect(result.sections).toEqual([])
  })

  it('returns empty intro when HTML starts directly with H2 (no intro before)', () => {
    const html = '<h2>First</h2><p>Content.</p><h2>Second</h2><p>More.</p>'
    const result = splitArticleByH2(html)

    expect(result.intro).toBe('')
    expect(result.sections).toHaveLength(2)
    expect(result.sections[0]!.title).toBe('First')
    expect(result.sections[1]!.title).toBe('Second')
  })

  it('includes nested content (H3, p, ul, li) in the section html', () => {
    const html = [
      '<h2>Main Section</h2>',
      '<p>Intro to section.</p>',
      '<h3>Subsection</h3>',
      '<ul><li>Item A</li><li>Item B</li></ul>',
      '<p>Final paragraph.</p>',
    ].join('')

    const result = splitArticleByH2(html)

    expect(result.sections).toHaveLength(1)
    const section = result.sections[0]!
    expect(section.html).toContain('<h3>Subsection</h3>')
    expect(section.html).toContain('<ul>')
    expect(section.html).toContain('<li>Item A</li>')
    expect(section.html).toContain('<li>Item B</li>')
    expect(section.html).toContain('Final paragraph.')
  })

  it('preserves text nodes between elements (finding F4: uses childNodes not children)', () => {
    const html = '<p>Intro.</p><h2>Title</h2>Some text node between<p>Block content</p>'
    const result = splitArticleByH2(html)

    expect(result.sections).toHaveLength(1)
    expect(result.sections[0]!.html).toContain('Some text node between')
    expect(result.sections[0]!.html).toContain('Block content')
  })

  it('preserves HTML comments in section output when DOMParser keeps them', () => {
    // DOMParser may strip comments appearing before block elements at the
    // start of <body>, but preserves comments appearing between siblings.
    // The serialize() function handles comment nodes (nodeType 8) correctly.
    const html = '<p>Intro.</p><h2>Title</h2><!-- section comment --><p>Content.</p>'
    const result = splitArticleByH2(html)

    expect(result.sections).toHaveLength(1)
    expect(result.sections[0]!.html).toContain('<!-- section comment -->')
  })

  it('handles malformed HTML gracefully with fallback { intro: html, sections: [] }', () => {
    // DOMParser in jsdom will still parse this, but the absence of valid H2
    // tags means it falls through to the "no sections found" fallback.
    const malformed = '<<<not really html at all>>>'
    const result = splitArticleByH2(malformed)

    expect(result.intro).toBe(malformed)
    expect(result.sections).toEqual([])
  })

  it('handles a single H2 with no following content', () => {
    const html = '<p>Intro.</p><h2>Alone</h2>'
    const result = splitArticleByH2(html)

    expect(result.intro).toContain('Intro.')
    expect(result.sections).toHaveLength(1)
    expect(result.sections[0]!.title).toBe('Alone')
    expect(result.sections[0]!.html).toContain('<h2>Alone</h2>')
  })
})

// ---------------------------------------------------------------------------
// validateHtmlStructurePreserved
// ---------------------------------------------------------------------------

describe('validateHtmlStructurePreserved', () => {
  it('returns preserved: true for identical HTML', () => {
    const html = '<p>Hello <strong>world</strong></p>'
    const result = validateHtmlStructurePreserved(html, html)

    expect(result.preserved).toBe(true)
  })

  it('detects an added tag as reason "extra"', () => {
    const original = '<p>Hello</p>'
    const modified = '<p>Hello</p><p>Extra</p>'
    const result = validateHtmlStructurePreserved(original, modified)

    expect(result.preserved).toBe(false)
    expect(result.diff?.reason).toBe('extra')
  })

  it('detects a removed tag as reason "missing"', () => {
    const original = '<p>Hello</p><p>World</p>'
    const modified = '<p>Hello World</p>'
    const result = validateHtmlStructurePreserved(original, modified)

    expect(result.preserved).toBe(false)
    expect(result.diff?.reason).toBe('missing')
  })

  it('detects a changed tag name as reason "tag-name"', () => {
    const original = '<p>Hello</p>'
    const modified = '<div>Hello</div>'
    const result = validateHtmlStructurePreserved(original, modified)

    expect(result.preserved).toBe(false)
    expect(result.diff?.reason).toBe('tag-name')
  })

  it('detects a changed whitelisted attr value (href) as reason "attr-value"', () => {
    const original = '<a href="https://example.com">Link</a>'
    const modified = '<a href="https://other.com">Link</a>'
    const result = validateHtmlStructurePreserved(original, modified)

    expect(result.preserved).toBe(false)
    expect(result.diff?.reason).toBe('attr-value')
    expect(result.diff?.expected).toContain('href')
  })

  it('detects an added whitelisted attr as reason "attr"', () => {
    const original = '<p>Hello</p>'
    const modified = '<p class="new-class">Hello</p>'
    const result = validateHtmlStructurePreserved(original, modified)

    expect(result.preserved).toBe(false)
    expect(result.diff?.reason).toBe('attr')
  })

  it('ignores non-whitelisted attr changes (style, title) and returns preserved: true', () => {
    const original = '<p style="color:red" title="old">Hello</p>'
    const modified = '<p style="color:blue" title="new">Hello</p>'
    const result = validateHtmlStructurePreserved(original, modified)

    expect(result.preserved).toBe(true)
  })

  it('normalizes <br> vs <br/> — returns preserved: true', () => {
    const original = '<p>Hello<br>World</p>'
    const modified = '<p>Hello<br/>World</p>'
    const result = validateHtmlStructurePreserved(original, modified)

    expect(result.preserved).toBe(true)
  })

  it('preserves TipTap custom blocks: class="content-valeur" data-block-id="cv-42"', () => {
    const html = '<div class="content-valeur" data-block-id="cv-42"><p>Value block</p></div>'
    const result = validateHtmlStructurePreserved(html, html)

    expect(result.preserved).toBe(true)

    // Verify the attributes were actually parsed
    const tags = parseNormalizedTags(html)
    const divTag = tags.find(t => t.name === 'div' && !t.closing)
    expect(divTag).toBeDefined()
    expect(divTag!.attrs['class']).toBe('content-valeur')
    expect(divTag!.attrs['data-block-id']).toBe('cv-42')
  })

  it('compares data-* attributes correctly', () => {
    const original = '<div data-type="capsule" data-id="123"><p>Content</p></div>'
    const modified = '<div data-type="capsule" data-id="456"><p>Content</p></div>'
    const result = validateHtmlStructurePreserved(original, modified)

    expect(result.preserved).toBe(false)
    expect(result.diff?.reason).toBe('attr-value')
    expect(result.diff?.expected).toContain('data-id')
  })

  it('AC 26: detects if Claude changes class="internal-link" to class="link"', () => {
    const original = '<a href="/page" class="internal-link">Link text</a>'
    const modified = '<a href="/page" class="link">Link text</a>'
    const result = validateHtmlStructurePreserved(original, modified)

    expect(result.preserved).toBe(false)
    expect(result.diff?.reason).toBe('attr-value')
    expect(result.diff?.expected).toContain('class')
    expect(result.diff?.expected).toContain('internal-link')
    expect(result.diff?.got).toContain('link')
  })

  it('returns preserved: true when only text content changes', () => {
    const original = '<p>Original text</p>'
    const modified = '<p>Modified text</p>'
    const result = validateHtmlStructurePreserved(original, modified)

    expect(result.preserved).toBe(true)
  })

  it('detects removed whitelisted attr as reason "attr"', () => {
    const original = '<a href="https://example.com" class="link">Link</a>'
    const modified = '<a href="https://example.com">Link</a>'
    const result = validateHtmlStructurePreserved(original, modified)

    expect(result.preserved).toBe(false)
    expect(result.diff?.reason).toBe('attr')
  })

  it('handles empty strings', () => {
    const result = validateHtmlStructurePreserved('', '')
    expect(result.preserved).toBe(true)
    expect(result.originalTags).toEqual([])
    expect(result.modifiedTags).toEqual([])
  })

  it('detects closing tag mismatch as "tag-name"', () => {
    const original = '<p>Hello</p>'
    const modified = '<p>Hello</div>'
    const result = validateHtmlStructurePreserved(original, modified)

    expect(result.preserved).toBe(false)
    expect(result.diff?.reason).toBe('tag-name')
  })

  it('ignores style attribute entirely', () => {
    const original = '<p>Hello</p>'
    const modified = '<p style="font-weight:bold">Hello</p>'
    const result = validateHtmlStructurePreserved(original, modified)

    // style is not whitelisted, so it is ignored -> same tag set
    expect(result.preserved).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// parseNormalizedTags (edge cases)
// ---------------------------------------------------------------------------

describe('parseNormalizedTags', () => {
  it('parses self-closing void elements', () => {
    const tags = parseNormalizedTags('<br><hr/><img src="x.png">')
    expect(tags).toHaveLength(3)
    expect(tags[0]!.name).toBe('br')
    expect(tags[0]!.selfClosing).toBe(true)
    expect(tags[1]!.name).toBe('hr')
    expect(tags[1]!.selfClosing).toBe(true)
    expect(tags[2]!.name).toBe('img')
    expect(tags[2]!.selfClosing).toBe(true)
    // src is not whitelisted
    expect(tags[2]!.attrs).toEqual({})
  })

  it('captures only whitelisted attributes', () => {
    const tags = parseNormalizedTags('<a href="/page" class="link" style="color:red" title="tip" data-foo="bar">')
    expect(tags).toHaveLength(1)
    const t = tags[0]!
    expect(t.attrs['href']).toBe('/page')
    expect(t.attrs['class']).toBe('link')
    expect(t.attrs['data-foo']).toBe('bar')
    expect(t.attrs['style']).toBeUndefined()
    expect(t.attrs['title']).toBeUndefined()
  })

  it('returns empty array for text-only input', () => {
    expect(parseNormalizedTags('Just plain text')).toEqual([])
  })

  it('handles closing tags', () => {
    const tags = parseNormalizedTags('</p></div>')
    expect(tags).toHaveLength(2)
    expect(tags[0]!.closing).toBe(true)
    expect(tags[0]!.name).toBe('p')
    expect(tags[1]!.closing).toBe(true)
    expect(tags[1]!.name).toBe('div')
  })
})
