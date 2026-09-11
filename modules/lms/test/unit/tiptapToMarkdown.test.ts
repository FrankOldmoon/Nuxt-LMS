/**
 * tiptapToMarkdown 单元测试
 * @see modules/lms/utils/tiptapToMarkdown.ts
 *
 * 覆盖常用节点与 marks，并验证与 markdownToTiptap 的闭环（可逆性）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('tiptapToMarkdown', () => {
  it('段落与标题', async () => {
    const { tiptapToMarkdown } = await import('../../utils/tiptapToMarkdown')
    const md = tiptapToMarkdown({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '标题' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '正文' }] },
      ],
    })
    expect(md).toBe('## 标题\n\n正文\n')
  })

  it('文本 marks：粗体/斜体/删除线/代码/链接', async () => {
    const { tiptapToMarkdown } = await import('../../utils/tiptapToMarkdown')
    const md = tiptapToMarkdown({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: 'a', marks: [{ type: 'bold' }] },
          { type: 'text', text: 'b', marks: [{ type: 'italic' }] },
          { type: 'text', text: 'c', marks: [{ type: 'strike' }] },
          { type: 'text', text: 'd', marks: [{ type: 'code' }] },
          { type: 'text', text: 'link', marks: [{ type: 'link', attrs: { href: 'https://x.com' } }] },
        ],
      }],
    })
    expect(md).toBe('**a***b*~~c~~`d`[link](https://x.com)\n')
  })

  it('列表（有序/无序/任务）与嵌套', async () => {
    const { tiptapToMarkdown } = await import('../../utils/tiptapToMarkdown')
    const md = tiptapToMarkdown({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [{
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: '一' }] },
              { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '嵌套' }] }] }] },
            ],
          }],
        },
        { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '完成' }] }] }] },
      ],
    })
    expect(md).toContain('- 一')
    expect(md).toContain('  - 嵌套')
    expect(md).toContain('- [x] 完成')
  })

  it('代码块 / 引用 / 表格 / 分割线 / 公式', async () => {
    const { tiptapToMarkdown } = await import('../../utils/tiptapToMarkdown')
    const md = tiptapToMarkdown({
      type: 'doc',
      content: [
        { type: 'codeBlock', attrs: { language: 'js' }, content: [{ type: 'text', text: 'const a = 1' }] },
        { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: '引用' }] }] },
        {
          type: 'table',
          content: [
            { type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] }, { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] }] },
            { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }] }, { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '2' }] }] }] },
          ],
        },
        { type: 'horizontalRule' },
        { type: 'blockMath', attrs: { latex: 'E=mc^2' } },
      ],
    })
    expect(md).toContain('```js\nconst a = 1\n```')
    expect(md).toContain('> 引用')
    expect(md).toContain('| A | B |')
    expect(md).toContain('| 1 | 2 |')
    expect(md).toContain('---')
    expect(md).toContain('$$\nE=mc^2\n$$')
  })

  it('vue question 节点还原为 question 围栏', async () => {
    const { tiptapToMarkdown } = await import('../../utils/tiptapToMarkdown')
    const question = { type: 'single_choice', name: 'q', options: ['A', 'B'], answer: [0] }
    const md = tiptapToMarkdown({
      type: 'doc',
      content: [{ type: 'vue', attrs: { type: 'question', content: question } }],
    })
    expect(md).toContain('```question')
    expect(md).toContain('"type": "single_choice"')
    expect(md).toContain('```')
  })

  it('与 markdownToTiptap 闭环：常见 markdown 可逆', async () => {
    const { tiptapToMarkdown } = await import('../../utils/tiptapToMarkdown')
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '# 标题\n\n**加粗** 和 *斜体* 和 `代码`\n\n- 列表一\n- 列表二\n\n1. 有序一\n2. 有序二\n\n> 引用\n\n```py\nprint(1)\n```'
    const tiptap = markdownToTiptap(md)
    const out = tiptapToMarkdown(tiptap)
    // 关键内容都应保留
    expect(out).toContain('# 标题')
    expect(out).toContain('**加粗**')
    expect(out).toContain('*斜体*')
    expect(out).toContain('`代码`')
    expect(out).toContain('- 列表一')
    expect(out).toContain('1. 有序一')
    expect(out).toContain('> 引用')
    expect(out).toContain('```py\nprint(1)\n```')
  })
})
