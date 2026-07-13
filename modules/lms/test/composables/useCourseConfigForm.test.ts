/**
 * useCourseConfigForm composable 测试
 * @see modules/lms/composables/useCourseConfigForm.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
  // useCourseConfigForm 依赖 colorOptions / levelOptions（base 模块 auto-import）
  const { colorOptions, levelOptions } = await import('../../../base/utils/colors')
  ;(globalThis as any).colorOptions = colorOptions
  ;(globalThis as any).levelOptions = levelOptions
})

describe('composables/useCourseConfigForm', () => {
  it('初始状态', async () => {
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    expect(r.config.icon).toBe('')
    expect(r.config.color).toBe('primary')
    expect(r.config.level).toBe('')
    expect(r.coverImg.value).toBe('')
    expect(r.uploading.value).toBe(false)
    expect(r.extraConfigText.value).toBe('{}')
    expect(r.extraConfigError.value).toBe('')
  })

  it('colorOpts 返回颜色选项', async () => {
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    expect(r.colorOpts.value.length).toBe(6)
    expect(r.colorOpts.value[0].value).toBe('primary')
  })

  it('levelOpts 返回难度选项', async () => {
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    expect(r.levelOpts.value.length).toBe(3)
  })

  it('courseSwitchList 有 5 个开关', async () => {
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    expect(r.courseSwitchList.length).toBe(5)
    expect(r.courseSwitchList.map(s => s.key)).toEqual([
      'defaultChapterOpen', 'showAnnouncement', 'showComments', 'showProgress', 'showDanmaku',
    ])
  })

  it('courseSwitches 默认值', async () => {
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    expect(r.courseSwitches.showDanmaku).toBe(true)
    expect(r.courseSwitches.showAnnouncement).toBe(true)
    expect(r.courseSwitches.showComments).toBe(true)
    expect(r.courseSwitches.showProgress).toBe(false)
    expect(r.courseSwitches.defaultChapterOpen).toBe(true)
  })

  it('loadGlobalLmsConfig 通过 initFromConfig 间接拉取配置', async () => {
    setMockFetchHandler(async (url) => {
      if (url === '/api/config/get') {
        return { data: { course: { showDanmaku: false, showProgress: true } }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    // initFromConfig 内部调用 loadGlobalLmsConfig → 全局配置的 course 字段影响 courseSwitches
    await r.initFromConfig({})
    expect(r.courseSwitches.showDanmaku).toBe(false) // 来自全局配置
    expect(r.courseSwitches.showProgress).toBe(true) // 来自全局配置
  })

  it('initFromConfig 从 cfg 初始化', async () => {
    setMockFetchHandler(async (url) => {
      if (url === '/api/config/get') {
        return { data: { course: { showDanmaku: true, showProgress: true } }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    await r.initFromConfig({
      icon: 'i-lucide-book',
      color: 'success',
      level: 'advanced',
      coverImg: 'data:image/png;base64,abc',
      lmsConfig: { course: { showComments: false } },
      extraField: 'extra',
    })
    expect(r.config.icon).toBe('i-lucide-book')
    expect(r.config.color).toBe('success')
    expect(r.config.level).toBe('advanced')
    expect(r.coverImg.value).toBe('data:image/png;base64,abc')
    expect(r.courseSwitches.showComments).toBe(false)
    expect(r.extraConfigText.value).toContain('extraField')
  })

  it('initFromConfig level 缺失时用默认值', async () => {
    setMockFetchHandler(async () => ({ data: {}, success: true, msg: '' }))
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    await r.initFromConfig({})
    expect(r.config.level).toBe('home.levels.beginner')
  })

  it('buildConfig 无效 JSON 时返回 null 并设错误', async () => {
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    r.extraConfigText.value = '{invalid}'
    const result = r.buildConfig()
    expect(result).toBe(null)
    expect(r.extraConfigError.value).toBeTruthy()
  })

  it('buildConfig 有效 JSON 时返回配置对象', async () => {
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    r.config.icon = 'i-lucide-book'
    r.config.color = 'success'
    r.config.level = 'advanced'
    r.extraConfigText.value = '{"customField": 123}'
    const result = r.buildConfig()
    expect(result).not.toBe(null)
    expect(result!.icon).toBe('i-lucide-book')
    expect(result!.color).toBe('success')
    expect(result!.level).toBe('advanced')
    expect(result!.customField).toBe(123)
    expect(result!.lmsConfig).toBeDefined()
    expect(result!.lmsConfig.course).toBeDefined()
  })

  it('deepMerge 通过 initFromConfig 间接测试合并行为', async () => {
    setMockFetchHandler(async (url) => {
      if (url === '/api/config/get') {
        return { data: { course: { showDanmaku: true } }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    // initFromConfig 内部调用 deepMerge(globalLmsConfig, cfg.lmsConfig)
    // 全局有 course.showDanmaku=true，cfg.lmsConfig 覆盖 course.showComments=false
    await r.initFromConfig({
      lmsConfig: { course: { showComments: false } },
    })
    // courseSwitches 反映合并结果：showDanmaku 来自全局，showComments 来自覆盖
    expect(r.courseSwitches.showDanmaku).toBe(true) // 全局值保留
    expect(r.courseSwitches.showComments).toBe(false) // 覆盖值生效
    // buildConfig 返回的 lmsConfig 应包含合并后的数据
    const result = r.buildConfig()
    expect(result).not.toBe(null)
    expect(result!.lmsConfig.course.showDanmaku).toBe(true)
    expect(result!.lmsConfig.course.showComments).toBe(false)
  })

  it('triggerCoverUpload 调用 coverInputRef.click', async () => {
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    const clickSpy = vi.fn()
    r.coverInputRef.value = { click: clickSpy } as any
    r.triggerCoverUpload()
    expect(clickSpy).toHaveBeenCalled()
  })

  it('onCoverFileSelected 非图片时 toast 报错', async () => {
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    const fakeEvent = {
      target: {
        files: [{ type: 'text/plain', name: 'a.txt' }],
        value: '',
      },
    } as any
    await r.onCoverFileSelected(fakeEvent)
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'error')).toBe(true)
  })

  it('onCoverFileSelected 图片时调用 cropperRef.setImage', async () => {
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    const setImageSpy = vi.fn()
    r.cropperRef.value = { setImage: setImageSpy } as any
    const fakeEvent = {
      target: {
        files: [{ type: 'image/png', name: 'a.png' }],
        value: '',
      },
    } as any
    await r.onCoverFileSelected(fakeEvent)
    expect(setImageSpy).toHaveBeenCalled()
  })

  it('onCropped 设置 coverImg', async () => {
    const { useCourseConfigForm } = await import('../../composables/useCourseConfigForm')
    const r = useCourseConfigForm()
    r.onCropped('data:image/png;base64,new')
    expect(r.coverImg.value).toBe('data:image/png;base64,new')
  })
})
