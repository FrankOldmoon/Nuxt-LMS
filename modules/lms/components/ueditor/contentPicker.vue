<template>
    <UModal v-model:open="open" :ui="{ content: 'sm:max-w-3xl' }">
        <template #content>
            <div class="flex flex-col" style="height: 80vh;">
                <!-- 固定头部 -->
                <div class="p-4 space-y-3 shrink-0 border-b border-gray-100 dark:border-gray-800">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold">{{ title }}</h3>
                        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="open = false" />
                    </div>

                    <!-- 选择模式：已选标签 -->
                    <div v-if="!previewMode && selected.length" class="flex flex-wrap gap-1.5">
                        <UBadge v-for="cid in selected" :key="cid" color="primary" variant="subtle" size="xs"
                            class="cursor-pointer" @click="toggle(cid)">
                            #{{ cid }}
                            <UIcon name="i-lucide-x" class="size-3 ml-0.5" />
                        </UBadge>
                    </div>

                    <!-- 预览模式：类型筛选 + 搜索 + 新增 + 导入 + 导出 -->
                    <div v-if="previewMode" class="flex items-center gap-2">
                        <USelect v-model="filterType" :items="typeOptions" size="sm" class="w-32" />
                        <UInput v-model="keyword" :placeholder="$t('courseData.searchPlaceholder')"
                            icon="i-lucide-search" size="sm" class="flex-1" />
                        <UButton size="sm" color="info" variant="soft" icon="i-lucide-plus" @click="addNew">
                            {{ $t('common.add') }}
                        </UButton>
                        <UButton size="sm" color="primary" variant="soft" icon="i-lucide-upload"
                            @click="importOpen = true">
                            {{ $t('courseData.import') }}
                        </UButton>
                        <UButton size="sm" color="warning" variant="soft" icon="i-lucide-download"
                            :disabled="!filtered.length" @click="exportItems">
                            {{ $t('courseData.export') }}
                        </UButton>
                    </div>

                    <!-- 选择模式：搜索 + 新增 + 导入 + 导出 -->
                    <div v-if="!previewMode" class="flex items-center gap-2">
                        <UInput v-model="keyword" :placeholder="$t('courseData.searchPlaceholder')"
                            icon="i-lucide-search" size="sm" class="flex-1" />
                        <UButton size="sm" color="primary" variant="soft" icon="i-lucide-plus" @click="addNew">
                            {{ $t('common.add') }}
                        </UButton>
                        <UButton size="sm" color="primary" variant="soft" icon="i-lucide-upload"
                            @click="importOpen = true">
                            {{ $t('courseData.import') }}
                        </UButton>
                        <UButton size="sm" color="primary" variant="soft" icon="i-lucide-download"
                            :disabled="!filtered.length" @click="exportItems">
                            {{ $t('courseData.export') }}
                        </UButton>
                    </div>
                </div>

                <!-- 滚动预览区 -->
                <div class="flex-1 overflow-y-auto p-4">
                    <!-- 加载中 -->
                    <div v-if="loading" class="flex items-center justify-center py-10 text-gray-400">
                        <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
                        <span class="text-sm">{{ $t('common.loading') }}</span>
                    </div>

                    <!-- 预览模式：单条预览 -->
                    <template v-else-if="previewMode">
                        <div v-if="filtered.length && currentItem"
                            class="rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800">
                                <span class="text-sm font-medium flex-1 truncate">{{ currentItem.name || $t('common.unnamed') }}</span>
                                <span class="text-xs text-gray-400">#{{ currentItem.cid }}</span>
                            </div>
                            <div class="p-3">
                                <component :is="renderComp" :key="currentItem.cid" :node="renderNode" />
                            </div>
                        </div>
                        <div v-else class="flex items-center justify-center h-full text-gray-400 text-sm">
                            {{ $t('courseData.empty') }}
                        </div>
                    </template>

                    <!-- 选择模式：分页列表 -->
                    <template v-else>
                        <div v-if="pagedItems.length" class="space-y-3">
                            <div v-for="item in pagedItems" :key="item.cid"
                                class="rounded-lg border-2 transition-all overflow-hidden"
                                :class="isSelected(item.cid) ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'">
                                <!-- 选中标记 -->
                                <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                                    @click="toggle(item.cid)">
                                    <UIcon :name="isSelected(item.cid) ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                                        class="size-4 shrink-0"
                                        :class="isSelected(item.cid) ? 'text-primary' : 'text-muted'" />
                                    <span class="text-sm font-medium flex-1 truncate">{{ item.name || $t('common.unnamed') }}</span>
                                    <span class="text-xs text-gray-400">#{{ item.cid }}</span>
                                    <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost"
                                        @click.stop="editItem(item)" />
                                    <UPopover :modal="true">
                                        <UButton icon="i-lucide-trash" size="xs" color="neutral" variant="ghost"
                                            @click.stop />
                                        <template #content>
                                            <div class="p-3 space-y-2 w-48">
                                                <p class="text-sm text-gray-600 dark:text-gray-300">{{
                                                    $t('courseData.confirmDelete') }}</p>
                                                <div class="flex justify-end gap-2">
                                                    <UButton size="xs" color="error" @click="deleteItem(item)">
                                                        {{ $t('common.delete') }}
                                                    </UButton>
                                                </div>
                                            </div>
                                        </template>
                                    </UPopover>
                                </div>
                                <!-- 实际预览 -->
                                <div class="p-3">
                                    <component :is="renderComp"
                                        :node="{ attrs: { type: singularType, content: String(item.cid) } }" />
                                </div>
                            </div>
                        </div>
                        <div v-else class="flex items-center justify-center h-full text-gray-400 text-sm">
                            {{ $t('courseData.empty') }}
                        </div>
                    </template>
                </div>

                <!-- 固定底部 -->
                <div class="p-4 shrink-0 border-t border-gray-100 dark:border-gray-800 space-y-2">
                    <!-- 预览模式：导航 + 编辑/删除 -->
                    <template v-if="previewMode">
                        <div v-if="filtered.length" class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-1">
                                <UButton icon="i-lucide-chevron-left" size="sm" color="neutral" variant="ghost"
                                    @click="prev" />
                                <span class="text-xs text-gray-400">{{ currentIndex + 1 }} / {{ filtered.length }}</span>
                                <UButton icon="i-lucide-chevron-right" size="sm" color="neutral" variant="ghost"
                                    @click="next" />
                            </div>
                            <div class="flex items-center gap-2">
                                <UButton size="sm" color="primary" variant="soft" icon="i-lucide-pencil"
                                    :disabled="!currentItem" @click="editCurrent">
                                    {{ $t('common.edit') }}
                                </UButton>
                                <UPopover :modal="true">
                                    <UButton size="sm" color="error" variant="soft" icon="i-lucide-trash"
                                        :disabled="!currentItem">
                                        {{ $t('common.delete') }}
                                    </UButton>
                                    <template #content>
                                        <div class="p-3 space-y-2 w-48">
                                            <p class="text-sm text-gray-600 dark:text-gray-300">{{
                                                $t('courseData.confirmDelete') }}</p>
                                            <div class="flex justify-end gap-2">
                                                <UButton size="xs" color="error" @click="deleteCurrent">
                                                    {{ $t('common.delete') }}
                                                </UButton>
                                            </div>
                                        </div>
                                    </template>
                                </UPopover>
                            </div>
                        </div>
                    </template>

                    <!-- 选择模式：分页 + 确认插入 -->
                    <template v-else>
                        <div v-if="filtered.length" class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-gray-400">
                                    {{ (page - 1) * pageSize + 1 }}-{{ Math.min(page * pageSize, filtered.length) }} /
                                    {{ filtered.length }}
                                </span>
                                <USelect v-model="pageSize" :items="pageSizeOptions" size="xs" class="w-16" />
                            </div>
                            <div class="flex items-center gap-1">
                                <UButton icon="i-lucide-chevron-left" size="xs" color="neutral" variant="ghost"
                                    @click="prevPage" />
                                <span class="text-xs text-gray-400">{{ page }} / {{ totalPages }}</span>
                                <UButton icon="i-lucide-chevron-right" size="xs" color="neutral" variant="ghost"
                                    @click="nextPage" />
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-400">{{ selected.length }} {{ $t('courseData.selected') }}</span>
                            <div class="flex gap-2">
                                <UButton variant="ghost" size="sm" @click="open = false">{{ $t('common.cancel') }}</UButton>
                                <UButton color="primary" size="sm" :disabled="!selected.length" @click="confirm">
                                    {{ $t('courseData.confirmInsert') }} ({{ selected.length }})
                                </UButton>
                            </div>
                        </div>
                    </template>
                </div>
            </div>

            <!-- 编辑弹窗（预览模式：新增/编辑） -->
            <QuestionEdit v-if="editType === 'question'" v-model="editOpen" :question-id="editId" :question="editData"
                @saved="onEditSaved" />
            <HomeworkEdit v-if="editType === 'homework'" v-model="editOpen" :homework-id="editId" :homework="editData"
                @saved="onEditSaved" />
            <CommentEdit v-if="editType === 'comment'" v-model="editOpen" :comment-id="editId" :comment="editData"
                @saved="onEditSaved" />
            <QuizEdit v-if="editType === 'quiz'" v-model="editOpen" :quiz-id="editId" :quiz="editData"
                @saved="onEditSaved" />
            <component v-if="moduleLms && editType === 'race' && RaceEdit" :is="RaceEdit" v-model="editOpen"
                :race-id="editId" :race="editData" @saved="onEditSaved" />

            <!-- 导入弹窗（预览模式） -->
            <UModal v-model:open="importOpen" fullscreen scrollable>
                <template #content>
                    <div class="p-6 space-y-4">
                        <h3 class="text-lg font-semibold">{{ $t('courseData.importTitle') }}</h3>
                        <p class="text-xs text-gray-500">{{ $t('courseData.importHint') }}</p>
                        <div class="h-[400px]">
                            <Monaco v-model="importJson" language="json" />
                        </div>
                        <details v-if="currentType === 'question'" class="text-xs">
                            <summary class="cursor-pointer text-gray-500 hover:text-primary py-1 select-none flex items-center gap-2">
                                Question Format Help
                                <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" @click.stop="copyPrompt" />
                            </summary>
                            <pre class="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-auto max-h-[300px] text-xs whitespace-pre-wrap border border-gray-200 dark:border-gray-700 leading-relaxed">{{ allPrompts() }}</pre>
                        </details>
                        <div v-if="importMsg" class="text-xs" :class="importOk ? 'text-green-500' : 'text-red-500'">
                            {{ importMsg }}
                        </div>
                        <div class="flex justify-end gap-2">
                            <UButton variant="ghost" @click="importOpen = false">{{ $t('common.cancel') }}</UButton>
                            <UButton color="primary" :loading="importing" @click="doImport">
                                {{ $t('courseData.import') }}
                            </UButton>
                        </div>
                    </div>
                </template>
            </UModal>
        </template>
    </UModal>
</template>

<script setup>
import QuestionEdit from './extensions/nodes/vue/question/edit.vue'
import HomeworkEdit from './extensions/nodes/vue/homework/edit.vue'
import CommentEdit from './extensions/nodes/vue/comment/edit.vue'
import QuizEdit from './extensions/nodes/vue/quiz/edit.vue'
import RaceEdit from './extensions/nodes/vue/race/edit.vue'
import QuestionRender from './extensions/nodes/vue/question/render.vue'
import HomeworkRender from './extensions/nodes/vue/homework/render.vue'
import CommentRender from './extensions/nodes/vue/comment/render.vue'
import QuizRender from './extensions/nodes/vue/quiz/render.vue'
import RaceRender from './extensions/nodes/vue/race/render.vue'
// 各题型的英文出题说明（原 question_prompt.md 已拆分为 edit/prompt-*.js）
import { allPrompts } from './extensions/nodes/vue/question/edit/prompts.js'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    type: { type: String, default: 'questions' }, // questions | homeworks | comments（选择模式）
    initialSelected: { type: Array, default: () => [] },
    previewMode: { type: Boolean, default: false }, // 预览模式：仅预览/管理，无选择
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const { t } = useI18n()
const { courseId } = useLmsContext()
const toast = useToast()

// race / chatroom 已迁回 doc 模块，组件始终可用；
// moduleLms 仅控制是否在 UI 中显示 race 相关选项（无 lms 时无班级概念）
const { moduleLms } = useRuntimeConfig().public

const open = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

// 选择模式的类型（单数）
// 注：不能用单纯 /s$/ 去尾 s，'quizzes' 会变成 'quizze' 而非 'quiz'，导致 API ?type=quizze 查不到
const singularType = computed(() => {
    const map = { questions: 'question', homeworks: 'homework', comments: 'comment', quizzes: 'quiz', races: 'race' }
    return map[props.type] || props.type.replace(/s$/, '')
})

// 当前操作的内容类型（预览模式取筛选值，选择模式取单数类型）
const currentType = computed(() => props.previewMode ? filterType.value : singularType.value)

// 预览模式的类型筛选
const filterType = ref('question')
const typeOptions = computed(() => {
    const list = [
        { label: t('courseData.questionLabel'), value: 'question' },
        { label: t('homework.label'), value: 'homework' },
        { label: t('comment.label'), value: 'comment' },
        { label: t('quiz.label'), value: 'quiz' },
    ]
    if (moduleLms) list.push({ label: t('race.label'), value: 'race' })
    return list
})

// 渲染组件映射
const renderCompMap = computed(() => {
    const map = {
        question: QuestionRender,
        homework: HomeworkRender,
        comment: CommentRender,
        quiz: QuizRender,
    }
    if (moduleLms) map.race = RaceRender
    return map
})
const renderComp = computed(() => {
    const typ = props.previewMode ? filterType.value : singularType.value
    return renderCompMap.value[typ] || null
})

const title = computed(() => {
    if (props.previewMode) return t('courseData.editor')
    const titles = {
        questions: t('courseData.selectQuestions'),
        homeworks: t('courseData.selectHomeworks'),
        comments: t('courseData.selectComments'),
        quizzes: t('quiz.label'),
    }
    if (moduleLms) titles.races = t('race.label')
    return titles[props.type] || t('courseData.editor')
})

const loading = ref(false)
const items = ref([])
const keyword = ref('')
const selected = ref([])
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
]
const currentIndex = ref(0)

// 选择模式的过滤（按名称/cid 搜索）
const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    if (props.previewMode) {
        const byType = items.value.filter(i => i.type === filterType.value)
        if (!kw) return byType
        return byType.filter(i =>
            (i.name || '').toLowerCase().includes(kw) || String(i.cid).includes(kw)
        )
    }
    if (!kw) return items.value
    return items.value.filter(i =>
        (i.name || '').toLowerCase().includes(kw) || String(i.cid).includes(kw)
    )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const pagedItems = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return filtered.value.slice(start, start + pageSize.value)
})

// 分页循环切换
function prevPage() {
    page.value = page.value <= 1 ? totalPages.value : page.value - 1
}
function nextPage() {
    page.value = page.value >= totalPages.value ? 1 : page.value + 1
}

// 每页数量变化时回到第一页
watch(pageSize, () => { page.value = 1 })

// 预览模式当前项
const currentItem = computed(() => filtered.value[currentIndex.value] || null)
const renderNode = computed(() => ({
    attrs: {
        type: currentItem.value?.type || '',
        content: String(currentItem.value?.cid || ''),
    },
}))

// 搜索或类型变化时重置
watch([keyword, () => props.type, filterType], () => {
    page.value = 1
    currentIndex.value = 0
})

function isSelected(cid) {
    return selected.value.includes(cid)
}

function toggle(cid) {
    const idx = selected.value.indexOf(cid)
    if (idx >= 0) selected.value.splice(idx, 1)
    else selected.value.push(cid)
}

function prev() {
    if (filtered.value.length === 0) return
    currentIndex.value = (currentIndex.value - 1 + filtered.value.length) % filtered.value.length
}
function next() {
    if (filtered.value.length === 0) return
    currentIndex.value = (currentIndex.value + 1) % filtered.value.length
}

async function fetchItems() {
    if (!courseId.value) return
    loading.value = true
    try {
        const url = props.previewMode
            ? `/api/courses/content?course_id=${courseId.value}`
            : `/api/courses/content?course_id=${courseId.value}&type=${singularType.value}`
        const data = await cRequest(url)
        items.value = data || []
        currentIndex.value = 0
        page.value = 1
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

// ===== 新增/编辑/删除/导入（预览模式 + 选择模式共用） =====
const editOpen = ref(false)
const editType = ref('')
const editId = ref(0)
const editData = ref(null)

async function addNew() {
    editType.value = props.previewMode ? filterType.value : singularType.value
    editId.value = 0
    editData.value = null
    await nextTick()
    editOpen.value = true
}

async function editItem(item) {
    editType.value = item.type
    editId.value = item.cid
    editData.value = {
        name: item.name || '',
        content: item.content || '',
        tags: Array.isArray(item.tags) ? [...item.tags] : [],
        point: item.point || 0,
        ...item.extra,
    }
    await nextTick()
    editOpen.value = true
}

async function editCurrent() {
    if (!currentItem.value) return
    await editItem(currentItem.value)
}

async function onEditSaved() {
    const wasAdding = editId.value === 0
    editOpen.value = false
    await fetchItems()
    if (wasAdding) {
        // 新增后跳转到最后一个
        if (props.previewMode) {
            currentIndex.value = Math.max(0, filtered.value.length - 1)
        } else {
            page.value = totalPages.value
        }
    }
}

async function deleteItem(item) {
    try {
        await cRequest('/api/courses/delete', {
            method: 'POST',
            body: {
                course_id: courseId.value,
                cid: item.cid,
                type: item.type,
            },
        })
        toast.add({ title: t('courseData.deleted'), color: 'success' })
        fetchItems()
    } catch (err) {
        toast.add({ title: err.message || t('courseData.deleteFailed'), color: 'error' })
    }
}

async function deleteCurrent() {
    if (!currentItem.value) return
    await deleteItem(currentItem.value)
}

const importOpen = ref(false)
const importJson = ref(`[\n  {\n    "name": "${t('contentPicker.example')}",\n    "content": "",\n    "point": 1\n  }\n]`)
const importing = ref(false)
const importMsg = ref('')
const importOk = ref(true)

async function doImport() {
    let importItems
    try {
        importItems = JSON.parse(importJson.value)
        if (!Array.isArray(importItems)) throw new Error(t('contentPicker.jsonMustBeArray'))
    } catch (err) {
        importOk.value = false
        importMsg.value = `${t('courseData.importParseError')}: ${err.message}`
        return
    }
    importing.value = true
    importMsg.value = ''
    const currentType = props.previewMode ? filterType.value : singularType.value
    const endpoint = {
        question: '/api/questions/add',
        homework: '/api/homeworks/add',
        comment: '/api/comments/add',
        quiz: '/api/quizzes/add',
        ...(moduleLms ? { race: '/api/races/add' } : {}),
    }[currentType]
    let success = 0
    let failed = 0
    for (const item of importItems) {
        try {
            await cRequest(endpoint, {
                method: 'POST',
                body: { course_id: courseId.value, ...item },
            })
            success++
        } catch {
            failed++
        }
    }
    importing.value = false
    if (success > 0) {
        importOk.value = true
        importMsg.value = `${t('courseData.importSuccess')}: ${success}${failed > 0 ? t('contentPicker.importFailedCount', { count: failed }) : ''}`
        toast.add({ title: importMsg.value, color: 'success' })
        await fetchItems()
        importOpen.value = false
        // 导入后跳转到最后一个
        if (props.previewMode) {
            currentIndex.value = Math.max(0, filtered.value.length - 1)
        } else {
            page.value = totalPages.value
        }
    } else {
        importOk.value = false
        importMsg.value = t('courseData.importFailed')
    }
}

// 复制题目格式参考文档
async function copyPrompt() {
    try {
        await navigator.clipboard.writeText(allPrompts())
        toast.add({ title: t('common.copied'), color: 'success' })
    } catch {
        toast.add({ title: t('common.copyFailed'), color: 'error' })
    }
}

// 批量导出：将当前类型的所有条目导出为可重新导入的 JSON
// 去除 course_id、cid、createdAt、updatedAt 等无关属性，展平 extra
function exportItems() {
    if (!filtered.value.length) return

    const cleanItems = filtered.value.map(item => {
        // 解构出需要排除的字段
        const { type: _wrapperType, cid, createdAt, updatedAt, extra, ...rest } = item
        // 展平 extra，qtype 改回 type（DB 列名）
        const flatExtra = { ...extra }
        if (flatExtra.qtype !== undefined) {
            flatExtra.type = flatExtra.qtype
            delete flatExtra.qtype
        }
        return { ...rest, ...flatExtra }
    })

    const json = JSON.stringify(cleanItems, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentType.value}_export.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.add({ title: t('contentPicker.exportSuccess', { count: cleanItems.length }), color: 'success' })
}

watch(open, (val) => {
    if (val) {
        if (!props.previewMode) {
            selected.value = [...props.initialSelected]
        }
        keyword.value = ''
        page.value = 1
        currentIndex.value = 0
        fetchItems()
    }
})

</script>
