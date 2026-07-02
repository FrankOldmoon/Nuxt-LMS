<template>
    <UModal v-model:open="open" scrollable fullscreen>
        <template #content>
            <div class="p-6 space-y-4 min-w-[600px]">
                <h2 class="text-lg font-semibold">{{ title }}</h2>

                <!-- 复用 usersTable，传入 rows + 额外列 + 插槽 -->
                <ClassUsersTable :rows="rows" :loading="pending" :extra-columns="extraColumns"
                    :hide-actions="true" :hide-teachers="true" :default-sort="defaultSort">
                    <!-- record 列：question 显示作答内容+正误，homework 显示查看详情按钮 -->
                    <template #record-cell="{ row }">
                        <!-- question: 显示学生选择/填写的具体内容 + 正确与否 -->
                        <div v-if="type === 'question'" class="flex items-start gap-2">
                            <template v-if="row.original.record">
                                <UIcon :name="recordIcon(row.original.record)" class="w-3.5 h-3.5 mt-0.5 shrink-0"
                                    :class="recordIconClass(row.original.record)" />
                                <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span v-for="(ans, idx) in formatUserAnswer(row.original.record)" :key="idx"
                                        class="text-xs px-1.5 py-0.5 rounded"
                                        :class="answerItemClass(row.original.record, idx)">
                                        {{ ans }}
                                    </span>
                                    <span class="text-xs text-gray-400">→ {{ formatCorrectRate(row.original.record) }}</span>
                                </div>
                            </template>
                            <span v-else class="text-xs text-gray-400">-</span>
                        </div>
                        <!-- homework: 按钮打开详情 -->
                        <div v-else class="flex items-center gap-2">
                            <UButton v-if="row.original.record" size="xs" variant="soft"
                                icon="i-heroicons-document" @click="openHomeworkDetail(row.original.record)">
                                {{ $t('record.viewDetail') }}
                            </UButton>
                            <span v-else class="text-xs text-gray-400">-</span>
                        </div>
                    </template>

                    <!-- score 列（仅 homework） -->
                    <template #score-cell="{ row }">
                        <UInput v-if="row.original.record" v-model.number="scoreMap[row.original.id]" type="number"
                            size="xs" class="w-20" :max="maxScore" :placeholder="'/' + maxScore"
                            @blur="onScoreBlur(row.original)" @keydown.enter="$event.target.blur()" />
                        <span v-else class="text-xs text-gray-400">-</span>
                    </template>
                </ClassUsersTable>
            </div>
        </template>
    </UModal>

    <!-- 作业详情弹窗 -->
    <UModal v-model:open="detailOpen" scrollable>
        <template #content>
            <div v-if="detailData" class="p-6 space-y-4 min-w-[500px]">
                <h2 class="text-lg font-semibold">{{ $t('record.homeworkDetail') }}</h2>

                <!-- 作答内容 -->
                <div v-if="detailData.content">
                    <label class="text-xs text-gray-500 mb-1 block">{{ $t('homework.contentLabel') }}</label>
                    <div class="prose prose-sm dark:prose-invert max-w-none border rounded-md p-3">
                        <ueditorRender v-if="isRichDoc(detailData.content)" :json="detailData.content" />
                        <p v-else class="text-sm whitespace-pre-wrap">{{ detailData.content }}</p>
                    </div>
                </div>

                <!-- 提交文件 -->
                <div v-if="detailData.files && detailData.files.length">
                    <label class="text-xs text-gray-500 mb-1 block">{{ $t('homework.uploadLabel') }}</label>
                    <div class="space-y-1">
                        <div v-for="(url, idx) in detailData.files" :key="idx" class="flex items-center gap-2">
                            <UIcon name="i-heroicons-document" class="w-4 h-4 text-gray-400" />
                            <a :href="url" target="_blank" class="text-xs text-blue-500 hover:underline truncate">{{ url }}</a>
                        </div>
                    </div>
                </div>

                <!-- 得分 -->
                <div v-if="detailData.score !== null && detailData.score !== undefined">
                    <label class="text-xs text-gray-500">{{ $t('record.score') }}: </label>
                    <span class="text-sm font-medium">{{ detailData.score }}</span>
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup>
const props = defineProps({
    modelValue: { type: Boolean, default: false },
    type: { type: String, default: 'question' }, // 'question' | 'homework'
    courseId: { type: Number, default: 0 },
    cid: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    question: { type: Object, default: null }, // question 数据（type, options, answer）用于格式化作答内容
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()

const open = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const title = computed(() => props.type === 'question' ? t('record.questionRecords') : t('record.homeworkRecords'))

const rows = ref([])
const pending = ref(false)

// 额外列：record 列 + homework 的 score 列
const extraColumns = computed(() => {
    const cols = [{
        id: 'record',
        header: t('record.colRecord'),
        sortingFn: (a, b) => (a.original.record ? 1 : 0) - (b.original.record ? 1 : 0),
    }]
    if (props.type === 'homework') {
        cols.push({ id: 'score', header: t('record.score') })
    }
    return cols
})

// 默认按有无记录排序（有记录在前）
const defaultSort = [{ id: 'record', desc: true }]

// 打分状态
const scoreMap = reactive({})

async function fetchRecords() {
    if (!props.courseId || !props.cid) {
        rows.value = []
        return
    }
    pending.value = true
    try {
        const url = props.type === 'question'
            ? `/api/lms/questions/records?course_id=${props.courseId}&cid=${props.cid}`
            : `/api/lms/homeworks/records?course_id=${props.courseId}&cid=${props.cid}`
        const data = await cRequest(url)
        rows.value = data || []
        // 初始化打分 map
        rows.value.forEach(r => {
            scoreMap[r.id] = r.record?.score != null ? Number(r.record.score) : null
        })
    } catch {
        rows.value = []
    } finally {
        pending.value = false
    }
}

// 保存打分
async function onScoreBlur(row) {
    const val = scoreMap[row.id]
    if (val === null || val === undefined || val === '') return
    const original = row.record?.score != null ? Number(row.record.score) : null
    if (original === Number(val)) return

    try {
        await cRequest('/api/lms/homeworks/score', {
            method: 'POST',
            body: {
                course_id: props.courseId,
                homework_cid: props.cid,
                user_id: row.id,
                score: val,
            },
        })
        if (row.record) row.record.score = String(val)
    } catch (err) {
        scoreMap[row.id] = original
    }
}

watch(open, (val) => {
    if (val) fetchRecords()
})

// 作业详情弹窗
const detailOpen = ref(false)
const detailData = ref(null)

function openHomeworkDetail(record) {
    detailData.value = record
    detailOpen.value = true
}

// question record：格式化作答内容
// record.records 是用户答案数组：single/judge [idx]、multiple [idx,...]、fill/select [text,...]
function formatUserAnswer(record) {
    const userAns = Array.isArray(record?.records) ? record.records : []
    const q = props.question
    if (!q) return userAns.map(String)
    const type = q.type

    if (type === 'single' || type === 'judge' || type === 'multiple') {
        // 选项题：显示 A/B/C/D
        return userAns.map(idx => String.fromCharCode(65 + Number(idx)))
    }
    // fill/select：直接显示文本
    return userAns.map(String)
}

// 正确率文字
function formatCorrectRate(record) {
    const rate = Number(record?.correctRate) || 0
    if (rate >= 1) return `${t('record.correct')} ( ${record.score}分 )`
    if (rate > 0) return `${t('record.partial')} ${Math.round(rate * 100)}% ( ${record.score}分 )`
    return `${t('record.wrong')} ( ${record.score}分 )`
}

// 单个答案项的样式：该答案是否正确
function answerItemClass(record, idx) {
    const q = props.question
    if (!q) return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
    const userAns = Array.isArray(record?.records) ? record.records : []
    const answer = Array.isArray(q.answer) ? q.answer : []
    const type = q.type
    const val = userAns[idx]

    if (type === 'single' || type === 'judge' || type === 'multiple') {
        // 选项题：用户选的 idx 是否在正确答案里
        return answer.includes(Number(val))
            ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
    }
    // fill/select：逐项比对
    return String(val).trim() === String(answer[idx] || '').trim()
        ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
}

function recordIconClass(record) {
    const rate = Number(record?.correctRate) || 0
    if (rate >= 1) return 'text-green-500'
    if (rate > 0) return 'text-yellow-500'
    return 'text-red-500'
}

function recordIcon(record) {
    const rate = Number(record?.correctRate) || 0
    if (rate >= 1) return 'i-heroicons-check-circle'
    if (rate > 0) return 'i-heroicons-exclamation-circle'
    return 'i-heroicons-x-circle'
}

function isRichDoc(content) {
    return content && typeof content === 'object' && !Array.isArray(content) && !!content.type
}
</script>
