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
})
