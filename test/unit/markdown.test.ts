import { describe, it, expect } from 'vitest'
import { markdownToTiptap } from '../../app/utils/markdown'

describe('markdownToTiptap', () => {
  it('returns empty doc for empty string', () => {
    const result = markdownToTiptap('')
    expect(result).toEqual({ type: 'doc', content: [] })
  })

  it('returns empty doc for whitespace-only string', () => {
    const result = markdownToTiptap('   \n  \n  ')
    expect(result).toEqual({ type: 'doc', content: [] })
  })

  it('normalizes CRLF to LF', () => {
    const result = markdownToTiptap('line1\r\nline2')
    expect(result.type).toBe('doc')
    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('paragraph')
  })

  it('returns doc type', () => {
    const result = markdownToTiptap('hello')
    expect(result.type).toBe('doc')
  })

  describe('paragraphs', () => {
    it('parses a simple paragraph', () => {
      const result = markdownToTiptap('Hello world')
      expect(result.content[0].type).toBe('paragraph')
      expect(result.content[0].content[0]).toEqual({ type: 'text', text: 'Hello world' })
    })

    it('merges consecutive non-block lines into one paragraph', () => {
      const result = markdownToTiptap('line1\nline2')
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('paragraph')
      expect(result.content[0].content[0].text).toBe('line1 line2')
    })

    it('separates paragraphs by empty lines', () => {
      const result = markdownToTiptap('para1\n\npara2')
      expect(result.content).toHaveLength(2)
      expect(result.content[0].content[0].text).toBe('para1')
      expect(result.content[1].content[0].text).toBe('para2')
    })
  })

  describe('headings', () => {
    it('parses h1', () => {
      const result = markdownToTiptap('# Title')
      expect(result.content[0].type).toBe('heading')
      expect(result.content[0].attrs.level).toBe(1)
      expect(result.content[0].content[0].text).toBe('Title')
    })

    it('parses h2', () => {
      const result = markdownToTiptap('## Subtitle')
      expect(result.content[0].attrs.level).toBe(2)
    })

    it('parses h6', () => {
      const result = markdownToTiptap('###### Deep')
      expect(result.content[0].attrs.level).toBe(6)
    })

    it('requires space after #', () => {
      const result = markdownToTiptap('#NoSpace')
      expect(result.content[0].type).toBe('paragraph')
    })
  })

  describe('code blocks', () => {
    it('parses a code block with language', () => {
      const result = markdownToTiptap('```js\nconst x = 1\n```')
      expect(result.content[0].type).toBe('codeBlock')
      expect(result.content[0].attrs.language).toBe('js')
      expect(result.content[0].content[0].text).toBe('const x = 1')
    })

    it('parses a code block without language', () => {
      const result = markdownToTiptap('```\nplain text\n```')
      expect(result.content[0].type).toBe('codeBlock')
      expect(result.content[0].attrs.language).toBe('')
    })

    it('handles multi-line code blocks', () => {
      const result = markdownToTiptap('```\nline1\nline2\nline3\n```')
      expect(result.content[0].content[0].text).toBe('line1\nline2\nline3')
    })
  })

  describe('blockquotes', () => {
    it('parses a blockquote', () => {
      const result = markdownToTiptap('> quoted text')
      expect(result.content[0].type).toBe('blockquote')
      expect(result.content[0].content[0].type).toBe('paragraph')
    })

    it('parses multi-line blockquote', () => {
      const result = markdownToTiptap('> line1\n> line2')
      expect(result.content[0].type).toBe('blockquote')
    })
  })

  describe('lists', () => {
    it('parses unordered list with -', () => {
      const result = markdownToTiptap('- item1\n- item2')
      expect(result.content[0].type).toBe('bulletList')
      expect(result.content[0].content).toHaveLength(2)
      expect(result.content[0].content[0].type).toBe('listItem')
    })

    it('parses unordered list with *', () => {
      const result = markdownToTiptap('* item1\n* item2')
      expect(result.content[0].type).toBe('bulletList')
    })

    it('parses unordered list with +', () => {
      const result = markdownToTiptap('+ item1\n+ item2')
      expect(result.content[0].type).toBe('bulletList')
    })

    it('parses ordered list', () => {
      const result = markdownToTiptap('1. first\n2. second')
      expect(result.content[0].type).toBe('orderedList')
      expect(result.content[0].content).toHaveLength(2)
    })
  })

  describe('horizontal rule', () => {
    it('parses ---', () => {
      const result = markdownToTiptap('---')
      expect(result.content[0].type).toBe('horizontalRule')
    })

    it('parses ------', () => {
      const result = markdownToTiptap('------')
      expect(result.content[0].type).toBe('horizontalRule')
    })
  })

  describe('inline marks', () => {
    it('parses bold with **', () => {
      const result = markdownToTiptap('**bold**')
      expect(result.content[0].content[0]).toEqual({
        type: 'text',
        text: 'bold',
        marks: [{ type: 'bold' }],
      })
    })

    it('parses bold with __', () => {
      const result = markdownToTiptap('__bold__')
      expect(result.content[0].content[0]).toEqual({
        type: 'text',
        text: 'bold',
        marks: [{ type: 'bold' }],
      })
    })

    it('parses italic with *', () => {
      const result = markdownToTiptap('*italic*')
      expect(result.content[0].content[0]).toEqual({
        type: 'text',
        text: 'italic',
        marks: [{ type: 'italic' }],
      })
    })

    it('parses italic with _', () => {
      const result = markdownToTiptap('_italic_')
      expect(result.content[0].content[0]).toEqual({
        type: 'text',
        text: 'italic',
        marks: [{ type: 'italic' }],
      })
    })

    it('parses bold+italic with ***', () => {
      const result = markdownToTiptap('***both***')
      expect(result.content[0].content[0].marks).toContainEqual({ type: 'bold' })
      expect(result.content[0].content[0].marks).toContainEqual({ type: 'italic' })
    })

    it('parses strikethrough with ~~', () => {
      const result = markdownToTiptap('~~struck~~')
      expect(result.content[0].content[0]).toEqual({
        type: 'text',
        text: 'struck',
        marks: [{ type: 'strike' }],
      })
    })

    it('parses inline code with backticks', () => {
      const result = markdownToTiptap('`code`')
      expect(result.content[0].content[0]).toEqual({
        type: 'text',
        text: 'code',
        marks: [{ type: 'code' }],
      })
    })
  })

  describe('links and images', () => {
    it('parses a link', () => {
      const result = markdownToTiptap('[text](https://example.com)')
      const textNode = result.content[0].content[0]
      expect(textNode.type).toBe('text')
      expect(textNode.text).toBe('text')
      expect(textNode.marks[0]).toEqual({
        type: 'link',
        attrs: { href: 'https://example.com', title: null },
      })
    })

    it('parses a link with title', () => {
      const result = markdownToTiptap('[text](https://example.com "Title")')
      expect(result.content[0].content[0].marks[0].attrs.title).toBe('Title')
    })

    it('parses an image', () => {
      const result = markdownToTiptap('![alt](https://example.com/img.png)')
      expect(result.content[0].content[0]).toEqual({
        type: 'image',
        attrs: {
          src: 'https://example.com/img.png',
          alt: 'alt',
          title: null,
        },
      })
    })

    it('parses an image with title', () => {
      const result = markdownToTiptap('![alt](https://example.com/img.png "Pic")')
      expect(result.content[0].content[0].attrs.title).toBe('Pic')
    })
  })

  describe('special inline syntax', () => {
    it('parses {{xxx}} as inputs node', () => {
      const result = markdownToTiptap('{{placeholder}}')
      expect(result.content[0].content[0]).toEqual({
        type: 'inputs',
        attrs: { content: '' },
      })
    })

    it('parses ||content|| as select node', () => {
      const result = markdownToTiptap('||option||')
      expect(result.content[0].content[0]).toEqual({
        type: 'select',
        attrs: { content: 'option' },
      })
    })
  })

  describe('mixed content', () => {
    it('handles text with mixed inline marks', () => {
      const result = markdownToTiptap('normal **bold** normal')
      const nodes = result.content[0].content
      expect(nodes).toHaveLength(3)
      expect(nodes[0].text).toBe('normal ')
      expect(nodes[1].text).toBe('bold')
      expect(nodes[1].marks[0].type).toBe('bold')
      expect(nodes[2].text).toBe(' normal')
    })

    it('handles multiple block types', () => {
      const md = '# Title\n\nparagraph\n\n- list item\n\n```js\ncode\n```'
      const result = markdownToTiptap(md)
      const types = result.content.map(b => b.type)
      expect(types).toEqual(['heading', 'paragraph', 'bulletList', 'codeBlock'])
    })
  })
})
