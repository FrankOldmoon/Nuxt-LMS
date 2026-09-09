/**
 * useClassOpenMatrix composable 测试
 * @see modules/lms/composables/useClassOpenMatrix.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useClassOpenMatrix', () => {
  it('初始状态', async () => {
    const isOpen = ref(false)
    const { useClassOpenMatrix } = await import('../../composables/useClassOpenMatrix')
    const r = useClassOpenMatrix({ courseId: 1 }, isOpen)
    expect(r.loading.value).toBe(false)
    expect(r.chapters.value).toEqual([])
    expect(r.classes.value).toEqual([])
    expect(r.openMap.value).toEqual({})
  })

  it('loadData 无 courseId 时不加载', async () => {
    let called = false
    setMockFetchHandler(async () => {
      called = true
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useClassOpenMatrix } = await import('../../composables/useClassOpenMatrix')
    const r = useClassOpenMatrix({ courseId: 0 }, isOpen)
    await r.loadData()
    expect(called).toBe(false)
  })

  it('loadData 拉取矩阵并 isOpenFor 判断开放状态', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/class-open-matrix')) {
        return {
          data: {
            chapters: [{ id: 11, name: 'C1', isOpen: false }],
            classes: [{ id: 101, name: 'A' }, { id: 102, name: 'B' }],
            openMap: { 11: { 101: true } },
          },
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useClassOpenMatrix } = await import('../../composables/useClassOpenMatrix')
    const r = useClassOpenMatrix({ courseId: 1 }, isOpen)
    await r.loadData()
    expect(r.chapters.value).toHaveLength(1)
    expect(r.classes.value).toHaveLength(2)
    expect(r.isOpenFor(11, 101)).toBe(true)
    expect(r.isOpenFor(11, 102)).toBe(false)
    expect(r.loading.value).toBe(false)
  })

  it('loadData 失败时不抛错', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'fail' }))
    const isOpen = ref(false)
    const { useClassOpenMatrix } = await import('../../composables/useClassOpenMatrix')
    const r = useClassOpenMatrix({ courseId: 1 }, isOpen)
    await expect(r.loadData()).resolves.toBeUndefined()
    expect(r.loading.value).toBe(false)
  })

  it('isOpen 变 true 时触发 loadData', async () => {
    let called = false
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/class-open-matrix')) {
        called = true
        return { data: { chapters: [], classes: [], openMap: {} }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useClassOpenMatrix } = await import('../../composables/useClassOpenMatrix')
    const r = useClassOpenMatrix({ courseId: 1 }, isOpen)
    expect(called).toBe(false)
    isOpen.value = true
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(called).toBe(true)
  })
})