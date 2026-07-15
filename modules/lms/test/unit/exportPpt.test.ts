/**
 * exportPpt full node type test
 *
 * Test scope:
 * 1. markdownToTiptap: all markdown syntax → Tiptap JSON conversion verification
 * 2. addNodeToSlide: all Tiptap node types → PPT render verification (including editor-specific types)
 * 3. full flow: markdown → Tiptap JSON → PPT rendering
 *
 * Covered Tiptap node types (cf. components/ueditor/render/nodes/):
 * - markdown supported: paragraph, heading, codeBlock, vue(question), blockMath, inlineMath,
 *   blockquote, bulletList, orderedList, horizontalRule, image, hardBreak, inputs, select,
 *   text(+marks: bold, italic, strike, code, link)
 * - editor-specific: callout, details, textBox, tag, mention, datetime, echarts,
 *   footnotes, footnote, taskList, table, columnContainer, column, pageBreak,
 *   audio, video, file, iframe, footnoteReference, optionBox, toc
 * - vue subtypes: question, quiz, homework, race, tabs, mindmap, html, other
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

// ═══════════════════════════════════════
// Mock utilities: construct pptxgenjs slide context
// ═══════════════════════════════════════

/** Create mock slide (simulating pptxgenjs slide object) */
function createMockSlide() {
  return {
    addText: vi.fn(),
    addImage: vi.fn(),
    addTable: vi.fn(),
    addShape: vi.fn(),
  }
}

/**
 * Create mock SlideContext
 * - pres.addSlide() returns a new mock slide and updates ctx.slide
 * - allSlides tracks all created slides (for cross-page assertions)
 * - after rendering, check the last slide method call via ctx.slide
 */
function createMockCtx(overrides: Record<string, any> = {}) {
  const slide = createMockSlide()
  const allSlides: any[] = [slide]
  const pres = {
    addSlide: vi.fn(() => {
      const s = createMockSlide()
      allSlides.push(s)
      return s
    }),
  }
  return {
    pres,
    slide,
    allSlides,
    currentY: 1.25,
    marginX: 0.5,
    contentWidth: 12.33,
    startY: 1.25,
    maxY: 7.0,
    questionCache: new Map<number, any>(),
    blockMathCache: new Map<string, any>(),
    inlineMathCache: new Map<string, string>(),
    quizCache: new Map<number, any>(),
    homeworkCache: new Map<number, any>(),
    raceCache: new Map<number, any>(),
    echartsCache: new Map<any, any>(),
    mindmapCache: new Map<string, any>(),
    htmlCache: new Map<string, any>(),
    ...overrides,
  } as any
}

/** Extract all text content from addText calls */
function getAddTextTexts(slide: any): string[] {
  return slide.addText.mock.calls.map((call: any[]) => {
    const arg = call[0]
    if (typeof arg === 'string') return arg
    if (Array.isArray(arg)) return arg.map((r: any) => r.text || '').join('')
    return ''
  })
}

/** Collect addText text from all slides (including cross-page) */
function getAllAddTextTexts(ctx: any): string[] {
  const slides = ctx.allSlides || [ctx.slide]
  const texts: string[] = []
  for (const s of slides) {
    if (s.addText?.mock?.calls) {
      for (const call of s.addText.mock.calls) {
        const arg = call[0]
        if (typeof arg === 'string') texts.push(arg)
        else if (Array.isArray(arg)) texts.push(arg.map((r: any) => r.text || '').join(''))
      }
    }
  }
  return texts
}

/** Check whether addText calls contain the specified text */
function addTextContains(slide: any, substr: string): boolean {
  return getAddTextTexts(slide).some(t => t.includes(substr))
}

// ═══════════════════════════════════════
// Part 1: markdownToTiptap — markdown syntax to Tiptap JSON
// ═══════════════════════════════════════

describe('markdownToTiptap — markdown 语法转 Tiptap JSON', () => {
  it('空字符串 → 空 doc', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    expect(markdownToTiptap('')).toEqual({ type: 'doc', content: [] })
  })

  it('纯文本 → paragraph', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('Hello world')
    expect(r.type).toBe('doc')
    expect(r.content![0].type).toBe('paragraph')
    expect(r.content![0].content![0]).toEqual({ type: 'text', text: 'Hello world' })
  })

  it('标题 h1-h6 → heading（level 1-6）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    for (let level = 1; level <= 6; level++) {
      const r = markdownToTiptap(`${'#'.repeat(level)} 标题${level}`)
      expect(r.content![0].type).toBe('heading')
      expect(r.content![0].attrs!.level).toBe(level)
    }
  })

  it('代码块 ```lang → codeBlock（带语言）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('```python\nprint("hello")\n```')
    expect(r.content![0].type).toBe('codeBlock')
    expect(r.content![0].attrs!.language).toBe('python')
    expect(r.content![0].content![0].text).toContain('print')
  })

  it('代码块无语言 → codeBlock（language 为空）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('```\nplain\n```')
    expect(r.content![0].type).toBe('codeBlock')
    expect(r.content![0].attrs!.language).toBe('')
  })

  it('```question 围栏 → vue 节点（content 为 JSON 对象）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('```question\n{"type":"single","name":"Q1","options":["A","B"],"answer":[0]}\n```')
    expect(r.content![0].type).toBe('vue')
    expect(r.content![0].attrs!.type).toBe('question')
    expect(r.content![0].attrs!.content.type).toBe('single')
  })

  it('```question JSON 无效 → 跳过（不降级 codeBlock）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('```question\n{invalid\n```')
    expect(r.content).toHaveLength(0)
  })

  it('块级公式 $$...$$ → blockMath', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('$$E = mc^2$$')
    expect(r.content![0].type).toBe('blockMath')
    expect(r.content![0].attrs!.latex).toBe('E = mc^2')
  })

  it('多行块级公式 $$...$$ → blockMath（保留换行）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('$$\nx = a + b\ny = c + d\n$$')
    expect(r.content![0].type).toBe('blockMath')
    expect(r.content![0].attrs!.latex).toBe('x = a + b\ny = c + d')
  })

  it('行内公式 $...$ → inlineMath', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('已知 $a^2 + b^2 = c^2$ 求解')
    const para = r.content![0]
    const mathNode = para.content!.find((n: any) => n.type === 'inlineMath')
    expect(mathNode).toBeDefined()
    expect(mathNode!.attrs!.latex).toBe('a^2 + b^2 = c^2')
  })

  it('引用块 > → blockquote', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('> 引用内容\n> 第二行')
    expect(r.content![0].type).toBe('blockquote')
  })

  it('无序列表 - * + → bulletList', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('- 项目1\n- 项目2\n* 项目3')
    expect(r.content![0].type).toBe('bulletList')
    expect(r.content![0].content!).toHaveLength(3)
    r.content![0].content!.forEach((item: any) => {
      expect(item.type).toBe('listItem')
    })
  })

  it('有序列表 1. → orderedList', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('1. 第一\n2. 第二')
    expect(r.content![0].type).toBe('orderedList')
    expect(r.content![0].content!).toHaveLength(2)
  })

  it('分隔线 --- → horizontalRule', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('---')
    expect(r.content![0].type).toBe('horizontalRule')
  })

  it('图片 ![alt](url) → image 节点', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('![logo](https://example.com/img.png "标题")')
    const img = r.content![0].content!.find((n: any) => n.type === 'image')
    expect(img).toBeDefined()
    expect(img!.attrs!.src).toBe('https://example.com/img.png')
    expect(img!.attrs!.alt).toBe('logo')
    expect(img!.attrs!.title).toBe('标题')
  })

  it('链接 [text](url) → text + link mark', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('[GitHub](https://github.com)')
    const link = r.content![0].content![0]
    expect(link.type).toBe('text')
    expect(link.marks).toContainEqual({ type: 'link', attrs: { href: 'https://github.com', title: null } })
  })

  it('行内代码 `code` → text + code mark', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('使用 `npm install` 安装')
    const codeNode = r.content![0].content!.find((n: any) => n.marks?.some((m: any) => m.type === 'code'))
    expect(codeNode).toBeDefined()
    expect(codeNode!.text).toBe('npm install')
  })

  it('粗体 **text** → text + bold mark', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('这是 **粗体** 文字')
    const boldNode = r.content![0].content!.find((n: any) => n.marks?.some((m: any) => m.type === 'bold'))
    expect(boldNode).toBeDefined()
    expect(boldNode!.text).toBe('粗体')
  })

  it('斜体 *text* → text + italic mark', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('这是 *斜体* 文字')
    const italicNode = r.content![0].content!.find((n: any) => n.marks?.some((m: any) => m.type === 'italic'))
    expect(italicNode).toBeDefined()
  })

  it('删除线 ~~text~~ → text + strike mark', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('~~删除~~')
    expect(r.content![0].content![0].marks).toEqual([{ type: 'strike' }])
  })

  it('粗斜体 ***text*** → text + bold + italic marks', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('***粗斜***')
    const marks = r.content![0].content![0].marks
    expect(marks).toContainEqual({ type: 'bold' })
    expect(marks).toContainEqual({ type: 'italic' })
  })

  it('{{xxx}} 占位符 → inputs 节点', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('请输入 {{ 答案 }}')
    const inputs = r.content![0].content!.find((n: any) => n.type === 'inputs')
    expect(inputs).toBeDefined()
  })

  it('||content|| → select 节点', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r = markdownToTiptap('选 ||选项A||')
    const select = r.content![0].content!.find((n: any) => n.type === 'select')
    expect(select).toBeDefined()
    expect(select!.attrs!.content).toBe('选项A')
  })
})

// ═══════════════════════════════════════
// Part 2: addNodeToSlide — all Tiptap types rendered to PPT
// ═══════════════════════════════════════

describe('addNodeToSlide — 所有 Tiptap 类型渲染到 PPT', () => {

  // ── Basic block types ──

  describe('基础块级类型', () => {
    it('paragraph → addText', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'paragraph', content: [{ type: 'text', text: 'Hello PPT' }] }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, 'Hello PPT')).toBe(true)
    })

    it('heading h1 → 新页 + 标题 addText', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '第一章' }] }, ctx.pres, 0)
      expect(ctx.pres.addSlide).toHaveBeenCalled()
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '第一章')).toBe(true)
    })

    it('heading h2 → 新页 + 标题', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '第二节' }] }, ctx.pres, 0)
      expect(ctx.pres.addSlide).toHaveBeenCalled()
    })

    it('heading h3 → 当前页 addText（粗体）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '子标题' }] }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      // h3 does not create a new page (unless overflow)
      const opts = ctx.slide.addText.mock.calls[0][1]
      expect(opts.bold).toBe(true)
    })

    it('codeBlock → addText（带语法高亮 runs + 背景色）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'codeBlock', attrs: { language: 'javascript' },
        content: [{ type: 'text', text: 'const x = 1' }],
      }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      const opts = ctx.slide.addText.mock.calls[0][1]
      expect(opts.fill).toBeDefined()  // Has background color
    })

    it('blockquote → addShape（竖线）+ addText', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'blockquote',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '引用' }] }],
      }, ctx.pres, 0)
      expect(ctx.slide.addShape).toHaveBeenCalled()
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('horizontalRule → addShape（分隔线）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'horizontalRule' }, ctx.pres, 0)
      expect(ctx.slide.addShape).toHaveBeenCalled()
    })

    it('pageBreak → pres.addSlide（新空白页）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'pageBreak' }, ctx.pres, 0)
      expect(ctx.pres.addSlide).toHaveBeenCalled()
    })
  })

  // ── List types ──

  describe('列表类型', () => {
    it('bulletList → 每项 addText', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '项A' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '项B' }] }] },
        ],
      }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '项A')).toBe(true)
    })

    it('orderedList → 每项 addText（带序号前缀）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'orderedList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '第一' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '第二' }] }] },
        ],
      }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '1.')).toBe(true)
    })

    it('taskList → 每项 addText（带 checkbox 前缀）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '已完成' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '未完成' }] }] },
        ],
      }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '☑')).toBe(true)
      expect(addTextContains(ctx.slide, '☐')).toBe(true)
    })
  })

  // ── Table types ──

  describe('表格类型', () => {
    it('table → addTable', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'table',
        content: [
          { type: 'tableRow', content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '姓名' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '分数' }] }] },
          ]},
          { type: 'tableRow', content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '张三' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '95' }] }] },
          ]},
        ],
      }, ctx.pres, 0)
      expect(ctx.slide.addTable).toHaveBeenCalled()
      const rows = ctx.slide.addTable.mock.calls[0][0]
      expect(rows).toHaveLength(2)
      expect(rows[0]).toHaveLength(2)  // 2 columns
    })
  })

  // ── Math formulas ──

  describe('数学公式', () => {
    it('blockMath（缓存命中）→ addImage', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const blockMathCache = new Map()
      blockMathCache.set('E = mc^2', { dataUrl: 'data:image/png;base64,xxx', width: 4, height: 1 })
      const ctx = createMockCtx({ blockMathCache })
      addNodeToSlide(ctx, { type: 'blockMath', attrs: { latex: 'E = mc^2' } }, ctx.pres, 0)
      expect(ctx.slide.addImage).toHaveBeenCalled()
    })

    it('blockMath（缓存未命中）→ addText（LaTeX 源码回退）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'blockMath', attrs: { latex: 'x^2 + y^2' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, 'x^2 + y^2')).toBe(true)
    })

    it('blockMath（缓存未命中）→ addText 直接显示 LaTeX 源码（保留 ^ 上标信息）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'blockMath', attrs: { latex: 'e = m^c' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      // Directly display LaTeX source (preserves ^), does not use KaTeX textContent (would lose ^ becoming e=mc)
      expect(addTextContains(ctx.slide, 'e = m^c')).toBe(true)
    })

    it('inlineMath → 段落内由 extractTextRuns 处理（不单独渲染）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const inlineMathCache = new Map()
      inlineMathCache.set('a+b', 'a+b')  // Unicode text
      const ctx = createMockCtx({ inlineMathCache })
      // inlineMath is replaced by Unicode text via extractTextRuns in the paragraph
      addNodeToSlide(ctx, {
        type: 'paragraph',
        content: [
          { type: 'text', text: '公式: ' },
          { type: 'inlineMath', attrs: { latex: 'a+b' } },
        ],
      }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    // ── latexToText unit test (mock window.katex + document, verify .katex-html selector fix) ──

    it('latexToText → 只提取 .katex-html 文本（跳过 MathML annotation 避免三重重复）', async () => {
      const { latexToText } = await import('../../utils/exportPpt/mathRender')
      // KaTeX renderToString output contains katex-mathml (with <annotation> original LaTeX source)
      // And katex-html (visual rendering) two parts
      const katexOutput = '<span class="katex"><span class="katex-mathml"><annotation encoding="application/x-tex">e=m^c</annotation></span><span class="katex-html"><span class="base"><span class="strut"></span><span class="mord mathnormal">e</span><span class="mrel">=</span><span class="mord mathnormal">m</span><span class="mord"><span class="mord mathnormal">c</span></span></span></span></span>'
      const querySelectorMock = vi.fn((selector: string) => {
        if (selector === '.katex-html') return { textContent: 'e=mc' }
        return null
      })
      // Backup original globals (window/document may not exist in node environment)
      const origWindow = (globalThis as any).window
      const origDocument = (globalThis as any).document
      ;(globalThis as any).window = { katex: { renderToString: vi.fn(() => katexOutput) } }
      ;(globalThis as any).document = {
        createElement: vi.fn(() => ({
          innerHTML: '',
          querySelector: querySelectorMock,
          // The entire span.textContent will extract MathML + annotation + HTML = e=mce=m^ce=mc (bug scenario)
          get textContent() { return 'e=mce=m^ce=mc' },
        })),
      }
      try {
        const result = latexToText('e=m^c')
        expect(querySelectorMock).toHaveBeenCalledWith('.katex-html')
        expect(result).toBe('e=mc')
        expect(result).not.toContain('^')
        expect(result).not.toBe('e=mce=m^ce=mc')
      } finally {
        // Restore globals, avoid polluting subsequent tests
        if (origWindow === undefined) delete (globalThis as any).window
        else (globalThis as any).window = origWindow
        if (origDocument === undefined) delete (globalThis as any).document
        else (globalThis as any).document = origDocument
      }
    })

    it('latexToText → katex 未加载时回退原始 LaTeX', async () => {
      const { latexToText } = await import('../../utils/exportPpt/mathRender')
      const origWindow = (globalThis as any).window
      ;(globalThis as any).window = {}  // No katex
      try {
        const result = latexToText('x^2')
        expect(result).toBe('x^2')
      } finally {
        if (origWindow === undefined) delete (globalThis as any).window
        else (globalThis as any).window = origWindow
      }
    })

    it('latexToText → 无 window（node 环境）时回退原始 LaTeX', async () => {
      const { latexToText } = await import('../../utils/exportPpt/mathRender')
      const origWindow = (globalThis as any).window
      delete (globalThis as any).window
      try {
        const result = latexToText('a+b')
        expect(result).toBe('a+b')
      } finally {
        if (origWindow === undefined) delete (globalThis as any).window
        else (globalThis as any).window = origWindow
      }
    })
  })

  // ── Media types ──

  describe('媒体类型', () => {
    it('image → addImage', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'image', attrs: { src: 'https://example.com/img.png' } }, ctx.pres, 0)
      expect(ctx.slide.addImage).toHaveBeenCalled()
    })

    it('inlineImage → addImage', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'inlineImage', attrs: { src: 'data:image/png;base64,xxx' } }, ctx.pres, 0)
      expect(ctx.slide.addImage).toHaveBeenCalled()
    })

    it('video → addText（占位标签）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'video', attrs: { src: 'video.mp4' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, 'video')).toBe(true)
    })

    it('audio → addText（占位标签）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'audio', attrs: { src: 'audio.mp3' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('file → addText（占位标签）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'file', attrs: { src: 'doc.pdf' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('iframe → addText（占位标签）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'iframe', attrs: { src: 'https://example.com' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('echarts（缓存命中）→ addImage', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const echartsNode = { type: 'echarts', attrs: { option: { title: { text: '图表' } } } }
      const echartsCache = new Map()
      echartsCache.set(echartsNode, { dataUrl: 'data:image/png;base64,xxx', width: 8, height: 4 })
      const ctx = createMockCtx({ echartsCache })
      addNodeToSlide(ctx, echartsNode, ctx.pres, 0)
      expect(ctx.slide.addImage).toHaveBeenCalled()
    })

    it('echarts（缓存未命中）→ addText（占位标签）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'echarts', attrs: { option: {} } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })
  })

  // ── Inline mark types ──

  describe('内联标记类型', () => {
    it('datetime → addText', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'datetime', attrs: { text: '2024-01-01 12:00' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '2024-01-01')).toBe(true)
    })

    it('mention → addText（@label）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'mention', attrs: { label: '张三' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '@张三')).toBe(true)
    })

    it('tag → addText（带颜色背景）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'tag', attrs: { text: '重要', color: '#ff0000', backgroundColor: '#ffeeee' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '重要')).toBe(true)
    })
  })

  // ── Container types ──

  describe('容器类型', () => {
    it('callout → addShape（圆角矩形）+ addText', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'callout', attrs: { icon: '💡', backgroundColor: '#fff3cd', fontColor: '#856404' },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '提示内容' }] }],
      }, ctx.pres, 0)
      expect(ctx.slide.addShape).toHaveBeenCalled()
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('details → addText（摘要 + 内容）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'details',
        content: [
          { type: 'detailsSummary', content: [{ type: 'text', text: '点击展开' }] },
          { type: 'detailsContent', content: [{ type: 'paragraph', content: [{ type: 'text', text: '隐藏内容' }] }] },
        ],
      }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '点击展开')).toBe(true)
    })

    it('textBox → addShape + addText', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'textBox', attrs: { left: 1, top: 1, width: 6, height: 2 },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '文本框内容' }] }],
      }, ctx.pres, 0)
      expect(ctx.slide.addShape).toHaveBeenCalled()
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('columnContainer → 子节点渲染', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'columnContainer',
        content: [
          { type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: '左列' }] }] },
          { type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: '右列' }] }] },
        ],
      }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('column → 子节点渲染', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'column',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '列内容' }] }],
      }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })
  })

  // ── Footnote types ──

  describe('脚注类型', () => {
    it('footnotes → 子节点渲染', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'footnotes',
        content: [
          { type: 'footnote', attrs: { id: 'fn1' }, content: [{ type: 'text', text: '脚注1内容' }] },
        ],
      }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('footnote → addText（小字文本）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'footnote', attrs: { id: 'fn1' },
        content: [{ type: 'text', text: '脚注说明' }],
      }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      const opts = ctx.slide.addText.mock.calls[0][1]
      expect(opts.fontSize).toBe(10)  // Footnotes are small text
    })
  })

  // ── Vue extension types ──

  describe('Vue 扩展类型', () => {
    it('vue/question（缓存命中）→ addText（题型标签 + 名称）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const questionCache = new Map()
      questionCache.set(101, {
        type: 'single', name: '1+1=?',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'What is 1+1?' }] }] },
        options: [{ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '2' }] }] },
                  { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '3' }] }] }],
        answer: [0],
        explanation: '1+1=2',
      })
      const ctx = createMockCtx({ questionCache })
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'question', content: '101' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '1+1=?')).toBe(true)
    })

    it('vue/question（字符串选项 → markdownToTiptap 转换）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const questionCache = new Map()
      questionCache.set(102, {
        type: 'single', name: 'Code option',
        content: '题目内容',
        options: ['```python\nprint("hello")\n```', 'plain text option'],
        answer: [0],
      })
      const ctx = createMockCtx({ questionCache })
      // Should not throw exception; string options rendered after markdownToTiptap conversion
      expect(() => addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'question', content: '102' } }, ctx.pres, 0)).not.toThrow()
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('vue/question（无缓存）→ addText（占位标签）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'question', content: '999' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, 'Question')).toBe(true)
    })

    it('vue/question（内联对象 → 直接渲染）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'vue',
        attrs: {
          type: 'question',
          content: { type: 'judge', name: '判断题', content: '天空是蓝色的', options: [], answer: [0] },
        },
      }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '判断题')).toBe(true)
    })

    it('vue/question → addShape 绘制 group 边框（roundRect + 透明填充 + line）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const questionCache = new Map()
      questionCache.set(1, {
        type: 'single', name: '边框测试题',
        content: '题目内容', options: ['选项A', '选项B'], answer: [0],
      })
      const ctx = createMockCtx({ questionCache })
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'question', content: '1' } }, ctx.pres, 0)
      // Should call addShape to draw group border
      expect(ctx.slide.addShape).toHaveBeenCalled()
      // Find the roundRect + transparent fill border call
      const borderCall = ctx.slide.addShape.mock.calls.find((c: any[]) =>
        c[0] === 'roundRect' && c[1]?.fill?.type === 'none',
      )
      expect(borderCall).toBeDefined()
      // Border has line (color + width)
      const opts = borderCall![1]
      expect(opts.line).toBeDefined()
      expect(opts.line.color).toBeTruthy()
      expect(opts.line.width).toBeGreaterThan(0)
      // Border dimensions: width = contentWidth + padding*2, height > 0
      expect(opts.w).toBeGreaterThan(ctx.contentWidth)
      expect(opts.h).toBeGreaterThan(0)
    })

    it('vue/question（无缓存）→ 不绘制 group 边框', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'question', content: '999' } }, ctx.pres, 0)
      // Question not found → placeholder label, should not have group border
      const borderCall = ctx.slide.addShape.mock.calls.find((c: any[]) =>
        c[0] === 'roundRect' && c[1]?.fill?.type === 'none',
      )
      expect(borderCall).toBeUndefined()
    })

    // ── Diagnostic test: formula render count & option text box merge ──

    it('question 内容含 blockMath（缓存未命中）→ 公式文本只出现一次（无重复）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const questionCache = new Map()
      questionCache.set(1, {
        type: 'single', name: '公式题',
        content: '$$e = m^c$$',
        options: ['选项A', '选项B'], answer: [0],
      })
      const ctx = createMockCtx({ questionCache })  // blockMathCache is empty → cache miss
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'question', content: '1' } }, ctx.pres, 0)
      const allTexts = getAllAddTextTexts(ctx)
      // Formula source e = m^c should appear only once
      const formulaCount = allTexts.filter(t => t.includes('e = m^c')).length
      expect(formulaCount).toBe(1)
    })

    it('question 选项（字符串）→ 字母前缀 + 内容在同一个 addText 调用中', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const questionCache = new Map()
      questionCache.set(1, {
        type: 'single', name: '选择题',
        content: '题目内容',
        options: ['北京', '上海', '广州', '深圳'], answer: [0],
      })
      const ctx = createMockCtx({ questionCache })
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'question', content: '1' } }, ctx.pres, 0)
      // Find the addText call containing "A. Beijing" (prefix and content in the same runs array)
      const texts = getAddTextTexts(ctx.slide)
      const optionA = texts.find(t => t.includes('A.') && t.includes('北京'))
      const optionB = texts.find(t => t.includes('B.') && t.includes('上海'))
      expect(optionA).toBeDefined()
      expect(optionB).toBeDefined()
    })

    it('vue/quiz（缓存命中）→ addText（quiz 标签 + 名称）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const quizCache = new Map()
      quizCache.set(201, {
        name: '测验1', startAt: '2024-01-01', endAt: '2024-12-31',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '测验说明' }] }] },
        questions: [],
      })
      const ctx = createMockCtx({ quizCache })
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'quiz', content: '201' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '测验1')).toBe(true)
    })

    it('vue/quiz（无缓存）→ addText（占位）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'quiz', content: '999' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('vue/homework（缓存命中）→ addText（homework 标签 + 名称）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const homeworkCache = new Map()
      homeworkCache.set(301, {
        name: '作业1', code: 'HW001',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '作业内容' }] }] },
        tags: ['math'], explanation: '解析',
      })
      const ctx = createMockCtx({ homeworkCache })
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'homework', content: '301' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '作业1')).toBe(true)
    })

    it('vue/homework（无缓存）→ addText（占位）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'homework', content: '999' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('vue/race（缓存命中）→ addText（race 标签 + 名称）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const raceCache = new Map()
      raceCache.set(401, { name: '竞赛1', questionIds: [] })
      const ctx = createMockCtx({ raceCache })
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'race', content: '401' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '竞赛1')).toBe(true)
    })

    it('vue/race（无缓存）→ addText（占位）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'race', content: '999' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('vue/tabs → 每个 tab 新页 + addText（标签 + 内容）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'vue',
        attrs: {
          type: 'tabs',
          content: {
            tabs: [
              { label: '标签A', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '内容A' }] }] } },
              { label: '标签B', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '内容B' }] }] } },
            ],
          },
        },
      }, ctx.pres, 0)
      // At least 2 new pages (one per tab)
      expect(ctx.pres.addSlide.mock.calls.length).toBeGreaterThanOrEqual(2)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('vue/mindmap（缓存命中）→ addImage', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const mindmapCache = new Map()
      mindmapCache.set('# 思维导图', { dataUrl: 'data:image/png;base64,xxx', width: 6, height: 3 })
      const ctx = createMockCtx({ mindmapCache })
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'mindmap', content: '# 思维导图' } }, ctx.pres, 0)
      expect(ctx.slide.addImage).toHaveBeenCalled()
    })

    it('vue/mindmap（无缓存）→ addText（回退 markdown 源码）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'mindmap', content: '# 标题\n- A\n- B' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('vue/html（缓存命中）→ addImage', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const htmlCache = new Map()
      htmlCache.set('<p>Hello</p>', { dataUrl: 'data:image/png;base64,xxx', width: 6, height: 2 })
      const ctx = createMockCtx({ htmlCache })
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'html', content: '<p>Hello</p>' } }, ctx.pres, 0)
      expect(ctx.slide.addImage).toHaveBeenCalled()
    })

    it('vue/html（无缓存）→ addText（占位）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'html', content: '<p>Test</p>' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
    })

    it('vue/其他类型（aichat）→ addText（占位标签）', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'aichat', content: '123' } }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, 'aichat')).toBe(true)
    })
  })

  // ── Skip types (interactive components) ──

  describe('跳过类型（交互式组件不渲染）', () => {
    it('toc → 不调用任何 slide 方法', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'toc' }, ctx.pres, 0)
      expect(ctx.slide.addText).not.toHaveBeenCalled()
      expect(ctx.pres.addSlide).not.toHaveBeenCalled()
    })

    it('inputs → 不调用任何 slide 方法', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'inputs', attrs: { content: '' } }, ctx.pres, 0)
      expect(ctx.slide.addText).not.toHaveBeenCalled()
    })

    it('select → 不调用任何 slide 方法', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'select', attrs: { content: '选项' } }, ctx.pres, 0)
      expect(ctx.slide.addText).not.toHaveBeenCalled()
    })

    it('optionBox → 不调用任何 slide 方法', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'optionBox' }, ctx.pres, 0)
      expect(ctx.slide.addText).not.toHaveBeenCalled()
    })
  })

  // ── Default/boundary types ──

  describe('默认/边界类型', () => {
    it('footnoteReference → 无内容不渲染', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, { type: 'footnoteReference', attrs: { id: 'fn1' } }, ctx.pres, 0)
      // footnoteReference has no content, falls into default but does not render child nodes
      expect(ctx.slide.addText).not.toHaveBeenCalled()
    })

    it('未知类型（有子节点）→ 递归渲染子节点', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      addNodeToSlide(ctx, {
        type: 'customWrapper',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '子内容' }] }],
      }, ctx.pres, 0)
      expect(ctx.slide.addText).toHaveBeenCalled()
      expect(addTextContains(ctx.slide, '子内容')).toBe(true)
    })

    it('null/undefined 节点 → 不抛异常', async () => {
      const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
      const ctx = createMockCtx()
      expect(() => addNodeToSlide(ctx, null, ctx.pres, 0)).not.toThrow()
      expect(() => addNodeToSlide(ctx, undefined, ctx.pres, 0)).not.toThrow()
      expect(() => addNodeToSlide(ctx, {}, ctx.pres, 0)).not.toThrow()
    })
  })
})

// ═══════════════════════════════════════
// Part 3: full coverage of question types (single/multiple/judge/fill/sort/classify/match)
// ═══════════════════════════════════════

describe('addNodeToSlide — 题目类型全覆盖', () => {
  /** Helper: render question via vue/question node, returns ctx */
  async function renderQuestion(questionData: any) {
    const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')
    const questionCache = new Map()
    questionCache.set(1, questionData)
    const ctx = createMockCtx({ questionCache })
    addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'question', content: '1' } }, ctx.pres, 0)
    return ctx
  }

  it('single（单选）→ 渲染选项 A. B. 前缀', async () => {
    const ctx = await renderQuestion({
      type: 'single', name: '单选题',
      content: '选一个', options: ['选项A', '选项B'], answer: [0],
    })
    expect(ctx.slide.addText).toHaveBeenCalled()
    expect(addTextContains(ctx.slide, 'A.')).toBe(true)
    expect(addTextContains(ctx.slide, 'B.')).toBe(true)
  })

  it('multiple（多选）→ 渲染选项', async () => {
    const ctx = await renderQuestion({
      type: 'multiple', name: '多选题',
      content: '选多个', options: ['X', 'Y', 'Z'], answer: [0, 2],
    })
    expect(addTextContains(ctx.slide, 'X')).toBe(true)
  })

  it('judge（判断题）→ 不渲染选项列表', async () => {
    const ctx = await renderQuestion({
      type: 'judge', name: '判断题',
      content: '对吗？', options: [], answer: [0],
    })
    expect(ctx.slide.addText).toHaveBeenCalled()
    expect(addTextContains(ctx.slide, '判断题')).toBe(true)
  })

  it('fill（填空题）→ 不渲染选项列表', async () => {
    const ctx = await renderQuestion({
      type: 'fill', name: '填空题',
      content: '1+1=?', options: ['regex', 'regex'], answer: ['2'],
    })
    expect(ctx.slide.addText).toHaveBeenCalled()
  })

  it('sort（排序题）→ 渲染选项 A. B. C. 前缀', async () => {
    const ctx = await renderQuestion({
      type: 'sort', name: '排序题',
      content: '排序', options: ['小', '中', '大'], answer: [0, 1, 2],
    })
    expect(addTextContains(ctx.slide, 'A.')).toBe(true)
  })

  it('classify（分类题）→ 渲染分类名 + 项目', async () => {
    const ctx = await renderQuestion({
      type: 'classify', name: '分类题',
      content: '分类',
      options: [
        { name: '动物', items: ['猫', '狗'] },
        { name: '植物', items: ['花', '草'] },
      ],
      answer: [[0, 1], [0, 1]],
    })
    expect(addTextContains(ctx.slide, '动物')).toBe(true)
    expect(addTextContains(ctx.slide, '植物')).toBe(true)
  })

  it('match（连线题）→ 渲染 left ↔ right', async () => {
    const ctx = await renderQuestion({
      type: 'match', name: '连线题',
      content: '连线',
      options: [
        { left: '中国', right: '北京' },
        { left: '日本', right: '东京' },
      ],
      answer: [0, 1],
    })
    expect(addTextContains(ctx.slide, '中国')).toBe(true)
    expect(addTextContains(ctx.slide, '北京')).toBe(true)
  })

  it('short-answer（简答题）→ 不渲染选项', async () => {
    const ctx = await renderQuestion({
      type: 'short-answer', name: '简答题',
      content: '简述...', options: [], answer: ['答案.*'],
    })
    expect(ctx.slide.addText).toHaveBeenCalled()
  })

  it('含 explanation → 渲染答案解析', async () => {
    const ctx = await renderQuestion({
      type: 'single', name: '带解析',
      content: '内容', options: ['A', 'B'], answer: [0],
      explanation: '这是解析内容',
    })
    expect(addTextContains(ctx.slide, '解析内容')).toBe(true)
  })
})

// ═══════════════════════════════════════
// Part 4: full flow — markdown → Tiptap → PPT
// ═══════════════════════════════════════

describe('全流程：markdown → Tiptap JSON → PPT 渲染', () => {
  it('复杂 markdown 文档全流程渲染（不抛异常）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')

    const md = [
      '# 第一章：数学基础',
      '',
      '这是一个段落，包含 **粗体** 和 *斜体* 以及 `行内代码`。',
      '',
      '## 公式',
      '',
      '$$E = mc^2$$',
      '',
      '行内公式 $a^2 + b^2 = c^2$ 很重要。',
      '',
      '### 代码示例',
      '',
      '```python',
      'def hello():',
      '    print("Hello, World!")',
      '```',
      '',
      '- 无序项目1',
      '- 无序项目2',
      '',
      '1. 有序项目1',
      '2. 有序项目2',
      '',
      '> 引用块内容',
      '',
      '---',
      '',
      '[链接](https://example.com)',
      '',
      '![图片](https://example.com/img.png)',
    ].join('\n')

    // Step 1: markdown → Tiptap JSON
    const doc = markdownToTiptap(md)
    expect(doc.type).toBe('doc')
    expect(doc.content!.length).toBeGreaterThan(5)  // Should produce multiple block nodes

    // Step 2: Tiptap JSON → PPT rendering (no node throws exception)
    const ctx = createMockCtx()
    for (const node of doc.content!) {
      expect(() => addNodeToSlide(ctx, node, ctx.pres, 0)).not.toThrow()
    }

    // h1/h2 create new pages → pres.addSlide should be called
    expect(ctx.pres.addSlide).toHaveBeenCalled()
  })

  it('markdown 中的 ```question 围栏 → vue 节点 → PPT 渲染（内联题目）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')

    const md = '```question\n{"type":"judge","name":"判断","content":"对吗","options":[],"answer":[0]}\n```'
    const doc = markdownToTiptap(md)
    expect(doc.content![0].type).toBe('vue')
    expect(doc.content![0].attrs!.type).toBe('question')

    // Inline question object → addQuestionToSlide renders directly (no caching needed)
    const ctx = createMockCtx()
    expect(() => addNodeToSlide(ctx, doc.content![0], ctx.pres, 0)).not.toThrow()
    expect(ctx.slide.addText).toHaveBeenCalled()
    expect(addTextContains(ctx.slide, '判断')).toBe(true)
  })

  it('字符串内容经 markdownToTiptap 转换后渲染（题目选项含 codeBlock）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')

    // Simulate question options as markdown strings (containing code blocks)
    const optionMd = '```python\nprint("hello")\n```'
    const optionTiptap = markdownToTiptap(optionMd)
    expect(optionTiptap.content![0].type).toBe('codeBlock')

    // Render question with string options
    const questionCache = new Map()
    questionCache.set(1, {
      type: 'single', name: '代码选项题',
      content: '哪个输出 hello？',
      options: [optionMd, 'print("world")'],  // String options
      answer: [0],
    })
    const ctx = createMockCtx({ questionCache })
    expect(() => addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'question', content: '1' } }, ctx.pres, 0)).not.toThrow()
    // Should have rendered codeBlock (addText with background color)
    const allTextCalls = ctx.slide.addText.mock.calls
    expect(allTextCalls.length).toBeGreaterThan(0)
    // Check whether there is an addText call with fill (background color) (codeBlock feature)
    const hasCodeBlockCall = allTextCalls.some((call: any) => {
      const opts = call[1]
      return opts?.fill?.color  // codeBlock has background color
    })
    expect(hasCodeBlockCall).toBe(true)
  })

  it('字符串内容含数学公式 → markdownToTiptap → blockMath 节点', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const { addNodeToSlide } = await import('../../utils/exportPpt/nodes')

    // Question content is a markdown string containing formulas
    const contentMd = '求以下公式的值：\n\n$$x^2 + y^2 = r^2$$'
    const contentTiptap = markdownToTiptap(contentMd)
    // Should contain blockMath node
    const hasBlockMath = contentTiptap.content!.some((n: any) => n.type === 'blockMath')
    expect(hasBlockMath).toBe(true)

    // Pre-render blockMath (simulating prerenderMathNodes)
    const blockMathCache = new Map()
    blockMathCache.set('x^2 + y^2 = r^2', { dataUrl: 'data:image/png;base64,xxx', width: 4, height: 1 })

    // Render question (content is string → renderTiptapContent → markdownToTiptap → blockMath → addImage)
    const questionCache = new Map()
    questionCache.set(1, {
      type: 'fill', name: '公式题',
      content: contentMd,  // String content
      options: [], answer: ['r'],
    })
    const ctx = createMockCtx({ questionCache, blockMathCache })
    expect(() => addNodeToSlide(ctx, { type: 'vue', attrs: { type: 'question', content: '1' } }, ctx.pres, 0)).not.toThrow()
    // blockMath cache hit → addImage
    expect(ctx.slide.addImage).toHaveBeenCalled()
  })
})
