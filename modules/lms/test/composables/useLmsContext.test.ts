/**
 * useLmsContext composable 测试
 * @see modules/lms/composables/useLmsContext.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import {
  resetAllStubs,
  setMockRoute,
  setMockI18n,
  clearProvideStore,
  provide as stubProvide,
  inject as stubInject,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  clearProvideStore()
  // provide/inject 桩未在 nuxt-stubs 中暴露到 globalThis，这里手动暴露
  ;(globalThis as any).provide = stubProvide
  ;(globalThis as any).inject = stubInject
})

describe('composables/useLmsContext', () => {
  it('无 injection 时从 route.params 回退', async () => {
    setMockRoute({ params: { id: '42', cid: '7' }, query: {}, path: '/course/42/7', fullPath: '/course/42/7' })
    const { useLmsContext } = await import('../../composables/useLmsContext')
    const { courseId, chapterId } = useLmsContext()
    expect(courseId.value).toBe(42)
    expect(chapterId.value).toBe(7)
  })

  it('无 route 参数时返回 0', async () => {
    setMockRoute({ params: {}, query: {}, path: '/', fullPath: '/' })
    const { useLmsContext } = await import('../../composables/useLmsContext')
    const { courseId, chapterId } = useLmsContext()
    expect(courseId.value).toBe(0)
    expect(chapterId.value).toBe(0)
  })

  it('provideLmsContext 通过 provide 注入值', async () => {
    const { provideLmsContext, useLmsContext, LMS_COURSE_ID, LMS_CHAPTER_ID } = await import('../../composables/useLmsContext')
    const cid = ref('99')
    const chid = ref('5')
    provideLmsContext(cid, chid)
    // provide 写入全局 store，useLmsContext 内部 inject 读取
    const { courseId, chapterId } = useLmsContext()
    expect(courseId.value).toBe(99)
    expect(chapterId.value).toBe(5)
  })

  it('provideLmsCourseId 单独注入 course id', async () => {
    const { provideLmsCourseId, useLmsContext } = await import('../../composables/useLmsContext')
    const cid = ref(123)
    provideLmsCourseId(cid)
    const { courseId } = useLmsContext()
    expect(courseId.value).toBe(123)
  })

  it('courseId 为字符串数字时转换为 number', async () => {
    const { provideLmsContext, useLmsContext } = await import('../../composables/useLmsContext')
    const cid = ref('abc')
    provideLmsContext(cid)
    const { courseId } = useLmsContext()
    expect(courseId.value).toBe(0) // Number('abc') || 0
  })
})
