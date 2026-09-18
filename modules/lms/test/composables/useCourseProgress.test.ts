/**
 * useCourseProgress composable 测试
 * @see modules/lms/composables/useCourseProgress.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
  setMockAuthUser,
} from '../../../../test/setup/nuxt-stubs'

// mock TaskDot.vue 组件（composables 项目无 vue 插件，无法直接 import .vue）
vi.mock('../../components/course/task/dot.vue', () => ({
  default: { name: 'TaskDot', __isMock: true },
}))

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

describe('composables/useCourseProgress', () => {
  it('初始状态正确', async () => {
    const { useCourseProgress } = await import('../../composables/useCourseProgress')
    const isOpen = ref(false)
    const ui = { UButton: {}, UTooltip: {}, UIcon: {}, NuxtLink: {} }
    const { loading, taskModalOpen, canSelectStudent, totalCount, passedCount, overallProgress } = useCourseProgress(
      { courseId: '1', navigation: [] },
      isOpen,
      ui,
    )
    expect(loading.value).toBe(false)
    expect(taskModalOpen.value).toBe(false)
    expect(canSelectStudent.value).toBe(false)
    expect(totalCount.value).toBe(0)
    expect(passedCount.value).toBe(0)
    expect(overallProgress.value).toBeNull()
  })

  it('整体进度只统计目录里的章节，目录外章节不计入', async () => {
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/courses/progress')) {
        return {
          data: [
            { chapterId: 2, score: 80, isPass: true, isOpen: true, accessible: true, items: [] },
            { chapterId: 3, score: 50, isPass: false, isOpen: true, accessible: true, items: [] },
            // 不在目录里的章节（chapterId 99）：不应被计入整体进度
            { chapterId: 99, score: 100, isPass: true, isOpen: true, accessible: true, items: [] },
          ],
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useCourseProgress } = await import('../../composables/useCourseProgress')
    const isOpen = ref(false)
    const ui = { UButton: {}, UTooltip: {}, UIcon: {}, NuxtLink: {} }
    // 目录（navigation）：Home 会被 slice(1) 跳过，只有 /course/1/2、/course/1/3 两个章节
    const nav = [
      { label: 'Home', to: '/course/1' },
      { label: 'Ch2', to: '/course/1/2' },
      { label: 'Ch3', to: '/course/1/3' },
    ]
    const { loadData, totalCount, passedCount, overallProgress, tableData } = useCourseProgress(
      { courseId: '1', navigation: nav },
      isOpen,
      ui,
    )
    await loadData()
    expect(tableData.value).toHaveLength(2)
    expect(totalCount.value).toBe(2)
    expect(passedCount.value).toBe(1)
    expect(overallProgress.value).toBe(50)
  })

  it('loadData 无 courseId 时不执行', async () => {
    let fetchCalled = false
    setMockFetchHandler(async () => {
      fetchCalled = true
      return { data: null, success: true, msg: '' }
    })
    const { useCourseProgress } = await import('../../composables/useCourseProgress')
    const isOpen = ref(false)
    const ui = { UButton: {}, UTooltip: {}, UIcon: {}, NuxtLink: {} }
    const { loadData } = useCourseProgress(
      { courseId: '', navigation: [] },
      isOpen,
      ui,
    )
    await loadData()
    expect(fetchCalled).toBe(false)
  })

  it('onItemClick 打开任务弹窗', async () => {
    const { useCourseProgress } = await import('../../composables/useCourseProgress')
    const isOpen = ref(false)
    const ui = { UButton: {}, UTooltip: {}, UIcon: {}, NuxtLink: {} }
    const { onItemClick, taskModalOpen, taskModalItem } = useCourseProgress(
      { courseId: '1', navigation: [] },
      isOpen,
      ui,
    )
    onItemClick({ id: 5, type: 'question', status: 'todo' })
    expect(taskModalOpen.value).toBe(true)
    expect(taskModalItem.id).toBe(5)
    expect(taskModalItem.type).toBe('question')
  })

  it('isOpen 打开时 admin 可选学生', async () => {
    setMockAuthUser(
      { id: 1, name: 'Admin' },
      [{ code: 'admin', name: 'Admin' }],
      [],
    )
    setMockFetchHandler(async () => ({ data: [], success: true, msg: '' }))
    const { useCourseProgress } = await import('../../composables/useCourseProgress')
    const isOpen = ref(false)
    const ui = { UButton: {}, UTooltip: {}, UIcon: {}, NuxtLink: {} }
    const { canSelectStudent } = useCourseProgress(
      { courseId: '1', navigation: [] },
      isOpen,
      ui,
    )
    expect(canSelectStudent.value).toBe(false)
    isOpen.value = true
    // watch(isOpen) 触发，admin 可选学生
    await vi.waitFor(() => {
      expect(canSelectStudent.value).toBe(true)
    })
  })

  it('tableData 从 navigation 构建', async () => {
    const { useCourseProgress } = await import('../../composables/useCourseProgress')
    const isOpen = ref(false)
    const ui = { UButton: {}, UTooltip: {}, UIcon: {}, NuxtLink: {} }
    const nav = [
      { label: 'Home', to: '/course/1' }, // 第一个被 slice(1) 跳过
      { label: 'Ch1', to: '/course/1/2' },
      { label: 'Ch2', to: '/course/1/3' },
    ]
    const { tableData } = useCourseProgress(
      { courseId: '1', navigation: nav },
      isOpen,
      ui,
    )
    // slice(1) 跳过第一个 Home
    expect(tableData.value).toHaveLength(2)
    expect(tableData.value[0].label).toBe('Ch1')
    expect(tableData.value[0].to).toBe('/course/1/2')
  })

  it('tasks 列：未开放/不可访问的章节不显示内部题目', async () => {
    const { useCourseProgress } = await import('../../composables/useCourseProgress')
    const isOpen = ref(false)
    const ui = { UButton: {}, UTooltip: {}, UIcon: {}, NuxtLink: {} }
    const { columns } = useCourseProgress({ courseId: '1', navigation: [] }, isOpen, ui)
    const tasksCol = columns.find(c => c.id === 'tasks')
    expect(tasksCol).toBeDefined()

    const items = [{ id: 1, type: 'question', status: 'todo' } as const]

    // accessible=false：即使有 items 也不渲染
    const locked = tasksCol!.cell({ row: { original: { accessible: false, items } } as any })
    expect(locked).toBeNull()

    // accessible=true：渲染题目
    const opened = tasksCol!.cell({ row: { original: { accessible: true, items } } as any })
    expect(opened).toBeTruthy()
  })

  it('bar 列：显示百分比数字', async () => {
    const { useCourseProgress } = await import('../../composables/useCourseProgress')
    const isOpen = ref(false)
    const ui = { UButton: {}, UTooltip: {}, UIcon: {}, NuxtLink: {} }
    const { columns } = useCourseProgress({ courseId: '1', navigation: [] }, isOpen, ui)
    const barCol = columns.find(c => c.id === 'bar')
    expect(barCol).toBeDefined()

    // 有进度：进度条 + 百分比数字
    const vnode = barCol!.cell({ row: { original: { progress: 60, isParent: false } } as any } as any)
    expect(vnode).toBeTruthy()
    expect(collectText(vnode)).toContain('60%')

    // 无进度（null）：不渲染
    expect(barCol!.cell({ row: { original: { progress: null } } as any } as any)).toBeNull()
  })
})

/** 递归收集 vnode 树中的文本，用于断言渲染文案 */
function collectText(node: any): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(collectText).join('')
  const children = node.children
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(collectText).join('')
  if (children && typeof children === 'object' && typeof children.default === 'function') {
    return collectText(children.default())
  }
  return ''
}
