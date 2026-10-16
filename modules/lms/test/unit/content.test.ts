/**
 * server/utils/content.ts - normalizeContent 测试：保存时删除空白 heading
 * @see modules/lms/server/utils/content.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('utils/content - normalizeContent 删除空白 heading', () => {
  it('tiptap 对象：删除无内容的空白 heading', async () => {
    const { normalizeContent } = await import('../../server/utils/content')
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '标题' }] },
        { type: 'heading', attrs: { level: 2 } },
        { type: 'paragraph' },
      ],
    }
    const r = normalizeContent(doc)
    expect(r.content).toHaveLength(2)
    expect(r.content[0].content[0].text).toBe('标题')
    expect(r.content[1].type).toBe('paragraph')
  })

  it('tiptap 对象：删除仅含空白文本的 heading', async () => {
    const { normalizeContent } = await import('../../server/utils/content')
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '   ' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '\n\t' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'keep' }] },
      ],
    }
    const r = normalizeContent(doc)
    expect(r.content).toHaveLength(1)
    expect(r.content[0].type).toBe('paragraph')
  })

  it('heading 含非 text 节点（图片等）时不算空白，保留', async () => {
    const { normalizeContent } = await import('../../server/utils/content')
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'image', attrs: { src: '/a.png' } }] },
      ],
    }
    const r = normalizeContent(doc)
    expect(r.content).toHaveLength(1)
    expect(r.content[0].type).toBe('heading')
  })

  it('嵌套容器（blockquote）内的空白 heading 也被删除', async () => {
    const { normalizeContent } = await import('../../server/utils/content')
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            { type: 'heading', attrs: { level: 2 } },
            { type: 'paragraph', content: [{ type: 'text', text: 'text' }] },
          ],
        },
      ],
    }
    const r = normalizeContent(doc)
    expect(r.content[0].content).toHaveLength(1)
    expect(r.content[0].content[0].type).toBe('paragraph')
  })

  it('markdown 字符串：转换后同样删除空白 heading（如 "## " 空标题）', async () => {
    const { normalizeContent } = await import('../../server/utils/content')
    const r = normalizeContent('## 实标题\n\n## \n\n正文')
    const headings = r.content.filter((n: any) => n.type === 'heading')
    expect(headings).toHaveLength(1)
    expect(headings[0].content[0].text).toBe('实标题')
    // 删除的空 heading 不会被补 id
    expect(r.content.some((n: any) => n.type === 'heading' && !n.attrs?.id)).toBe(false)
  })

  it('有效 heading 补 id 逻辑不受影响', async () => {
    const { normalizeContent } = await import('../../server/utils/content')
    const r = normalizeContent('## 标题')
    expect(r.content[0].attrs.id).toBeTruthy()
    expect(r.content[0].attrs['data-toc-id']).toBeTruthy()
  })
})
