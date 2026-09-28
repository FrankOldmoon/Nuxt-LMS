import { h, type Ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import TaskDot from '../components/course/task/dot.vue'

export interface NavItem {
  to?: string
  label: string
  children?: NavItem[]
}

interface ChapterData {
  score: number | null
  isPass: boolean
  isOpen: boolean
  accessible: boolean
  items: TaskItem[]
  /** 标题完成率（0-100，无标题为 null） */
  progress: number | null
}

export type TaskItem = {
  id: number
  type: 'question' | 'homework' | 'comment'
  status: string
}

type ProgressRow = {
  label: string
  to?: string
  score: number | null | undefined
  items: TaskItem[]
  /** 章节任务完成率（0-100，无任务为 null） */
  progress: number | null
  isParent: boolean
  isOpen?: boolean
  accessible?: boolean
  isPass?: boolean
  children?: ProgressRow[]
}

interface ProgressModalProps {
  courseId: string | number
  navigation: NavItem[]
}

/** 需要调用方解析后传入的 UI 组件引用 */
interface ProgressUiComponents {
  UButton: any
  UTooltip: any
  UIcon: any
  NuxtLink: any
}

/**
 * 课程进度弹窗：导航树构建 + 进度数据加载 + 表格列定义（h 渲染）
 *
 * 注意：UButton/UTooltip/UIcon/NuxtLink 必须由调用方（modal.vue）解析后传入。
 * 因为 composable 在 setup 阶段执行时，resolveComponent 返回的可能是字符串，
 * 而 h() 真正渲染是在 UTable 的 cell() 里（mount 之后），不同阶段引用会失效。
 */
export function useCourseProgress(
  props: ProgressModalProps,
  isOpen: Ref<boolean>,
  ui: ProgressUiComponents,
) {
  const { t } = useI18n()
  const { hasRole } = useAuth()
  // 切换/恢复身份后需刷新课程导航（章节 accessible 随登录用户变化）
  const { notifyCourseNavUpdate } = useLayoutState()

  const { UButton, UTooltip, UIcon, NuxtLink } = ui

  const loading = ref(false)
  const taskModalOpen = ref(false)
  const taskModalItem = reactive({ type: '', id: 0, status: 'todo' })
  const canSelectStudent = ref(false)
  const chapterData = ref<Record<number, ChapterData>>({})
  const expanded = ref<Record<number, boolean>>({})

  function onItemClick(item: TaskItem) {
    Object.assign(taskModalItem, item)
    taskModalOpen.value = true
  }

  function extractChapterId(to: string): number | null {
    if (!to) return null
    const match = to.match(/\/course\/[^/]+\/(\d+)$/)
    return match ? Number(match[1]) : null
  }

  function buildTree(navItems: NavItem[], dataMap: Record<number, ChapterData>): ProgressRow[] {
    function walk(items: NavItem[]): ProgressRow[] {
      return items.map((item: NavItem) => {
        const chapterId = extractChapterId(item.to || '')
        const hasChildren = !!item.children?.length
        const fallback = { score: null, isPass: false, isOpen: false, accessible: false, items: [] }
        const nodeData: ChapterData = chapterId ? (dataMap[chapterId] || fallback) : fallback
        const items = nodeData.items || []
        const row: ProgressRow = {
          label: item.label,
          to: chapterId ? item.to : undefined,
          score: nodeData.score ?? null,
          items,
          // 标题完成率（服务端已按 toc 同口径计算）
          progress: nodeData.progress ?? null,
          isParent: hasChildren,
          isOpen: nodeData.isOpen,
          accessible: nodeData.accessible,
          isPass: nodeData.isPass,
        }
        if (hasChildren) {
          row.children = walk(item.children || [])
        }
        return row
      })
    }
    return walk(navItems)
  }

  const tableData = computed(() => buildTree(props.navigation.slice(1), chapterData.value))

  watch(tableData, (data: ProgressRow[]) => {
    // 保留已有的展开/收起状态：静默刷新（任务提交后重拉）会重建 tableData，
    // 若无条件重置，用户手动收起的父章节会莫名弹开
    const next: Record<number, boolean> = {}
    data.forEach((_: ProgressRow, i: number) => { next[i] = expanded.value[i] ?? true })
    expanded.value = next
  }, { immediate: true })

  const columns: TableColumn<ProgressRow>[] = [
    {
      accessorKey: 'label',
      header: () => t('coursePanel.chapter'),
      cell: ({ row }) => {
        const orig = row.original as ProgressRow
        return h('div', { style: { paddingLeft: `${row.depth * 1.5}rem` }, class: 'flex items-center gap-2' }, [
          h(UButton, {
            color: 'neutral', variant: 'outline', size: 'xs',
            icon: row.getIsExpanded() ? 'i-lucide-minus' : 'i-lucide-plus',
            class: !row.getCanExpand() && 'invisible',
            ui: { base: 'p-0 rounded-sm', leadingIcon: 'size-4' },
            onClick: row.getToggleExpandedHandler(),
          }),
          orig?.to && orig?.accessible
            ? h(NuxtLink, {
              to: orig.to,
              // 章节名：完成后才变绿色（与 ✓ 图标同色 text-success），未完成保持默认文字色
              class: ['truncate hover:underline', orig?.isPass ? 'text-success' : 'text-default'],
              onClick: (e: Event) => { e.stopPropagation(); isOpen.value = false },
            }, { default: () => row.getValue('label') as string })
            : h('span', { class: orig?.isParent ? 'font-semibold' : '' }, row.getValue('label') as string),
          orig?.isPass && orig?.to
            ? h(UTooltip, { text: t('coursePanel.done') }, () => h(UIcon, { name: 'i-lucide-circle-check', class: 'size-4 text-success shrink-0' }))
            : null,
          orig?.to && !orig?.accessible
            ? h(UTooltip, { text: t('chapter.notOpen') }, () => h(UIcon, { name: 'i-lucide-lock', class: 'size-4 text-muted shrink-0' }))
            : null,
        ])
      },
    },
    {
      accessorKey: 'score',
      header: () => t('coursePanel.score'),
      meta: { class: { th: 'text-right w-24', td: 'text-right font-mono' } },
      cell: ({ row }) => {
        const score = row.getValue('score') as number | null
        return score != null ? Number(score).toFixed(1) : '—'
      },
    },
    {
      id: 'bar',
      header: () => t('coursePanel.bar'),
      cell: ({ row }) => {
        // 进度条 = 章节任务完成率（无任务不显示）
        const progress = (row.original as ProgressRow)?.progress ?? null
        if (progress == null) return null
        const pct = Math.min(100, Math.max(0, progress))
        return h('div', { class: 'flex items-center gap-2' }, [
          h('div', { class: 'flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden' }, [
            h('div', {
              class: ['h-full rounded transition-all', (row.original as ProgressRow)?.isParent ? 'bg-primary-300' : 'bg-primary-500'],
              style: { width: `${pct}%` },
            }),
          ]),
          // 百分比数字：进度为 0-100 的整数（服务端按 Math.round 计算）
          h('span', { class: 'text-xs text-muted tabular-nums shrink-0 w-9 text-right' }, `${pct}%`),
        ])
      },
    },
    {
      id: 'tasks',
      header: () => t('coursePanel.tasks'),
      cell: ({ row }) => {
        const orig = row.original as ProgressRow
        // 未开放/不可访问的章节不显示内部题目（与链接、锁图标逻辑保持一致）
        const items = orig?.accessible ? (orig.items || []) : []
        if (!items.length) return null
        return h('div', { class: 'flex items-center gap-1 flex-wrap' },
          items.map((item: TaskItem) =>
            h(UTooltip, { key: `${item.type}-${item.id}`, text: `${item.type} #${item.id} (${item.status})` }, () =>
              h(TaskDot, { type: item.type, status: item.status, id: item.id, onClick: () => onItemClick(item) }),
            ),
          ),
        )
      },
    },
  ]

  async function loadData(opts: { silent?: boolean } = {}) {
    if (!props.courseId) return
    if (!opts.silent) loading.value = true
    try {
      const data = await cRequest(`/api/courses/progress?courseId=${props.courseId}`) as { chapterId: number; score: number; isPass?: boolean; isOpen?: boolean; accessible?: boolean; items?: TaskItem[] }[]
      const map: Record<number, ChapterData> = {}
      for (const row of data) {
        map[row.chapterId] = {
          score: row.score, isPass: !!row.isPass, isOpen: !!row.isOpen,
          accessible: !!row.accessible, items: row.items || [],
          progress: row.progress != null ? Number(row.progress) : null,
        }
      }
      chapterData.value = map
    } catch (e) {
      console.error('加载进度失败', e)
    } finally {
      if (!opts.silent) loading.value = false
    }
  }

  /**
   * 任务弹窗内提交成功后的回调（@submitted）。
   *
   * 任务完成状态（question 正确率 / homework 提交记录 / comment 记录）都落在服务端，
   * 进度弹窗只在打开时拉过一次快照 —— 提交后必须重拉，对应圆点才会变绿/变黄。
   * 静默（不切 loading）：否则表格会被「加载中」占位顶掉，造成整表闪烁。
   */
  async function onTaskSubmitted() {
    await loadData({ silent: true })
    // 重拉后把该任务的最新状态同步给任务弹窗的标题徽标（不关弹窗也能看到状态翻转）
    const { type, id } = taskModalItem
    if (!type || !id) return
    for (const ch of Object.values(chapterData.value)) {
      const hit = (ch.items || []).find(it => it.type === type && it.id === id)
      if (hit) { taskModalItem.status = hit.status; return }
    }
  }

  // 整体进度只统计「课程目录里的章节」：
  // tableData 来自 props.navigation（目录树），而 /api/courses/progress 返回的是课程全部章节
  // （含未出现在目录里的章节）。为避免整体进度把目录外章节也算进去，按 tableData 统计。
  // 有 to（指向具体章节 /course/:id/:cid）的目录项才计为一个章节。
  const dirStats = computed(() => {
    let count = 0
    let passed = 0
    const walk = (rows: ProgressRow[]) => {
      for (const r of rows) {
        if (r.to) {
          count++
          if (r.isPass) passed++
        }
        if (r.children?.length) walk(r.children)
      }
    }
    walk(tableData.value)
    return { count, passed }
  })

  const totalCount = computed(() => dirStats.value.count)
  const passedCount = computed(() => dirStats.value.passed)
  const overallProgress = computed(() => {
    if (totalCount.value === 0) return null
    return Math.round((passedCount.value / totalCount.value) * 100)
  })

  async function onImpersonated() {
    await nextTick()
    // 身份切换/恢复后，章节可访问性随登录用户变化 → 刷新课程详情/侧边栏缓存
    notifyCourseNavUpdate()
    await loadData()
  }

  watch(isOpen, (val) => {
    if (val) {
      canSelectStudent.value = hasRole('admin') || hasRole('teacher')
      loadData()
    }
  })

  return {
    loading, taskModalOpen, taskModalItem, canSelectStudent,
    tableData, expanded, columns,
    totalCount, passedCount, overallProgress,
    onItemClick, onImpersonated, loadData, onTaskSubmitted,
  }
}
