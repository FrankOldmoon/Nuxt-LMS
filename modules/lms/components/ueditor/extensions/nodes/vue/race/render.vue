<template>
    <!-- lms notEnableornotJoin Class：show placeholderholder -->
    <div v-if="!canShow" class="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-center text-gray-400 text-sm">
        {{ placeholderText }}
    </div>
    <div v-else class="race-render w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 relative">
        <!-- Loading -->
        <div v-if="pending" class="flex items-center justify-center py-6 text-gray-400">
            <span>{{ t('race.loading') }}</span>
        </div>

        <!-- CompetitionNot Found -->
        <div v-else-if="!race" class="text-center py-6 text-gray-400">
            {{ t('race.notFound') }} (cid: {{ raceId }})
        </div>

        <template v-else>
            <!-- CompetitionTitle -->
            <div class="flex items-center gap-3 mb-3 pr-6">
                <span class="px-2 py-0.5 bg-red-50 dark:bg-red-800 text-red-600 dark:text-red-300 rounded text-xs font-medium">
                    {{ t('race.label') }}
                </span>
                <span class="font-semibold text-gray-800 dark:text-gray-200">{{ race.name }}</span>
                <span v-if="raceId" class="text-xs text-gray-400">#{{ raceId }}</span>
                <div class="flex items-center gap-2 ml-auto">
                    <UButton v-if="isTeacher" icon="i-lucide-edit" variant="ghost" size="2xs"
                        class="opacity-50 hover:opacity-100 transition-opacity"
                        @click="editOpen = true" />
                    <UIcon name="i-lucide-key" class="size-3.5 text-gray-400" />
                    <span class="text-xs font-mono text-gray-400">{{ pin }}</span>
                </div>
            </div>

            <!-- ====== Top：StudentScoretable ====== -->
            <RaceScoresTable />

            <!-- ====== TeachercontrolButton ====== -->
            <RaceTeacherControls v-if="isTeacher && raceActive" />

            <!-- ====== Countdown ====== -->
            <RaceTimer v-if="raceActive && currentQuestionCid" />

            <!-- ====== Questionarea（showPodium whenHide） ====== -->
            <div v-if="currentQuestionCid && !showPodium" class="mb-4">
                <component
                    ref="questionRef"
                    :is="QuestionRender"
                    :node="{ attrs: { type: 'question', content: String(currentQuestionCid) } }" />
            </div>

            <!-- ====== Podium：Fronttop three ====== -->
            <RacePodium v-if="showPodium" />

            <!-- Not Started -->
            <RaceNotStarted v-if="!raceActive" />

            <!-- alreadySubmit Tip（Student） -->
            <div v-if="!isTeacher && raceActive && studentAnswered && currentQuestionCid" class="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <UIcon name="i-lucide-check" class="size-4 text-blue-500" />
                <span class="text-sm text-blue-600 dark:text-blue-300">{{ t('race.submitted') }} - {{ t('race.waitingNext') }}</span>
            </div>
        </template>

        <!-- Edit Modal -->
        <Edit v-model="editOpen" :race-id="raceId" :race="race" @saved="onSaved" />
    </div>
</template>

<script setup>
import { useRaceRender } from './useRaceRender'
import QuestionRender from '../question/render.vue'
import Edit from './edit.vue'
import RaceScoresTable from './render/scores-table.vue'
import RaceTeacherControls from './render/teacher-controls.vue'
import RaceTimer from './render/timer.vue'
import RacePodium from './render/podium.vue'
import RaceNotStarted from './render/not-started.vue'

const props = defineProps({
    node: Object,
    courseId: { type: [Number, String], default: undefined },
})
const emit = defineEmits(['saved'])

const {
    t, canShow, placeholderText, pending, race, raceId, isTeacher, pin,
    editOpen, studentAnswered, currentQuestionCid, showPodium, questionRef,
    raceActive, onSaved, refresh,
} = useRaceRender(props, emit)

defineExpose({ refresh, data: race })
</script>

<style scoped>
.race-render {
    width: 100%;
}
</style>
