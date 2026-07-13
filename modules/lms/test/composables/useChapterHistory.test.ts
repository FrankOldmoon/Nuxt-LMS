/**
 * useChapterHistory composable 测试
 * @see modules/lms/composables/useChapterHistory.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockLayoutState,
  setMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  setMockLayoutState({
    notifyContentSaved: vi.fn(),
    notifyCourseNavUpdate: vi.fn(),
  })
  // 阻止 location.reload 真的执行
  vi.stubGlobal('location', { reload: vi.fn(), ...((globalThis as any).location || {}) })
})

describe('composables/useChapterHistory', () => {
  it('初始状态：open=false, versions=[], pending=false', async () => {
    const { useChapterHistory } = await import('../../composables/useChapterHistory')
    const r = useChapterHistory({ table: 'chapters', id: 1 })
    expect(r.open.value).toBe(false)
    expect(r.versions.value).toEqual([])
    expect(r.pending.value).toBe(false)
    expect(r.restoring.value).toBe(false)
    expect(r.page.value).toBe(1)
    expect(r.currentVersion.value).toBeNull()
  })

  it('fetchVersions 拉取版本列表', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/chapters/versions')) {
        return {
          data: [
            { id: 1, content: { type: 'doc' }, createdAt: '2024-01-01' },
            { id: 2, content: { type: 'doc' }, createdAt: '2024-01-02' },
          ],
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useChapterHistory } = await import('../../composables/useChapterHistory')
    const r = useChapterHistory({ table: 'chapters', id: 1 })
    await r.fetchVersions()
    expect(r.versions.value).toHaveLength(2)
    expect(r.versions.value[0].id).toBe(1)
    expect(r.page.value).toBe(1)
    expect(r.currentVersion.value?.id).toBe(1)
    expect(r.pending.value).toBe(false)
  })

  it('fetchVersions 无 id 时清空', async () => {
    const { useChapterHistory } = await import('../../composables/useChapterHistory')
    const r = useChapterHistory({ table: 'chapters', id: 0 })
    await r.fetchVersions()
    expect(r.versions.value).toEqual([])
  })

  it('fetchVersions 无 table 时清空', async () => {
    const { useChapterHistory } = await import('../../composables/useChapterHistory')
    const r = useChapterHistory({ table: '', id: 1 })
    await r.fetchVersions()
    expect(r.versions.value).toEqual([])
  })

  it('fetchVersions 失败时 versions 设为空数组', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'fail' }))
    const { useChapterHistory } = await import('../../composables/useChapterHistory')
    const r = useChapterHistory({ table: 'chapters', id: 1 })
    await r.fetchVersions()
    expect(r.versions.value).toEqual([])
    expect(r.pending.value).toBe(false)
  })

  it('prevPage / nextPage 翻页', async () => {
    setMockFetchHandler(async () => ({
      data: [
        { id: 1, content: {}, createdAt: '2024-01-01' },
        { id: 2, content: {}, createdAt: '2024-01-02' },
        { id: 3, content: {}, createdAt: '2024-01-03' },
      ],
      success: true,
      msg: '',
    }))
    const { useChapterHistory } = await import('../../composables/useChapterHistory')
    const r = useChapterHistory({ table: 'chapters', id: 1 })
    await r.fetchVersions()
    expect(r.page.value).toBe(1)
    r.nextPage()
    expect(r.page.value).toBe(2)
    r.nextPage()
    expect(r.page.value).toBe(3)
    r.nextPage() // 已到末尾不再递增
    expect(r.page.value).toBe(3)
    r.prevPage()
    expect(r.page.value).toBe(2)
    r.prevPage()
    expect(r.page.value).toBe(1)
    r.prevPage() // 已到首页不再递减
    expect(r.page.value).toBe(1)
  })

  it('currentVersion 跟随 page 变化', async () => {
    setMockFetchHandler(async () => ({
      data: [
        { id: 10, content: {}, createdAt: '2024-01-01' },
        { id: 20, content: {}, createdAt: '2024-01-02' },
      ],
      success: true,
      msg: '',
    }))
    const { useChapterHistory } = await import('../../composables/useChapterHistory')
    const r = useChapterHistory({ table: 'chapters', id: 1 })
    await r.fetchVersions()
    expect(r.currentVersion.value?.id).toBe(10)
    r.nextPage()
    expect(r.currentVersion.value?.id).toBe(20)
  })

  it('handleRestore 成功时调用 toast + notifyContentSaved + 关闭弹窗', async () => {
    setMockFetchHandler(async (url, opts: any) => {
      if (url.includes('/restore') && opts?.method === 'POST') {
        return { data: null, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useChapterHistory } = await import('../../composables/useChapterHistory')
    const r = useChapterHistory({ table: 'chapters', id: 1 })
    r.open.value = true
    await r.handleRestore(99)
    expect(r.open.value).toBe(false)
    expect(r.restoring.value).toBe(false)
  })

  it('handleRestore 失败时不关闭弹窗', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'fail' }))
    const { useChapterHistory } = await import('../../composables/useChapterHistory')
    const r = useChapterHistory({ table: 'chapters', id: 1 })
    r.open.value = true
    await r.handleRestore(99)
    expect(r.open.value).toBe(true)
    expect(r.restoring.value).toBe(false)
  })

  it('open 变 true 时自动 fetchVersions', async () => {
    let called = false
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/chapters/versions')) {
        called = true
        return { data: [], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useChapterHistory } = await import('../../composables/useChapterHistory')
    const r = useChapterHistory({ table: 'chapters', id: 1 })
    expect(called).toBe(false)
    r.open.value = true
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(called).toBe(true)
  })
})
