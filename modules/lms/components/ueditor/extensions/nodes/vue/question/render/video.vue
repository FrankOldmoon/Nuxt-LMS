<template>
    <div class="w-full">
        <!-- 未配置视频：占位提示 -->
        <div v-if="!videoSrc"
            class="flex flex-col items-center justify-center py-12 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <UIcon name="i-lucide-video" class="size-8 text-gray-300" />
            <p class="text-sm text-gray-400 mt-2">{{ $t('question.videoSelectHint') }}</p>
        </div>

        <!-- 视频播放器 -->
        <div v-else class="video-question w-full relative" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #000;">
            <!-- 视频本体 -->
            <video ref="videoEl" :src="videoSrc" controls preload="metadata"
                class="w-full block" style="max-height: 480px; background: #000;"
                @timeupdate="onTimeUpdate" @seeking="onSeeking" @seeked="onTimeUpdate" @ended="onVideoEnded" @loadedmetadata="onLoadedMetadata" />

            <!-- 进度条：已观看比例 + 题目位置 -->
            <div v-if="subQuestions.length" class="relative h-2 bg-gray-200 dark:bg-gray-700">
                <!-- 已观看部分 -->
                <div class="absolute top-0 left-0 h-full bg-primary/40 transition-all"
                    :style="{ width: (watchedRatio * 100) + '%' }" />
                <!-- 题目位置标记 -->
                <div v-for="(q, idx) in subQuestions" :key="idx"
                    class="absolute top-0 h-full w-1.5 -translate-x-1/2 rounded-full transition-colors"
                    :class="subRecords[q.cid]?.correct ? 'bg-green-500' : (subRecords[q.cid] ? 'bg-red-500' : 'bg-amber-500')"
                    :style="{ left: pct(q.at) + '%' }"
                    :title="`${$t('courseData.questionLabel')} #${q.cid} @ ${formatTime(q.at)}`" />
            </div>

            <!-- 状态提示：已观看 X% + 已答对 X/Y -->
            <div v-if="subQuestions.length"
                class="flex items-center gap-3 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-eye" class="size-3.5" />
                    {{ $t('question.videoWatched') }}: {{ Math.round(watchedRatio * 100) }}%
                </span>
                <span class="text-gray-300">|</span>
                <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-circle-check" class="size-3.5" />
                    {{ $t('question.videoCorrect') }}: {{ correctSubCount }}/{{ subQuestions.length }}
                </span>
            </div>

            <!-- 题目弹出层 -->
            <Transition name="video-fade">
                <div v-if="activeQuestion" class="absolute inset-0 z-20 flex items-center justify-center p-4"
                    style="background: rgba(0, 0, 0, 0.72);">
                    <div
                        class="w-full max-w-2xl max-h-full overflow-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl flex flex-col">
                        <!-- 弹出层头部 -->
                        <div
                            class="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                            <span class="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                <UIcon name="i-lucide-pause" class="size-4" />
                                {{ $t('question.videoPaused') }} ({{ formatTime(activeQuestion.at) }})
                            </span>
                            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="2xs" @click="dismissQuestion" />
                        </div>
                        <!-- 题目内容（复用 question 渲染组件，独立提交） -->
                        <div class="p-4 overflow-auto">
                            <QuestionRender :key="activeQuestion.cid"
                                :node="{ attrs: { type: 'question', content: String(activeQuestion.cid) } }"
                                @submitted="onSubQuestionSubmitted" />
                        </div>
                        <!-- 弹出层底部：继续观看 -->
                        <div
                            class="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                            <p v-if="!activeSubCorrect" class="text-xs text-amber-500 mr-auto">
                                {{ $t('question.videoMustCorrect') }}
                            </p>
                            <UButton color="primary" icon="i-lucide-play" :label="$t('question.videoContinue')"
                                :disabled="!activeSubCorrect" @click="dismissQuestion" />
                        </div>
                    </div>
                </div>
            </Transition>
        </div>

        <!-- 整体状态指示（不在 quiz 模式下显示） -->
        <div v-if="!inQuiz && videoSrc" class="mt-3 flex items-center gap-2 text-sm">
            <UIcon v-if="allPassed" name="i-lucide-check-circle-2" class="size-4 text-green-500" />
            <UIcon v-else-if="watchedRatio >= 0.95" name="i-lucide-alert-circle" class="size-4 text-amber-500" />
            <UIcon v-else name="i-lucide-text-quote" class="size-4 text-gray-400" />
            <span :class="allPassed ? 'text-green-600' : 'text-gray-500'">
                {{ statusText }}
            </span>
            <span class="flex items-center gap-1 text-xs text-gray-400">
                <UIcon name="i-lucide-lock" class="size-3.5" />
                {{ $t('question.videoNoSeek') }}
            </span>
        </div>
    </div>
</template>
<script setup>
import QuestionRender from '../render.vue'
import { useVideo } from './useVideo'
const props = defineProps({ question: { type: Object, required: true }, questionId: { type: Number, default: 0 }, inQuiz: { type: Boolean, default: false } })
const { videoSrc, subQuestions, watchedRatio, subRecords, correctSubCount, allPassed, statusText, videoEl, activeQuestion, activeSubCorrect, onLoadedMetadata, onTimeUpdate, onSeeking, onVideoEnded, dismissQuestion, onSubQuestionSubmitted, submit, reset, hasAnswer, fillCorrectAnswer, pct, formatTime } = useVideo(props)
defineExpose({ submit, reset, get hasAnswer() { return hasAnswer.value }, fillCorrectAnswer })
</script>
<style scoped>
.video-question { width: 100%; } .video-fade-enter-active, .video-fade-leave-active { transition: opacity 0.2s ease; } .video-fade-enter-from, .video-fade-leave-to { opacity: 0; }
</style>
