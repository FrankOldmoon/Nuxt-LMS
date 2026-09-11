<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-5xl' }" scrollable>
        <template #content>
            <div class="p-6 space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">{{ $t('chapter.classOpenMatrix') }}</h3>
                    <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="isOpen = false" />
                </div>

                <div v-if="loading" class="py-8 text-center text-muted">
                    <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2 inline-block" />
                    {{ $t('common.loading') }}
                </div>

                <div v-else-if="classes.length === 0" class="py-8 text-center text-muted">
                    {{ $t('chapter.noOpenClasses') }}
                </div>

                <!-- 章节 × 班级开放矩阵（行=章节导航树，列=开放班级） -->
                <div v-else class="overflow-auto max-h-[60vh]">
                    <UTable
                        v-model:expanded="expanded"
                        :data="treeRows"
                        :columns="columns"
                        :get-sub-rows="(row: any) => row.children"
                        :ui="{
                            base: 'border-separate border-spacing-0',
                            tbody: '[&>tr]:last:[&>td]:border-b-0',
                            tr: 'group hover:bg-gray-50',
                            td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default',
                        }"
                    />
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const isOpen = defineModel<boolean>('open', { default: false })

const props = defineProps<{
    courseId: string | number
}>()

const { t } = useI18n()
// 复用课程导航树（与 chapter progress 同源），章节行按该层级缩进展示
const { navigation } = useSidebarNav()
const { loading, classes, isOpenFor } = useClassOpenMatrix(props, isOpen)

// 在 setup 阶段解析 UI 组件引用，供 columns 的 h() 渲染使用
const UButtonR = resolveComponent('UButton')

function extractChapterId(to?: string): number | null {
    if (!to) return null
    const m = to.match(/\/course\/[^/]+\/(\d+)$/)
    return m ? Number(m[1]) : null
}

interface MatrixRow {
    label: string
    chapterId: number | null
    children?: MatrixRow[]
}

// 与 chapter progress 相同的导航树 → 行结构
function buildRows(items: any[]): MatrixRow[] {
    return (items || []).map((it) => {
        const row: MatrixRow = {
            label: it.label || '',
            chapterId: extractChapterId(it.to),
        }
        if (it.children?.length) row.children = buildRows(it.children)
        return row
    })
}

const treeRows = computed(() => buildRows(navigation.value.slice(1)))

// 默认全部展开（与 progress 一致：宽表先展开全量）
const expanded = ref<Record<number, boolean>>({})
watch(treeRows, (data) => {
    expanded.value = {}
    ;(function setAll(rows: MatrixRow[], acc: { n: number }) {
        for (const r of rows) {
            expanded.value[acc.n] = true
            acc.n++
            if (r.children) setAll(r.children, acc)
        }
    })(data, { n: 0 })
}, { immediate: true })

const columns = computed<TableColumn<MatrixRow>[]>(() => [
    {
        accessorKey: 'label',
        header: () => t('coursePanel.chapter'),
        cell: ({ row }) => h('div', { style: { paddingLeft: `${row.depth * 1.5}rem` }, class: 'flex items-center gap-2' }, [
            h(UButtonR, {
                color: 'neutral', variant: 'outline', size: 'xs',
                icon: row.getIsExpanded() ? 'i-lucide-minus' : 'i-lucide-plus',
                class: !row.getCanExpand() && 'invisible',
                ui: { base: 'p-0 rounded-sm', leadingIcon: 'size-4' },
                onClick: row.getToggleExpandedHandler(),
            }),
            h('span', { class: !row.getCanExpand() ? 'font-medium' : 'font-semibold' }, (row.original as MatrixRow).label),
        ])
    },
    // 每个开放班级一列，单元格显示该章对该班的开放状态
    ...classes.value.map((c) => ({
        id: `open-${c.id}`,
        header: () => h('div', { class: 'text-center' }, c.name),
        cell: ({ row }) => {
            const orig = row.original as MatrixRow
            // 父分组无章节 id，单元格留空
            if (!orig.chapterId) return null
            return h('div', { class: 'flex justify-center py-1' }, [
                h('div', {
                    class: ['size-4 rounded-sm', isOpenFor(orig.chapterId, c.id) ? 'bg-success' : 'bg-muted/50'],
                }),
            ])
        },
    })),
])
</script>