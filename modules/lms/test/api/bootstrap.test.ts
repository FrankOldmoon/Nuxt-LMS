/**
 * 首屏引导端点测试
 * @see modules/lms/server/api/bootstrap.get.ts
 *
 * 一次请求返回三份数据（站点配置 / LMS 公开配置 / 首页数据），
 * 替代此前三个异步插件各自的 SSR 请求。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../server/utils/homeData', () => ({
  getHomeData: vi.fn(),
}))
vi.mock('../../server/utils/lmsPublicConfig', () => ({
  getLmsPublicConfig: vi.fn(),
}))

import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'
import { getHomeData } from '../../server/utils/homeData'
import { getLmsPublicConfig } from '../../server/utils/lmsPublicConfig'

function makeEvent() {
  return { cookies: {}, query: {}, params: {}, node: { req: {}, res: {} } } as any
}

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
})

describe('API: bootstrap.get', () => {
  it('一次返回 siteConfig / lmsPublicConfig / home', async () => {
    ;(globalThis as any).getSiteConfigPublic = vi.fn().mockResolvedValue({ siteTitle: 'My LMS' })
    vi.mocked(getHomeData).mockResolvedValue({ categories: [{ id: 1 }], courses: [], config: null } as any)
    vi.mocked(getLmsPublicConfig).mockReturnValue({ home: { showHero: true }, ai: {} } as any)

    const handler = (await import('../../server/api/bootstrap.get')).default
    const r = await handler(makeEvent())

    expect(r.success).toBe(true)
    expect(r.data.siteConfig.siteTitle).toBe('My LMS')
    expect(r.data.lmsPublicConfig.home).toEqual({ showHero: true })
    expect(r.data.home.categories).toHaveLength(1)
  })

  it('公开可访问，并把 event 透传给 getHomeData（用于按登录态过滤课程）', async () => {
    ;(globalThis as any).getSiteConfigPublic = vi.fn().mockResolvedValue({})
    vi.mocked(getHomeData).mockResolvedValue({ categories: [], courses: [], config: null } as any)
    vi.mocked(getLmsPublicConfig).mockReturnValue({ ai: {} } as any)

    const handler = (await import('../../server/api/bootstrap.get')).default
    const event = makeEvent()
    const r = await handler(event)

    expect(r.success).toBe(true)
    expect(getHomeData).toHaveBeenCalledWith(event)
  })
})
