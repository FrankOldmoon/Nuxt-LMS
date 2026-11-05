/**
 * OJ 题目正文拉取的稳定性测试
 * @see modules/lms/server/utils/questions/oj.ts
 *
 * 回归背景：OJ 平台实测常见 8~20s 才响应、偶发 502，而 show.ts 是「拉不到正文就
 * 把 content 留成 pid」，前端于是显示“OJ 题目内容加载失败”。这里锁住四条约定：
 *  1) 单次请求带 timeout + 不重试（fail fast，别让页面等几十秒）
 *  2) 同一 pid 命中缓存（10 分钟内不再打 OJ）
 *  3) 并发请求合并成一次上游调用
 *  4) 上游失败退回过期缓存（OJ 抖一下不至于整题空白）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  resetAllStubs, setMockFetchHandler, clearMockFetchHandler, setMockLmsConfig,
} from '../../../../test/setup/nuxt-stubs'
import { fetchOj, clearOjCache } from '../../server/utils/questions/oj'

const STATEMENT = '# Description\n\nGiven three variables a, b and c.'

function mockOk(text = STATEMENT) {
  setMockFetchHandler(async () => ({ pdoc: { content: JSON.stringify({ zh: '中文', en: text }) } }))
}

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
  clearOjCache()
  setMockLmsConfig({ oj: { url: 'http://oj.test/' } })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('fetchOj - 正文拉取', () => {
  it('取 {zh,en} 里的 en，走 /p/<pid> 且带 timeout、不重试', async () => {
    let seen: { url: string; options: any } | null = null
    setMockFetchHandler(async (url, options) => {
      seen = { url, options }
      return { pdoc: { content: JSON.stringify({ zh: '中文', en: STATEMENT }) } }
    })
    expect(await fetchOj('P1001')).toBe(STATEMENT)
    expect(seen!.url).toBe('http://oj.test/p/P1001')
    expect(seen!.options.timeout).toBeGreaterThan(0)
    expect(seen!.options.retry).toBe(0)
    expect(seen!.options.headers.Accept).toBe('application/json')
  })

  it('pdoc.content 不是 JSON 时原样返回（部分题目的正文直接是 markdown）', async () => {
    setMockFetchHandler(async () => ({ pdoc: { content: '# Raw markdown' } }))
    expect(await fetchOj('P1016')).toBe('# Raw markdown')
  })

  it('TTL 内命中缓存，不重复打 OJ', async () => {
    const handler = vi.fn(async () => ({ pdoc: { content: JSON.stringify({ en: STATEMENT }) } }))
    setMockFetchHandler(handler)
    await fetchOj('P1002')
    await fetchOj('P1002')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('并发同题只打一次 OJ（一个班同时打开同一道题）', async () => {
    let calls = 0
    setMockFetchHandler(async () => {
      calls++
      await new Promise(r => setTimeout(r, 10))
      return { pdoc: { content: JSON.stringify({ en: STATEMENT }) } }
    })
    const res = await Promise.all([fetchOj('P1003'), fetchOj('P1003'), fetchOj('P1003')])
    expect(calls).toBe(1)
    expect(res).toEqual([STATEMENT, STATEMENT, STATEMENT])
  })

  it('上游失败且无缓存时返回 null（show.ts 保留 pid，前端显示加载失败）', async () => {
    setMockFetchHandler(async () => { throw new Error('502 upstream connect failed') })
    expect(await fetchOj('P1031')).toBeNull()
  })

  it('空正文按失败处理', async () => {
    setMockFetchHandler(async () => ({ pdoc: { content: JSON.stringify({ zh: '', en: '' }) } }))
    expect(await fetchOj('P1026')).toBeNull()
  })

  it('缓存过期后上游挂了：返回上次成功的内容，不返回 null', async () => {
    mockOk()
    await fetchOj('P1017')
    // 推过期时间（TTL 10 分钟）
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 11 * 60 * 1000)
    setMockFetchHandler(async () => { throw new Error('timeout') })
    expect(await fetchOj('P1017')).toBe(STATEMENT)
  })

  it('未配置 OJ 地址时直接返回 null（不发起请求）', async () => {
    const handler = vi.fn(async () => ({ pdoc: { content: '{}' } }))
    setMockFetchHandler(handler)
    setMockLmsConfig({ oj: { url: '' } })
    expect(await fetchOj('P1001')).toBeNull()
    expect(handler).not.toHaveBeenCalled()
  })
})
