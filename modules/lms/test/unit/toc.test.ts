/**
 * 目录（TOC）提取 + 纯文本提取工具测试
 * @see modules/lms/utils/toc.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('utils/toc - extractPlainText', () => {
  it('字符串直接返回', async () => {
    const { extractPlainText } = await import('../../utils/toc')
    expect(extractPlainText('hello world')).toBe('hello world')
  })

  it('空值返回空字符串', async () => {
    const { extractPlainText } = await import('../../utils/toc')
    expect(extractPlainText(null)).toBe('')
    expect(extractPlainText(undefined)).toBe('')
  })

  it('超过 maxChars 时尾部截断', async () => {
    const { extractPlainText } = await import('../../utils/toc')
    const result = extractPlainText('a'.repeat(100), 50)
    expect(result.length).toBeGreaterThan(50) // 含省略提示
    expect(result).toContain('…')
  })

  it('从 TipTap doc 提取块级文本', async () => {
    const { extractPlainText } = await import('../../utils/toc')
    const content = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '第一段' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '第二段' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '标题' }] },
      ],
    }
    const result = extractPlainText(content)
    expect(result).toContain('第一段')
    expect(result).toContain('第二段')
    expect(result).toContain('标题')
  })

  it('递归处理嵌套 content', async () => {
    const { extractPlainText } = await import('../../utils/toc')
    const content = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: '项1' }] },
              ],
            },
          ],
        },
      ],
    }
    const result = extractPlainText(content)
    expect(result).toContain('项1')
  })
})

describe('utils/toc - extractTocFromContent', () => {
  it('空内容返回空数组', async () => {
    const { extractTocFromContent } = await import('../../utils/toc')
    expect(extractTocFromContent(null)).toEqual([])
    expect(extractTocFromContent(undefined)).toEqual([])
  })

  it('无 id 的 heading 被忽略', async () => {
    const { extractTocFromContent } = await import('../../utils/toc')
    const content = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '无id' }] },
      ],
    }
    expect(extractTocFromContent(content)).toEqual([])
  })

  it('提取扁平 heading 列表', async () => {
    const { extractTocFromContent } = await import('../../utils/toc')
    const content = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { id: 'h1', level: 1 }, content: [{ type: 'text', text: '一级' }] },
        { type: 'heading', attrs: { id: 'h2', level: 2 }, content: [{ type: 'text', text: '二级' }] },
      ],
    }
    const result = extractTocFromContent(content)
    // 1级 root，2级是其子节点
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('h1')
    expect(result[0].text).toBe('一级')
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].id).toBe('h2')
  })

  it('构建三级嵌套 TOC 树（h1→h2→h3）', async () => {
    const { extractTocFromContent } = await import('../../utils/toc')
    const content = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { id: 'h1', level: 1 }, content: [{ type: 'text', text: '一级' }] },
        { type: 'heading', attrs: { id: 'h2', level: 2 }, content: [{ type: 'text', text: '二级' }] },
        { type: 'heading', attrs: { id: 'h3', level: 3 }, content: [{ type: 'text', text: '三级' }] },
      ],
    }
    const result = extractTocFromContent(content)
    expect(result).toHaveLength(1)
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].children).toHaveLength(1)
    expect(result[0].children![0].children![0].text).toBe('三级')
  })

  it('同级新 heading 闭合前一个', async () => {
    const { extractTocFromContent } = await import('../../utils/toc')
    const content = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { id: 'a', level: 1 }, content: [{ type: 'text', text: 'A' }] },
        { type: 'heading', attrs: { id: 'b', level: 1 }, content: [{ type: 'text', text: 'B' }] },
      ],
    }
    const result = extractTocFromContent(content)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('a')
    expect(result[1].id).toBe('b')
  })

  it('空 children 的节点不带 children 字段', async () => {
    const { extractTocFromContent } = await import('../../utils/toc')
    const content = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { id: 'h1', level: 1 }, content: [{ type: 'text', text: '一级' }] },
      ],
    }
    const result = extractTocFromContent(content)
    expect(result[0].children).toBeUndefined()
  })

  it('使用 data-toc-id 作为 id（兼容旧字段名）', async () => {
    const { extractTocFromContent } = await import('../../utils/toc')
    const content = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { 'data-toc-id': 'legacy-id', level: 1 }, content: [{ type: 'text', text: 'X' }] },
      ],
    }
    const result = extractTocFromContent(content)
    expect(result[0].id).toBe('legacy-id')
  })

  it('默认 level=1 当 attrs.level 缺失', async () => {
    const { extractTocFromContent } = await import('../../utils/toc')
    const content = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { id: 'h' }, content: [{ type: 'text', text: 'X' }] },
      ],
    }
    const result = extractTocFromContent(content)
    expect(result).toHaveLength(1)
  })
})
