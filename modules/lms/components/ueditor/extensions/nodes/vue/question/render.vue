<template>
    <div class="question-render w-full space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-900 relative transition-colors duration-300"
        :class="isUnset ? unsetBorderClass : containerBorderClass"
        :data-question-id="questionId"
        @mouseenter.once="onHover">
        <!-- 尚未设置内容：节点没有 cid，也不是内联题 → 不渲染空题目，只提示去设置 -->
        <div v-if="isUnset" class="flex items-start gap-2 text-sm text-red-500">
            <UIcon name="i-lucide-circle-alert" class="size-4 shrink-0 mt-0.5" />
            <div>
                <p class="font-medium">{{ t('question.unsaved') }}</p>
                <p class="text-xs mt-1 text-red-400 dark:text-red-400/80">
                    {{ isTeacher ? t('question.unsavedHint') : t('common.contentPending') }}
                </p>
            </div>
        </div>
        <template v-else>
            <!-- 答对烟花效果 -->
            <Fireworks v-if="showFireworks" @done="showFireworks = false" />
            <!-- 加载中 -->
            <div v-if="pending" class="flex items-center justify-center py-6 text-gray-400">
                <span>{{ t('question.loading') }}</span>
            </div>
            <!-- 题目未找到 -->
            <div v-else-if="!question" class="text-center py-6 text-gray-400">
                {{ t('question.notFound') }} (cid: {{ questionId }})
            </div>
            <template v-else>
                <!-- 右上角编辑按钮（仅教师可见） -->
                <div v-if="isTeacher" class="absolute top-2 right-2 flex items-center gap-1 z-10">
                    <UButton icon="i-heroicons-pencil-square" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity"
                        @click="editOpen = true" />
                </div>
                <!-- 题目标题 -->
                <div class="flex items-center gap-3 mb-3 pr-6">
                    <span class="px-2 py-0.5 bg-blue-50 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded text-xs font-medium">
                        {{ typeLabel[question.type] }}
                    </span>
                    <span class="font-semibold text-gray-800 dark:text-gray-200">{{ question.name }}</span>
                    <span v-if="questionId" class="text-xs text-gray-400">#{{ questionId }}</span>
                    <div class="flex items-center gap-2 ml-auto">
                        <UButton v-if="moduleLms && isTeacher" icon="i-heroicons-clipboard" variant="ghost" size="2xs"
                            class="opacity-50 hover:opacity-100 transition-opacity"
                            @click="recordsOpen = true" />
                        <span class="text-xs text-gray-400 font-mono">{{ scoreDisplay }}</span>
                    </div>
                </div>
                <!-- 题目内容（html/composite/oj 题型由组件内部处理） -->
                <div v-if="question?.type !== 'html' && question?.type !== 'composite' && question?.type !== 'oj'" class="prose prose-sm dark:prose-invert max-w-none">
                    <ueditorRender :json="question.content" />
                </div>
                <!-- 题型特定渲染 -->
                <component v-if="renderComponent" ref="renderRef" :is="renderComponent" :question="question"
                    :question-id="questionId" />
            </template>

            <!-- 提交/重置 + 结果 + 教师答案 -->
            <QuestionRenderFooter />
        </template>

        <!-- 编辑弹窗 -->
        <QuestionEdit v-model="editOpen" :question-id="questionId" :question="question" :course-id="effectiveCourseId" @saved="onSaved" />
        <!-- 记录弹窗（仅教师） -->
        <LmsRecordsModalQuestion v-if="isTeacher && !isUnset" v-model="recordsOpen"
            :course-id="effectiveCourseId" :cid="questionId" :question="question" />
    </div>
</template>

<script setup>
import { useQuestionRender } from './useQuestionRender'
import Fireworks from './render/fireworks.vue'
import QuestionRenderFooter from './render/footer.vue'
import QuestionEdit from './edit.vue'

const props = defineProps({
    node: Object,
    question: Object,
    inQuiz: { type: Boolean, default: false },
    courseId: { type: Number, default: undefined },
    initialRecord: { type: Object, default: undefined },
})
const emit = defineEmits(['init', 'submitted'])

const {
    t, effectiveCourseId, moduleLms, RecordsModal,
    question, pending, questionId, isUnset, isTeacher, typeLabel,
    showFireworks, containerBorderClass, hasAnswer, scoreDisplay,
    renderComponent, renderRef, editOpen, recordsOpen, onHover, onSaved,
    getQuestionData, fillFromRecord, showResult, resetForQuiz, revealAnswer,
} = useQuestionRender(props, emit)

// 未设置内容时的外框（虚线红色，明显区别于正常题目）
const unsetBorderClass = 'border-2 border-dashed border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'

defineExpose({ getQuestionData, fillFromRecord, showResult, resetForQuiz, revealAnswer, get hasAnswer() { return hasAnswer.value } })
</script>

<style scoped>
.question-render {
    width: 100%;
}
</style>
