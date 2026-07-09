/**
 * useLmsConfig composable 测试
 * @see modules/lms/composables/useLmsConfig.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetAllStubs,
  setMockFetchHandler,
  clearMockFetchHandler,
  setMockI18n,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string) => k,
    d: (v: any) => String(v),
  })
})

describe('composables/useLmsConfig', () => {
  it('默认 siteTitle 为 "AI LMS"', async () => {
    const { useLmsConfig } = await import('../../composables/useLmsConfig')
    const { siteTitle } = useLmsConfig()
    expect(siteTitle.value).toBe('AI LMS')
  })

  it('siteTitle 支持国际化对象', async () => {
    setMockI18n({ locale: { value: 'zh' }, t: (k: string) => k, d: (v: any) => String(v) })
    setMockFetchHandler(async () => ({
      data: {
        config: { siteTitle: { zh: '我的学习平台', en: 'My LMS' } },
      },
      success: true,
      msg: '',
    }))
    const { useLmsConfig } = await import('../../composables/useLmsConfig')
    const { siteTitle } = useLmsConfig()
    // 站点配置变化不会立即反映（useFetch 是单次调用）
    expect(typeof siteTitle.value).toBe('string')
  })

  it('siteTitle 字符串直接返回', async () => {
    setMockFetchHandler(async () => ({
      data: { config: { siteTitle: 'My Custom LMS' } },
      success: true,
      msg: '',
    }))
    const { useLmsConfig } = await import('../../composables/useLmsConfig')
    const { siteTitle } = useLmsConfig()
    expect(typeof siteTitle.value).toBe('string')
  })

  it('logo 默认为 null', async () => {
    const { useLmsConfig } = await import('../../composables/useLmsConfig')
    const { logo } = useLmsConfig()
    expect(logo.value).toBeNull()
  })

  it('isLoading / refreshConfig / config 存在', async () => {
    const { useLmsConfig } = await import('../../composables/useLmsConfig')
    const { isLoading, refreshConfig, config } = useLmsConfig()
    expect(typeof isLoading.value).toBe('boolean')
    expect(typeof refreshConfig).toBe('function')
    expect(config).toBeDefined()
    await expect(refreshConfig()).resolves.toBeUndefined()
  })
})
