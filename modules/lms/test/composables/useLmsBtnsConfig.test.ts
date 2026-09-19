/**
 * useLmsBtnsConfig composable 测试
 * @see modules/lms/composables/useLmsBtnsConfig.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
  setMockLayoutState,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // stub useLmsPublicConfig（auto-imported）
  ;(globalThis as any).useLmsPublicConfig = () => ({
    courseBtns: ref<Record<string, boolean>>({}),
    chapterBtns: ref<Record<string, boolean>>({}),
  })
})

describe('composables/useLmsBtnsConfig', () => {
  it('source 为 null 时仍应用全局 public 配置与默认值', async () => {
    const courseBtnsConfig = ref<Record<string, boolean>>({})
    const chapterBtnsConfig = ref<Record<string, boolean>>({})
    const showDanmaku = ref(true)
    setMockLayoutState({ courseBtnsConfig, chapterBtnsConfig, showDanmaku, notifyCourseNavUpdate: () => {} })
    // 全局 public 配置已开启 MMO（课程页在无课程级 lmsConfig 时也必须生效）
    ;(globalThis as any).useLmsPublicConfig = () => ({
      courseBtns: ref<Record<string, boolean>>({ showMmo: true }),
      chapterBtns: ref<Record<string, boolean>>({}),
    })

    const { useLmsBtnsConfig } = await import('../../composables/useLmsBtnsConfig')
    const source = ref<any>(null)
    useLmsBtnsConfig(source)
    expect(courseBtnsConfig.value.showMmo).toBe(true) // 来自全局 public
    expect(courseBtnsConfig.value.showProgress).toBe(true) // 默认值
    expect(chapterBtnsConfig.value.showPlay).toBe(true) // 默认值
    expect(showDanmaku.value).toBe(true) // 未提供时不改动
  })

  it('source 有值时合并默认配置', async () => {
    const courseBtnsConfig = ref<Record<string, boolean>>({})
    const chapterBtnsConfig = ref<Record<string, boolean>>({})
    const showDanmaku = ref(true)
    setMockLayoutState({ courseBtnsConfig, chapterBtnsConfig, showDanmaku, notifyCourseNavUpdate: () => {} })

    const { useLmsBtnsConfig } = await import('../../composables/useLmsBtnsConfig')
    const source = ref({
      courseBtns: { showProgress: false },
      chapterBtns: { showPlay: false },
      showDanmaku: false,
    })
    useLmsBtnsConfig(source)
    // courseBtns 合并：默认 + public + source
    expect(courseBtnsConfig.value.showProgress).toBe(false) // source 覆盖
    expect(courseBtnsConfig.value.showLeaderboard).toBe(true) // 默认
    // chapterBtns 合并
    expect(chapterBtnsConfig.value.showPlay).toBe(false) // source 覆盖
    expect(chapterBtnsConfig.value.showScore).toBe(true) // 默认
    expect(showDanmaku.value).toBe(false)
  })

  it('public 配置与 source 配置正确合并（source 优先级最高）', async () => {
    const courseBtnsConfig = ref<Record<string, boolean>>({})
    const chapterBtnsConfig = ref<Record<string, boolean>>({})
    const showDanmaku = ref(true)
    setMockLayoutState({ courseBtnsConfig, chapterBtnsConfig, showDanmaku, notifyCourseNavUpdate: () => {} })

    ;(globalThis as any).useLmsPublicConfig = () => ({
      courseBtns: ref({ showProgress: false, showGroups: false }),
      chapterBtns: ref({ showPlay: false }),
    })
    const { useLmsBtnsConfig } = await import('../../composables/useLmsBtnsConfig')
    const source = ref({
      courseBtns: { showProgress: true }, // source 覆盖 public
      chapterBtns: {},
    })
    useLmsBtnsConfig(source)
    expect(courseBtnsConfig.value.showProgress).toBe(true) // source > public
    expect(courseBtnsConfig.value.showGroups).toBe(false) // public 未被 source 覆盖
    expect(courseBtnsConfig.value.showLeaderboard).toBe(true) // 默认
    expect(chapterBtnsConfig.value.showPlay).toBe(false) // public
  })

  it('source 变化时重新合并', async () => {
    const courseBtnsConfig = ref<Record<string, boolean>>({})
    const chapterBtnsConfig = ref<Record<string, boolean>>({})
    const showDanmaku = ref(true)
    setMockLayoutState({ courseBtnsConfig, chapterBtnsConfig, showDanmaku, notifyCourseNavUpdate: () => {} })

    const { useLmsBtnsConfig } = await import('../../composables/useLmsBtnsConfig')
    const source = ref<any>(null)
    useLmsBtnsConfig(source)
    expect(showDanmaku.value).toBe(true)
    source.value = { showDanmaku: false, courseBtns: {}, chapterBtns: {} }
    // watch flush:'pre' 需要 nextTick 触发回调
    await vi.waitFor(() => {
      expect(showDanmaku.value).toBe(false)
    })
    expect(courseBtnsConfig.value.showProgress).toBe(true) // 默认
  })
})
