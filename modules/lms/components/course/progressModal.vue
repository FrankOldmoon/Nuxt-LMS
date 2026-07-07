<template>
    <div>
        <!-- 进度弹窗 -->
        <UModal v-model:open="isOpen" :ui="{ content: 'max-w-4xl' }" scrollable>
            <template #content>
                <div class="p-6">

                    <!-- 教师/管理员：选择学生查看进度 -->
                    <CourseUserSelect v-if="canSelectStudent" :course-id="Number(courseId)"
                        @impersonated="onImpersonated" @restored="onImpersonated" />

                    <!-- 总体学习进度 -->
                    <div v-if="overallProgress !== null" class="mb-4 p-4 bg-elevated/50 rounded-lg">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-medium">{{ t('coursePanel.progress') }}</span>
                            <span class="text-lg font-bold text-primary">{{ overallProgress }}%</span>
                        </div>
                        <div class="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div class="h-full bg-primary rounded-full transition-all duration-500"
                                :style="{ width: `${overallProgress}%` }" />
                        </div>
                        <p class="text-xs text-muted mt-1.5">{{ passedCount }} / {{ totalCount }} {{ t('coursePanel.chapter') }}</p>
                    </div>

                    

                    <div v-if="loading" class="py-8 text-center text-gray-400">{{ t('common.loading') }}</div>
                    <UTable v-else v-model:expanded="expanded" :data="tableData" :columns="columns"
                        :get-sub-rows="(row) => row.children" class="flex-1" :ui="{
                            base: 'border-separate border-spacing-0',
                            tbody: '[&>tr]:last:[&>td]:border-b-0',
                            tr: 'group hover:bg-gray-50',
                            td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default',
                        }" />
                </div>
            </template>
        </UModal>

        <!-- 任务预览弹窗 -->
        <TaskModal v-model:open="taskModalOpen" :course-id="courseId" :type="taskModalItem.type" :id="taskModalItem.id"
            :status="taskModalItem.status" />
    </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

import TaskDot from './taskDot.vue'
import TaskModal from './taskModal.vue'

const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')
const UIcon = resolveComponent('UIcon')
const NuxtLink = resolveComponent('NuxtLink')

const isOpen = defineModel('open', { default: false })
const { t } = useI18n()

interface NavItem {
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

type TaskItem = {
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

const props = defineProps({
    courseId: { type: [String, Number], default: '' },
    navigation: { type: Array as () => NavItem[], default: () => [] as NavItem[] },
})

const { hasRole } = useAuth()
// 弹窗打开时记录原始角色，切换学生后仍保留选择器
const canSelectStudent = ref(false)

// 模拟学生身份或恢复后重新加载数据（等待 cookie 刷新）
async function onImpersonated() {
    await nextTick()
    await loadData()
}

// ---- 任务弹窗状态 ----
const loading = ref(false)
const taskModalOpen = ref(false)
const taskModalItem = reactive({ type: '', id: 0, status: 'todo' })

function onItemClick(item: TaskItem) {
    Object.assign(taskModalItem, item)
    taskModalOpen.value = true
}

// ---- 从导航构建树结构 ----
function extractChapterId(to: string): number | null {
    if (!to) return null
    const match = to.match(/\/course\/[^/]+\/(\d+)$/)
    return match ? Number(match[1]) : null
}

// 将导航转为带 children 的树（跳过根节点"课程"）
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
            // 递归子节点
            if (hasChildren) {
                row.children = walk(item.children || [])
            }
            return row
        })
    }
    return walk(navItems)
}

const chapterData = ref < Record < number, ChapterData>> ({})

const tableData = computed(() => buildTree(props.navigation.slice(1), chapterData.value))
const expanded = ref < Record < number, boolean>> ({})

// 默认展开第一层
watch(tableData, (data: ProgressRow[]) => {
    expanded.value = {}
    data.forEach((_: ProgressRow, i: number) => { expanded.value[i] = true })
}, { immediate: true })

// ---- 列定义 ----
const columns: TableColumn<ProgressRow>[] = [
    {
        accessorKey: 'label',
        header: () => t('coursePanel.chapter'),
        cell: ({ row }) => {
            const orig = row.original as ProgressRow

            return h(
                'div',
                {
                    style: { paddingLeft: `${row.depth * 1.5}rem` },
                    class: 'flex items-center gap-2',
                },
                [
                    h(UButton, {
                        color: 'neutral',
                        variant: 'outline',
                        size: 'xs',
                        icon: row.getIsExpanded() ? 'i-lucide-minus' : 'i-lucide-plus',
                        class: !row.getCanExpand() && 'invisible',
                        ui: {
                            base: 'p-0 rounded-sm',
                            leadingIcon: 'size-4',
                        },
                        onClick: row.getToggleExpandedHandler(),
                    }),
                    // 可访问的章节：内部路由链接；不可访问：普通文字
                    orig?.to && orig?.accessible
                        ? h(NuxtLink, {
                              to: orig.to,
                              class: 'text-primary hover:underline truncate',
                              onClick: (e: Event) => {
                                  e.stopPropagation()
                                  isOpen.value = false
                              },
                          }, { default: () => row.getValue('label') as string })
                        : h('span', {
                              class: orig?.isParent ? 'font-semibold' : '',
                          }, row.getValue('label') as string),
                    // is_pass 图标
                    orig?.isPass && orig?.to
                        ? h(UTooltip, { text: t('coursePanel.done') }, () =>
                              h(UIcon, { name: 'i-lucide-circle-check', class: 'size-4 text-success shrink-0' })
                          )
                        : null,
                    // 不可访问时显示锁
                    orig?.to && !orig?.accessible
                        ? h(UTooltip, { text: t('chapter.notOpen') }, () =>
                              h(UIcon, { name: 'i-lucide-lock', class: 'size-4 text-muted shrink-0' })
                          )
                        : null,
                ],
            )
        },
    },
    {
        accessorKey: 'score',
        header: () => t('coursePanel.score'),
        meta: {
            class: {
                th: 'text-right w-24',
                td: 'text-right font-mono',
            },
        },
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
                    class: [
                        'h-full rounded transition-all',
                        (row.original as ProgressRow)?.isParent ? 'bg-primary-300' : 'bg-primary-500',
                    ],
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
                    h(UTooltip, {
                        key: `${item.type}-${item.id}`,
                        text: `${item.type} #${item.id} (${item.status})`,
                    }, () =>
                        h(TaskDot, {
                            type: item.type,
                            status: item.status,
                            id: item.id,
                            onClick: () => onItemClick(item),
                        }),
                    ),
                ),
            )
        },
    },
]

// ---- 加载数据 ----
async function loadData() {
    if (!props.courseId) return
    loading.value = true
    try {
        const data = await cRequest(`/api/courses/progress?courseId=${props.courseId}`) as { chapterId: number; score: number; isPass?: boolean; isOpen?: boolean; accessible?: boolean; items?: TaskItem[] }[]
        const map: Record<number, ChapterData> = {}
        for (const row of data) {
            map[row.chapterId] = {
                score: row.score,
                isPass: !!row.isPass,
                isOpen: !!row.isOpen,
                accessible: !!row.accessible,
                items: row.items || [],
            }
        }
        chapterData.value = map
    } catch (e) {
        console.error('加载进度失败', e)
    } finally {
        loading.value = false
    }
}

// ---- 总体学习进度（基于 isPass 比例） ----
const totalCount = computed(() => Object.keys(chapterData.value).length)
const passedCount = computed(() => Object.values(chapterData.value as Record<number, ChapterData>).filter(ch => ch.isPass).length)
const overallProgress = computed(() => {
    if (totalCount.value === 0) return null
    return Math.round((passedCount.value / totalCount.value) * 100)
})

watch(isOpen, (val) => {
    if (val) {
        // 弹窗打开时记录当前角色（教师/管理员才显示选择器）
        canSelectStudent.value = hasRole('admin') || hasRole('teacher')
        loadData()
    }
})
</script>
