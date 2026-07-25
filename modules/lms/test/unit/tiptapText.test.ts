/**
 * tiptapText.ts 单元测试
 *
 * 覆盖：
 * - extractText：null/字符串/数组/文本节点/codeBlock(raw/fence/skip)/嵌套内容
 * - contentToText：字符串/对象/null/number/数组/options 透传
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => { resetAllStubs() })

describe('utils/tiptapText', () => {
  describe('extractText', () => {
    it('null/undefined → 空字符串', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      expect(extractText(null)).toBe('')
      expect(extractText(undefined)).toBe('')
    })

    it('字符串输入 → 原样返回', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      expect(extractText('hello')).toBe('hello')
    })

    it('节点数组 → 拼接所有文本', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      const nodes = [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'World' },
      ]
      expect(extractText(nodes)).toBe('Hello World')
    })

    it('text 节点 → 返回 text 字段', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      expect(extractText({ type: 'text', text: 'hi' })).toBe('hi')
    })

    it('text 节点 text 为 null → 空字符串', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      expect(extractText({ type: 'text', text: null })).toBe('')
    })

    it('自定义节点带 text 字段 → 返回 text（兜底逻辑）', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      expect(extractText({ type: 'custom', text: 'custom text' })).toBe('custom text')
    })

    it('codeBlock（raw 模式，默认）→ 提取纯代码', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      const codeBlock = {
        type: 'codeBlock',
        attrs: { language: 'javascript' },
        content: [
          { type: 'text', text: 'const x = 1\n' },
          { type: 'text', text: 'console.log(x)' },
        ],
      }
      expect(extractText(codeBlock)).toBe('const x = 1\nconsole.log(x)')
    })

    it('codeBlock（fence 模式）→ 用 ```lang 围栏包裹', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      const codeBlock = {
        type: 'codeBlock',
        attrs: { language: 'python' },
        content: [{ type: 'text', text: 'print("hello")' }],
      }
      const result = extractText(codeBlock, { codeBlock: 'fence' })
      expect(result).toContain('```python')
      expect(result).toContain('print("hello")')
      expect(result.startsWith('\n```')).toBe(true)
      expect(result.endsWith('```\n')).toBe(true)
    })

    it('codeBlock（fence 模式，无 language）→ 空语言围栏', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      const codeBlock = {
        type: 'codeBlock',
        attrs: {},
        content: [{ type: 'text', text: 'code' }],
      }
      const result = extractText(codeBlock, { codeBlock: 'fence' })
      expect(result).toContain('```\ncode\n```')
    })

    it('codeBlock（skip 模式）→ 空字符串', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      const codeBlock = {
        type: 'codeBlock',
        attrs: { language: 'javascript' },
        content: [{ type: 'text', text: 'code' }],
      }
      expect(extractText(codeBlock, { codeBlock: 'skip' })).toBe('')
    })

    it('codeBlock 无 content → 空字符串', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      expect(extractText({ type: 'codeBlock', attrs: {}, content: [] })).toBe('')
      expect(extractText({ type: 'codeBlock', attrs: {} })).toBe('')
    })

    it('嵌套 content → 递归提取', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      const doc = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
          { type: 'paragraph', content: [{ type: 'text', text: ' ' }, { type: 'text', text: 'World' }] },
        ],
      }
      expect(extractText(doc)).toBe('Hello World')
    })

    it('无 content 且无 text 的节点 → 空字符串', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      expect(extractText({ type: 'unknown' })).toBe('')
    })

    it('codeBlock 内 content 节点无 text 字段 → 空字符串拼接', async () => {
      const { extractText } = await import('../../utils/tiptapText')
      const codeBlock = {
        type: 'codeBlock',
        attrs: { language: 'js' },
        content: [{ type: 'text', text: 'a' }, { type: 'text' }, { type: 'text', text: 'b' }],
      }
      expect(extractText(codeBlock)).toBe('ab')
    })
  })

  describe('contentToText', () => {
    it('字符串输入 → 原样返回', async () => {
      const { contentToText } = await import('../../utils/tiptapText')
      expect(contentToText('hello')).toBe('hello')
    })

    it('对象输入 → 走 extractText', async () => {
      const { contentToText } = await import('../../utils/tiptapText')
      expect(contentToText({ type: 'text', text: 'hi' })).toBe('hi')
    })

    it('null/undefined → 空字符串', async () => {
      const { contentToText } = await import('../../utils/tiptapText')
      expect(contentToText(null)).toBe('')
      expect(contentToText(undefined)).toBe('')
    })

    it('number → 空字符串（非字符串非对象）', async () => {
      const { contentToText } = await import('../../utils/tiptapText')
      expect(contentToText(42)).toBe('')
    })

    it('数组 → 拼接', async () => {
      const { contentToText } = await import('../../utils/tiptapText')
      expect(contentToText([{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }])).toBe('ab')
    })

    it('透传 options 给 extractText', async () => {
      const { contentToText } = await import('../../utils/tiptapText')
      const codeBlock = {
        type: 'codeBlock',
        attrs: { language: 'js' },
        content: [{ type: 'text', text: 'code' }],
      }
      expect(contentToText(codeBlock, { codeBlock: 'skip' })).toBe('')
      expect(contentToText(codeBlock, { codeBlock: 'fence' })).toContain('```js')
    })
  })
})
