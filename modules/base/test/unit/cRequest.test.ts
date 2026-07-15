/**
 * utils/cRequest unit tests
 * @see modules/base/utils/cRequest.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockFetchHandler,
  clearMockFetchHandler,
  setMockRoute,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
})

describe('utils/cRequest - injectToUrl', () => {
  it('无 courseId/chapterId 时原样返回', async () => {
    const { injectToUrl } = await import('../../utils/cRequest')
    expect(injectToUrl('/api/list', 0, 0)).toBe('/api/list')
  })

  it('注入 courseId 到无 query 的 URL', async () => {
    const { injectToUrl } = await import('../../utils/cRequest')
    expect(injectToUrl('/api/list', 5, 0)).toBe('/api/list?course_id=5')
  })

  it('注入 chapterId 到已有 query 的 URL', async () => {
    const { injectToUrl } = await import('../../utils/cRequest')
    expect(injectToUrl('/api/list?page=1', 0, 7)).toBe('/api/list?page=1&chapter_id=7')
  })

  it('同时注入 courseId 和 chapterId', async () => {
    const { injectToUrl } = await import('../../utils/cRequest')
    expect(injectToUrl('/api/list', 5, 7)).toBe('/api/list?course_id=5&chapter_id=7')
  })

  it('已有 course_id 时不覆盖', async () => {
    const { injectToUrl } = await import('../../utils/cRequest')
    expect(injectToUrl('/api/list?course_id=99', 5, 0)).toBe('/api/list?course_id=99')
  })

  it('非字符串输入原样返回', async () => {
    const { injectToUrl } = await import('../../utils/cRequest')
    expect(injectToUrl(null as any, 5, 7)).toBe(null)
  })
})

describe('utils/cRequest - injectToBody', () => {
  it('null/非对象 body 原样返回', async () => {
    const { injectToBody } = await import('../../utils/cRequest')
    expect(injectToBody(null, 5, 7)).toBe(null)
    expect(injectToBody('string', 5, 7)).toBe('string')
  })

  it('注入 course_id 和 chapter_id 到 body', async () => {
    const { injectToBody } = await import('../../utils/cRequest')
    const result = injectToBody({ name: 'x' }, 5, 7)
    expect(result).toEqual({ name: 'x', course_id: 5, chapter_id: 7 })
  })

  it('已有 course_id 时不覆盖', async () => {
    const { injectToBody } = await import('../../utils/cRequest')
    const result = injectToBody({ course_id: 99 }, 5, 7)
    expect(result.course_id).toBe(99)
    expect(result.chapter_id).toBe(7)
  })

  it('不修改原始 body 对象', async () => {
    const { injectToBody } = await import('../../utils/cRequest')
    const original = { name: 'x' }
    injectToBody(original, 5, 7)
    expect(original).toEqual({ name: 'x' })
  })
})

describe('utils/cRequest - cRequest 命令式调用', () => {
  it('成功时返回 data 字段', async () => {
    setMockFetchHandler(async () => ({ data: { id: 1, name: 'alice' }, success: true, msg: '' }))
    const { cRequest } = await import('../../utils/cRequest')
    const result = await cRequest('/api/users/show')
    expect(result).toEqual({ id: 1, name: 'alice' })
  })

  it('success=false 时抛错并包含 msg', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'forbidden' }))
    const { cRequest } = await import('../../utils/cRequest')
    await expect(cRequest('/api/x')).rejects.toThrow('forbidden')
  })

  it('success=false 且无 msg 时使用默认错误信息', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: '' }))
    const { cRequest } = await import('../../utils/cRequest')
    await expect(cRequest('/api/x')).rejects.toThrow('请求失败')
  })

  it('GET 请求注入 route 的 course_id/chapter_id 到 URL', async () => {
    setMockRoute({ params: { id: '3', cid: '5' }, query: {} })
    let capturedUrl = ''
    setMockFetchHandler(async (url) => {
      capturedUrl = url
      return { data: null, success: true, msg: '' }
    })
    const { cRequest } = await import('../../utils/cRequest')
    await cRequest('/api/list')
    expect(capturedUrl).toContain('course_id=3')
    expect(capturedUrl).toContain('chapter_id=5')
  })

  it('POST 请求注入 route 的 course_id/chapter_id 到 body', async () => {
    setMockRoute({ params: { id: '3' }, query: {} })
    let capturedOpts: any
    setMockFetchHandler(async (_url, opts) => {
      capturedOpts = opts
      return { data: null, success: true, msg: '' }
    })
    const { cRequest } = await import('../../utils/cRequest')
    await cRequest('/api/save', { method: 'POST', body: { name: 'x' } })
    expect(capturedOpts.body).toEqual({ name: 'x', course_id: 3 })
  })
})

describe('utils/cRequest - cRequest.use', () => {
  it('返回 useFetch 风格结果，自动解包 data', async () => {
    setMockFetchHandler(async () => ({ data: { id: 1, name: 'alice' }, success: true, msg: '' }))
    const { cRequest } = await import('../../utils/cRequest')
    const result = cRequest.use('/api/users/show')
    // useFetch defaults to lazy=false, will trigger refresh immediately (async)
    expect(result.data).toBeDefined()
    expect(result.pending).toBeDefined()
    expect(result.refresh).toBeDefined()
  })

  it('支持 Ref 类型的 url', async () => {
    setMockFetchHandler(async () => ({ data: { ok: true }, success: true, msg: '' }))
    const { cRequest } = await import('../../utils/cRequest')
    const urlRef = ref('/api/x')
    const result = cRequest.use(urlRef)
    expect(result.data).toBeDefined()
  })

  it('支持函数类型的 url', async () => {
    setMockFetchHandler(async () => ({ data: { ok: true }, success: true, msg: '' }))
    const { cRequest } = await import('../../utils/cRequest')
    const result = cRequest.use(() => '/api/y')
    expect(result.data).toBeDefined()
  })

  it('自定义 transform 应用于解包后的 data', async () => {
    setMockFetchHandler(async () => ({ data: { id: 1, name: 'alice' }, success: true, msg: '' }))
    const { cRequest } = await import('../../utils/cRequest')
    const result = cRequest.use('/api/users/show', {
      transform: (raw: any) => ({ ...raw, transformed: true }),
    })
    await vi.waitFor(() => {
      expect(result.data.value).toEqual({ id: 1, name: 'alice', transformed: true })
    })
  })
})
