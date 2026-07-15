/**
 * composables/useNotifications tests
 * @see modules/base/composables/useNotifications.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockFetchHandler,
  clearMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
})

describe('composables/useNotifications - 初始状态', () => {
  it('page 初始为 1', async () => {
    const { useNotifications } = await import('../../composables/useNotifications')
    const { page } = useNotifications(ref(false))
    expect(page.value).toBe(1)
  })

  it('list 初始为 null（immediate=false）', async () => {
    const { useNotifications } = await import('../../composables/useNotifications')
    const { list } = useNotifications(ref(false))
    expect(list.value).toBeNull()
  })
})

describe('composables/useNotifications - watch isOpen', () => {
  it('isOpen 打开时重置 page=1 并触发 refresh', async () => {
    setMockFetchHandler(async () => ({
      data: { items: [{ id: 1, name: 'n1', content: { text: 'hello' }, readAt: null, createdAt: '2024-01-01T00:00:00' }], total: 1, page: 1, pageSize: 10 },
      success: true,
      msg: '',
    }))
    const { useNotifications } = await import('../../composables/useNotifications')
    const isOpen = ref(false)
    const { page, list } = useNotifications(isOpen)
    page.value = 5
    isOpen.value = true
    await nextTick() // watch(isOpen) callback executes asynchronously (reset page=1 + refresh)
    expect(page.value).toBe(1)
    await vi.waitFor(() => {
      expect(list.value).not.toBeNull()
      expect(list.value.items).toHaveLength(1)
    })
  })
})

describe('composables/useNotifications - formatTime', () => {
  it('返回本地化时间字符串', async () => {
    const { useNotifications } = await import('../../composables/useNotifications')
    const { formatTime } = useNotifications(ref(false))
    const result = formatTime('2024-06-15T10:30:00')
    expect(result).toMatch(/2024/)
    expect(result.length).toBeGreaterThan(5)
  })

  it('空值返回 Invalid Date 相关字符串（不抛错）', async () => {
    const { useNotifications } = await import('../../composables/useNotifications')
    const { formatTime } = useNotifications(ref(false))
    expect(() => formatTime('')).not.toThrow()
  })
})
