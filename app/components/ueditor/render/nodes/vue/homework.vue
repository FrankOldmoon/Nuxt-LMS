<template>
    <div class="homework-render w-full space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 relative"
        :data-homework-id="homeworkId"
        @mouseenter.once="fetchRecord">
        <!-- 加载中 -->
        <div v-if="pending" class="flex items-center justify-center py-6 text-gray-400">
            <span>{{ $t('homework.loading') }}</span>
        </div>

        <!-- 作业未找到 -->
        <div v-else-if="!homework" class="text-center py-6 text-gray-400">
            {{ $t('homework.notFound') }} (cid: {{ homeworkId }})
        </div>

        <template v-else>
            <!-- 右上角编辑按钮（仅教师） -->
            <div v-if="isTeacher" class="absolute top-2 right-2 flex items-center gap-1 z-10">
                <UButton icon="i-heroicons-pencil-square" variant="ghost" size="2xs"
                    class="opacity-50 hover:opacity-100 transition-opacity"
                    @click="editOpen = true" />
            </div>

            <!-- 作业标题 -->
            <div class="flex items-center gap-3 mb-3 pr-6">
                <span
                    class="px-2 py-0.5 bg-purple-50 dark:bg-purple-800 text-purple-600 dark:text-purple-300 rounded text-xs font-medium">
                    {{ $t('homework.label') }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ homework.name }}</span>
                <span v-if="homework.code" class="text-xs text-gray-400 font-mono">{{ homework.code }}</span>
                <span v-if="homeworkId" class="text-xs text-gray-400">#{{ homeworkId }}</span>
                <div class="flex items-center gap-2 ml-auto">
                    <UButton v-if="isTeacher" icon="i-heroicons-clipboard" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity"
                        @click="recordsOpen = true" />
                    <span class="text-xs text-gray-400">{{ homework.point }}{{ $t('question.points') }}</span>
                </div>
            </div>

            <!-- 作业内容 -->
            <div class="prose prose-sm dark:prose-invert max-w-none">
                <ueditorRender :json="homework.content" />
            </div>
        </template>

        <!-- 标签 -->
        <div v-if="homework && homework.tags && homework.tags.length" class="flex flex-wrap gap-1 pt-3">
            <span v-for="(tag, idx) in homework.tags" :key="idx"
                class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-xs">
                {{ tag }}
            </span>
        </div>

        <!-- 学生提交区域 -->
        <div v-if="homework" class="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <!-- 答题内容 -->
            <div>
                <label class="text-xs text-gray-500 mb-1 block">{{ $t('homework.contentLabel') }}</label>
                <richEditor v-model="submittedContent" />
            </div>

            <!-- 文件上传 -->
            <div>
                <label class="text-xs text-gray-500 mb-1 block">{{ $t('homework.uploadLabel') }}</label>
                <FormInputFile v-model="submittedFiles" multiple :placeholder="$t('homework.uploadHint')" />
            </div>

            <!-- 提交/重置按钮 -->
            <div class="flex items-center gap-2">
                <span v-if="submitMsg" class="text-xs" :class="submitOk ? 'text-green-500' : 'text-red-500'">{{
                    submitMsg
                    }}</span>
                <div class="flex gap-2 ml-auto">
                    <UButton variant="soft" size="sm" :disabled="submitting" @click="onReset">
                        {{ $t('common.reset') }}
                    </UButton>
                    <UButton color="primary" size="sm" :loading="submitting"
                        :disabled="!submittedFiles || (Array.isArray(submittedFiles) && submittedFiles.length === 0)"
                        @click="onSubmit">
                        {{ submitted ? $t('homework.resubmit') : $t('homework.submit') }}
                    </UButton>
                </div>
            </div>

            <!-- 已提交提示 -->
            <div v-if="submitted"
                class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500" />
                    <span class="text-sm text-green-700 dark:text-green-300">{{ $t('homework.submitSuccess') }}</span>
                </div>
                <!-- 已提交内容 -->
                <div v-if="submittedContent" class="mt-2">
                    <ueditorRender v-if="isRichDoc(submittedContent)" :json="submittedContent" />
                    <p v-else class="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ submittedContent }}</p>
                </div>
                <!-- 已提交文件列表 -->
                <div v-if="submittedFileList && submittedFileList.length" class="mt-2 space-y-1">
                    <div v-for="(url, idx) in submittedFileList" :key="idx" class="flex items-center gap-2">
                        <UIcon name="i-heroicons-document" class="w-4 h-4 text-gray-400" />
                        <a :href="url" target="_blank" class="text-xs text-blue-500 hover:underline truncate">{{ url
                            }}</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- 答案解析（仅教师可见） -->
        <div v-if="homework && isTeacher && homework.explanation" class="mt-4">
            <ExplanationBlock :explanation="homework.explanation" />
        </div>

        <!-- 编辑弹窗 -->
        <HomeworkEdit v-model="editOpen" :homework-id="homeworkId" :homework="homework" @saved="onSaved" />

        <!-- 记录弹窗（仅教师） -->
        <RecordsModal v-if="isTeacher" v-model="recordsOpen" type="homework" :course-id="editableCourseId"
            :cid="homeworkId" :max-score="homework.point || 0" />
    </div>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import ExplanationBlock from './question/explanation-block.vue'
import HomeworkEdit from '../../../extensions/nodes/vue/homework/edit.vue'
import RecordsModal from './records-modal.vue'

const props = defineProps({
    node: Object,
})
const { t } = useI18n()
const emit = defineEmits(['init'])

const { editableCourseId } = useLayoutState()
const { hasRole } = useAuth()

const homeworkId = computed(() => Number(props.node?.attrs?.content) || 0)

const isTeacher = computed(() => hasRole('teacher') || hasRole('admin'))

// 默认作业（homeworkId 为空时填充，便于新建）
const defaultHomework = reactive({
    name: '',
    code: '',
    content: '',
    point: 10,
    tags: [],
    explanation: '',
})

// SSR-friendly data fetching
const apiUrl = computed(() => {
    if (!homeworkId.value || !editableCourseId.value) return ''
    return `/api/lms/homeworks/show?course_id=${editableCourseId.value}&cid=${homeworkId.value}`
})

const { data: fetchedHomework, pending: fetchedPending, refresh } = cRequest.use(apiUrl, {
    transform: (raw) => {
        if (!raw) return null
        return reactive({
            name: raw.name || '',
            code: raw.code || '',
            content: raw.content || '',
            point: Number(raw.point) || 0,
            tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
            explanation: raw.explanation || '',
        })
    },
})

// homeworkId 为空时使用默认作业；否则使用接口数据
const homework = ref(defaultHomework)
watch([fetchedHomework, homeworkId], () => {
    if (!homeworkId.value) {
        homework.value = defaultHomework
    } else if (fetchedHomework.value) {
        homework.value = fetchedHomework.value
    }
}, { immediate: true, flush: 'sync' })

// homeworkId 为空时不显示加载态
const pending = computed(() => !!homeworkId.value && fetchedPending.value)

const editOpen = ref(false)
const recordsOpen = ref(false)

// 学生提交状态
const submittedContent = ref('')
const submittedFiles = ref([])
const submitted = ref(false)
const submittedFileList = ref([])
const submitting = ref(false)
const submitMsg = ref('')
const submitOk = ref(true)

// 判断是否为富文本 JSON
function isRichDoc(content) {
    return content && typeof content === 'object' && !Array.isArray(content) && !!content.type
}

async function onSubmit() {
    if (!homeworkId.value || !editableCourseId.value) return
    submitting.value = true
    submitMsg.value = ''
    try {
        const files = Array.isArray(submittedFiles.value) ? submittedFiles.value : [submittedFiles.value]
        await cRequest('/api/lms/homeworks/submit', {
            method: 'POST',
            body: {
                course_id: editableCourseId.value,
                homework_cid: homeworkId.value,
                files,
                content: submittedContent.value,
            },
        })
        submitted.value = true
        submittedFileList.value = files
        submitOk.value = true
        submitMsg.value = t('homework.submitSuccess')
    } catch (err) {
        submitOk.value = false
        submitMsg.value = err.message || t('homework.submitFailed')
    } finally {
        submitting.value = false
    }
}

function onReset() {
    submittedContent.value = ''
    submittedFiles.value = []
    submitted.value = false
    submittedFileList.value = []
    submitMsg.value = ''
}

function onSaved(hw) {
    // 新建作业：拿到新增 cid 后通知父节点更新 content 属性
    if (hw.cid && Number(hw.cid) !== homeworkId.value) {
        emit('init', hw.cid)
    } else {
        // 已有作业：刷新接口数据
        refresh()
    }
    // 本地立即更新内容，避免刷新期间空白
    if (homework.value) {
        Object.assign(homework.value, hw)
    }
}

// 鼠标移入时（仅一次）获取当前用户的提交记录，填充到提交状态
async function fetchRecord() {
    if (!homeworkId.value || !editableCourseId.value) return
    try {
        const data = await cRequest(`/api/lms/homeworks/record?course_id=${editableCourseId.value}&cid=${homeworkId.value}`)
        if (data) {
            // 填充已提交内容
            if (data.content) {
                submittedContent.value = data.content
            }
            // 填充已提交文件
            if (Array.isArray(data.files) && data.files.length > 0) {
                submittedFiles.value = [...data.files]
                submittedFileList.value = [...data.files]
            }
            // 有内容或文件则标记为已提交
            if (data.content || (Array.isArray(data.files) && data.files.length > 0)) {
                submitted.value = true
            }
        }
    } catch (err) {
        // 静默忽略（未登录或无记录）
    }
}
</script>

<style scoped>
.homework-render {
    width: 100%;
}
</style>
