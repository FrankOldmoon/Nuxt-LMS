<template>
    <!-- lms 未启用或未加入班级：显示占位 -->
    <div v-if="!canShow" class="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-center text-gray-400 text-sm">
        {{ placeholderText }}
    </div>
    <div v-else class="race-render w-full p-4 border border-amber-400 dark:border-amber-500 rounded-lg bg-white dark:bg-gray-900 relative">
        <!-- 答对者弹幕：竞赛内浮层，教师与学生端均可见 -->
        <div class="pointer-events-none absolute inset-0 overflow-hidden z-10">
            <div v-for="b in raceBarrages" :key="b.id" class="race-barrage" :style="{ top: b.top + '%' }">
                {{ b.from }}：{{ t('race.answerCorrectBarrage', { gain: b.gain }) }}
            </div>
        </div>

        <!-- 加载中 -->
        <div v-if="pending" class="flex items-center justify-center py-6 text-gray-400">
            <span>{{ t('race.loading') }}</span>
        </div>

        <!-- 竞赛未找到 -->
        <div v-else-if="!race" class="text-center py-6 text-gray-400">
            {{ t('race.notFound') }} (cid: {{ raceId }})
        </div>

        <template v-else>
            <!-- 竞赛标题 -->
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

            <!-- ====== 顶部：学生得分表 ====== -->
            <RaceScoresTable />

            <!-- ====== 教师控制按钮 ====== -->
            <RaceTeacherControls v-if="isTeacher && raceActive" />

            <!-- ====== 倒计时 ====== -->
            <RaceTimer v-if="raceActive && currentQuestionCid" />

            <!-- ====== 题目区域（showPodium 时隐藏） ====== -->
            <div v-if="currentQuestionCid && !showPodium" class="mb-4">
                <component
                    ref="questionRef"
                    :is="QuestionRender"
                    :node="{ attrs: { type: 'question', content: String(currentQuestionCid) } }" />
            </div>

            <!-- ====== Podium：前三名 ====== -->
            <RacePodium v-if="showPodium" />

            <!-- 未开始 -->
            <RaceNotStarted v-if="!raceActive" />

            <!-- 已提交提示（学生） -->
            <div v-if="!isTeacher && raceActive && studentAnswered && currentQuestionCid" class="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <UIcon name="i-lucide-check" class="size-4 text-blue-500" />
                <span class="text-sm text-blue-600 dark:text-blue-300">{{ t('race.submitted') }} - {{ t('race.waitingNext') }}</span>
            </div>
        </template>

        <!-- 编辑弹窗 -->
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
    raceActive, onSaved, refresh, raceBarrages,
} = useRaceRender(props, emit)

defineExpose({ refresh, data: race })
</script>

<style scoped>
.race-render {
    width: 100%;
}

.race-barrage {
    position: absolute;
    white-space: nowrap;
    font-weight: 700;
    font-size: 1.125rem;
    color: #22c55e;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
    animation: race-barrage-slide 4s linear forwards;
}

@keyframes race-barrage-slide {
    from {
        left: 100%;
        transform: translateX(0);
    }
    to {
        left: 0;
        transform: translateX(-100%);
    }
}
</style>
