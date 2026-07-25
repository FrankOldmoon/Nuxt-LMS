/**
 * Markdown → Tiptap JSON 转换工具测试
 * @see modules/lms/utils/markdown.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('utils/markdown - markdownToTiptap', () => {
  it('空字符串返回空 doc', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    expect(markdownToTiptap('')).toEqual({ type: 'doc', content: [] })
    expect(markdownToTiptap('   \n\n  ')).toEqual({ type: 'doc', content: [] })
  })

  it('段落转换', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('Hello world')
    expect(result.type).toBe('doc')
    expect(result.content).toHaveLength(1)
    expect(result.content![0].type).toBe('paragraph')
    expect(result.content![0].content![0]).toEqual({ type: 'text', text: 'Hello world' })
  })

  it('标题 # - ###### 转换', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const r1 = markdownToTiptap('# 标题1')
    expect(r1.content![0]).toMatchObject({ type: 'heading', attrs: { level: 1 } })
    expect(r1.content![0].content![0]).toEqual({ type: 'text', text: '标题1' })

    const r3 = markdownToTiptap('### 标题3')
    expect(r3.content![0].attrs.level).toBe(3)
  })

  it('代码块转换', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '```js\nconst x = 1\nconsole.log(x)\n```'
    const result = markdownToTiptap(md)
    expect(result.content).toHaveLength(1)
    expect(result.content![0].type).toBe('codeBlock')
    expect(result.content![0].attrs.language).toBe('js')
    expect(result.content![0].content![0].text).toContain('const x = 1')
  })

  it('代码块无语言标识时 attrs.language 为空', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '```\nplain code\n```'
    const result = markdownToTiptap(md)
    expect(result.content![0].attrs.language).toBe('')
  })

  it('```question 围栏解析为 vue 节点（content 为 JSON 对象）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '```question\n{"name":"Q1","type":"fill","content":"1+1=?","answer":["2"],"point":1}\n```'
    const result = markdownToTiptap(md)
    expect(result.content).toHaveLength(1)
    const node = result.content![0]
    expect(node.type).toBe('vue')
    expect(node.attrs.type).toBe('question')
    expect(node.attrs.content).toEqual({
      name: 'Q1',
      type: 'fill',
      content: '1+1=?',
      answer: ['2'],
      point: 1,
    })
  })

  it('```question 围栏 JSON 无效时跳过（不降级为 codeBlock）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '```question\n{invalid json\n```'
    const result = markdownToTiptap(md)
    // 无效 JSON 的 question 围栏应被跳过，不以 codeBlock 渲染残缺 JSON
    expect(result.content).toHaveLength(0)
  })

  it('```question 围栏 JSON 不完整时跳过（流式中途不渲染 codeBlock）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    // 流式中途：JSON 尚未写完，围栏也未闭合
    const md = '口语化指导文本\n\n```question\n{"type":"single","options":["A"'
    const result = markdownToTiptap(md)
    // 口语化段落保留，question 围栏跳过
    expect(result.content).toHaveLength(1)
    expect(result.content![0].type).toBe('paragraph')
  })

  it('```question 围栏可被 prose 包裹（前后段落独立）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '前面段落\n\n```question\n{"type":"single","options":["A","B"],"answer":[0]}\n```\n\n后面段落'
    const result = markdownToTiptap(md)
    expect(result.content).toHaveLength(3)
    expect(result.content![0].type).toBe('paragraph')
    expect(result.content![1].type).toBe('vue')
    expect(result.content![1].attrs.type).toBe('question')
    expect(result.content![2].type).toBe('paragraph')
  })

  it('未闭合的 ```question 围栏（流式中途）也能输出', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    // 流式期间围栏尚未闭合：完整 JSON 仍可解析为 vue 节点
    const md = '```question\n{"type":"judge","options":["正确","错误"],"answer":[0]}'
    const result = markdownToTiptap(md)
    expect(result.content).toHaveLength(1)
    expect(result.content![0].type).toBe('vue')
    expect(result.content![0].attrs.content.type).toBe('judge')
  })

  it('单行块级数学公式 $$...$$ 解析为 blockMath', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '$$x^2 + y^2 = z^2$$'
    const result = markdownToTiptap(md)
    expect(result.content).toHaveLength(1)
    expect(result.content![0].type).toBe('blockMath')
    expect(result.content![0].attrs.latex).toBe('x^2 + y^2 = z^2')
  })

  it('多行块级数学公式 $$...$$ 解析为 blockMath（保留换行）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '$$\nx = a + b\ny = c + d\n$$'
    const result = markdownToTiptap(md)
    expect(result.content).toHaveLength(1)
    expect(result.content![0].type).toBe('blockMath')
    expect(result.content![0].attrs.latex).toBe('x = a + b\ny = c + d')
  })

  it('块级公式与前后段落独立（不吞并相邻段落）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '前面段落\n\n$$E = mc^2$$\n\n后面段落'
    const result = markdownToTiptap(md)
    expect(result.content).toHaveLength(3)
    expect(result.content![0].type).toBe('paragraph')
    expect(result.content![1].type).toBe('blockMath')
    expect(result.content![1].attrs.latex).toBe('E = mc^2')
    expect(result.content![2].type).toBe('paragraph')
  })

  it('行内数学公式 $...$ 解析为 inlineMath', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '已知 $a^2 + b^2 = c^2$，求斜边'
    const result = markdownToTiptap(md)
    expect(result.content![0].type).toBe('paragraph')
    const inline = result.content![0].content || []
    // 应包含一个 inlineMath 节点
    const mathNode = inline.find((n: any) => n.type === 'inlineMath')
    expect(mathNode).toBeDefined()
    expect(mathNode.attrs.latex).toBe('a^2 + b^2 = c^2')
  })

  it('单独的 $ 不被误判为公式（保持字面文本）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '价格 $5 到 $10 之间'
    const result = markdownToTiptap(md)
    expect(result.content![0].type).toBe('paragraph')
    // 不应产生任何 inlineMath 节点
    const inline = result.content![0].content || []
    const mathNode = inline.find((n: any) => n.type === 'inlineMath')
    expect(mathNode).toBeUndefined()
  })

  it('引用块转换', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('> 引用内容\n> 第二行')
    expect(result.content![0].type).toBe('blockquote')
  })

  it('无序列表转换', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('- 项目1\n- 项目2\n* 项目3')
    expect(result.content![0].type).toBe('bulletList')
    expect(result.content![0].content).toHaveLength(3)
  })

  it('有序列表转换', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('1. 第一\n2. 第二\n3. 第三')
    expect(result.content![0].type).toBe('orderedList')
    expect(result.content![0].content).toHaveLength(3)
  })

  it('分隔线转换（仅 --- 识别为分隔线）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    expect(markdownToTiptap('---').content![0].type).toBe('horizontalRule')
    expect(markdownToTiptap('-----').content![0].type).toBe('horizontalRule')
  })

  it('行内语法：粗体 **text**', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('这是 **粗体** 文字')
    const para = result.content![0]
    expect(para.content!.find((n: any) => n.marks?.some((m: any) => m.type === 'bold'))).toBeDefined()
  })

  it('行内语法：斜体 *text*', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('这是 *斜体* 文字')
    const para = result.content![0]
    expect(para.content!.find((n: any) => n.marks?.some((m: any) => m.type === 'italic'))).toBeDefined()
  })

  it('行内语法：行内代码 `code`', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('`code`')
    const text = result.content![0].content![0]
    expect(text.marks).toEqual([{ type: 'code' }])
  })

  it('行内语法：删除线 ~~text~~', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('~~删除~~')
    expect(result.content![0].content![0].marks).toEqual([{ type: 'strike' }])
  })

  it('行内语法：图片 ![alt](url)', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('![logo](https://example.com/logo.png "题图")')
    const img = result.content![0].content!.find((n: any) => n.type === 'image')
    expect(img).toBeDefined()
    expect(img!.attrs.src).toBe('https://example.com/logo.png')
    expect(img!.attrs.alt).toBe('logo')
    expect(img!.attrs.title).toBe('题图')
  })

  it('行内语法：链接 [text](url)', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('[GitHub](https://github.com)')
    const link = result.content![0].content!.find((n: any) => n.marks?.some((m: any) => m.type === 'link'))
    expect(link).toBeDefined()
    expect(link.marks[0].attrs.href).toBe('https://github.com')
  })

  it('行内语法：{{xxx}} 占位符转为 inputs 节点', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('请输入 {{ 答案 }} 后继续')
    const inputs = result.content![0].content!.find((n: any) => n.type === 'inputs')
    expect(inputs).toBeDefined()
    expect(inputs!.attrs.content).toBe('') // 占位符括号内内容被丢弃
  })

  it('行内语法：||content|| 转为 select 节点', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('选 ||选项A|| 试试')
    const select = result.content![0].content!.find((n: any) => n.type === 'select')
    expect(select).toBeDefined()
    expect(select!.attrs.content).toBe('选项A')
  })

  it('粗斜体 ***text***', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('***粗斜***')
    const text = result.content![0].content![0]
    expect(text.marks).toEqual([{ type: 'bold' }, { type: 'italic' }])
  })

  it('\\r\\n 统一为 \\n', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('行1\r\n行2')
    // 多行连续非空行 → 一个段落，内容用空格连接
    expect(result.content).toHaveLength(1)
    expect(result.content![0].type).toBe('paragraph')
    // 段落内含一个 text 节点
    expect(result.content![0].content).toBeDefined()
    expect(result.content![0].content.length).toBeGreaterThan(0)
  })

  it('多个段落分隔（空行）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const result = markdownToTiptap('段1\n\n段2\n\n段3')
    expect(result.content).toHaveLength(3)
    result.content!.forEach((b: any) => expect(b.type).toBe('paragraph'))
  })

  // ===== 4 反引号围栏（````doc ... ````）— 修复死循环 bug 的回归测试 =====

  it('4 反引号 doc 围栏解析为 codeBlock（不进入死循环）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '````doc\n## 标题\n一些内容\n````'
    const result = markdownToTiptap(md)
    expect(result.content).toHaveLength(1)
    expect(result.content![0].type).toBe('codeBlock')
    expect(result.content![0].attrs.language).toBe('doc')
    expect(result.content![0].content![0].text).toContain('标题')
  })

  it('4 反引号围栏内的 3 反引号 question 块视为代码内容（不提前闭合）', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = [
      '````doc',
      '## 练习',
      '```question',
      '{"type":"single","options":["A","B"],"answer":[0]}',
      '```',
      '````',
    ].join('\n')
    const result = markdownToTiptap(md)
    // 整体应为一个 codeBlock（4 反引号围栏），内部的 3 反引号不拆分
    expect(result.content).toHaveLength(1)
    expect(result.content![0].type).toBe('codeBlock')
    expect(result.content![0].attrs.language).toBe('doc')
    // 内部 3 反引号 question 行应作为代码文本保留
    const codeText = result.content![0].content![0].text
    expect(codeText).toContain('question')
    expect(codeText).toContain('"type":"single"')
  })

  it('4 反引号围栏前后的段落独立', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '前面段落\n\n````doc\n内容\n````\n\n后面段落'
    const result = markdownToTiptap(md)
    expect(result.content).toHaveLength(3)
    expect(result.content![0].type).toBe('paragraph')
    expect(result.content![1].type).toBe('codeBlock')
    expect(result.content![2].type).toBe('paragraph')
  })

  it('未闭合的 4 反引号围栏（流式中途）也能输出', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '````doc\n## 流式中的内容'
    const result = markdownToTiptap(md)
    expect(result.content).toHaveLength(1)
    expect(result.content![0].type).toBe('codeBlock')
    expect(result.content![0].attrs.language).toBe('doc')
  })

  it('5+ 反引号围栏同样支持', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    const md = '`````doc\n含 ```` 4反引号\n`````'
    const result = markdownToTiptap(md)
    expect(result.content).toHaveLength(1)
    expect(result.content![0].type).toBe('codeBlock')
    expect(result.content![0].attrs.language).toBe('doc')
  })

  it('安全网：不支持的围栏语法不导致死循环', async () => {
    const { markdownToTiptap } = await import('../../utils/markdown')
    // ``` foo bar — 3 反引号 + 空格 + 文字
    // isBlockStart 返回 true（以 ``` 开头），但 fence 正则不匹配（空格不是 \w）
    // 安全网应将其作为段落消费，避免无限循环
    const md = '``` foo bar\n后续内容'
    const result = markdownToTiptap(md)
    expect(result.type).toBe('doc')
    expect(result.content!.length).toBeGreaterThan(0)
  })
})
