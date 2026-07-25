/**
 * exportPpt 模块补充单元测试
 *
 * 覆盖 exportPpt.test.ts 未测试的工具文件：
 * - colorUtils.ts：cssColorToHex / parseFontSize
 * - constants.ts：常量值
 * - textUtils.ts：extractPlainText / applyMark / extractTextRuns / estimateTextHeight
 * - tableUtils.ts：buildTableRows
 * - slideUtils.ts：newSlide
 * - listUtils.ts：flattenListItems / flattenTaskItems / addListItems
 * - questionUtils.ts：QUESTION_TYPE_LABELS / decryptAnswerValue / collectVueQuestionCids / formatQuestionAnswer
 * - vueDataFetch.ts：collectVueContentCids / extractQuizQuestionCids / extractRaceQuestionCids / fetchVueContent
 * - imageRender.ts：loadEcharts / loadSimpleMindMap / echartsToImage / mindmapToImage / htmlToImage / collectEchartsNodes / collectMindmapHtml / prerenderImageNodes
 * - index.ts：exportChapterToPpt（主流程）
 *
 * 注意：mathRender.ts 和 nodes.ts 已在 exportPpt.test.ts 中测试，此处不重复。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs, setMockFetchHandler } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => { resetAllStubs() })

// ═══════════════════════════════════════
// Mock 工具
// ═══════════════════════════════════════

function createMockSlide() {
  return {
    addText: vi.fn(),
    addImage: vi.fn(),
    addTable: vi.fn(),
    addShape: vi.fn(),
  }
}

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

// ═══════════════════════════════════════
// colorUtils
// ═══════════════════════════════════════

describe('utils/exportPpt/colorUtils', () => {
  describe('cssColorToHex', () => {
    it('undefined/空字符串 → undefined', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex(undefined)).toBeUndefined()
      expect(cssColorToHex('')).toBeUndefined()
    })

    it('非字符串 → undefined', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex(123 as any)).toBeUndefined()
      expect(cssColorToHex(null as any)).toBeUndefined()
    })

    it('#fff（3位 hex）→ FFFFFF', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('#fff')).toBe('FFFFFF')
    })

    it('#ffffff（6位 hex）→ FFFFFF', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('#ffffff')).toBe('FFFFFF')
    })

    it('#000 → 000000', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('#000')).toBe('000000')
    })

    it('#1a2b3c → 1A2B3C（大写）', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('#1a2b3c')).toBe('1A2B3C')
    })

    it('大写/混合大小写输入 → 正确转换', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('#FFF')).toBe('FFFFFF')
      expect(cssColorToHex('#FfFfFf')).toBe('FFFFFF')
    })

    it('带空格的输入 → trim 后转换', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('  #fff  ')).toBe('FFFFFF')
    })

    it('rgb(255, 0, 0) → FF0000', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('rgb(255, 0, 0)')).toBe('FF0000')
    })

    it('rgba(0, 255, 0, 0.5) → 00FF00（忽略 alpha）', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('rgba(0, 255, 0, 0.5)')).toBe('00FF00')
    })

    it('rgb 带空格 → 正确转换', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('rgb( 100, 200, 50 )')).toBe('64C832')
    })

    it('命名颜色 red → FF0000', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('red')).toBe('FF0000')
    })

    it('命名颜色 blue → 0000FF', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('blue')).toBe('0000FF')
    })

    it('命名颜色 transparent → FFFFFF', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('transparent')).toBe('FFFFFF')
    })

    it('grey/gray 别名 → 808080', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('gray')).toBe('808080')
      expect(cssColorToHex('grey')).toBe('808080')
    })

    it('未知颜色 → undefined', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('unknown')).toBeUndefined()
    })

    it('无效格式 → undefined', async () => {
      const { cssColorToHex } = await import('../../utils/exportPpt/colorUtils')
      expect(cssColorToHex('#gggggg')).toBeUndefined()
      expect(cssColorToHex('#12')).toBeUndefined()
      expect(cssColorToHex('rgb(notanumber)')).toBeUndefined()
    })
  })

  describe('parseFontSize', () => {
    it('undefined/空 → undefined', async () => {
      const { parseFontSize } = await import('../../utils/exportPpt/colorUtils')
      expect(parseFontSize(undefined)).toBeUndefined()
      expect(parseFontSize('')).toBeUndefined()
    })

    it('16px → 12（px 转 pt：×0.75）', async () => {
      const { parseFontSize } = await import('../../utils/exportPpt/colorUtils')
      expect(parseFontSize('16px')).toBe(12)
    })

    it('12pt → 12（pt 原值）', async () => {
      const { parseFontSize } = await import('../../utils/exportPpt/colorUtils')
      expect(parseFontSize('12pt')).toBe(12)
    })

    it('1em → 9（em 转 pt：×12×0.75）', async () => {
      const { parseFontSize } = await import('../../utils/exportPpt/colorUtils')
      expect(parseFontSize('1em')).toBe(9)
    })

    it('1rem → 9（rem 转 pt：×12×0.75）', async () => {
      const { parseFontSize } = await import('../../utils/exportPpt/colorUtils')
      expect(parseFontSize('1rem')).toBe(9)
    })

    it('16（无单位）→ 12（默认 px）', async () => {
      const { parseFontSize } = await import('../../utils/exportPpt/colorUtils')
      expect(parseFontSize('16')).toBe(12)
    })

    it('带小数 → 四舍五入', async () => {
      const { parseFontSize } = await import('../../utils/exportPpt/colorUtils')
      expect(parseFontSize('17px')).toBe(13)  // 17 * 0.75 = 12.75 → 13
    })

    it('无效格式 → undefined', async () => {
      const { parseFontSize } = await import('../../utils/exportPpt/colorUtils')
      expect(parseFontSize('invalid')).toBeUndefined()
      expect(parseFontSize('abc12px')).toBeUndefined()
    })

    it('带空格 → 正确解析', async () => {
      const { parseFontSize } = await import('../../utils/exportPpt/colorUtils')
      expect(parseFontSize('16 px')).toBe(12)
    })
  })
})

// ═══════════════════════════════════════
// constants
// ═══════════════════════════════════════

describe('utils/exportPpt/constants', () => {
  it('HEADING_FONT_SIZES 包含 level 1-6 的字号', async () => {
    const { HEADING_FONT_SIZES } = await import('../../utils/exportPpt/constants')
    expect(HEADING_FONT_SIZES[1]).toBe(32)
    expect(HEADING_FONT_SIZES[2]).toBe(26)
    expect(HEADING_FONT_SIZES[3]).toBe(22)
    expect(HEADING_FONT_SIZES[4]).toBe(18)
    expect(HEADING_FONT_SIZES[5]).toBe(16)
    expect(HEADING_FONT_SIZES[6]).toBe(14)
  })

  it('BODY_FONT_SIZE = 14', async () => {
    const { BODY_FONT_SIZE } = await import('../../utils/exportPpt/constants')
    expect(BODY_FONT_SIZE).toBe(14)
  })

  it('BODY_LINE_HEIGHT = 1.5', async () => {
    const { BODY_LINE_HEIGHT } = await import('../../utils/exportPpt/constants')
    expect(BODY_LINE_HEIGHT).toBe(1.5)
  })

  it('CODE_FONT_SIZE = 11', async () => {
    const { CODE_FONT_SIZE } = await import('../../utils/exportPpt/constants')
    expect(CODE_FONT_SIZE).toBe(11)
  })

  it('CODE_LINE_HEIGHT = 1.4', async () => {
    const { CODE_LINE_HEIGHT } = await import('../../utils/exportPpt/constants')
    expect(CODE_LINE_HEIGHT).toBe(1.4)
  })

  it('标题字号随 level 递减', async () => {
    const { HEADING_FONT_SIZES } = await import('../../utils/exportPpt/constants')
    for (let i = 1; i < 6; i++) {
      expect(HEADING_FONT_SIZES[i]).toBeGreaterThan(HEADING_FONT_SIZES[i + 1])
    }
  })
})

// ═══════════════════════════════════════
// textUtils
// ═══════════════════════════════════════

describe('utils/exportPpt/textUtils', () => {
  describe('extractPlainText', () => {
    it('null/undefined → 空字符串', async () => {
      const { extractPlainText } = await import('../../utils/exportPpt/textUtils')
      expect(extractPlainText(null)).toBe('')
      expect(extractPlainText(undefined)).toBe('')
    })

    it('字符串 → 原样返回', async () => {
      const { extractPlainText } = await import('../../utils/exportPpt/textUtils')
      expect(extractPlainText('hello')).toBe('hello')
    })

    it('text 节点 → text 字段', async () => {
      const { extractPlainText } = await import('../../utils/exportPpt/textUtils')
      expect(extractPlainText({ type: 'text', text: 'hi' })).toBe('hi')
    })

    it('text 节点无 text 字段 → 空字符串', async () => {
      const { extractPlainText } = await import('../../utils/exportPpt/textUtils')
      expect(extractPlainText({ type: 'text' })).toBe('')
    })

    it('自定义节点带 text 字段 → 返回 text', async () => {
      const { extractPlainText } = await import('../../utils/exportPpt/textUtils')
      expect(extractPlainText({ type: 'custom', text: 'text' })).toBe('text')
    })

    it('嵌套 content → 递归提取', async () => {
      const { extractPlainText } = await import('../../utils/exportPpt/textUtils')
      const node = {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello ' },
          { type: 'text', text: 'World' },
        ],
      }
      expect(extractPlainText(node)).toBe('Hello World')
    })

    it('无 content 无 text → 空字符串', async () => {
      const { extractPlainText } = await import('../../utils/exportPpt/textUtils')
      expect(extractPlainText({ type: 'unknown' })).toBe('')
    })
  })

  describe('applyMark', () => {
    it('bold → opts.bold = true', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'bold' }, opts)
      expect(opts.bold).toBe(true)
    })

    it('italic → opts.italic = true', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'italic' }, opts)
      expect(opts.italic).toBe(true)
    })

    it('strike → opts.strike = true', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'strike' }, opts)
      expect(opts.strike).toBe(true)
    })

    it('code → Courier New + 灰色背景', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'code' }, opts)
      expect(opts.fontFace).toBe('Courier New')
      expect(opts.backgroundColor).toBe('F0F0F0')
    })

    it('underline → opts.underline = true', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'underline' }, opts)
      expect(opts.underline).toBe(true)
    })

    it('subscript → opts.subscript = true', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'subscript' }, opts)
      expect(opts.subscript).toBe(true)
    })

    it('superscript → opts.superscript = true', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'superscript' }, opts)
      expect(opts.superscript).toBe(true)
    })

    it('link → opts.hyperlink = { url }', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'link', attrs: { href: 'https://example.com' } }, opts)
      expect(opts.hyperlink).toEqual({ url: 'https://example.com' })
    })

    it('link 无 href → 不设置 hyperlink', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'link', attrs: {} }, opts)
      expect(opts.hyperlink).toBeUndefined()
    })

    it('textStyle color → cssColorToHex 转换', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'textStyle', attrs: { color: '#ff0000' } }, opts)
      expect(opts.color).toBe('FF0000')
    })

    it('textStyle fontSize → parseFontSize 转换', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'textStyle', attrs: { fontSize: '16px' } }, opts)
      expect(opts.fontSize).toBe(12)
    })

    it('textStyle fontFamily → fontFace', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'textStyle', attrs: { fontFamily: 'Arial' } }, opts)
      expect(opts.fontFace).toBe('Arial')
    })

    it('textStyle backgroundColor → cssColorToHex', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'textStyle', attrs: { backgroundColor: 'blue' } }, opts)
      expect(opts.backgroundColor).toBe('0000FF')
    })

    it('未知 mark 类型 → 不修改 opts', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      applyMark({ type: 'unknownMark' }, opts)
      expect(Object.keys(opts)).toHaveLength(0)
    })

    it('mark 无 attrs → 不报错（使用默认 {}）', async () => {
      const { applyMark } = await import('../../utils/exportPpt/textUtils')
      const opts: any = {}
      expect(() => applyMark({ type: 'textStyle' }, opts)).not.toThrow()
    })
  })

  describe('extractTextRuns', () => {
    it('空数组 → 空数组', async () => {
      const { extractTextRuns } = await import('../../utils/exportPpt/textUtils')
      expect(extractTextRuns([])).toEqual([])
    })

    it('text 节点 → run with default fontSize/fontFace', async () => {
      const { extractTextRuns } = await import('../../utils/exportPpt/textUtils')
      const runs = extractTextRuns([{ type: 'text', text: 'hello' }])
      expect(runs).toHaveLength(1)
      expect(runs[0].text).toBe('hello')
      expect(runs[0].options.fontSize).toBe(14)  // BODY_FONT_SIZE
      expect(runs[0].options.fontFace).toBe('Calibri')
    })

    it('text 节点带 marks → opts 包含 mark 效果', async () => {
      const { extractTextRuns } = await import('../../utils/exportPpt/textUtils')
      const runs = extractTextRuns([
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
      ])
      expect(runs[0].options.bold).toBe(true)
    })

    it('text 节点无 text → 空字符串 run', async () => {
      const { extractTextRuns } = await import('../../utils/exportPpt/textUtils')
      const runs = extractTextRuns([{ type: 'text' }])
      expect(runs[0].text).toBe('')
    })

    it('hardBreak → \\n run with breakLine', async () => {
      const { extractTextRuns } = await import('../../utils/exportPpt/textUtils')
      const runs = extractTextRuns([{ type: 'hardBreak' }])
      expect(runs).toHaveLength(1)
      expect(runs[0].text).toBe('\n')
      expect(runs[0].options.breakLine).toBe(true)
    })

    it('inlineMath 无 cache → 跳过（不产生 run）', async () => {
      const { extractTextRuns } = await import('../../utils/exportPpt/textUtils')
      const runs = extractTextRuns([
        { type: 'inlineMath', attrs: { latex: 'a+b' } },
      ])
      expect(runs).toHaveLength(0)
    })

    it('inlineMath 有 cache 但未命中 → 跳过', async () => {
      const { extractTextRuns } = await import('../../utils/exportPpt/textUtils')
      const cache = new Map<string, string>()
      const runs = extractTextRuns([
        { type: 'inlineMath', attrs: { latex: 'a+b' } },
      ], cache)
      expect(runs).toHaveLength(0)
    })

    it('inlineMath cache 命中 → 产生 Unicode 文本 run', async () => {
      const { extractTextRuns } = await import('../../utils/exportPpt/textUtils')
      const cache = new Map<string, string>()
      cache.set('a+b', 'a+b')
      const runs = extractTextRuns([
        { type: 'inlineMath', attrs: { latex: 'a+b' } },
      ], cache)
      expect(runs).toHaveLength(1)
      expect(runs[0].text).toBe('a+b')
      expect(runs[0].options.fontSize).toBe(14)
    })

    it('inlineMath 无 latex → 跳过', async () => {
      const { extractTextRuns } = await import('../../utils/exportPpt/textUtils')
      const cache = new Map<string, string>()
      const runs = extractTextRuns([
        { type: 'inlineMath', attrs: {} },
      ], cache)
      expect(runs).toHaveLength(0)
    })

    it('嵌套 content → 递归 walk', async () => {
      const { extractTextRuns } = await import('../../utils/exportPpt/textUtils')
      const runs = extractTextRuns([
        { type: 'paragraph', content: [
          { type: 'text', text: 'a' },
          { type: 'text', text: 'b' },
        ]},
      ])
      expect(runs).toHaveLength(2)
      expect(runs[0].text).toBe('a')
      expect(runs[1].text).toBe('b')
    })

    it('混合节点 → 正确提取', async () => {
      const { extractTextRuns } = await import('../../utils/exportPpt/textUtils')
      const runs = extractTextRuns([
        { type: 'text', text: 'before ' },
        { type: 'hardBreak' },
        { type: 'text', text: 'after' },
      ])
      expect(runs).toHaveLength(3)
      expect(runs.map(r => r.text).join('')).toBe('before \nafter')
    })
  })

  describe('estimateTextHeight', () => {
    it('空文本 → 0', async () => {
      const { estimateTextHeight } = await import('../../utils/exportPpt/textUtils')
      expect(estimateTextHeight('', 10, 14)).toBe(0)
    })

    it('短文本（一行）→ 一行高度', async () => {
      const { estimateTextHeight } = await import('../../utils/exportPpt/textUtils')
      // 5 chars, 10 inches wide → charsPerLine = floor(720 / 7.7) = 93 → 1 line
      const height = estimateTextHeight('hello', 10, 14)
      expect(height).toBeCloseTo((1 * 14 * 1.5) / 72, 5)  // ≈ 0.2917
    })

    it('长文本 → 多行', async () => {
      const { estimateTextHeight } = await import('../../utils/exportPpt/textUtils')
      // 200 chars, 5 inches → charsPerLine = floor(360 / 7.7) = 46 → ceil(200/46) = 5 lines
      const height = estimateTextHeight('a'.repeat(200), 5, 14)
      expect(height).toBeCloseTo((5 * 14 * 1.5) / 72, 5)  // ≈ 1.4583
    })

    it('自定义 lineHeight', async () => {
      const { estimateTextHeight } = await import('../../utils/exportPpt/textUtils')
      const height = estimateTextHeight('hello', 10, 14, 2.0)
      expect(height).toBeCloseTo((1 * 14 * 2.0) / 72, 5)
    })

    it('极窄宽度 → 至少 1 行', async () => {
      const { estimateTextHeight } = await import('../../utils/exportPpt/textUtils')
      const height = estimateTextHeight('hello', 0.1, 14)
      // charsPerLine = floor(7.2 / 7.7) = 0 → max(1, 0) = 1 → 1 line
      expect(height).toBeGreaterThan(0)
    })
  })
})

// ═══════════════════════════════════════
// tableUtils
// ═══════════════════════════════════════

describe('utils/exportPpt/tableUtils', () => {
  it('空表格（无 content）→ 空 rows, colCount=0', async () => {
    const { buildTableRows } = await import('../../utils/exportPpt/tableUtils')
    const result = buildTableRows({ type: 'table' })
    expect(result.rows).toEqual([])
    expect(result.colCount).toBe(0)
  })

  it('仅含非 tableRow 行 → 空 rows', async () => {
    const { buildTableRows } = await import('../../utils/exportPpt/tableUtils')
    const result = buildTableRows({
      type: 'table',
      content: [{ type: 'paragraph' }],
    })
    expect(result.rows).toEqual([])
    expect(result.colCount).toBe(0)
  })

  it('表头行 → 蓝色背景白色文字', async () => {
    const { buildTableRows } = await import('../../utils/exportPpt/tableUtils')
    const result = buildTableRows({
      type: 'table',
      content: [
        { type: 'tableRow', content: [
          { type: 'tableHeader', content: [{ type: 'text', text: 'Name' }] },
          { type: 'tableHeader', content: [{ type: 'text', text: 'Score' }] },
        ]},
      ],
    })
    expect(result.rows).toHaveLength(1)
    expect(result.colCount).toBe(2)
    const headerCell = result.rows[0][0]
    expect(headerCell.text).toBe('Name')
    expect(headerCell.options.bold).toBe(true)
    expect(headerCell.options.align).toBe('center')
    expect(headerCell.options.fill).toEqual({ color: '4472C4' })
    expect(headerCell.options.color).toBe('FFFFFF')
  })

  it('普通单元格 → 默认样式（非粗体，左对齐）', async () => {
    const { buildTableRows } = await import('../../utils/exportPpt/tableUtils')
    const result = buildTableRows({
      type: 'table',
      content: [
        { type: 'tableRow', content: [
          { type: 'tableCell', content: [{ type: 'text', text: 'data' }] },
        ]},
      ],
    })
    const cell = result.rows[0][0]
    expect(cell.text).toBe('data')
    expect(cell.options.bold).toBe(false)
    expect(cell.options.align).toBe('left')
    expect(cell.options.fill).toBeUndefined()
  })

  it('表头自定义背景色/文字色', async () => {
    const { buildTableRows } = await import('../../utils/exportPpt/tableUtils')
    const result = buildTableRows({
      type: 'table',
      content: [
        { type: 'tableRow', content: [
          { type: 'tableHeader', attrs: { background: '#ff0000', color: '#00ff00' },
            content: [{ type: 'text', text: 'H' }] },
        ]},
      ],
    })
    const cell = result.rows[0][0]
    expect(cell.options.fill).toEqual({ color: 'FF0000' })
    expect(cell.options.color).toBe('00FF00')
  })

  it('普通单元格自定义背景色/文字色', async () => {
    const { buildTableRows } = await import('../../utils/exportPpt/tableUtils')
    const result = buildTableRows({
      type: 'table',
      content: [
        { type: 'tableRow', content: [
          { type: 'tableCell', attrs: { background: 'blue', color: 'yellow', align: 'right' },
            content: [{ type: 'text', text: 'C' }] },
        ]},
      ],
    })
    const cell = result.rows[0][0]
    expect(cell.options.fill).toEqual({ color: '0000FF' })
    expect(cell.options.color).toBe('FFFF00')
    expect(cell.options.align).toBe('right')
  })

  it('普通单元格 attrs 无 background/color → 不设置 fill/color', async () => {
    const { buildTableRows } = await import('../../utils/exportPpt/tableUtils')
    const result = buildTableRows({
      type: 'table',
      content: [
        { type: 'tableRow', content: [
          { type: 'tableCell', attrs: {}, content: [{ type: 'text', text: 'C' }] },
        ]},
      ],
    })
    const cell = result.rows[0][0]
    expect(cell.options.fill).toBeUndefined()
    expect(cell.options.color).toBeUndefined()
  })

  it('多行表格 → colCount = 最大列数', async () => {
    const { buildTableRows } = await import('../../utils/exportPpt/tableUtils')
    const result = buildTableRows({
      type: 'table',
      content: [
        { type: 'tableRow', content: [
          { type: 'tableHeader', content: [{ type: 'text', text: 'A' }] },
          { type: 'tableHeader', content: [{ type: 'text', text: 'B' }] },
          { type: 'tableHeader', content: [{ type: 'text', text: 'C' }] },
        ]},
        { type: 'tableRow', content: [
          { type: 'tableCell', content: [{ type: 'text', text: '1' }] },
          { type: 'tableCell', content: [{ type: 'text', text: '2' }] },
        ]},
      ],
    })
    expect(result.rows).toHaveLength(2)
    expect(result.colCount).toBe(3)
  })

  it('所有单元格 fontSize = 12, fontFace = Calibri, valign = middle', async () => {
    const { buildTableRows } = await import('../../utils/exportPpt/tableUtils')
    const result = buildTableRows({
      type: 'table',
      content: [
        { type: 'tableRow', content: [
          { type: 'tableCell', content: [{ type: 'text', text: 'X' }] },
        ]},
      ],
    })
    const opts = result.rows[0][0].options
    expect(opts.fontSize).toBe(12)
    expect(opts.fontFace).toBe('Calibri')
    expect(opts.valign).toBe('middle')
  })
})

// ═══════════════════════════════════════
// slideUtils
// ═══════════════════════════════════════

describe('utils/exportPpt/slideUtils', () => {
  it('newSlide 无标题 → 仅 addSlide，不调用 addText/addShape', async () => {
    const { newSlide } = await import('../../utils/exportPpt/slideUtils')
    const ctx = createMockCtx()
    newSlide(ctx, ctx.pres)
    expect(ctx.pres.addSlide).toHaveBeenCalledTimes(1)
    expect(ctx.slide.addText).not.toHaveBeenCalled()
    expect(ctx.slide.addShape).not.toHaveBeenCalled()
    expect(ctx.currentY).toBe(ctx.startY)
  })

  it('newSlide 有标题 → addSlide + addText + addShape', async () => {
    const { newSlide } = await import('../../utils/exportPpt/slideUtils')
    const ctx = createMockCtx()
    newSlide(ctx, ctx.pres, '章节标题')
    expect(ctx.pres.addSlide).toHaveBeenCalledTimes(1)
    expect(ctx.slide.addText).toHaveBeenCalledTimes(1)
    expect(ctx.slide.addShape).toHaveBeenCalledTimes(1)
    // 标题文本
    expect(ctx.slide.addText.mock.calls[0][0]).toBe('章节标题')
    // 标题选项
    const textOpts = ctx.slide.addText.mock.calls[0][1]
    expect(textOpts.fontSize).toBe(28)
    expect(textOpts.bold).toBe(true)
    expect(textOpts.color).toBe('2B579A')
    // currentY 被重置为 1.25（标题占位后）
    expect(ctx.currentY).toBe(1.25)
  })

  it('newSlide 有标题 → addShape 绘制装饰线', async () => {
    const { newSlide } = await import('../../utils/exportPpt/slideUtils')
    const ctx = createMockCtx()
    newSlide(ctx, ctx.pres, '标题')
    expect(ctx.slide.addShape).toHaveBeenCalledWith('line', expect.objectContaining({
      line: { color: '2B579A', width: 1.5 },
    }))
  })

  it('newSlide → ctx.slide 更新为新 slide 对象', async () => {
    const { newSlide } = await import('../../utils/exportPpt/slideUtils')
    const ctx = createMockCtx()
    const oldSlide = ctx.slide
    newSlide(ctx, ctx.pres)
    expect(ctx.slide).not.toBe(oldSlide)
    expect(ctx.allSlides).toContain(ctx.slide)
  })
})

// ═══════════════════════════════════════
// listUtils
// ═══════════════════════════════════════

describe('utils/exportPpt/listUtils', () => {
  describe('flattenListItems', () => {
    it('无序列表（disc 默认）→ • 前缀', async () => {
      const { flattenListItems } = await import('../../utils/exportPpt/listUtils')
      const list = {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] },
        ],
      }
      const items = flattenListItems(list, 0, 'bullet')
      expect(items).toHaveLength(2)
      expect(items[0].bulletPrefix).toBe('• ')
      expect(items[1].bulletPrefix).toBe('• ')
      expect(items[0].indentLevel).toBe(0)
    })

    it('无序列表（circle）→ ○ 前缀', async () => {
      const { flattenListItems } = await import('../../utils/exportPpt/listUtils')
      const list = {
        type: 'bulletList',
        attrs: { listType: 'circle' },
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'X' }] }] },
        ],
      }
      const items = flattenListItems(list, 0, 'bullet')
      expect(items[0].bulletPrefix).toBe('○ ')
    })

    it('无序列表（square）→ ■ 前缀', async () => {
      const { flattenListItems } = await import('../../utils/exportPpt/listUtils')
      const list = {
        type: 'bulletList',
        attrs: { listType: 'square' },
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Y' }] }] },
        ],
      }
      const items = flattenListItems(list, 0, 'bullet')
      expect(items[0].bulletPrefix).toBe('■ ')
    })

    it('有序列表 → 1. 2. 前缀', async () => {
      const { flattenListItems } = await import('../../utils/exportPpt/listUtils')
      const list = {
        type: 'orderedList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '第一' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '第二' }] }] },
        ],
      }
      const items = flattenListItems(list, 0, 'ordered')
      expect(items[0].bulletPrefix).toBe('1. ')
      expect(items[1].bulletPrefix).toBe('2. ')
    })

    it('有序列表带 start 属性 → 从 start 开始编号', async () => {
      const { flattenListItems } = await import('../../utils/exportPpt/listUtils')
      const list = {
        type: 'orderedList',
        attrs: { start: 5 },
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] },
        ],
      }
      const items = flattenListItems(list, 0, 'ordered')
      expect(items[0].bulletPrefix).toBe('5. ')
      expect(items[1].bulletPrefix).toBe('6. ')
    })

    it('嵌套列表 → indentLevel 递增', async () => {
      const { flattenListItems } = await import('../../utils/exportPpt/listUtils')
      const list = {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [
            { type: 'paragraph', content: [{ type: 'text', text: '父项' }] },
            { type: 'bulletList', content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '子项' }] }] },
            ]},
          ]},
        ],
      }
      const items = flattenListItems(list, 0, 'bullet')
      expect(items).toHaveLength(2)
      expect(items[0].indentLevel).toBe(0)
      expect(items[0].runs[0].text).toBe('父项')
      expect(items[1].indentLevel).toBe(1)
      expect(items[1].runs[0].text).toBe('子项')
    })

    it('嵌套有序列表 → 子列表从 1 重新编号', async () => {
      const { flattenListItems } = await import('../../utils/exportPpt/listUtils')
      const list = {
        type: 'orderedList',
        content: [
          { type: 'listItem', content: [
            { type: 'paragraph', content: [{ type: 'text', text: '父' }] },
            { type: 'orderedList', content: [
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '子1' }] }] },
              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '子2' }] }] },
            ]},
          ]},
        ],
      }
      const items = flattenListItems(list, 0, 'ordered')
      expect(items[1].bulletPrefix).toBe('1. ')
      expect(items[2].bulletPrefix).toBe('2. ')
    })

    it('空列表 → 空数组', async () => {
      const { flattenListItems } = await import('../../utils/exportPpt/listUtils')
      const items = flattenListItems({ type: 'bulletList', content: [] }, 0, 'bullet')
      expect(items).toEqual([])
    })

    it('非 listItem 子节点 → 跳过', async () => {
      const { flattenListItems } = await import('../../utils/exportPpt/listUtils')
      const list = {
        type: 'bulletList',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'not a listItem' }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'real item' }] }] },
        ],
      }
      const items = flattenListItems(list, 0, 'bullet')
      expect(items).toHaveLength(1)
    })
  })

  describe('flattenTaskItems', () => {
    it('已勾选 → ☑ 前缀', async () => {
      const { flattenTaskItems } = await import('../../utils/exportPpt/listUtils')
      const taskList = {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'done' }] }] },
        ],
      }
      const items = flattenTaskItems(taskList, 0)
      expect(items[0].bulletPrefix).toBe('☑ ')
    })

    it('未勾选 → ☐ 前缀', async () => {
      const { flattenTaskItems } = await import('../../utils/exportPpt/listUtils')
      const taskList = {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'todo' }] }] },
        ],
      }
      const items = flattenTaskItems(taskList, 0)
      expect(items[0].bulletPrefix).toBe('☐ ')
    })

    it('无 checked 属性 → 默认未勾选', async () => {
      const { flattenTaskItems } = await import('../../utils/exportPpt/listUtils')
      const taskList = {
        type: 'taskList',
        content: [
          { type: 'taskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }] },
        ],
      }
      const items = flattenTaskItems(taskList, 0)
      expect(items[0].bulletPrefix).toBe('☐ ')
    })

    it('非 taskItem 子节点 → 跳过', async () => {
      const { flattenTaskItems } = await import('../../utils/exportPpt/listUtils')
      const taskList = {
        type: 'taskList',
        content: [
          { type: 'paragraph' },
          { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ok' }] }] },
        ],
      }
      const items = flattenTaskItems(taskList, 0)
      expect(items).toHaveLength(1)
    })

    it('空任务列表 → 空数组', async () => {
      const { flattenTaskItems } = await import('../../utils/exportPpt/listUtils')
      const items = flattenTaskItems({ type: 'taskList', content: [] }, 0)
      expect(items).toEqual([])
    })
  })

  describe('addListItems', () => {
    it('基本渲染 → slide.addText 被调用', async () => {
      const { addListItems } = await import('../../utils/exportPpt/listUtils')
      const ctx = createMockCtx()
      const items = [
        { runs: [{ text: 'Item A', options: {} }], indentLevel: 0, bulletPrefix: '• ' },
        { runs: [{ text: 'Item B', options: {} }], indentLevel: 0, bulletPrefix: '• ' },
      ]
      addListItems(ctx, items, ctx.pres)
      expect(ctx.slide.addText).toHaveBeenCalledTimes(2)
    })

    it('bulletPrefix 合并到第一个 run', async () => {
      const { addListItems } = await import('../../utils/exportPpt/listUtils')
      const ctx = createMockCtx()
      const items = [
        { runs: [{ text: 'Hello', options: { fontSize: 14 } }], indentLevel: 0, bulletPrefix: '1. ' },
      ]
      addListItems(ctx, items, ctx.pres)
      const runs = ctx.slide.addText.mock.calls[0][0]
      expect(runs[0].text).toBe('1. Hello')
    })

    it('空 runs → 使用 bulletPrefix 作为文本', async () => {
      const { addListItems } = await import('../../utils/exportPpt/listUtils')
      const ctx = createMockCtx()
      const items = [
        { runs: [], indentLevel: 0, bulletPrefix: '• ' },
      ]
      addListItems(ctx, items, ctx.pres)
      const runs = ctx.slide.addText.mock.calls[0][0]
      expect(runs[0].text).toBe('• ')
    })

    it('溢出 → 调用 newSlide', async () => {
      const { addListItems } = await import('../../utils/exportPpt/listUtils')
      const ctx = createMockCtx({ currentY: 6.9, maxY: 7.0 })
      const items = [
        { runs: [{ text: 'overflow item', options: {} }], indentLevel: 0, bulletPrefix: '• ' },
      ]
      addListItems(ctx, items, ctx.pres)
      expect(ctx.pres.addSlide).toHaveBeenCalled()
    })

    it('indentLevel > 0 → x 偏移', async () => {
      const { addListItems } = await import('../../utils/exportPpt/listUtils')
      const ctx = createMockCtx()
      const items = [
        { runs: [{ text: 'nested', options: {} }], indentLevel: 2, bulletPrefix: '• ' },
      ]
      addListItems(ctx, items, ctx.pres)
      const opts = ctx.slide.addText.mock.calls[0][1]
      // indent = 2 * 0.4 = 0.8, x = marginX + indent = 0.5 + 0.8 = 1.3
      expect(opts.x).toBe(1.3)
    })
  })
})

// ═══════════════════════════════════════
// questionUtils
// ═══════════════════════════════════════

describe('utils/exportPpt/questionUtils', () => {
  describe('QUESTION_TYPE_LABELS', () => {
    it('包含常见题型', async () => {
      const { QUESTION_TYPE_LABELS } = await import('../../utils/exportPpt/questionUtils')
      expect(QUESTION_TYPE_LABELS.single).toBe('Single Choice')
      expect(QUESTION_TYPE_LABELS.judge).toBe('True/False')
      expect(QUESTION_TYPE_LABELS.multiple).toBe('Multiple Choice')
      expect(QUESTION_TYPE_LABELS.fill).toBe('Fill in Blank')
      expect(QUESTION_TYPE_LABELS['short-answer']).toBe('Short Answer')
      expect(QUESTION_TYPE_LABELS.composite).toBe('Composite')
    })
  })

  describe('decryptAnswerValue', () => {
    it('非字符串 → 原样返回', async () => {
      const { decryptAnswerValue } = await import('../../utils/exportPpt/questionUtils')
      expect(decryptAnswerValue(42)).toBe(42)
      expect(decryptAnswerValue(null)).toBe(null)
      expect(decryptAnswerValue(undefined)).toBe(undefined)
      expect(decryptAnswerValue([1, 2])).toEqual([1, 2])
    })

    it('非 enc: 前缀字符串 → 原样返回', async () => {
      const { decryptAnswerValue } = await import('../../utils/exportPpt/questionUtils')
      expect(decryptAnswerValue('hello')).toBe('hello')
      expect(decryptAnswerValue('0')).toBe('0')
      expect(decryptAnswerValue('enc')).toBe('enc')
    })

    it('无效 base64 → 返回原始 val（catch 回退）', async () => {
      const { decryptAnswerValue } = await import('../../utils/exportPpt/questionUtils')
      const result = decryptAnswerValue('enc:!!!invalid!!!')
      expect(result).toBe('enc:!!!invalid!!!')
    })

    it('加密数字 → 解密为 number', async () => {
      const { decryptAnswerValue } = await import('../../utils/exportPpt/questionUtils')
      // 构造加密值：plain '0' XOR key → base64
      const encVal = encryptForTest('0')
      const result = decryptAnswerValue(encVal)
      expect(result).toBe(0)
      expect(typeof result).toBe('number')
    })

    it('加密非数字字符串 → 解密为 string', async () => {
      const { decryptAnswerValue } = await import('../../utils/exportPpt/questionUtils')
      const encVal = encryptForTest('hello')
      const result = decryptAnswerValue(encVal)
      expect(result).toBe('hello')
      expect(typeof result).toBe('string')
    })
  })

  describe('collectVueQuestionCids', () => {
    it('收集 vue question 节点的 cid', async () => {
      const { collectVueQuestionCids } = await import('../../utils/exportPpt/questionUtils')
      const cids: number[] = []
      const nodes = [
        { type: 'vue', attrs: { type: 'question', content: '101' } },
        { type: 'vue', attrs: { type: 'question', content: 202 } },
      ]
      collectVueQuestionCids(nodes, cids)
      expect(cids).toEqual([101, 202])
    })

    it('递归扫描嵌套节点', async () => {
      const { collectVueQuestionCids } = await import('../../utils/exportPpt/questionUtils')
      const cids: number[] = []
      const nodes = [
        { type: 'doc', content: [
          { type: 'vue', attrs: { type: 'question', content: '303' } },
        ]},
      ]
      collectVueQuestionCids(nodes, cids)
      expect(cids).toEqual([303])
    })

    it('去重（相同 cid 只收集一次）', async () => {
      const { collectVueQuestionCids } = await import('../../utils/exportPpt/questionUtils')
      const cids: number[] = []
      const nodes = [
        { type: 'vue', attrs: { type: 'question', content: '101' } },
        { type: 'vue', attrs: { type: 'question', content: '101' } },
      ]
      collectVueQuestionCids(nodes, cids)
      expect(cids).toEqual([101])
    })

    it('content 为对象（内联题目）→ 跳过', async () => {
      const { collectVueQuestionCids } = await import('../../utils/exportPpt/questionUtils')
      const cids: number[] = []
      const nodes = [
        { type: 'vue', attrs: { type: 'question', content: { type: 'single' } } },
      ]
      collectVueQuestionCids(nodes, cids)
      expect(cids).toEqual([])
    })

    it('cid <= 0 → 跳过', async () => {
      const { collectVueQuestionCids } = await import('../../utils/exportPpt/questionUtils')
      const cids: number[] = []
      const nodes = [
        { type: 'vue', attrs: { type: 'question', content: '0' } },
        { type: 'vue', attrs: { type: 'question', content: '-1' } },
      ]
      collectVueQuestionCids(nodes, cids)
      expect(cids).toEqual([])
    })

    it('非 question 类型的 vue 节点 → 跳过', async () => {
      const { collectVueQuestionCids } = await import('../../utils/exportPpt/questionUtils')
      const cids: number[] = []
      const nodes = [
        { type: 'vue', attrs: { type: 'quiz', content: '101' } },
      ]
      collectVueQuestionCids(nodes, cids)
      expect(cids).toEqual([])
    })

    it('空节点数组 → 不抛异常', async () => {
      const { collectVueQuestionCids } = await import('../../utils/exportPpt/questionUtils')
      const cids: number[] = []
      expect(() => collectVueQuestionCids([], cids)).not.toThrow()
      expect(() => collectVueQuestionCids(null as any, cids)).not.toThrow()
    })
  })

  describe('formatQuestionAnswer', () => {
    it('空 answer → 空字符串', async () => {
      const { formatQuestionAnswer } = await import('../../utils/exportPpt/questionUtils')
      expect(formatQuestionAnswer({ type: 'single', answer: [] })).toBe('')
      expect(formatQuestionAnswer({ type: 'single', answer: null })).toBe('')
      expect(formatQuestionAnswer({ type: 'single' })).toBe('')
    })

    it('single → A, B, C 前缀', async () => {
      const { formatQuestionAnswer } = await import('../../utils/exportPpt/questionUtils')
      const result = formatQuestionAnswer({ type: 'single', answer: [0], options: [] })
      expect(result).toBe('A')
    })

    it('multiple → 多个字母', async () => {
      const { formatQuestionAnswer } = await import('../../utils/exportPpt/questionUtils')
      const result = formatQuestionAnswer({ type: 'multiple', answer: [0, 2], options: [] })
      expect(result).toBe('A, C')
    })

    it('judge → Correct/Wrong', async () => {
      const { formatQuestionAnswer } = await import('../../utils/exportPpt/questionUtils')
      expect(formatQuestionAnswer({ type: 'judge', answer: [0], options: [] })).toBe('Correct')
      expect(formatQuestionAnswer({ type: 'judge', answer: [1], options: [] })).toBe('Wrong')
    })

    it('sort with string options → 1. opt1  2. opt2', async () => {
      const { formatQuestionAnswer } = await import('../../utils/exportPpt/questionUtils')
      const result = formatQuestionAnswer({
        type: 'sort', answer: [0, 1],
        options: ['Small', 'Large'],
      })
      expect(result).toBe('1. Small  2. Large')
    })

    it('sort with object options → extractPlainText', async () => {
      const { formatQuestionAnswer } = await import('../../utils/exportPpt/questionUtils')
      const result = formatQuestionAnswer({
        type: 'sort', answer: [0, 1],
        options: [
          { type: 'doc', content: [{ type: 'text', text: 'First' }] },
          { type: 'doc', content: [{ type: 'text', text: 'Second' }] },
        ],
      })
      expect(result).toContain('1. First')
      expect(result).toContain('2. Second')
    })

    it('fill → ans (regex) | ans2', async () => {
      const { formatQuestionAnswer } = await import('../../utils/exportPpt/questionUtils')
      const result = formatQuestionAnswer({
        type: 'fill', answer: ['answer1', 'answer2'],
        options: ['regex', 'normal'],
      })
      expect(result).toBe('answer1 (regex)  |  answer2')
    })

    it('select → 同 fill 格式', async () => {
      const { formatQuestionAnswer } = await import('../../utils/exportPpt/questionUtils')
      const result = formatQuestionAnswer({
        type: 'select', answer: ['selected'],
        options: ['normal'],
      })
      expect(result).toBe('selected')
    })

    it('short-answer → Regex: ...', async () => {
      const { formatQuestionAnswer } = await import('../../utils/exportPpt/questionUtils')
      const result = formatQuestionAnswer({
        type: 'short-answer', answer: ['.*pattern.*'], options: [],
      })
      expect(result).toBe('Regex: .*pattern.*')
    })

    it('match → left ↔ right', async () => {
      const { formatQuestionAnswer } = await import('../../utils/exportPpt/questionUtils')
      const result = formatQuestionAnswer({
        type: 'match', answer: [0, 1],
        options: [
          { left: '中国', right: '北京' },
          { left: '日本', right: '东京' },
        ],
      })
      expect(result).toBe('中国 ↔ 北京  日本 ↔ 东京')
    })

    it('classify → name: item', async () => {
      const { formatQuestionAnswer } = await import('../../utils/exportPpt/questionUtils')
      const result = formatQuestionAnswer({
        type: 'classify', answer: [0, 1],
        options: [
          { name: '动物', items: ['猫', '狗'] },
          { name: '植物', items: ['花', '草'] },
        ],
      })
      expect(result).toBe('动物: 猫  植物: 草')
    })

    it('未知 type → decrypted join ", "', async () => {
      const { formatQuestionAnswer } = await import('../../utils/exportPpt/questionUtils')
      const result = formatQuestionAnswer({
        type: 'unknown', answer: ['x', 'y'], options: [],
      })
      expect(result).toBe('x, y')
    })

    it('加密 answer → 自动解密', async () => {
      const { formatQuestionAnswer } = await import('../../utils/exportPpt/questionUtils')
      const encrypted0 = encryptForTest('0')
      const result = formatQuestionAnswer({
        type: 'single', answer: [encrypted0], options: [],
      })
      expect(result).toBe('A')
    })
  })
})

// ═══════════════════════════════════════
// vueDataFetch
// ═══════════════════════════════════════

describe('utils/exportPpt/vueDataFetch', () => {
  describe('collectVueContentCids', () => {
    it('收集 quiz/homework/race 的 cid', async () => {
      const { collectVueContentCids } = await import('../../utils/exportPpt/vueDataFetch')
      const quizCids: number[] = []
      const hwCids: number[] = []
      const raceCids: number[] = []
      const nodes = [
        { type: 'vue', attrs: { type: 'quiz', content: '101' } },
        { type: 'vue', attrs: { type: 'homework', content: '201' } },
        { type: 'vue', attrs: { type: 'race', content: '301' } },
      ]
      collectVueContentCids(nodes, quizCids, hwCids, raceCids)
      expect(quizCids).toEqual([101])
      expect(hwCids).toEqual([201])
      expect(raceCids).toEqual([301])
    })

    it('递归扫描嵌套节点', async () => {
      const { collectVueContentCids } = await import('../../utils/exportPpt/vueDataFetch')
      const quizCids: number[] = []
      const hwCids: number[] = []
      const raceCids: number[] = []
      const nodes = [
        { type: 'doc', content: [
          { type: 'vue', attrs: { type: 'quiz', content: 102 } },
        ]},
      ]
      collectVueContentCids(nodes, quizCids, hwCids, raceCids)
      expect(quizCids).toEqual([102])
    })

    it('去重', async () => {
      const { collectVueContentCids } = await import('../../utils/exportPpt/vueDataFetch')
      const quizCids: number[] = []
      const hwCids: number[] = []
      const raceCids: number[] = []
      const nodes = [
        { type: 'vue', attrs: { type: 'quiz', content: '101' } },
        { type: 'vue', attrs: { type: 'quiz', content: '101' } },
      ]
      collectVueContentCids(nodes, quizCids, hwCids, raceCids)
      expect(quizCids).toEqual([101])
    })

    it('content 为对象（内联数据）→ 跳过', async () => {
      const { collectVueContentCids } = await import('../../utils/exportPpt/vueDataFetch')
      const quizCids: number[] = []
      const hwCids: number[] = []
      const raceCids: number[] = []
      const nodes = [
        { type: 'vue', attrs: { type: 'quiz', content: { name: 'inline' } } },
      ]
      collectVueContentCids(nodes, quizCids, hwCids, raceCids)
      expect(quizCids).toEqual([])
    })

    it('cid <= 0 → 跳过', async () => {
      const { collectVueContentCids } = await import('../../utils/exportPpt/vueDataFetch')
      const quizCids: number[] = []
      const hwCids: number[] = []
      const raceCids: number[] = []
      const nodes = [
        { type: 'vue', attrs: { type: 'quiz', content: '0' } },
        { type: 'vue', attrs: { type: 'quiz', content: '-5' } },
      ]
      collectVueContentCids(nodes, quizCids, hwCids, raceCids)
      expect(quizCids).toEqual([])
    })

    it('非 quiz/homework/race 类型 → 跳过', async () => {
      const { collectVueContentCids } = await import('../../utils/exportPpt/vueDataFetch')
      const quizCids: number[] = []
      const hwCids: number[] = []
      const raceCids: number[] = []
      const nodes = [
        { type: 'vue', attrs: { type: 'question', content: '101' } },
      ]
      collectVueContentCids(nodes, quizCids, hwCids, raceCids)
      expect(quizCids).toEqual([])
      expect(hwCids).toEqual([])
      expect(raceCids).toEqual([])
    })

    it('空数组 → 不抛异常', async () => {
      const { collectVueContentCids } = await import('../../utils/exportPpt/vueDataFetch')
      const quizCids: number[] = []
      const hwCids: number[] = []
      const raceCids: number[] = []
      expect(() => collectVueContentCids([], quizCids, hwCids, raceCids)).not.toThrow()
      expect(() => collectVueContentCids(null as any, quizCids, hwCids, raceCids)).not.toThrow()
    })
  })

  describe('extractQuizQuestionCids', () => {
    it('数字数组 → 直接收集', async () => {
      const { extractQuizQuestionCids } = await import('../../utils/exportPpt/vueDataFetch')
      const result = extractQuizQuestionCids({ questions: [1, 2, 3] })
      expect(result).toEqual([1, 2, 3])
    })

    it('对象数组 → 提取 id 字段', async () => {
      const { extractQuizQuestionCids } = await import('../../utils/exportPpt/vueDataFetch')
      const result = extractQuizQuestionCids({ questions: [{ id: 10 }, { id: 20 }] })
      expect(result).toEqual([10, 20])
    })

    it('混合数字/对象', async () => {
      const { extractQuizQuestionCids } = await import('../../utils/exportPpt/vueDataFetch')
      const result = extractQuizQuestionCids({ questions: [1, { id: 2 }, 3] })
      expect(result).toEqual([1, 2, 3])
    })

    it('无 questions 字段 → 空数组', async () => {
      const { extractQuizQuestionCids } = await import('../../utils/exportPpt/vueDataFetch')
      expect(extractQuizQuestionCids({})).toEqual([])
      expect(extractQuizQuestionCids({ questions: null })).toEqual([])
    })

    it('去重', async () => {
      const { extractQuizQuestionCids } = await import('../../utils/exportPpt/vueDataFetch')
      const result = extractQuizQuestionCids({ questions: [1, 1, 2, 2] })
      expect(result).toEqual([1, 2])
    })

    it('id <= 0 → 跳过', async () => {
      const { extractQuizQuestionCids } = await import('../../utils/exportPpt/vueDataFetch')
      const result = extractQuizQuestionCids({ questions: [0, -1, 5] })
      expect(result).toEqual([5])
    })
  })

  describe('extractRaceQuestionCids', () => {
    it('提取 questionIds', async () => {
      const { extractRaceQuestionCids } = await import('../../utils/exportPpt/vueDataFetch')
      const result = extractRaceQuestionCids({ questionIds: [10, 20, 30] })
      expect(result).toEqual([10, 20, 30])
    })

    it('无 questionIds → 空数组', async () => {
      const { extractRaceQuestionCids } = await import('../../utils/exportPpt/vueDataFetch')
      expect(extractRaceQuestionCids({})).toEqual([])
      expect(extractRaceQuestionCids({ questionIds: null })).toEqual([])
    })

    it('去重', async () => {
      const { extractRaceQuestionCids } = await import('../../utils/exportPpt/vueDataFetch')
      const result = extractRaceQuestionCids({ questionIds: [1, 1, 2] })
      expect(result).toEqual([1, 2])
    })

    it('字符串数字 → 转换为 number', async () => {
      const { extractRaceQuestionCids } = await import('../../utils/exportPpt/vueDataFetch')
      const result = extractRaceQuestionCids({ questionIds: ['10', '20'] })
      expect(result).toEqual([10, 20])
    })

    it('id <= 0 → 跳过', async () => {
      const { extractRaceQuestionCids } = await import('../../utils/exportPpt/vueDataFetch')
      const result = extractRaceQuestionCids({ questionIds: [0, -1, 5] })
      expect(result).toEqual([5])
    })
  })

  describe('fetchVueContent', () => {
    it('courseId = 0 → 直接返回，不调用 $fetch', async () => {
      const { fetchVueContent } = await import('../../utils/exportPpt/vueDataFetch')
      const quizCache = new Map()
      const hwCache = new Map()
      const raceCache = new Map()
      await fetchVueContent(0, [1], [2], [3], quizCache, hwCache, raceCache)
      expect(quizCache.size).toBe(0)
      expect(hwCache.size).toBe(0)
      expect(raceCache.size).toBe(0)
    })

    it('有 cid → 调用 $fetch 并写入 cache', async () => {
      const { fetchVueContent } = await import('../../utils/exportPpt/vueDataFetch')
      setMockFetchHandler(async (url: string) => {
        if (url.includes('/api/quizzes/')) return { data: { name: 'Quiz1' }, success: true, msg: '' }
        if (url.includes('/api/homeworks/')) return { data: { name: 'HW1' }, success: true, msg: '' }
        if (url.includes('/api/races/')) return { data: { name: 'Race1' }, success: true, msg: '' }
        return { data: null, success: false, msg: 'not found' }
      })
      const quizCache = new Map()
      const hwCache = new Map()
      const raceCache = new Map()
      await fetchVueContent(1, [101], [201], [301], quizCache, hwCache, raceCache)
      expect(quizCache.get(101)).toEqual({ name: 'Quiz1' })
      expect(hwCache.get(201)).toEqual({ name: 'HW1' })
      expect(raceCache.get(301)).toEqual({ name: 'Race1' })
    })

    it('$fetch 返回 success=false → 不写入 cache', async () => {
      const { fetchVueContent } = await import('../../utils/exportPpt/vueDataFetch')
      setMockFetchHandler(async () => ({ data: null, success: false, msg: 'error' }))
      const quizCache = new Map()
      const hwCache = new Map()
      const raceCache = new Map()
      await fetchVueContent(1, [101], [], [], quizCache, hwCache, raceCache)
      expect(quizCache.size).toBe(0)
    })

    it('$fetch 抛异常 → 不写入 cache，不抛出', async () => {
      const { fetchVueContent } = await import('../../utils/exportPpt/vueDataFetch')
      setMockFetchHandler(async () => { throw new Error('network error') })
      const quizCache = new Map()
      const hwCache = new Map()
      const raceCache = new Map()
      await expect(fetchVueContent(1, [101], [], [], quizCache, hwCache, raceCache)).resolves.not.toThrow()
      expect(quizCache.size).toBe(0)
    })

    it('空 cid 数组 → 正常完成', async () => {
      const { fetchVueContent } = await import('../../utils/exportPpt/vueDataFetch')
      const quizCache = new Map()
      const hwCache = new Map()
      const raceCache = new Map()
      await fetchVueContent(1, [], [], [], quizCache, hwCache, raceCache)
      expect(quizCache.size).toBe(0)
    })
  })
})

// ═══════════════════════════════════════
// imageRender
// ═══════════════════════════════════════

describe('utils/exportPpt/imageRender', () => {
  describe('loadEcharts', () => {
    it('window.echarts 已存在 → 直接 resolve', async () => {
      const { loadEcharts } = await import('../../utils/exportPpt/imageRender')
      // 保存原始值
      const origEcharts = (globalThis as any).echarts
      ;(globalThis as any).echarts = { init: vi.fn() }
      try {
        await expect(loadEcharts()).resolves.toBeUndefined()
      } finally {
        // 恢复
        if (origEcharts === undefined) delete (globalThis as any).echarts
        else (globalThis as any).echarts = origEcharts
      }
    })
  })

  describe('loadSimpleMindMap', () => {
    it('window.simpleMindMap 已存在 → 直接 resolve', async () => {
      const { loadSimpleMindMap } = await import('../../utils/exportPpt/imageRender')
      const origSmm = (globalThis as any).simpleMindMap
      ;(globalThis as any).simpleMindMap = { default: vi.fn() }
      try {
        await expect(loadSimpleMindMap()).resolves.toBeUndefined()
      } finally {
        if (origSmm === undefined) delete (globalThis as any).simpleMindMap
        else (globalThis as any).simpleMindMap = origSmm
      }
    })
  })

  describe('echartsToImage', () => {
    it('无 window（node 环境）→ null', async () => {
      const { echartsToImage } = await import('../../utils/exportPpt/imageRender')
      const origWindow = (globalThis as any).window
      delete (globalThis as any).window
      try {
        const result = await echartsToImage({})
        expect(result).toBeNull()
      } finally {
        if (origWindow === undefined) delete (globalThis as any).window
        else (globalThis as any).window = origWindow
      }
    })

    it('loadEcharts 失败 → null', async () => {
      const { echartsToImage } = await import('../../utils/exportPpt/imageRender')
      // window 存在但 document 不存在 → loadEcharts 会 reject → catch → null
      const result = await echartsToImage({})
      expect(result).toBeNull()
    })
  })

  describe('mindmapToImage', () => {
    it('无 window → null', async () => {
      const { mindmapToImage } = await import('../../utils/exportPpt/imageRender')
      const origWindow = (globalThis as any).window
      delete (globalThis as any).window
      try {
        const result = await mindmapToImage('# test')
        expect(result).toBeNull()
      } finally {
        if (origWindow === undefined) delete (globalThis as any).window
        else (globalThis as any).window = origWindow
      }
    })

    it('空 markdown → null', async () => {
      const { mindmapToImage } = await import('../../utils/exportPpt/imageRender')
      const result = await mindmapToImage('')
      expect(result).toBeNull()
    })

    it('非空 markdown + loadSimpleMindMap 失败 → null', async () => {
      const { mindmapToImage } = await import('../../utils/exportPpt/imageRender')
      const result = await mindmapToImage('# Title\n- A\n- B')
      expect(result).toBeNull()
    })
  })

  describe('htmlToImage', () => {
    it('无 window → null', async () => {
      const { htmlToImage } = await import('../../utils/exportPpt/imageRender')
      const origWindow = (globalThis as any).window
      delete (globalThis as any).window
      try {
        const result = await htmlToImage('<p>test</p>')
        expect(result).toBeNull()
      } finally {
        if (origWindow === undefined) delete (globalThis as any).window
        else (globalThis as any).window = origWindow
      }
    })

    it('空 html → null', async () => {
      const { htmlToImage } = await import('../../utils/exportPpt/imageRender')
      const result = await htmlToImage('')
      expect(result).toBeNull()
    })

    it('非空 html + 无 document → rejects（document.createElement 在 try/catch 外）', async () => {
      const { htmlToImage } = await import('../../utils/exportPpt/imageRender')
      // document 在 node 环境不存在，htmlToImage 直接调用 document.createElement → 抛出
      await expect(htmlToImage('<p>test</p>')).rejects.toThrow()
    })
  })

  describe('collectEchartsNodes', () => {
    it('收集 echarts 节点引用', async () => {
      const { collectEchartsNodes } = await import('../../utils/exportPpt/imageRender')
      const echartsNode = { type: 'echarts', attrs: { option: {} } }
      const nodes = [
        echartsNode,
        { type: 'paragraph' },
      ]
      const refs: any[] = []
      collectEchartsNodes(nodes, refs)
      expect(refs).toHaveLength(1)
      expect(refs[0]).toBe(echartsNode)
    })

    it('递归收集嵌套 echarts 节点', async () => {
      const { collectEchartsNodes } = await import('../../utils/exportPpt/imageRender')
      const nested = { type: 'echarts', attrs: {} }
      const nodes = [
        { type: 'doc', content: [
          { type: 'column', content: [nested] },
        ]},
      ]
      const refs: any[] = []
      collectEchartsNodes(nodes, refs)
      expect(refs).toHaveLength(1)
      expect(refs[0]).toBe(nested)
    })

    it('无 echarts 节点 → 空数组', async () => {
      const { collectEchartsNodes } = await import('../../utils/exportPpt/imageRender')
      const refs: any[] = []
      collectEchartsNodes([{ type: 'paragraph' }, { type: 'heading' }], refs)
      expect(refs).toHaveLength(0)
    })

    it('空数组 → 不抛异常', async () => {
      const { collectEchartsNodes } = await import('../../utils/exportPpt/imageRender')
      const refs: any[] = []
      expect(() => collectEchartsNodes([], refs)).not.toThrow()
      expect(() => collectEchartsNodes(null as any, refs)).not.toThrow()
    })

    it('跳过 null 节点', async () => {
      const { collectEchartsNodes } = await import('../../utils/exportPpt/imageRender')
      const refs: any[] = []
      collectEchartsNodes([null, { type: 'echarts', attrs: {} }, undefined], refs)
      expect(refs).toHaveLength(1)
    })
  })

  describe('collectMindmapHtml', () => {
    it('收集 mindmap 和 html 内容', async () => {
      const { collectMindmapHtml } = await import('../../utils/exportPpt/imageRender')
      const mindmapKeys = new Set<string>()
      const htmlKeys = new Set<string>()
      const nodes = [
        { type: 'vue', attrs: { type: 'mindmap', content: '# Mind Map' } },
        { type: 'vue', attrs: { type: 'html', content: '<p>HTML</p>' } },
      ]
      collectMindmapHtml(nodes, mindmapKeys, htmlKeys)
      expect(mindmapKeys.has('# Mind Map')).toBe(true)
      expect(htmlKeys.has('<p>HTML</p>')).toBe(true)
    })

    it('递归收集嵌套节点', async () => {
      const { collectMindmapHtml } = await import('../../utils/exportPpt/imageRender')
      const mindmapKeys = new Set<string>()
      const htmlKeys = new Set<string>()
      const nodes = [
        { type: 'doc', content: [
          { type: 'vue', attrs: { type: 'mindmap', content: '# Nested' } },
        ]},
      ]
      collectMindmapHtml(nodes, mindmapKeys, htmlKeys)
      expect(mindmapKeys.has('# Nested')).toBe(true)
    })

    it('非 mindmap/html 类型 → 跳过', async () => {
      const { collectMindmapHtml } = await import('../../utils/exportPpt/imageRender')
      const mindmapKeys = new Set<string>()
      const htmlKeys = new Set<string>()
      const nodes = [
        { type: 'vue', attrs: { type: 'question', content: '101' } },
        { type: 'vue', attrs: { type: 'quiz', content: '201' } },
      ]
      collectMindmapHtml(nodes, mindmapKeys, htmlKeys)
      expect(mindmapKeys.size).toBe(0)
      expect(htmlKeys.size).toBe(0)
    })

    it('content 非字符串 → 跳过', async () => {
      const { collectMindmapHtml } = await import('../../utils/exportPpt/imageRender')
      const mindmapKeys = new Set<string>()
      const htmlKeys = new Set<string>()
      const nodes = [
        { type: 'vue', attrs: { type: 'mindmap', content: { obj: true } } },
        { type: 'vue', attrs: { type: 'html', content: null } },
      ]
      collectMindmapHtml(nodes, mindmapKeys, htmlKeys)
      expect(mindmapKeys.size).toBe(0)
      expect(htmlKeys.size).toBe(0)
    })

    it('content 为空字符串 → 跳过', async () => {
      const { collectMindmapHtml } = await import('../../utils/exportPpt/imageRender')
      const mindmapKeys = new Set<string>()
      const htmlKeys = new Set<string>()
      const nodes = [
        { type: 'vue', attrs: { type: 'mindmap', content: '' } },
      ]
      collectMindmapHtml(nodes, mindmapKeys, htmlKeys)
      expect(mindmapKeys.size).toBe(0)
    })

    it('去重（相同 content 只收集一次）', async () => {
      const { collectMindmapHtml } = await import('../../utils/exportPpt/imageRender')
      const mindmapKeys = new Set<string>()
      const htmlKeys = new Set<string>()
      const nodes = [
        { type: 'vue', attrs: { type: 'mindmap', content: '# Same' } },
        { type: 'vue', attrs: { type: 'mindmap', content: '# Same' } },
      ]
      collectMindmapHtml(nodes, mindmapKeys, htmlKeys)
      expect(mindmapKeys.size).toBe(1)
    })

    it('空数组 → 不抛异常', async () => {
      const { collectMindmapHtml } = await import('../../utils/exportPpt/imageRender')
      const mindmapKeys = new Set<string>()
      const htmlKeys = new Set<string>()
      expect(() => collectMindmapHtml([], mindmapKeys, htmlKeys)).not.toThrow()
      expect(() => collectMindmapHtml(null as any, mindmapKeys, htmlKeys)).not.toThrow()
    })
  })

  describe('prerenderImageNodes', () => {
    it('空节点 → 直接返回，cache 不变', async () => {
      const { prerenderImageNodes } = await import('../../utils/exportPpt/imageRender')
      const echartsCache = new Map<any, any>()
      const mindmapCache = new Map<string, any>()
      const htmlCache = new Map<string, any>()
      await prerenderImageNodes([], echartsCache, mindmapCache, htmlCache)
      expect(echartsCache.size).toBe(0)
      expect(mindmapCache.size).toBe(0)
      expect(htmlCache.size).toBe(0)
    })

    it('无图片节点 → 直接返回', async () => {
      const { prerenderImageNodes } = await import('../../utils/exportPpt/imageRender')
      const echartsCache = new Map<any, any>()
      const mindmapCache = new Map<string, any>()
      const htmlCache = new Map<string, any>()
      const nodes = [{ type: 'paragraph' }, { type: 'heading' }]
      await prerenderImageNodes(nodes, echartsCache, mindmapCache, htmlCache)
      expect(echartsCache.size).toBe(0)
    })

    it('有 echarts 节点 → cache 写入 null（渲染失败）', async () => {
      const { prerenderImageNodes } = await import('../../utils/exportPpt/imageRender')
      const echartsCache = new Map<any, any>()
      const mindmapCache = new Map<string, any>()
      const htmlCache = new Map<string, any>()
      const echartsNode = { type: 'echarts', attrs: { chartOptions: { title: { text: 'Chart' } } } }
      await prerenderImageNodes([echartsNode], echartsCache, mindmapCache, htmlCache)
      expect(echartsCache.size).toBe(1)
      expect(echartsCache.get(echartsNode)).toBeNull()
    })

    it('有 mindmap 节点 → cache 写入 null', async () => {
      const { prerenderImageNodes } = await import('../../utils/exportPpt/imageRender')
      const echartsCache = new Map<any, any>()
      const mindmapCache = new Map<string, any>()
      const htmlCache = new Map<string, any>()
      const md = '# Mind Map'
      const nodes = [{ type: 'vue', attrs: { type: 'mindmap', content: md } }]
      await prerenderImageNodes(nodes, echartsCache, mindmapCache, htmlCache)
      expect(mindmapCache.size).toBe(1)
      expect(mindmapCache.get(md)).toBeNull()
    })

    it('有 html 节点 → cache 写入 null', async () => {
      const { prerenderImageNodes } = await import('../../utils/exportPpt/imageRender')
      const echartsCache = new Map<any, any>()
      const mindmapCache = new Map<string, any>()
      const htmlCache = new Map<string, any>()
      const html = '<p>Test</p>'
      const nodes = [{ type: 'vue', attrs: { type: 'html', content: html } }]
      await prerenderImageNodes(nodes, echartsCache, mindmapCache, htmlCache)
      expect(htmlCache.size).toBe(1)
      expect(htmlCache.get(html)).toBeNull()
    })
  })
})

// ═══════════════════════════════════════
// index (exportChapterToPpt)
// ═══════════════════════════════════════

describe('utils/exportPpt/index', () => {
  describe('exportChapterToPpt', () => {
    it('无 window → 抛出错误', async () => {
      const { exportChapterToPpt } = await import('../../utils/exportPpt/index')
      const origWindow = (globalThis as any).window
      delete (globalThis as any).window
      try {
        await expect(exportChapterToPpt({}, 'test')).rejects.toThrow('PPT export can only be used in the browser')
      } finally {
        if (origWindow === undefined) delete (globalThis as any).window
        else (globalThis as any).window = origWindow
      }
    })

    it('空内容 + mock PptxGenJS → 完成 writeFile 调用', async () => {
      const { exportChapterToPpt } = await import('../../utils/exportPpt/index')

      const mockSlide = createMockSlide()
      const mockPres = {
        addSlide: vi.fn(() => mockSlide),
        writeFile: vi.fn().mockResolvedValue(undefined),
      }
      const MockPptxGenJS = vi.fn(function() { return mockPres })

      const origPptx = (globalThis as any).PptxGenJS
      ;(globalThis as any).PptxGenJS = MockPptxGenJS
      try {
        await exportChapterToPpt(
          { type: 'doc', content: [] },
          'Test Chapter',
          0,  // courseId = 0 → 跳过 $fetch
        )
        expect(MockPptxGenJS).toHaveBeenCalled()
        expect(mockPres.addSlide).toHaveBeenCalled()
        expect(mockPres.writeFile).toHaveBeenCalledWith({ fileName: 'Test Chapter.pptx' })
      } finally {
        if (origPptx === undefined) delete (globalThis as any).PptxGenJS
        else (globalThis as any).PptxGenJS = origPptx
      }
    })

    it('文件名特殊字符 → 替换为 _', async () => {
      const { exportChapterToPpt } = await import('../../utils/exportPpt/index')

      const mockSlide = createMockSlide()
      const mockPres = {
        addSlide: vi.fn(() => mockSlide),
        writeFile: vi.fn().mockResolvedValue(undefined),
      }
      const MockPptxGenJS = vi.fn(function() { return mockPres })

      const origPptx = (globalThis as any).PptxGenJS
      ;(globalThis as any).PptxGenJS = MockPptxGenJS
      try {
        await exportChapterToPpt(
          { type: 'doc', content: [] },
          'chapter/title:with*special?chars',
          0,
        )
        const fileName = mockPres.writeFile.mock.calls[0][0].fileName
        // 所有特殊字符 \ / : * ? " < > | 替换为 _
        expect(fileName).not.toContain('/')
        expect(fileName).not.toContain(':')
        expect(fileName).not.toContain('*')
        expect(fileName).not.toContain('?')
        expect(fileName).toBe('chapter_title_with_special_chars.pptx')
      } finally {
        if (origPptx === undefined) delete (globalThis as any).PptxGenJS
        else (globalThis as any).PptxGenJS = origPptx
      }
    })

    it('空标题 → 使用 chapter 作为文件名', async () => {
      const { exportChapterToPpt } = await import('../../utils/exportPpt/index')

      const mockSlide = createMockSlide()
      const mockPres = {
        addSlide: vi.fn(() => mockSlide),
        writeFile: vi.fn().mockResolvedValue(undefined),
      }
      const MockPptxGenJS = vi.fn(function() { return mockPres })

      const origPptx = (globalThis as any).PptxGenJS
      ;(globalThis as any).PptxGenJS = MockPptxGenJS
      try {
        await exportChapterToPpt({ type: 'doc', content: [] }, '', 0)
        expect(mockPres.writeFile).toHaveBeenCalledWith({ fileName: 'chapter.pptx' })
      } finally {
        if (origPptx === undefined) delete (globalThis as any).PptxGenJS
        else (globalThis as any).PptxGenJS = origPptx
      }
    })

    it('裸 doc 内容（无 type）→ 正常处理', async () => {
      const { exportChapterToPpt } = await import('../../utils/exportPpt/index')

      const mockSlide = createMockSlide()
      const mockPres = {
        addSlide: vi.fn(() => mockSlide),
        writeFile: vi.fn().mockResolvedValue(undefined),
      }
      const MockPptxGenJS = vi.fn(function() { return mockPres })

      const origPptx = (globalThis as any).PptxGenJS
      ;(globalThis as any).PptxGenJS = MockPptxGenJS
      try {
        // 传裸数组（非 doc 对象）
        await exportChapterToPpt([], 'Bare', 0)
        expect(mockPres.writeFile).toHaveBeenCalledWith({ fileName: 'Bare.pptx' })
      } finally {
        if (origPptx === undefined) delete (globalThis as any).PptxGenJS
        else (globalThis as any).PptxGenJS = origPptx
      }
    })

    it('{ json: ... } 包裹形式 → 正确解包', async () => {
      const { exportChapterToPpt } = await import('../../utils/exportPpt/index')

      const mockSlide = createMockSlide()
      const mockPres = {
        addSlide: vi.fn(() => mockSlide),
        writeFile: vi.fn().mockResolvedValue(undefined),
      }
      const MockPptxGenJS = vi.fn(function() { return mockPres })

      const origPptx = (globalThis as any).PptxGenJS
      ;(globalThis as any).PptxGenJS = MockPptxGenJS
      try {
        await exportChapterToPpt({ json: { type: 'doc', content: [] } }, 'Wrapped', 0)
        expect(mockPres.writeFile).toHaveBeenCalledWith({ fileName: 'Wrapped.pptx' })
      } finally {
        if (origPptx === undefined) delete (globalThis as any).PptxGenJS
        else (globalThis as any).PptxGenJS = origPptx
      }
    })

    it('pres 属性被正确设置', async () => {
      const { exportChapterToPpt } = await import('../../utils/exportPpt/index')

      const mockSlide = createMockSlide()
      const mockPres: any = {
        addSlide: vi.fn(() => mockSlide),
        writeFile: vi.fn().mockResolvedValue(undefined),
      }
      const MockPptxGenJS = vi.fn(function() { return mockPres })

      const origPptx = (globalThis as any).PptxGenJS
      ;(globalThis as any).PptxGenJS = MockPptxGenJS
      try {
        await exportChapterToPpt({ type: 'doc', content: [] }, 'Props', 0)
        expect(mockPres.layout).toBe('LAYOUT_WIDE')
        expect(mockPres.author).toBe('LMS')
        expect(mockPres.company).toBe('LMS')
        expect(mockPres.slideNumber).toBeDefined()
        expect(mockPres.slideNumber.align).toBe('right')
      } finally {
        if (origPptx === undefined) delete (globalThis as any).PptxGenJS
        else (globalThis as any).PptxGenJS = origPptx
      }
    })
  })
})

// ═══════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════

/**
 * 测试用加密函数（与 questionUtils.decryptAnswerValue 对应的加密逻辑）
 * 用 Buffer 代替 btoa/unescape 以确保 Node 环境兼容
 */
function encryptForTest(plain: string): string {
  const ENC_KEY = 'lms_q_a_2026'
  let xored = ''
  for (let i = 0; i < plain.length; i++) {
    xored += String.fromCharCode(plain.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length))
  }
  // 反向操作 of: decoded = decodeURIComponent(escape(binary))
  // 即: binary = unescape(encodeURIComponent(decoded)) → 但用 Buffer 更可靠
  const buf = Buffer.from(xored, 'utf8')
  let binary = ''
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i])
  return 'enc:' + Buffer.from(binary, 'binary').toString('base64')
}
