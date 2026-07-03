<template>
    <UModal v-model:open="open" :ui="{ content: 'sm:max-w-3xl' }">
        <template #content>
            <div class="flex flex-col" style="height: 80vh;">
                <!-- 固定头部：标题 + 已选标签 + 搜索 -->
                <div class="p-4 space-y-3 shrink-0 border-b border-gray-100 dark:border-gray-800">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold">{{ title }}</h3>
                        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="open = false" />
                    </div>

                    <!-- 已选标签 -->
                    <div v-if="selected.length" class="flex flex-wrap gap-1.5">
                        <UBadge v-for="cid in selected" :key="cid" color="primary" variant="subtle" size="xs"
                            class="cursor-pointer" @click="toggle(cid)">
                            #{{ cid }}
                            <UIcon name="i-lucide-x" class="size-3 ml-0.5" />
                        </UBadge>
                    </div>

                    <!-- 搜索 -->
                    <UInput v-model="keyword" :placeholder="$t('courseData.searchPlaceholder')" icon="i-lucide-search"
                        size="sm" class="w-full" />
                </div>

                <!-- 滚动预览区（固定一个题目高度） -->
                <div class="flex-1 overflow-y-auto p-4">
                    <!-- 加载中 -->
                    <div v-if="loading" class="flex items-center justify-center py-10 text-gray-400">
                        <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
                        <span class="text-sm">{{ $t('common.loading') }}</span>
                    </div>

                    <!-- 当前页预览 -->
                    <div v-else-if="pagedItems.length" class="space-y-3">
                        <div v-for="item in pagedItems" :key="item.cid"
                            class="rounded-lg border-2 cursor-pointer transition-all overflow-hidden"
                            :class="isSelected(item.cid) ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
                            @click="toggle(item.cid)">
                            <!-- 选中标记 -->
                            <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800">
                                <UIcon :name="isSelected(item.cid) ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                                    class="size-4 shrink-0"
                                    :class="isSelected(item.cid) ? 'text-primary' : 'text-muted'" />
                                <span class="text-sm font-medium flex-1 truncate">{{ item.name || '(未命名)' }}</span>
                                <span class="text-xs text-gray-400">#{{ item.cid }}</span>
                            </div>
                            <!-- 实际预览 -->
                            <div class="p-3 pointer-events-none">
                                <component :is="renderComp" :node="{ attrs: { type: singularType, content: String(item.cid) } }" />
                            </div>
                        </div>
                    </div>

                    <!-- 空 -->
                    <div v-else class="flex items-center justify-center h-full text-gray-400 text-sm">
                        {{ $t('courseData.empty') }}
                    </div>
                </div>

                <!-- 固定底部：分页 + 操作按钮 -->
                <div class="p-4 shrink-0 border-t border-gray-100 dark:border-gray-800 space-y-2">
                    <!-- 分页 -->
                    <div v-if="filtered.length > pageSize" class="flex items-center justify-between">
                        <span class="text-xs text-gray-400">
                            {{ (page - 1) * pageSize + 1 }}-{{ Math.min(page * pageSize, filtered.length) }} / {{ filtered.length }}
                        </span>
                        <div class="flex items-center gap-1">
                            <UButton icon="i-lucide-chevron-left" size="xs" color="neutral" variant="ghost"
                                :disabled="page <= 1" @click="page--" />
                            <span class="text-xs text-gray-400">{{ page }} / {{ totalPages }}</span>
                            <UButton icon="i-lucide-chevron-right" size="xs" color="neutral" variant="ghost"
                                :disabled="page >= totalPages" @click="page++" />
                        </div>
                    </div>

                    <!-- 操作按钮 -->
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-gray-400">{{ selected.length }} {{ $t('courseData.selected') }}</span>
                        <div class="flex gap-2">
                            <UButton variant="ghost" size="sm" @click="open = false">{{ $t('common.cancel') }}</UButton>
                            <UButton color="primary" size="sm" :disabled="!selected.length" @click="confirm">
                                {{ $t('courseData.confirmInsert') }} ({{ selected.length }})
                            </UButton>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup>
import QuestionRender from './render/nodes/vue/question.vue'
import HomeworkRender from './render/nodes/vue/homework.vue'
import CommentRender from './render/nodes/vue/comment.vue'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    type: { type: String, default: 'question' }, // questions | homeworks | comments
    initialSelected: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const { t } = useI18n()
const { editableCourseId } = useLayoutState()

const courseId = computed(() => editableCourseId.value)

const open = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const singularType = computed(() => props.type.replace(/s$/, ''))
const renderComp = computed(() => {
    if (singularType.value === 'question') return QuestionRender
    if (singularType.value === 'homework') return HomeworkRender
    if (singularType.value === 'comment') return CommentRender
    return null
})

const title = computed(() => {
    if (props.type === 'questions') return t('courseData.selectQuestions')
    if (props.type === 'homeworks') return t('courseData.selectHomeworks')
    return t('courseData.selectComments')
})

const loading = ref(false)
const items = ref([])
const keyword = ref('')
const selected = ref([])
const page = ref(1)
const pageSize = 3

const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    if (!kw) return items.value
    return items.value.filter(i =>
        (i.name || '').toLowerCase().includes(kw) ||
        String(i.cid).includes(kw)
    )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pagedItems = computed(() => {
    const start = (page.value - 1) * pageSize
    return filtered.value.slice(start, start + pageSize)
})

// 搜索或类型变化时重置页码
watch([keyword, () => props.type], () => {
    page.value = 1
})

function isSelected(cid) {
    return selected.value.includes(cid)
}

function toggle(cid) {
    const idx = selected.value.indexOf(cid)
    if (idx >= 0) {
        selected.value.splice(idx, 1)
    } else {
        selected.value.push(cid)
    }
}

async function fetchItems() {
    if (!courseId.value) return
    loading.value = true
    try {
        const data = await cRequest(`/api/lms/courses/content?course_id=${courseId.value}&type=${singularType.value}`)
        items.value = data || []
    } catch {
        items.value = []
    } finally {
        loading.value = false
    }
}

function confirm() {
    emit('confirm', [...selected.value])
    open.value = false
}

watch(open, (val) => {
    if (val) {
        selected.value = [...props.initialSelected]
        keyword.value = ''
        page.value = 1
        fetchItems()
    }
})
</script>
