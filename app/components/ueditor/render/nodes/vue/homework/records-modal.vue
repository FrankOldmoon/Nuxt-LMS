<template>
    <UModal v-model:open="open" scrollable fullscreen>
        <template #content>
            <div class="p-6 space-y-4 min-w-[600px]">
                <h2 class="text-lg font-semibold">{{ $t('record.homeworkRecords') }}</h2>

                <ClassUsersTable :rows="rows" :loading="pending" :extra-columns="extraColumns"
                    :hide-actions="true" :hide-teachers="true" :default-sort="defaultSort">
                    <!-- record 列：查看详情按钮 -->
                    <template #record-cell="{ row }">
                        <div class="flex items-center gap-2">
                            <UButton v-if="row.original.record" size="xs" variant="soft"
                                icon="i-heroicons-document" @click="openHomeworkDetail(row.original.record)">
                                {{ $t('record.viewDetail') }}
                            </UButton>
                            <span v-else class="text-xs text-gray-400">-</span>
                        </div>
                    </template>

                    <!-- score 列：打分输入 -->
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
    courseId: { type: Number, default: 0 },
    cid: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()

const open = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const rows = ref([])
const pending = ref(false)

const extraColumns = computed(() => [
    {
        id: 'record',
        header: t('record.colRecord'),
        sortingFn: (a, b) => (a.original.record ? 1 : 0) - (b.original.record ? 1 : 0),
    },
    { id: 'score', header: t('record.score') },
])

const defaultSort = [{ id: 'record', desc: true }]

const scoreMap = reactive({})

async function fetchRecords() {
    if (!props.courseId || !props.cid) {
        rows.value = []
        return
    }
    pending.value = true
    try {
        const data = await cRequest(`/api/lms/homeworks/records?course_id=${props.courseId}&cid=${props.cid}`)
        rows.value = data || []
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

function isRichDoc(content) {
    return content && typeof content === 'object' && !Array.isArray(content) && !!content.type
}
</script>
