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

/** UI component references that must be resolved and passed in by the caller */
interface ProgressUiComponents {
  UButton: any
  UTooltip: any
  UIcon: any
  NuxtLink: any
}

/**
 * Course progress modal: navigation tree building + progress data loading + table column definitions (h render)
 *
 * Note: UButton/UTooltip/UIcon/NuxtLink must be resolved and passed in by the caller (modal.vue).
 * Because when the composable executes during the setup phase, resolveComponent may return strings,
 * while h() actually renders inside UTable's cell() (after mount), references may become invalid at different phases.
 */
export function useCourseProgress(
  props: ProgressModalProps,
  isOpen: Ref<boolean>,
  ui: ProgressUiComponents,
) {
  const { t } = useI18n()
  const { hasRole } = useAuth()

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
        const row: ProgressRow = {
          label: item.label,
          to: chapterId ? item.to : undefined,
          score: nodeData.score ?? null,
          items: nodeData.items || [],
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
    expanded.value = {}
    data.forEach((_: ProgressRow, i: number) => { expanded.value[i] = true })
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
              to: orig.to, class: 'text-primary hover:underline truncate',
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
        const score = row.getValue('score') as number | null
        if (score == null) return null
        const pct = Math.min(100, score)
        return h('div', { class: 'w-full h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden' }, [
          h('div', {
            class: ['h-full rounded transition-all', (row.original as ProgressRow)?.isParent ? 'bg-primary-300' : 'bg-primary-500'],
            style: { width: `${pct}%` },
          }),
        ])
      },
    },
    {
      id: 'tasks',
      header: () => t('coursePanel.tasks'),
      cell: ({ row }) => {
        const items = (row.original as ProgressRow)?.items
        if (!items?.length) return null
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

  async function loadData() {
    if (!props.courseId) return
    loading.value = true
    try {
      const data = await cRequest(`/api/courses/progress?courseId=${props.courseId}`) as { chapterId: number; score: number; isPass?: boolean; isOpen?: boolean; accessible?: boolean; items?: TaskItem[] }[]
      const map: Record<number, ChapterData> = {}
      for (const row of data) {
        map[row.chapterId] = {
          score: row.score, isPass: !!row.isPass, isOpen: !!row.isOpen,
          accessible: !!row.accessible, items: row.items || [],
        }
      }
      chapterData.value = map
    } catch (e) {
      console.error('Failed to load progress', e)
    } finally {
      loading.value = false
    }
  }

  const totalCount = computed(() => Object.keys(chapterData.value).length)
  const passedCount = computed(() => Object.values(chapterData.value as Record<number, ChapterData>).filter(ch => ch.isPass).length)
  const overallProgress = computed(() => {
    if (totalCount.value === 0) return null
    return Math.round((passedCount.value / totalCount.value) * 100)
  })

  async function onImpersonated() {
    await nextTick()
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
    onItemClick, onImpersonated, loadData,
  }
}
