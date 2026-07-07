<template>
    <!-- 条件列表 -->
    <div class="space-y-2">
        <div v-for="(cond, idx) in editConditions" :key="idx" class="flex items-center gap-2">
            <USelect v-model="cond.type" :items="conditionTypes" size="sm" class="w-32" />
            <USelect v-if="cond.type === 'role'" v-model="cond.value" :items="roleOptions" size="sm"
                class="flex-1" />
            <USelect v-else-if="cond.type === 'class'" v-model="cond.value" :items="classOptions" size="sm"
                class="flex-1" @update:model-value="updateClassLabel(idx, $event)" />
            <USelect v-else-if="cond.type === 'question'" v-model="cond.value" :items="questionOptions" multiple
                size="sm" class="flex-1" @update:model-value="updateTaskLabel(idx, $event, 'question')" />
            <USelect v-else-if="cond.type === 'homework'" v-model="cond.value" :items="homeworkOptions" multiple
                size="sm" class="flex-1" @update:model-value="updateTaskLabel(idx, $event, 'homework')" />
            <USelect v-else-if="cond.type === 'comment'" v-model="cond.value" :items="commentOptions" multiple
                size="sm" class="flex-1" @update:model-value="updateTaskLabel(idx, $event, 'comment')" />
            <UButton icon="i-lucide-x" color="error" variant="ghost" size="xs"
                @click="editConditions.splice(idx, 1)" />
        </div>
    </div>
    <UButton icon="i-lucide-plus" color="neutral" variant="outline" size="xs"
        :label="t('ueditor.conditionAdd')" @click="editConditions.push({ type: 'role', value: '' })" />
    <USeparator />
    <UFormField :label="t('ueditor.conditionContent')" size="sm">
        <RichEditor v-model="editContent" />
    </UFormField>
    <UButton size="xs" color="primary" @click="apply">{{ t('common.save') }}</UButton>
</template>

<script setup>
const props = defineProps({
    config: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:config', 'close'])
const { t } = useI18n()
const { editableId } = useLayoutState()

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
        const data = await cRequest(`/api/chapters/show?id=${editableId.value}`)
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

function updateTaskLabel(idx, val, type) {
    const map = { question: questionOptions, homework: homeworkOptions, comment: commentOptions }
    const opts = map[type].value
    const vals = Array.isArray(val) ? val : [val]
    const labels = vals.map(v => opts.find(o => o.value === v)?.label || v)
    editConditions.value[idx].label = labels.join(', ')
}

const editConditions = ref([...(props.config?.conditions || [])])
const editContent = ref(props.config?.content || '')

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

const classOptions = ref([])

async function loadClasses() {
    try {
        const resp = await $fetch('/api/classes/list')
        if (resp.success && resp.data) {
            classOptions.value = resp.data.map(c => ({ label: c.name, value: String(c.id) }))
        }
    } catch (e) {
        console.error('[condition] 加载班级失败', e)
    }
}

function updateClassLabel(idx, val) {
    const opt = classOptions.value.find(o => o.value === val)
    if (opt) editConditions.value[idx].label = opt.label
}

// 打开时加载编辑值
onMounted(() => {
    editConditions.value = (props.config?.conditions || []).map(c => {
        const taskTypes = ['question', 'homework', 'comment']
        if (taskTypes.includes(c.type)) {
            return { ...c, value: Array.isArray(c.value) ? c.value : (c.value ? [c.value] : []) }
        }
        return { ...c }
    })
    editContent.value = props.config?.content || ''
    if (classOptions.value.length === 0) loadClasses()
    loadChapterTasks()
})

function apply() {
    const newConfig = {
        conditions: editConditions.value.filter(c => {
            if (Array.isArray(c.value)) return c.value.length > 0
            return String(c.value || '').trim()
        }),
        content: editContent.value,
    }
    emit('update:config', newConfig)
    emit('close')
}
</script>
