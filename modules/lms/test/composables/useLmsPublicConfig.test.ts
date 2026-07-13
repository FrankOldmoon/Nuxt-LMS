/**
 * useLmsPublicConfig composable 测试
 * @see modules/lms/composables/useLmsPublicConfig.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useLmsPublicConfig', () => {
  it('返回默认值当 config 为空', async () => {
    const { useLmsPublicConfig } = await import('../../composables/useLmsPublicConfig')
    const { home, courseList, chapterPage, course, chapterBtns, courseBtns, user, ai } = useLmsPublicConfig()
    expect(home.value.showHero).toBe(true)
    expect(courseList.value.showSearch).toBe(true)
    expect(chapterPage.value.showOutline).toBe(true)
    expect(course.value).toEqual({})
    expect(chapterBtns.value).toEqual({})
    expect(courseBtns.value).toEqual({})
    expect(user.value).toEqual({})
    expect(ai.value).toEqual({})
  })

  it('config 有值时返回对应分组', async () => {
    const { useLmsPublicConfig } = await import('../../composables/useLmsPublicConfig')
    const { config, home, user, ai } = useLmsPublicConfig()
    config.value = {
      home: { showHero: false, showStats: false, showRecentCourses: true, showLeaderboard: true },
      user: { allowChangePassword: false },
      ai: { mode: 'api' },
    }
    expect(home.value.showHero).toBe(false)
    expect(user.value.allowChangePassword).toBe(false)
    expect(ai.value.mode).toBe('api')
  })

  it('refresh 调用 refreshNuxtData', async () => {
    const { useLmsPublicConfig } = await import('../../composables/useLmsPublicConfig')
    const { refresh } = useLmsPublicConfig()
    // refresh 调用 refreshNuxtData（无注册 handler 时不抛错）
    await expect(refresh()).resolves.toBeUndefined()
  })
})
