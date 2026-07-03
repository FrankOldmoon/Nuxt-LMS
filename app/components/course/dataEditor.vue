<template>
    <UModal v-model:open="open" fullscreen>
        <UTooltip :text="$t('courseData.editor')" :content="{ side: 'bottom' }">
            <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-database"
                :aria-label="$t('courseData.editor')" @click.prevent.stop="open = true" />
        </UTooltip>

        <template #content>
            <div class="p-6 space-y-4 h-full flex flex-col">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">{{ $t('courseData.editor') }}</h3>
                    <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="open = false" />
                </div>

                <!-- 工具栏：类型筛选 + 搜索 + 导入 -->
                <div class="flex items-center gap-2">
                    <USelect v-model="filterType" :items="typeOptions" size="sm" class="w-32" />
                    <UInputMenu v-model="searchSelected" :items="searchItems" value-key="value" label-key="label"
                        :placeholder="$t('courseData.searchPlaceholder')" icon="i-lucide-search" size="sm"
                        class="flex-1" @change="onSearchSelect" />
                    <UButton size="sm" color="primary" variant="soft" icon="i-lucide-upload"
                        @click="importOpen = true">
                        {{ $t('courseData.import') }}
                    </UButton>
                    <span class="text-xs text-gray-400 whitespace-nowrap">
                        {{ filtered.length ? `${currentIndex + 1} / ${filtered.length}` : '0 / 0' }}
                    </span>
                </div>

                <!-- 加载中 -->
                <div v-if="loading" class="flex items-center justify-center py-10 text-gray-400">
                    <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
                    <span class="text-sm">{{ $t('common.loading') }}</span>
                </div>

                <!-- 空状态 -->
                <div v-else-if="!filtered.length" class="flex-1 flex items-center justify-center text-gray-400 text-sm">
                    {{ $t('courseData.empty') }}
                </div>

                <!-- 预览区：直接使用 render 组件 -->
                <div v-else-if="currentItem" class="flex-1 overflow-y-auto">
                    <component :is="renderComp" :node="renderNode" />
                </div>

                <!-- 底部：导航 + 操作 -->
                <div v-if="filtered.length" class="flex items-center justify-between gap-2 pt-2">
                    <!-- 左右切换 -->
                    <div class="flex items-center gap-1">
                        <UButton icon="i-lucide-chevron-left" size="sm" color="neutral" variant="ghost"
                            :disabled="currentIndex <= 0" @click="prev" />
                        <UButton icon="i-lucide-chevron-right" size="sm" color="neutral" variant="ghost"
                            :disabled="currentIndex >= filtered.length - 1" @click="next" />
                    </div>

                    <!-- 编辑 + 删除 -->
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
            </div>

            <!-- 编辑弹窗 -->
            <QuestionEdit v-if="editType === 'question'" v-model="editOpen" :question-id="editId" :question="editData"
                @saved="onEditSaved" />
            <HomeworkEdit v-if="editType === 'homework'" v-model="editOpen" :homework-id="editId" :homework="editData"
                @saved="onEditSaved" />
            <CommentEdit v-if="editType === 'comment'" v-model="editOpen" :comment-id="editId" :comment="editData"
                @saved="onEditSaved" />

            <!-- 导入弹窗 -->
            <UModal v-model:open="importOpen" :ui="{ content: 'sm:max-w-2xl' }">
                <template #content>
                    <div class="p-6 space-y-4">
                        <h3 class="text-lg font-semibold">{{ $t('courseData.importTitle') }}</h3>
                        <p class="text-xs text-gray-500">{{ $t('courseData.importHint') }}</p>
                        <div class="h-[400px]">
                            <Monaco v-model="importJson" language="json" />
                        </div>
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
import QuestionEdit from '../ueditor/extensions/nodes/vue/question/edit.vue'
import HomeworkEdit from '../ueditor/extensions/nodes/vue/homework/edit.vue'
import CommentEdit from '../ueditor/extensions/nodes/vue/comment/edit.vue'
import QuestionRender from '../ueditor/render/nodes/vue/question.vue'
import HomeworkRender from '../ueditor/render/nodes/vue/homework.vue'
import CommentRender from '../ueditor/render/nodes/vue/comment.vue'
import Monaco from '../monaco/index.vue'

const props = defineProps({
    courseId: { type: [Number, String], default: 0 },
})

const { t } = useI18n()
const toast = useToast()

const open = ref(false)
const loading = ref(false)
const items = ref([])
const filterType = ref('question')
const searchSelected = ref(undefined)
const currentIndex = ref(0)

const typeOptions = [
    { label: t('courseData.questionLabel'), value: 'question' },
    { label: t('homework.label'), value: 'homework' },
    { label: t('comment.label'), value: 'comment' },
]

// 搜索下拉选项：显示当前类型的所有 item
const searchItems = computed(() => {
    return items.value
        .filter(i => i.type === filterType.value)
        .map(i => ({
            label: `(${i.cid}) ${i.name || '(未命名)'}`,
            value: i.cid,
        }))
})

// 渲染组件映射
const renderCompMap = {
    question: QuestionRender,
    homework: HomeworkRender,
    comment: CommentRender,
}

const filtered = computed(() => {
    return items.value.filter(i => i.type === filterType.value)
})

const currentItem = computed(() => filtered.value[currentIndex.value] || null)

// 构造 render 组件所需的 node 对象
const renderNode = computed(() => ({
    attrs: {
        type: currentItem.value?.type || '',
        content: String(currentItem.value?.cid || ''),
    },
}))

const renderComp = computed(() => renderCompMap[filterType.value] || null)

watch(filterType, () => {
    currentIndex.value = 0
    searchSelected.value = undefined
})

// 选中搜索项时跳转到对应 item
function onSearchSelect(val) {
    if (val === undefined || val === null) return
    const idx = filtered.value.findIndex(i => i.cid === val)
    if (idx >= 0) currentIndex.value = idx
}

// searchSelected 变化时也跳转（确保选中后预览更新）
watch(searchSelected, (val) => {
    if (val === undefined || val === null) return
    const idx = filtered.value.findIndex(i => i.cid === val)
    if (idx >= 0) currentIndex.value = idx
})

watch(open, (val) => {
    if (val) fetchData()
})

async function fetchData() {
    loading.value = true
    try {
        const data = await cRequest(`/api/lms/courses/content?course_id=${props.courseId}`)
        items.value = data || []
        currentIndex.value = 0
        searchSelected.value = undefined
    } catch {
        items.value = []
    } finally {
        loading.value = false
    }
}

function prev() {
    if (currentIndex.value > 0) currentIndex.value--
}
function next() {
    if (currentIndex.value < filtered.value.length - 1) currentIndex.value++
}

// 切换时同步搜索框选中值
watch(currentIndex, () => {
    searchSelected.value = currentItem.value?.cid ?? undefined
})

// 编辑
const editOpen = ref(false)
const editType = ref('')
const editId = ref(0)
const editData = ref(null)

function editCurrent() {
    if (!currentItem.value) return
    const item = currentItem.value
    editType.value = item.type
    editId.value = item.cid
    editData.value = {
        name: item.name || '',
        content: item.content || '',
        tags: Array.isArray(item.tags) ? [...item.tags] : [],
        point: item.point || 0,
        ...item.extra,
    }
    editOpen.value = true
}

function onEditSaved() {
    editOpen.value = false
    fetchData()
}

// 删除
async function deleteCurrent() {
    if (!currentItem.value) return
    try {
        await cRequest('/api/lms/courses/delete', {
            method: 'POST',
            body: {
                course_id: props.courseId,
                cid: currentItem.value.cid,
                type: currentItem.value.type,
            },
        })
        toast.add({ title: t('courseData.deleted'), color: 'success' })
        fetchData()
    } catch (err) {
        toast.add({ title: err.message || t('courseData.deleteFailed'), color: 'error' })
    }
}

// 导入
const importOpen = ref(false)
const importJson = ref('[\n  {\n    "name": "示例",\n    "content": "",\n    "point": 1\n  }\n]')
const importing = ref(false)
const importMsg = ref('')
const importOk = ref(true)

async function doImport() {
    let items
    try {
        items = JSON.parse(importJson.value)
        if (!Array.isArray(items)) throw new Error('JSON 必须是数组格式')
    } catch (err) {
        importOk.value = false
        importMsg.value = `${t('courseData.importParseError')}: ${err.message}`
        return
    }
    importing.value = true
    importMsg.value = ''
    try {
        const data = await cRequest('/api/lms/courses/import', {
            method: 'POST',
            body: {
                course_id: props.courseId,
                type: filterType.value,
                items,
            },
        })
        importOk.value = true
        importMsg.value = `${t('courseData.importSuccess')}: ${data.imported}`
        toast.add({ title: `${t('courseData.importSuccess')}: ${data.imported}`, color: 'success' })
        fetchData()
        importOpen.value = false
    } catch (err) {
        importOk.value = false
        importMsg.value = err.message || t('courseData.importFailed')
    } finally {
        importing.value = false
    }
}
</script>
