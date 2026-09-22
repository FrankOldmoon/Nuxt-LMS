/**
 * exportDocx smoke 测试
 * @see modules/lms/utils/exportDocx.ts
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import JSZip from 'jszip'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

// ── 图片内嵌相关：node 环境没有浏览器图片能力，按需桩出 Image / document / fetch ──

const _saved: Record<string, any> = {}
function saveGlobal(key: string) { _saved[key] = (globalThis as any)[key] }
function restoreGlobals() {
  for (const [k, v] of Object.entries(_saved)) {
    if (v === undefined) delete (globalThis as any)[k]
    else (globalThis as any)[k] = v
  }
}

/** 假 <img>：设置 src 后异步触发 onload，naturalWidth/Height 固定 1200x800 */
class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 1200
  naturalHeight = 800
  set src(_v: string) { queueMicrotask(() => this.onload?.()) }
}

/** 假 canvas：toBlob 产出 PNG（用于验证 webp → PNG 转码路径） */
const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

function installBrowserImageStubs(fetchImpl: (url: string) => Promise<any>) {
  saveGlobal('fetch'); saveGlobal('Image'); saveGlobal('URL'); saveGlobal('document')
  ;(globalThis as any).fetch = fetchImpl
  ;(globalThis as any).Image = FakeImage
  // 继承真实 URL（其它代码仍可 new URL），只补 blob 静态方法
  const RealURL: any = (globalThis as any).URL
  class FakeURL extends RealURL {
    static createObjectURL() { return 'blob:fake' }
    static revokeObjectURL() {}
  }
  ;(globalThis as any).URL = FakeURL
  ;(globalThis as any).document = {
    createElement: (tag: string) => tag === 'canvas'
      ? {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: () => {} }),
        toBlob: (cb: (b: Blob) => void) => cb(new Blob([PNG_BYTES], { type: 'image/png' })),
      }
      : {},
  }
}

/** 返回指定 MIME 的假图片响应 */
function imageFetch(mime: string) {
  return async () => ({
    ok: true,
    status: 200,
    blob: async () => new Blob([PNG_BYTES], { type: mime }),
  })
}

const imageDoc = (attrs: Record<string, any>) => ({
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: '前后文字' }] },
    { type: 'image', attrs },
  ],
})

/** 解开 docx（zip）：返回内嵌媒体列表与 document.xml */
async function unzip(blob: Blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  const media = Object.keys(zip.files).filter((n) => n.startsWith('word/media/'))
  const xml = (await zip.file('word/document.xml')!.async('string')) || ''
  return { media, xml }
}

afterEach(() => {
  restoreGlobals()
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

  // ── 图片：应内嵌真实图片，而不是链接文字/占位 ──

  it('块级图片内嵌为真实图片（zip 内含 media，document.xml 有 drawing）', async () => {
    installBrowserImageStubs(imageFetch('image/png'))
    const { tiptapToDocxBlob } = await import('../../utils/exportDocx')
    const blob = await tiptapToDocxBlob(
      imageDoc({ src: '/api/files/serve?pathname=abc.png', alt: '示意图' }),
      'Test',
    )

    const { media, xml } = await unzip(blob)
    expect(media.length).toBeGreaterThan(0)
    expect(xml).toContain('w:drawing')
    expect(xml).toContain('a:blip')
    // 尺寸按内容区上限等比缩放：1200x800 → 600x400px；docx 按 9525 EMU/px 换算
    expect(xml).toContain('cx="5715000"')
    expect(xml).toContain('cy="3810000"')
    // 不再退化为文字占位；alt 作为图注保留
    expect(xml).not.toContain('[图片:')
    expect(xml).toContain('示意图')
  })

  it('webp 图片转成 PNG 后内嵌（docx 不支持 webp）', async () => {
    installBrowserImageStubs(imageFetch('image/webp'))
    const { tiptapToDocxBlob } = await import('../../utils/exportDocx')
    const blob = await tiptapToDocxBlob(
      imageDoc({ src: '/api/files/serve?pathname=abc.webp' }),
      'Test',
    )

    const { media, xml } = await unzip(blob)
    expect(media.some((n) => n.endsWith('.png'))).toBe(true)
    expect(xml).toContain('w:drawing')
  })

  it('行内图片同样内嵌（inlineImage）', async () => {
    installBrowserImageStubs(imageFetch('image/png'))
    const { tiptapToDocxBlob } = await import('../../utils/exportDocx')
    const blob = await tiptapToDocxBlob({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: '看图：' },
          { type: 'inlineImage', attrs: { src: '/api/files/serve?pathname=inline.png' } },
        ],
      }],
    }, 'Test')

    const { media, xml } = await unzip(blob)
    expect(media.length).toBeGreaterThan(0)
    expect(xml).toContain('w:drawing')
  })

  it('图片下载失败时退化为文字占位，不阻断导出', async () => {
    installBrowserImageStubs(async () => ({ ok: false, status: 404, blob: async () => new Blob([]) }))
    const { tiptapToDocxBlob } = await import('../../utils/exportDocx')
    const blob = await tiptapToDocxBlob(
      imageDoc({ src: '/api/files/serve?pathname=missing.png', alt: '缺失图' }),
      'Test',
    )

    const { media, xml } = await unzip(blob)
    expect(media.length).toBe(0)
    expect(xml).not.toContain('w:drawing')
    expect(xml).toContain('[图片:')
  })
})
