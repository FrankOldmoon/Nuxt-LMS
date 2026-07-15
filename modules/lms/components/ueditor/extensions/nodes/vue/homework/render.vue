<template>
    <div class="homework-render w-full space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 relative"
        :data-homework-id="homeworkId"
        @mouseenter.once="fetchRecord">
        <!-- Loading -->
        <div v-if="pending" class="flex items-center justify-center py-6 text-gray-400">
            <span>{{ t('homework.loading') }}</span>
        </div>

        <!-- HomeworkNot Found -->
        <div v-else-if="!homework" class="text-center py-6 text-gray-400">
            {{ t('homework.notFound') }} (cid: {{ homeworkId }})
        </div>

        <template v-else>
            <!-- HomeworkTitle -->
            <div class="flex items-center gap-3 mb-3">
                <span
                    class="px-2 py-0.5 bg-purple-50 dark:bg-purple-800 text-purple-600 dark:text-purple-300 rounded text-xs font-medium">
                    {{ t('homework.label') }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ homework.name }}</span>
                <span v-if="homework.code" class="text-xs text-gray-400 font-mono">{{ homework.code }}</span>
                <span v-if="homeworkId" class="text-xs text-gray-400">#{{ homeworkId }}</span>
                <div class="flex items-center gap-2 ml-auto">
                    <UButton v-if="isTeacher" icon="i-lucide-edit" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity"
                        @click="editOpen = true" />
                    <UButton v-if="moduleLms && isTeacher" icon="i-heroicons-clipboard" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity"
                        @click="recordsOpen = true" />
                    <span class="text-xs text-gray-400">{{ homework.point }}{{ t('question.points') }}</span>
                </div>
            </div>

            <!-- Homework Content -->
            <div class="prose prose-sm dark:prose-invert max-w-none">
                <ueditorRender :json="homework.content" />
            </div>
        </template>

        <!-- Tag -->
        <div v-if="homework && homework.tags && homework.tags.length" class="flex flex-wrap gap-1 pt-3">
            <span v-for="(tag, idx) in homework.tags" :key="idx"
                class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-xs">
                {{ tag }}
            </span>
        </div>

        <!-- StudentSubmitarea -->
        <HomeworkSubmitSection v-if="homework" />

        <!-- AnswerAnalysis（onlyTeacherVisible） -->
        <div v-if="homework && isTeacher && homework.explanation" class="mt-4">
            <ExplanationBlock :explanation="homework.explanation" />
        </div>

        <!-- RecordsModal（onlyTeacher） -->
        <LmsRecordsModalHomework v-if="isTeacher" v-model="recordsOpen"
            :course-id="courseId" :cid="homeworkId" :max-score="homework.point || 0" />

        <!-- Edit Modal -->
        <Edit v-model="editOpen" :homework-id="homeworkId" :homework="homework" @saved="onSaved" />
    </div>
</template>

<script setup>
import { useHomeworkRender } from './useHomeworkRender'
import HomeworkSubmitSection from './render/submit-section.vue'
import ExplanationBlock from '../question/render/explanation-block.vue'
import Edit from './edit.vue'

const props = defineProps({
    node: Object,
    courseId: { type: [Number, String], default: undefined }, // canoption CourseUpDowntext：admin BackreplayTime Usedpass in
})
const emit = defineEmits(['saved'])

const {
    t, moduleLms, RecordsModal,
    homework, pending, homeworkId, isTeacher,
    editOpen, recordsOpen, refresh,
    fetchRecord, onSaved,
} = useHomeworkRender(props, emit)

// expose refresh and data to index.vue Call
defineExpose({ refresh, data: homework })
</script>

<style scoped>
.homework-render {
    width: 100%;
}
</style>
