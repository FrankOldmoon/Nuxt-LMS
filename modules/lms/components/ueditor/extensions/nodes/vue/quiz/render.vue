<template>
    <div class="quiz-render w-full p-4 border border-amber-400 dark:border-amber-500 rounded-lg bg-white dark:bg-gray-900 relative"
        @mouseenter.once="onHover">
        <!-- 加载中 -->
        <div v-if="pending" class="flex items-center justify-center py-6 text-gray-400">
            <span>{{ t('quiz.loading') }}</span>
        </div>

        <!-- 测验未找到 -->
        <div v-else-if="!quiz" class="text-center py-6 text-gray-400">
            {{ t('quiz.notFound') }} (cid: {{ quizId }})
        </div>

        <template v-else>
            <QuizRenderHeader />
            <QuizRenderQuestions v-if="started || userRecord" />
            <QuizRenderResult v-if="submitted && resultScore !== null" />
        </template>

        <!-- 记录弹窗（仅教师） -->
        <LmsRecordsModalQuiz v-if="isTeacher" v-model="recordsOpen"
            :course-id="effectiveCourseId" :cid="quizId"
            :quiz-point="quiz.point || 100" :questions="quizQuestions" />

        <!-- 编辑弹窗 -->
        <Edit v-model="editOpen" :quiz-id="quizId" :quiz="quiz" :course-id="effectiveCourseId" @saved="onSaved" />
    </div>
</template>

<script setup>
import { useQuizRender } from './useQuizRender'
import QuizRenderHeader from './render/header.vue'
import QuizRenderQuestions from './render/questionsArea.vue'
import QuizRenderResult from './render/result.vue'
import Edit from './edit.vue'

const props = defineProps({
    node: Object,
    courseId: { type: Number, default: undefined },
})
const emit = defineEmits(['saved'])

const {
    t, effectiveCourseId, moduleLms, QuizRecordsModal, quiz, pending, quizId,
    isTeacher, editOpen, recordsOpen, quizQuestions, userRecord,
    started, submitted, resultScore, onHover, onSaved, refresh,
} = useQuizRender(props, emit)

defineExpose({ refresh, data: quiz })
</script>

<style scoped>
.quiz-render {
    width: 100%;
}
</style>
