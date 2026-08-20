/**
 * comment/validate - 评论富文本内容安全校验 单元测试（H3）
 * @see modules/lms/server/utils/comment/validate.ts
 */
import { describe, it, expect } from 'vitest'

async function load() {
  return await import('../../server/utils/comment/validate')
}

describe('validateCommentContent - 禁止危险节点', () => {
  it('拒绝 iframe 节点（恶意 src）', async () => {
    const { validateCommentContent } = await load()
    const doc = { type: 'doc', content: [{ type: 'iframe', attrs: { src: 'https://evil.example.com/xss', width: '100%', height: '300' } }] }
    expect(validateCommentContent(doc)).toMatch(/iframe/)
  })

  it('拒绝嵌套在段落里的 iframe', async () => {
    const { validateCommentContent } = await load()
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hi' }] },
        { type: 'iframe', attrs: { src: 'http://evil.com' } },
      ],
    }
    expect(validateCommentContent(doc)).toMatch(/iframe/)
  })

  it('拒绝 script / html / foreignObject 节点', async () => {
    const { validateCommentContent } = await load()
    expect(validateCommentContent({ type: 'doc', content: [{ type: 'script' }] })).toMatch(/script/)
    expect(validateCommentContent({ type: 'doc', content: [{ type: 'html' }] })).toMatch(/html/)
    expect(validateCommentContent({ type: 'doc', content: [{ type: 'foreignObject' }] })).toMatch(/foreignObject/)
  })

  it('拒绝 vue(html) 原始 HTML 子类型', async () => {
    const { validateCommentContent } = await load()
    const doc = { type: 'doc', content: [{ type: 'vue', attrs: { type: 'html', content: '<script>alert(1)</script>' } }] }
    expect(validateCommentContent(doc)).toMatch(/vue\(html\)/)
  })

  it('接受 JSON 字符串形式的 iframe（反序列化后仍拦截）', async () => {
    const { validateCommentContent } = await load()
    const s = JSON.stringify({ type: 'doc', content: [{ type: 'iframe', attrs: { src: 'https://evil.example.com/' } }] })
    expect(validateCommentContent(s)).toMatch(/iframe/)
  })
})

describe('validateCommentContent - 放行合法内容', () => {
  it('放行纯文本评论', async () => {
    const { validateCommentContent } = await load()
    expect(validateCommentContent('这是一条普通评论')).toBeNull()
    expect(validateCommentContent('<script> 被转义的文本')).toBeNull()
  })

  it('放行正常富文本（段落/图片/视频）', async () => {
    const { validateCommentContent } = await load()
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
        { type: 'image', attrs: { src: '/api/files/serve?pathname=x.png' } },
        { type: 'video', attrs: { src: '/api/files/serve?pathname=x.mp4' } },
      ],
    }
    expect(validateCommentContent(doc)).toBeNull()
  })

  it('放行空内容', async () => {
    const { validateCommentContent } = await load()
    expect(validateCommentContent(null)).toBeNull()
    expect(validateCommentContent('')).toBeNull()
    expect(validateCommentContent(undefined)).toBeNull()
  })
})
