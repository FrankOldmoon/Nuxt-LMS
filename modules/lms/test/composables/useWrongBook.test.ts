/**
 * useWrongBook composable test
 * @see modules/lms/composables/useWrongBook.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockFetchHandler,
  setMockI18n,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useWrongBook', () => {
  it('初始状态正确', async () => {
    const { useWrongBook } = await import('../../composables/useWrongBook')
    const { items, total, page, pageSize, loading, keyword, filterType } = useWrongBook({ modelValue: false, courseId: 1 }, () => {})
    expect(items.value).toEqual([])
    expect(total.value).toBe(0)
    expect(page.value).toBe(1)
    expect(pageSize.value).toBe(10)
    expect(loading.value).toBe(false)
    expect(keyword.value).toBe('')
    expect(filterType.value).toBe('all')
  })

  it('typeOptions 返回题型列表', async () => {
    const { useWrongBook } = await import('../../composables/useWrongBook')
    const { typeOptions } = useWrongBook({ modelValue: false, courseId: 1 }, () => {})
    expect(typeOptions.value.length).toBeGreaterThan(0)
    const allOption = typeOptions.value.find(o => o.value === 'all')
    expect(allOption).toBeDefined()
  })

  it('pageSizeOptions 返回分页选项', async () => {
    const { useWrongBook } = await import('../../composables/useWrongBook')
    const { pageSizeOptions } = useWrongBook({ modelValue: false, courseId: 1 }, () => {})
    expect(pageSizeOptions).toEqual([
      { label: '10', value: 10 },
      { label: '20', value: 20 },
      { label: '50', value: 50 },
      { label: '100', value: 100 },
    ])
  })

  it('totalPages 计算正确', async () => {
    const { useWrongBook } = await import('../../composables/useWrongBook')
    const { totalPages, total, pageSize } = useWrongBook({ modelValue: false, courseId: 1 }, () => {})
    total.value = 25
    pageSize.value = 10
    expect(totalPages.value).toBe(3)
    total.value = 0
    expect(totalPages.value).toBe(1)
  })

  it('refetch 加载错题列表', async () => {
    setMockFetchHandler(async (url) => {
      if (url.startsWith('/api/questions/wrong-list')) {
        return { data: { items: [{ id: 1, title: 'Q1' }], total: 1 }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useWrongBook } = await import('../../composables/useWrongBook')
    const { items, total, refetch } = useWrongBook({ modelValue: false, courseId: 1 }, () => {})
    await refetch()
    expect(items.value).toHaveLength(1)
    expect(total.value).toBe(1)
  })

  it('refetch 失败时清空数据', async () => {
    setMockFetchHandler(async () => {
      throw new Error('network error')
    })
    const { useWrongBook } = await import('../../composables/useWrongBook')
    const { items, total, refetch } = useWrongBook({ modelValue: false, courseId: 1 }, () => {})
    await refetch()
    expect(items.value).toEqual([])
    expect(total.value).toBe(0)
  })

  it('prevPage / nextPage 翻页', async () => {
    setMockFetchHandler(async (url) => {
      return { data: { items: [], total: 30 }, success: true, msg: '' }
    })
    const { useWrongBook } = await import('../../composables/useWrongBook')
    const { page, prevPage, nextPage, totalPages, refetch } = useWrongBook({ modelValue: false, courseId: 1 }, () => {})
    await refetch()
    expect(totalPages.value).toBe(3)
    nextPage()
    expect(page.value).toBe(2)
    nextPage()
    expect(page.value).toBe(3)
    nextPage()
    expect(page.value).toBe(3) // Already at last page
    prevPage()
    expect(page.value).toBe(2)
    prevPage()
    expect(page.value).toBe(1)
    prevPage()
    expect(page.value).toBe(1) // Already at first page
  })
})
