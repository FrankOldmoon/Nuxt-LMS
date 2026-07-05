import { describe, it, expect } from 'vitest'
import { extractTocFromContent } from '../../app/utils/toc'

function heading(id: string, level: number, text: string, content?: any) {
  return {
    type: 'heading',
    attrs: { id, level },
    content: content ?? [{ type: 'text', text }],
  }
}

function paragraph(text: string) {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  }
}

describe('extractTocFromContent', () => {
  it('returns empty array for null', () => {
    expect(extractTocFromContent(null)).toEqual([])
  })

  it('returns empty array for undefined', () => {
    expect(extractTocFromContent(undefined)).toEqual([])
  })

  it('returns empty array for content with no headings', () => {
    const content = { type: 'doc', content: [paragraph('hello')] }
    expect(extractTocFromContent(content)).toEqual([])
  })

  it('extracts a single heading', () => {
    const content = {
      type: 'doc',
      content: [heading('h1', 1, 'Title')],
    }
    const result = extractTocFromContent(content)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('h1')
    expect(result[0].text).toBe('Title')
    expect(result[0].children).toBeUndefined()
  })

  it('extracts multiple same-level headings as flat list', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, 'First'),
        heading('h2', 1, 'Second'),
      ],
    }
    const result = extractTocFromContent(content)
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('First')
    expect(result[1].text).toBe('Second')
    expect(result[0].children).toBeUndefined()
    expect(result[1].children).toBeUndefined()
  })

  it('nests h2 under h1', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, 'Parent'),
        heading('h2', 2, 'Child'),
      ],
    }
    const result = extractTocFromContent(content)
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Parent')
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].text).toBe('Child')
  })

  it('nests h3 under h2 under h1', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, 'L1'),
        heading('h2', 2, 'L2'),
        heading('h3', 3, 'L3'),
      ],
    }
    const result = extractTocFromContent(content)
    expect(result).toHaveLength(1)
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].children).toHaveLength(1)
    expect(result[0].children![0].children![0].text).toBe('L3')
  })

  it('handles level jump from h1 to h3 (skipping h2)', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, 'L1'),
        heading('h3', 3, 'L3'),
      ],
    }
    const result = extractTocFromContent(content)
    expect(result).toHaveLength(1)
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].text).toBe('L3')
  })

  it('handles heading going back to lower level after nested', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, 'First'),
        heading('h2', 2, 'Sub'),
        heading('h1', 1, 'Second'),
      ],
    }
    const result = extractTocFromContent(content)
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('First')
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].text).toBe('Sub')
    expect(result[1].text).toBe('Second')
    expect(result[1].children).toBeUndefined()
  })

  it('skips headings without id', () => {
    const content = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'No ID' }] },
        heading('h1', 1, 'Has ID'),
      ],
    }
    const result = extractTocFromContent(content)
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Has ID')
  })

  it('skips headings without text', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, ''),
        heading('h2', 1, 'Has Text'),
      ],
    }
    const result = extractTocFromContent(content)
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Has Text')
  })

  it('supports data-toc-id as alternative id source', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { 'data-toc-id': 'alt-id', level: 1 },
          content: [{ type: 'text', text: 'Alt' }],
        },
      ],
    }
    const result = extractTocFromContent(content)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('alt-id')
  })

  it('extracts text from nested inline content', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { id: 'h1', level: 1 },
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'World' },
          ],
        },
      ],
    }
    const result = extractTocFromContent(content)
    expect(result[0].text).toBe('Hello World')
  })

  it('handles deeply nested content structures', () => {
    const content = {
      type: 'doc',
      content: [
        heading('h1', 1, 'Title'),
        {
          type: 'paragraph',
          content: [
            {
              type: 'nestedBlock',
              content: [
                heading('h2', 2, 'Deep Heading'),
              ],
            },
          ],
        },
      ],
    }
    const result = extractTocFromContent(content)
    expect(result).toHaveLength(1)
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].text).toBe('Deep Heading')
  })
})
