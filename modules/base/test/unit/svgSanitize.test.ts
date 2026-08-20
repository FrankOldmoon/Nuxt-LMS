/**
 * upload/validate - SVG 消毒与内容嗅探 单元测试（存储型 XSS 修复）
 * @see modules/base/server/utils/upload/validate.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// validate.ts 依赖 @nuxthub/db 与 ./parse(-> sharp)，此处打桩隔离
vi.mock('@nuxthub/db', () => ({ db: {}, schema: {} }))
vi.mock('../../server/utils/upload/parse', () => ({
  UploadError: class UploadError extends Error {},
}))

import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

async function load() {
  return await import('../../server/utils/upload/validate')
}

describe('sanitizeSvg - 移除可执行内容', () => {
  it('移除 <script> 块', async () => {
    const { sanitizeSvg } = await load()
    const out = sanitizeSvg(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')).toString()
    expect(out).not.toMatch(/script/i)
    expect(out).toContain('<svg')
  })

  it('移除自闭合 <script/>', async () => {
    const { sanitizeSvg } = await load()
    const out = sanitizeSvg(Buffer.from('<svg><script src="https://evil/x.js"/></svg>')).toString()
    expect(out).not.toMatch(/script/i)
  })

  it('移除 <foreignObject>（可内嵌 HTML）', async () => {
    const { sanitizeSvg } = await load()
    const out = sanitizeSvg(Buffer.from('<svg><foreignObject><div onclick="x()">hi</div></foreignObject></svg>')).toString()
    expect(out).not.toMatch(/foreignObject/i)
  })

  it('移除 on* 事件处理器属性', async () => {
    const { sanitizeSvg } = await load()
    const out = sanitizeSvg(Buffer.from('<svg onload="alert(document.domain)"><circle onclick="x()"/></svg>')).toString()
    expect(out).not.toMatch(/onload/i)
    expect(out).not.toMatch(/onclick/i)
  })

  it('移除 javascript: 伪协议 URL（href / xlink:href / src）', async () => {
    const { sanitizeSvg } = await load()
    const out = sanitizeSvg(Buffer.from(
      '<svg xmlns:xlink="http://www.w3.org/1999/xlink">'
      + '<a href="javascript:alert(1)">t</a>'
      + '<use xlink:href="javascript:evil()"/>'
      + '<image src="javascript:x"/>'
      + '</svg>',
    )).toString()
    expect(out).not.toMatch(/javascript:/i)
    // 属性名保留：xlink:href 不会被破坏成 xlink
    expect(out).toContain('xlink:href=""')
  })

  it('保留无害 SVG 结构', async () => {
    const { sanitizeSvg } = await load()
    const src = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="#fff"/></svg>'
    expect(sanitizeSvg(Buffer.from(src)).toString()).toBe(src)
  })
})

describe('isSvgContent - MIME 嗅探', () => {
  it('识别带 XML 声明与 BOM 的 SVG', async () => {
    const { isSvgContent } = await load()
    expect(isSvgContent(Buffer.from('\uFEFF<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe(true)
  })

  it('拒绝伪装成 SVG 的 HTML', async () => {
    const { isSvgContent } = await load()
    expect(isSvgContent(Buffer.from('<!DOCTYPE html><html><body>x</body></html>'))).toBe(false)
    expect(isSvgContent(Buffer.from('plain text'))).toBe(false)
  })
})
