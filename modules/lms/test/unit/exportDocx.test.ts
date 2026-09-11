/**
 * exportDocx smoke 测试
 * @see modules/lms/utils/exportDocx.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('exportDocx', () => {
  it('tiptap JSON → docx Blob 生成成功', async () => {
    const { tiptapToDocxBlob } = await import('../../utils/exportDocx')
    const blob = await tiptapToDocxBlob({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Chapter Title' }] },
        { type: 'paragraph', content: [
          { type: 'text', text: 'bold ', marks: [{ type: 'bold' }] },
          { type: 'text', text: 'plain' },
        ] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }] }] },
        {
          type: 'table',
          content: [
            { type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'H1' }] }] }] },
            { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'C1' }] }] }] },
          ],
        },
      ],
    }, 'Test Chapter')
    expect(blob).toBeInstanceOf(Blob)
    // docx 是 zip 包：读取头部 PK 魔数验证
    const buf = new Uint8Array(await blob.arrayBuffer())
    expect(String.fromCharCode(buf[0], buf[1])).toBe('PK')
  })

  it('vue question 等自定义扩展渲染为可读内容', async () => {
    const { tiptapToDocxBlob } = await import('../../utils/exportDocx')
    const blob = await tiptapToDocxBlob({
      type: 'doc',
      content: [
        {
          type: 'vue',
          attrs: {
            type: 'question',
            content: {
              type: 'single', name: '以下哪个正确？', content: '选择正确答案',
              options: ['苹果', '香蕉'], answer: [1], explanation: '香蕉是正确答案',
            },
          },
        },
        { type: 'vue', attrs: { type: 'html', content: '<h1>x</h1>' } },
        { type: 'vue', attrs: { type: 'mindmap', content: '# 主题\n- 分支' } },
        { type: 'vue', attrs: { type: 'tabs', content: { tabs: [{ label: 'Tab1', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '标签内容' }] }] } }] } } },
      ],
    }, 'Test')
    expect(blob).toBeInstanceOf(Blob)
    const buf = new Uint8Array(await blob.arrayBuffer())
    expect(String.fromCharCode(buf[0], buf[1])).toBe('PK')
  })

  it('question 题库 cid 形式在无查询环境下回退为占位', async () => {
    const { tiptapToDocxBlob } = await import('../../utils/exportDocx')
    const blob = await tiptapToDocxBlob({
      type: 'doc',
      content: [{ type: 'vue', attrs: { type: 'question', content: '123' } }],
    }, 'Test')
    expect(blob).toBeInstanceOf(Blob)
    const buf = new Uint8Array(await blob.arrayBuffer())
    expect(String.fromCharCode(buf[0], buf[1])).toBe('PK')
  })
})
