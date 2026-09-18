/**
 * useChapterScore composable 测试
 * @see modules/lms/composables/useChapterScore.ts
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
  // 真实 useClassUsers（已独立测试）
  const { useClassUsers } = await import('../../composables/useClassUsers')
  ;(globalThis as any).useClassUsers = useClassUsers
  // 桩 useChapterTask（返回 taskMap 含 headings）
  ;(globalThis as any).useChapterTask = () => ({
    taskMap: ref({ headings: [{ id: 'h1', level: 2, text: 'Heading 1' }, { id: 'h2', level: 2, text: 'Heading 2' }] }),
  })
})

describe('composables/useChapterScore', () => {
  it('初始状态', async () => {
    const isOpen = ref(false)
    const { useChapterScore } = await import('../../composables/useChapterScore')
    const r = useChapterScore({ courseId: 1, chapterId: 10, classId: 100 }, isOpen)
    expect(r.loading.value).toBe(false)
    expect(r.scoreData.value).toEqual([])
    expect(r.taskModalOpen.value).toBe(false)
    expect(r.tableRows.value).toEqual([])
  })

  it('extraColumns 包含 score/task/progress 三列', async () => {
    const isOpen = ref(false)
    const { useChapterScore } = await import('../../composables/useChapterScore')
    const r = useChapterScore({ courseId: 1, chapterId: 10, classId: 100 }, isOpen)
    expect(r.extraColumns.value).toHaveLength(3)
    const ids = r.extraColumns.value.map((c: any) => c.id)
    expect(ids).toEqual(['score', 'task', 'progress'])
    expect(r.extraColumns.value[0].canSort).toBe(true)
    expect(r.extraColumns.value[1].canSort).toBeUndefined()
    expect(r.extraColumns.value[2].canSort).toBe(true)
  })

  it('onItemClick 设置 taskModalItem 并打开弹窗', async () => {
    const isOpen = ref(false)
    const { useChapterScore } = await import('../../composables/useChapterScore')
    const r = useChapterScore({ courseId: 1, chapterId: 10, classId: 100 }, isOpen)
    r.onItemClick({ type: 'question', id: 5, status: 'done' })
    expect(r.taskModalOpen.value).toBe(true)
    expect(r.taskModalItem.id).toBe(5)
    expect(r.taskModalItem.type).toBe('question')
  })

  it('loadData 无 chapterId/classId/courseId 时不加载', async () => {
    let called = false
    setMockFetchHandler(async () => {
      called = true
      return { data: [], success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useChapterScore } = await import('../../composables/useChapterScore')
    const r = useChapterScore({ courseId: 0, chapterId: 0, classId: 0 }, isOpen)
    await r.loadData()
    expect(called).toBe(false)
  })

  it('loadData 拉取学生 + 章节得分', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/users')) {
        return {
          data: [
            { id: 1, name: 'alice', isTeacher: false },
            { id: 2, name: 'bob', isTeacher: false },
          ],
          success: true,
          msg: '',
        }
      }
      if (url.includes('/api/chapters/scores')) {
        return {
          data: [
            { userId: 1, score: 80, items: [], taskStatus: { h1: true, h2: false } },
            { userId: 2, score: 60, items: [], taskStatus: { h1: false, h2: false } },
          ],
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useChapterScore } = await import('../../composables/useChapterScore')
    const r = useChapterScore({ courseId: 1, chapterId: 10, classId: 100 }, isOpen)
    await r.loadData()
    expect(r.scoreData.value).toHaveLength(2)
    expect(r.scoreData.value[0].score).toBe(80)
    // tableRows 合并了 students + scoreData
    expect(r.tableRows.value).toHaveLength(2)
    const alice = r.tableRows.value.find((row: any) => row.id === 1)
    expect(alice.score).toBe(80)
    expect(alice.progress).toBe(0.5) // h1 done, h2 not → 1/2 = 0.5
  })

  it('tableRows 计算 progress = done/total', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/users')) {
        return {
          data: [
            { id: 1, name: 'a', isTeacher: false },
            { id: 2, name: 'b', isTeacher: false },
            { id: 3, name: 'c', isTeacher: false },
          ],
          success: true,
          msg: '',
        }
      }
      if (url.includes('/api/chapters/scores')) {
        return {
          data: [
            { userId: 1, score: 100, items: [], taskStatus: { h1: true, h2: true } },
            { userId: 2, score: 50, items: [], taskStatus: { h1: true } },
            { userId: 3, score: 0, items: [], taskStatus: {} },
          ],
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useChapterScore } = await import('../../composables/useChapterScore')
    const r = useChapterScore({ courseId: 1, chapterId: 10, classId: 100 }, isOpen)
    await r.loadData()
    const rows = r.tableRows.value
    expect(rows).toHaveLength(3)
    const byId = (id: number) => rows.find((row: any) => row.id === id)
    expect(byId(1).progress).toBe(1) // 2/2
    expect(byId(2).progress).toBe(0.5) // 1/2
    expect(byId(3).progress).toBe(0) // 0/2
  })

  it('loadData 失败时不抛错（仅 console.error）', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'fail' }))
    const isOpen = ref(false)
    const { useChapterScore } = await import('../../composables/useChapterScore')
    const r = useChapterScore({ courseId: 1, chapterId: 10, classId: 100 }, isOpen)
    await expect(r.loadData()).resolves.toBeUndefined()
    expect(r.loading.value).toBe(false)
  })

  it('isOpen 初始即为 true（弹窗被 v-if 门控）时挂载即加载', async () => {
    // 回归：弹窗改成 Lazy + v-if 后，组件创建时 isOpen 已是 true，
    // watch(isOpen) 若不开 immediate 就永远不触发，打开得分弹窗无数据
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/users')) {
        return { data: [{ id: 1, name: 'alice', isTeacher: false }], success: true, msg: '' }
      }
      if (url.includes('/api/chapters/scores')) {
        return { data: [{ userId: 1, score: 80, items: [], taskStatus: { h1: true } }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(true)
    const { useChapterScore } = await import('../../composables/useChapterScore')
    const r = useChapterScore({ courseId: 1, chapterId: 10, classId: 100 }, isOpen)
    await vi.waitFor(() => {
      expect(r.scoreData.value).toHaveLength(1)
    })
    expect(r.tableRows.value[0].score).toBe(80)
  })

  it('isOpen 变 true 时触发 loadData', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/classes/users')) {
        return { data: [], success: true, msg: '' }
      }
      if (url.includes('/api/chapters/scores')) {
        return { data: [], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useChapterScore } = await import('../../composables/useChapterScore')
    const r = useChapterScore({ courseId: 1, chapterId: 10, classId: 100 }, isOpen)
    isOpen.value = true
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(r.loading.value).toBe(false)
  })
})
