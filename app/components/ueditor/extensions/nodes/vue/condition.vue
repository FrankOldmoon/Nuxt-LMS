<template>
    <node-view-wrapper class="condition-node-wrapper">
        <div class="condition-node-container" contenteditable="false">
            <!-- 工具栏 -->
            <div class="condition-node-toolbar">
                <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-shield-check" class="text-gray-500" />
                    <span class="text-sm font-medium">{{ t('ueditor.condition') }}</span>
                </div>
                <div class="flex items-center gap-1">
                    <UButton icon="i-lucide-settings-2" color="neutral" variant="ghost" size="2xs" @click="toggleConfig" />
                    <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="2xs" @click="deleteNode" />
                </div>
            </div>

            <!-- 配置面板 -->
            <div v-if="showConfig" class="condition-node-config">
                <!-- 条件列表 -->
                <div class="space-y-2">
                    <div v-for="(cond, idx) in editConditions" :key="idx" class="flex items-center gap-2">
                        <USelect
                            v-model="cond.type"
                            :items="conditionTypes"
                            size="sm"
                            class="w-32"
                        />
                        <USelect
                            v-if="cond.type === 'role'"
                            v-model="cond.value"
                            :items="roleOptions"
                            size="sm"
                            class="flex-1"
                        />
                        <USelect
                            v-else-if="cond.type === 'class'"
                            v-model="cond.value"
                            :items="classOptions"
                            size="sm"
                            class="flex-1"
                            @update:model-value="updateClassLabel(idx, $event)"
                        />
                        <USelect
                            v-else-if="cond.type === 'question'"
                            v-model="cond.value"
                            :items="questionOptions"
                            multiple
                            size="sm"
                            class="flex-1"
                            @update:model-value="updateTaskLabel(idx, $event, 'question')"
                        />
                        <USelect
                            v-else-if="cond.type === 'homework'"
                            v-model="cond.value"
                            :items="homeworkOptions"
                            multiple
                            size="sm"
                            class="flex-1"
                            @update:model-value="updateTaskLabel(idx, $event, 'homework')"
                        />
                        <USelect
                            v-else-if="cond.type === 'comment'"
                            v-model="cond.value"
                            :items="commentOptions"
                            multiple
                            size="sm"
                            class="flex-1"
                            @update:model-value="updateTaskLabel(idx, $event, 'comment')"
                        />
                        <UButton
                            icon="i-lucide-x"
                            color="error"
                            variant="ghost"
                            size="xs"
                            @click="editConditions.splice(idx, 1)"
                        />
                    </div>
                </div>
                <UButton
                    icon="i-lucide-plus"
                    color="neutral"
                    variant="outline"
                    size="xs"
                    :label="t('ueditor.conditionAdd')"
                    @click="editConditions.push({ type: 'role', value: '' })"
                />

                <USeparator />

                <!-- 富文本编辑器 -->
                <UFormField :label="t('ueditor.conditionContent')" size="sm">
                    <RichEditor v-model="editContent" />
                </UFormField>

                <UButton size="xs" color="primary" @click="applyConfig">{{ t('common.save') }}</UButton>
            </div>

            <!-- 引用渲染端组件预览 -->
            <UeditorRenderNodesVueCondition v-show="!showConfig" :node="node" />
        </div>
    </node-view-wrapper>
</template>

<script setup>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const { t } = useI18n()
const { editableId } = useLayoutState()

const showConfig = ref(false)

// 当前章节的 question/homework/comment IDs
const chapterTaskIds = ref({ questionIds: [], homeworkIds: [], commentIds: [] })

const questionOptions = computed(() =>
    (chapterTaskIds.value.questionIds || []).map(id => ({ label: `#${id}`, value: String(id) }))
)
const homeworkOptions = computed(() =>
    (chapterTaskIds.value.homeworkIds || []).map(id => ({ label: `#${id}`, value: String(id) }))
)
const commentOptions = computed(() =>
    (chapterTaskIds.value.commentIds || []).map(id => ({ label: `#${id}`, value: String(id) }))
)

async function loadChapterTasks() {
    if (!editableId.value) return
    try {
        const data = await cRequest(`/api/lms/chapters/show?id=${editableId.value}`)
        if (data?.chapter) {
            chapterTaskIds.value = {
                questionIds: data.chapter.questionIds || [],
                homeworkIds: data.chapter.homeworkIds || [],
                commentIds: data.chapter.commentIds || [],
            }
        }
    } catch (e) {
        console.error('[condition] 加载章节任务失败', e)
    }
}

// 选择 task 时同步保存 label（多选时拼接近似显示）
function updateTaskLabel(idx, val, type) {
    const map = { question: questionOptions, homework: homeworkOptions, comment: commentOptions }
    const opts = map[type].value
    const vals = Array.isArray(val) ? val : [val]
    const labels = vals.map(v => opts.find(o => o.value === v)?.label || v)
    editConditions.value[idx].label = labels.join(', ')
}

const parseConfig = () => {
    try {
        const raw = props.node.attrs.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
}
const config = ref(parseConfig())

const editConditions = ref([...(config.value.conditions || [])])
const editContent = ref(config.value.content || '')

const conditionTypes = computed(() => [
    { label: t('ueditor.conditionRole'), value: 'role' },
    { label: t('ueditor.conditionClass'), value: 'class' },
    { label: t('ueditor.conditionQuestion'), value: 'question' },
    { label: t('ueditor.conditionHomework'), value: 'homework' },
    { label: t('ueditor.conditionComment'), value: 'comment' },
])

const roleOptions = [
    { label: 'Admin', value: 'admin' },
    { label: 'Teacher', value: 'teacher' },
    { label: 'Student', value: 'student' },
]

// 班级列表（动态加载）
const classOptions = ref([])

async function loadClasses() {
    try {
        const resp = await $fetch('/api/lms/classes/list')
        if (resp.success && resp.data) {
            classOptions.value = resp.data.map(c => ({
                label: c.name,
                value: String(c.id),
            }))
        }
    } catch (e) {
        console.error('[condition] 加载班级失败', e)
    }
}

// 选择班级时同步保存 label
function updateClassLabel(idx, val) {
    const opt = classOptions.value.find(o => o.value === val)
    if (opt) {
        editConditions.value[idx].label = opt.label
    }
}

function getPlaceholder(type) {
    const map = {
        role: 'admin / teacher / student',
        class: t('ueditor.conditionClassId'),
        question: t('ueditor.conditionQuestionId'),
        homework: t('ueditor.conditionHomeworkId'),
        comment: t('ueditor.conditionCommentId'),
    }
    return map[type] || ''
}

function toggleConfig() {
    editConditions.value = (config.value.conditions || []).map(c => {
        // question/homework/comment 使用多选，确保 value 是数组
        const taskTypes = ['question', 'homework', 'comment']
        if (taskTypes.includes(c.type)) {
            return { ...c, value: Array.isArray(c.value) ? c.value : (c.value ? [c.value] : []) }
        }
        return { ...c }
    })
    editContent.value = config.value.content || ''
    showConfig.value = !showConfig.value
    if (showConfig.value) {
        if (classOptions.value.length === 0) loadClasses()
        loadChapterTasks()
    }
}

function applyConfig() {
    const newConfig = {
        conditions: editConditions.value.filter(c => {
            // question/homework/comment 是多选数组，role/class 是字符串
            if (Array.isArray(c.value)) return c.value.length > 0
            return String(c.value || '').trim()
        }),
        content: editContent.value,
    }
    config.value = newConfig
    props.updateAttributes({ content: JSON.stringify(newConfig) })
    showConfig.value = false
}

function deleteNode() {
    props.deleteNode()
}
</script>

<style scoped>
.condition-node-container {
    border: 1px solid var(--umo-content-node-border, #e5e7eb);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}
.condition-node-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
}
.condition-node-config {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: #f3f4f6;
}
</style>
