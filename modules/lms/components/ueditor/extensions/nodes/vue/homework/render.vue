<template>
    <div
        class="homework-render w-full space-y-4 p-4 rounded-xl bg-white dark:bg-gray-900 relative shadow-sm transition-shadow duration-200 hover:shadow-md"
        :class="submitted
            ? 'border-2 border-green-400 dark:border-green-500'
            : 'border border-amber-400 dark:border-amber-500'"
        :data-homework-id="homeworkId"
        @mouseenter.once="fetchOnce">
        <!-- 加载中 -->
        <div v-if="pending" class="flex items-center justify-center py-6 text-gray-400">
            <span>{{ t('homework.loading') }}</span>
        </div>

        <!-- 作业未找到 -->
        <div v-else-if="!homework" class="text-center py-6 text-gray-400">
            {{ t('homework.notFound') }} (cid: {{ homeworkId }})
        </div>

        <template v-else>
            <!-- 作业标题 -->
            <div class="flex items-center gap-3 mb-3 flex-wrap">
                <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white bg-purple-500 bg-linear-to-r from-purple-500 to-fuchsia-500 shadow-sm">
                    {{ t('homework.label') }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ homework.name }}</span>
                <span v-if="homework.code" class="text-xs text-gray-400 font-mono">{{ homework.code }}</span>
                <span v-if="homeworkId" class="text-xs text-gray-400">#{{ homeworkId }}</span>
                <div class="flex items-center gap-2 ml-auto">
                    <UButton v-if="isTeacher" icon="i-lucide-edit" color="secondary" variant="soft" size="2xs"
                        @click="editOpen = true" />
                    <UButton v-if="moduleLms && isTeacher" icon="i-heroicons-clipboard" color="info" variant="subtle"
                        size="2xs" @click="recordsOpen = true" />
                    <span
                        class="px-2 py-0.5 rounded-full text-xs font-semibold text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/50">
                        {{ homework.point }}{{ t('question.points') }}
                    </span>
                </div>
            </div>

            <!-- 作业内容 -->
            <div class="prose prose-sm dark:prose-invert max-w-none">
                <ueditorRender :json="homework.content" />
            </div>
        </template>

        <!-- 标签 -->
        <div v-if="homework && homework.tags && homework.tags.length" class="flex flex-wrap gap-1.5 pt-3">
            <span v-for="(tag, idx) in homework.tags" :key="idx"
                class="px-2 py-0.5 rounded-full text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300">
                {{ tag }}
            </span>
        </div>

        <!-- 学生提交区域：未登录时不显示 -->
        <HomeworkSubmitSection v-if="homework && isLoggedIn" />

        <!-- 优秀作业：教师或"已打分"的学生可见 -->
        <FeaturedBlock v-if="homework && (isTeacher || selfScore !== null)" />

        <!-- 答案解析：教师或"已打分"的学生可见 -->
        <div v-if="homework && homework.explanation && (isTeacher || selfScore !== null)" class="mt-4">
            <ExplanationBlock :explanation="homework.explanation" />
        </div>

        <!-- 记录弹窗（仅教师） -->
        <LmsRecordsModalHomework v-if="isTeacher" v-model="recordsOpen"
            :course-id="courseId" :cid="homeworkId" :homework-name="homework.name" :max-score="homework.point || 0" />

        <!-- 编辑弹窗 -->
        <Edit v-model="editOpen" :homework-id="homeworkId" :homework="homework" @saved="onSaved" />
    </div>
</template>

<script setup>
import { useHomeworkRender } from './useHomeworkRender'
import HomeworkSubmitSection from './render/submit-section.vue'
import FeaturedBlock from './render/featured-block.vue'
import ExplanationBlock from '../question/render/explanation-block.vue'
import Edit from './edit.vue'

const props = defineProps({
    node: Object,
    courseId: { type: [Number, String], default: undefined }, // 可选课程上下文：admin 后台复用时传入
})
const emit = defineEmits(['saved'])

const {
    t, moduleLms, RecordsModal,
    homework, pending, homeworkId, isTeacher, isLoggedIn,
    editOpen, recordsOpen, refresh,
    selfScore, submitted,
    fetchRecord, fetchFeatured, onSaved,
} = useHomeworkRender(props, emit)

function fetchOnce() {
    fetchRecord()
    fetchFeatured()
}

// 暴露 refresh 和 data 给 index.vue 调用
defineExpose({ refresh, data: homework })
</script>

<style scoped>
.homework-render {
    width: 100%;
}
</style>
