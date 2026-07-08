<template>
    <div class="space-y-4">
        <USeparator :label="$t('lmsConfig.title')" class="my-4" />

        <!-- AI 助手配置 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.ai') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <UFormField :label="$t('lmsConfig.aiMode')" size="xs">
                    <USelect v-model="config.ai.mode" :items="aiModeOpts" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.aiTtsGender')" size="xs">
                    <USelect v-model="config.ai.ttsGender" :items="ttsGenderOpts" size="xs" class="w-full" />
                </UFormField>
                <!-- Ollama 配置（ollama 模式） -->
                <UFormField v-if="config.ai.mode === 'ollama'" :label="$t('lmsConfig.aiOllamaUrl')" size="xs" class="col-span-2">
                    <UInput v-model="config.ai.ollamaUrl" placeholder="http://localhost:11434" size="xs" class="w-full" />
                </UFormField>
                <UFormField v-if="config.ai.mode === 'ollama'" :label="$t('lmsConfig.aiOllamaModel')" size="xs" class="col-span-2">
                    <UInput v-model="config.ai.ollamaModel" placeholder="llama3.2" size="xs" class="w-full" />
                </UFormField>
                <!-- API 模式特有 -->
                <UFormField v-if="config.ai.mode === 'api'" :label="$t('lmsConfig.aiModel')" size="xs" class="col-span-2">
                    <UInput v-model="config.ai.model" :placeholder="$t('lmsConfig.aiModelPlaceholder')" size="xs" class="w-full" />
                </UFormField>
                <UFormField v-if="config.ai.mode === 'api'" :label="$t('lmsConfig.aiThinking')" size="xs">
                    <USwitch v-model="config.ai.thinking" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.aiApiUrl')" size="xs" class="col-span-2">
                    <UInput v-model="config.ai.apiUrl" placeholder="/api/aichat/chat" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.aiTitle')" size="xs">
                    <UInput v-model="config.ai.title" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.aiPreset')" size="xs" class="col-span-2">
                    <UTextarea v-model="config.ai.preset" :rows="2" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.aiOpening')" size="xs" class="col-span-2">
                    <UTextarea v-model="config.ai.opening" :rows="2" size="xs" class="w-full" />
                </UFormField>
            </div>
        </div>

        <!-- 题目 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.question') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <UFormField :label="$t('lmsConfig.submitExp')" size="xs">
                    <UInput v-model.number="config.question.submitExp" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.correctBonusExp')" size="xs">
                    <UInput v-model.number="config.question.correctBonusExp" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.firstCorrectBonusExp')" size="xs">
                    <UInput v-model.number="config.question.firstCorrectBonusExp" type="number" size="xs"
                        class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.maxSubmitCount')" size="xs">
                    <UInput v-model.number="config.question.maxSubmitCount" type="number" size="xs" class="w-full" />
                </UFormField>
            </div>
        </div>

        <!-- 作业 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.homework') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <UFormField :label="$t('lmsConfig.submitExp')" size="xs">
                    <UInput v-model.number="config.homework.submitExp" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.resubmitExp')" size="xs">
                    <UInput v-model.number="config.homework.resubmitExp" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.latePenalty')" size="xs">
                    <UInput v-model.number="config.homework.latePenalty" type="number" step="0.1" size="xs"
                        class="w-full" />
                </UFormField>
            </div>
        </div>

        <!-- 评论 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.comment') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <UFormField :label="$t('lmsConfig.publishExp')" size="xs">
                    <UInput v-model.number="config.comment.publishExp" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.replyExp')" size="xs">
                    <UInput v-model.number="config.comment.replyExp" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.likeReceivedExp')" size="xs">
                    <UInput v-model.number="config.comment.likeReceivedExp" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.maxDailyExp')" size="xs">
                    <UInput v-model.number="config.comment.maxDailyExp" type="number" size="xs" class="w-full" />
                </UFormField>
            </div>
        </div>

        <!-- 章节学习 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.chapter') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <UFormField :label="$t('lmsConfig.readExp')" size="xs">
                    <UInput v-model.number="config.chapter.readExp" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.readTimeThreshold')" size="xs">
                    <UInput v-model.number="config.chapter.readTimeThreshold" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.readThresholdExp')" size="xs">
                    <UInput v-model.number="config.chapter.readThresholdExp" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.passScore')" size="xs">
                    <UInput v-model.number="config.chapter.passScore" type="number" size="xs" class="w-full" />
                </UFormField>
            </div>
        </div>

        <!-- 竞赛 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.race') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <UFormField :label="$t('lmsConfig.participateExp')" size="xs">
                    <UInput v-model.number="config.race.participateExp" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.rank1Exp')" size="xs">
                    <UInput v-model.number="config.race.rank1Exp" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.rank2Exp')" size="xs">
                    <UInput v-model.number="config.race.rank2Exp" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.rank3Exp')" size="xs">
                    <UInput v-model.number="config.race.rank3Exp" type="number" size="xs" class="w-full" />
                </UFormField>
            </div>
        </div>

        <!-- 测验 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.quiz') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <UFormField :label="$t('lmsConfig.submitExp')" size="xs">
                    <UInput v-model.number="config.quiz.submitExp" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.passScore')" size="xs">
                    <UInput v-model.number="config.quiz.passScore" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.passBonusExp')" size="xs">
                    <UInput v-model.number="config.quiz.passBonusExp" type="number" size="xs" class="w-full" />
                </UFormField>
            </div>
        </div>

        <!-- 通用 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.general') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <UFormField :label="$t('lmsConfig.dailyExpCap')" size="xs">
                    <UInput v-model.number="config.general.dailyExpCap" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.levelStep')" size="xs">
                    <UInput v-model.number="config.general.levelStep" type="number" size="xs" class="w-full" />
                </UFormField>
            </div>
        </div>

        <!-- 课程功能开关（全局配置时显示，课程配置时由 configForm 单独管理） -->
        <div v-if="!hideCourse" class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.course') }}</p>
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('courseEditor.showDanmaku') }}</span>
                    <USwitch v-model="config.course.showDanmaku" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('courseEditor.showAnnouncement') }}</span>
                    <USwitch v-model="config.course.showAnnouncement" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('courseEditor.showComments') }}</span>
                    <USwitch v-model="config.course.showComments" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('courseEditor.showProgress') }}</span>
                    <USwitch v-model="config.course.showProgress" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('courseEditor.defaultChapterOpen') }}</span>
                    <USwitch v-model="config.course.defaultChapterOpen" />
                </div>
            </div>
        </div>

        <!-- 章节按钮开关 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.chapterBtns') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('chapter.play') }}</span>
                    <USwitch v-model="config.chapterBtns.showPlay" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('chapter.score') }}</span>
                    <USwitch v-model="config.chapterBtns.showScore" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('chapter.select') }}</span>
                    <USwitch v-model="config.chapterBtns.showSelect" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('chapter.timer') }}</span>
                    <USwitch v-model="config.chapterBtns.showTimer" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('chapter.invite') }}</span>
                    <USwitch v-model="config.chapterBtns.showInvite" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('chapter.danmaku') }}</span>
                    <USwitch v-model="config.chapterBtns.showDanmaku" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('chapter.vote') }}</span>
                    <USwitch v-model="config.chapterBtns.showVote" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('chapter.quickAnswer') }}</span>
                    <USwitch v-model="config.chapterBtns.showQuickAnswer" />
                </div>
            </div>
        </div>

        <!-- 课程按钮开关 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.courseBtns') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('coursePanel.progress') }}</span>
                    <USwitch v-model="config.courseBtns.showProgress" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('coursePanel.leaderboard') }}</span>
                    <USwitch v-model="config.courseBtns.showLeaderboard" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('coursePanel.groups') }}</span>
                    <USwitch v-model="config.courseBtns.showGroups" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('coursePanel.grades') }}</span>
                    <USwitch v-model="config.courseBtns.showGrades" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('coursePanel.announcements') }}</span>
                    <USwitch v-model="config.courseBtns.showAnnouncements" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
const { t: $t } = useI18n()
const props = defineProps({
    modelValue: { type: Object, default: null },
    // 课程配置场景下隐藏 course 分组（由 configForm 顶部开关单独管理）
    hideCourse: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const defaultConfig = {
    ai: { mode: 'api', model: '', thinking: false, apiUrl: '/api/aichat/chat', llmApiUrl: '', llmApiKey: '', ollamaUrl: 'http://localhost:11434', ollamaModel: '', title: '', preset: '', opening: '', ttsGender: 'female' },
    question: { submitExp: 2, correctBonusExp: 5, firstCorrectBonusExp: 10, maxSubmitCount: 999 },
    homework: { submitExp: 5, resubmitExp: 1, latePenalty: 0.8 },
    comment: { publishExp: 3, replyExp: 2, likeReceivedExp: 1, maxDailyExp: 20 },
    chapter: { readExp: 1, readTimeThreshold: 30, readThresholdExp: 10, passScore: 60 },
    race: { participateExp: 10, rank1Exp: 100, rank2Exp: 80, rank3Exp: 60, participationExp: 30 },
    quiz: { submitExp: 3, passScore: 60, passBonusExp: 10 },
    general: { dailyExpCap: 100, levelStep: 100 },
    course: { showDanmaku: true, showAnnouncement: true, showComments: true, showProgress: false, defaultChapterOpen: true },
    chapterBtns: { showPlay: true, showScore: true, showSelect: true, showTimer: true, showInvite: true, showDanmaku: true, showVote: true, showQuickAnswer: true },
    courseBtns: { showProgress: true, showLeaderboard: true, showGroups: true, showGrades: true, showAnnouncements: true },
}

const aiModeOpts = computed(() => [
    { label: $t('lmsConfig.aiModeApi'), value: 'api' },
    { label: $t('lmsConfig.aiModeLocal'), value: 'local' },
    { label: $t('lmsConfig.aiModeOllama'), value: 'ollama' },
])

const ttsGenderOpts = computed(() => [
    { label: $t('lmsConfig.aiTtsFemale'), value: 'female' },
    { label: $t('lmsConfig.aiTtsMale'), value: 'male' },
])

const config = reactive(JSON.parse(JSON.stringify(defaultConfig)))

// 从外部数据初始化
watch(() => props.modelValue, (val) => {
    if (val) {
        deepMerge(config, val)
    }
}, { immediate: true, deep: true })

// 变化时通知父组件
watch(config, () => {
    emit('update:modelValue', JSON.parse(JSON.stringify(config)))
}, { deep: true })

function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (typeof target[key] === 'object' && typeof source[key] === 'object' && !Array.isArray(target[key])) {
            deepMerge(target[key], source[key])
        } else {
            target[key] = source[key]
        }
    }
}

defineExpose({ getConfig: () => {
    const data = JSON.parse(JSON.stringify(config))
    // 课程配置场景：移除 course 分组（由 configForm 顶部开关管理）
    if (props.hideCourse) delete data.course
    return data
} })
</script>
