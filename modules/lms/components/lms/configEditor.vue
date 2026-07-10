<template>
    <div class="space-y-4">
        <USeparator :label="$t('lmsConfig.title')" class="my-4" />

        <!-- 用户（全局控制用户端功能可用性；admin/teacher 不受限制） -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.user') }}</p>
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-xs">{{ $t('lmsConfig.allowSelfAvatarUpload') }}</span>
                        <p class="text-[10px] text-muted">{{ $t('lmsConfig.allowSelfAvatarUploadHint') }}</p>
                    </div>
                    <USwitch v-model="config.user.allowSelfAvatarUpload" />
                </div>
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-xs">{{ $t('lmsConfig.allowChangePassword') }}</span>
                        <p class="text-[10px] text-muted">{{ $t('lmsConfig.allowChangePasswordHint') }}</p>
                    </div>
                    <USwitch v-model="config.user.allowChangePassword" />
                </div>
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-xs">{{ $t('lmsConfig.allowChangeEmail') }}</span>
                        <p class="text-[10px] text-muted">{{ $t('lmsConfig.allowChangeEmailHint') }}</p>
                    </div>
                    <USwitch v-model="config.user.allowChangeEmail" />
                </div>
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-xs">{{ $t('lmsConfig.allowChangeLocale') }}</span>
                        <p class="text-[10px] text-muted">{{ $t('lmsConfig.allowChangeLocaleHint') }}</p>
                    </div>
                    <USwitch v-model="config.user.allowChangeLocale" />
                </div>
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-xs">{{ $t('lmsConfig.allowExportData') }}</span>
                        <p class="text-[10px] text-muted">{{ $t('lmsConfig.allowExportDataHint') }}</p>
                    </div>
                    <USwitch v-model="config.user.allowExportData" />
                </div>
            </div>
        </div>

        <!-- AI 助手配置 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.ai') }}</p>
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-xs">{{ $t('lmsConfig.aiEnabled') }}</span>
                        <p class="text-[10px] text-muted">{{ $t('lmsConfig.aiEnabledHint') }}</p>
                    </div>
                    <USwitch v-model="config.ai.enabled" />
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <UFormField :label="$t('lmsConfig.aiMode')" size="xs">
                    <USelect v-model="config.ai.mode" :items="aiModeOpts" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.aiTtsGender')" size="xs">
                    <USelect v-model="config.ai.ttsGender" :items="ttsGenderOpts" size="xs" class="w-full" />
                </UFormField>

                <!-- API 模式：模型 + LLM API 地址 + Key + 思考模式 -->
                <template v-if="config.ai.mode === 'api'">
                    <UFormField :label="$t('lmsConfig.aiModel')" size="xs" class="col-span-2">
                        <UInput v-model="config.ai.model" :placeholder="$t('lmsConfig.aiModelPlaceholder')" size="xs" class="w-full" />
                    </UFormField>
                    <UFormField :label="$t('lmsConfig.aiLlmApiUrl')" size="xs" class="col-span-2">
                        <template #hint>{{ $t('lmsConfig.aiLlmApiUrlHint') }}</template>
                        <UInput v-model="config.ai.llmApiUrl" :placeholder="$t('lmsConfig.aiLlmApiUrlPlaceholder')" size="xs" class="w-full" />
                    </UFormField>
                    <UFormField :label="$t('lmsConfig.aiLlmApiKey')" size="xs" class="col-span-2">
                        <template #hint>{{ $t('lmsConfig.aiLlmApiKeyHint') }}</template>
                        <UInput v-model="config.ai.llmApiKey" type="password" :placeholder="$t('lmsConfig.aiLlmApiKeyPlaceholder')" size="xs" class="w-full" />
                    </UFormField>
                    <UFormField :label="$t('lmsConfig.aiThinking')" size="xs">
                        <USwitch v-model="config.ai.thinking" />
                    </UFormField>
                </template>

                <!-- Ollama 模式：服务地址 + 模型名 -->
                <template v-if="config.ai.mode === 'ollama'">
                    <UFormField :label="$t('lmsConfig.aiOllamaUrl')" size="xs" class="col-span-2">
                        <UInput v-model="config.ai.ollamaUrl" placeholder="http://localhost:11434" size="xs" class="w-full" />
                    </UFormField>
                    <UFormField :label="$t('lmsConfig.aiOllamaModel')" size="xs" class="col-span-2">
                        <UInput v-model="config.ai.ollamaModel" placeholder="llama3.2" size="xs" class="w-full" />
                    </UFormField>
                </template>

                <!-- 通用：服务端代理端点（前端调用的接口，非 LLM 提供方地址） -->
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
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('chapter.wrongBook') }}</span>
                    <USwitch v-model="config.courseBtns.showWrongBook" />
                </div>
            </div>
        </div>

        <!-- 首页显隐 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.home') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('lmsConfig.showHero') }}</span>
                    <USwitch v-model="config.home.showHero" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('lmsConfig.showStats') }}</span>
                    <USwitch v-model="config.home.showStats" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('lmsConfig.showRecentCourses') }}</span>
                    <USwitch v-model="config.home.showRecentCourses" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('lmsConfig.showLeaderboard') }}</span>
                    <USwitch v-model="config.home.showLeaderboard" />
                </div>
            </div>
        </div>

        <!-- 课程列表显隐与默认视图 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.courseList') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('lmsConfig.showSearch') }}</span>
                    <USwitch v-model="config.courseList.showSearch" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('lmsConfig.showFilter') }}</span>
                    <USwitch v-model="config.courseList.showFilter" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('lmsConfig.showSort') }}</span>
                    <USwitch v-model="config.courseList.showSort" />
                </div>
                <UFormField :label="$t('lmsConfig.defaultView')" size="xs" class="col-span-2">
                    <USelect v-model="config.courseList.defaultView" :items="defaultViewOpts" size="xs" class="w-full" />
                </UFormField>
            </div>
        </div>

        <!-- 章节播放页显隐 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.chapterPage') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('lmsConfig.showOutline') }}</span>
                    <USwitch v-model="config.chapterPage.showOutline" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('lmsConfig.showNote') }}</span>
                    <USwitch v-model="config.chapterPage.showNote" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('lmsConfig.showDanmakuPanel') }}</span>
                    <USwitch v-model="config.chapterPage.showDanmakuPanel" />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs">{{ $t('lmsConfig.enableFullscreen') }}</span>
                    <USwitch v-model="config.chapterPage.enableFullscreen" />
                </div>
            </div>
        </div>

        <!-- 网盘存储 -->
        <div class="space-y-2">
            <p class="text-sm font-medium">{{ $t('lmsConfig.storage') }}</p>
            <div class="grid grid-cols-2 gap-2">
                <UFormField :label="$t('lmsConfig.driveSize')" size="xs" class="col-span-2">
                    <template #hint>{{ $t('lmsConfig.driveSizeHint') }}</template>
                    <UInput v-model.number="config.storage.driveSize" type="number" size="xs" class="w-full" />
                </UFormField>
                <UFormField :label="$t('lmsConfig.teacherMultiplier')" size="xs" class="col-span-2">
                    <template #hint>{{ $t('lmsConfig.teacherMultiplierHint') }}</template>
                    <UInput v-model.number="config.storage.teacherMultiplier" type="number" step="0.1" size="xs"
                        class="w-full" />
                </UFormField>
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
    ai: { enabled: true, mode: 'api', model: '', thinking: false, apiUrl: '/api/aichat/chat', llmApiUrl: '', llmApiKey: '', ollamaUrl: 'http://localhost:11434', ollamaModel: '', title: '', preset: '', opening: '', ttsGender: 'female' },
    question: { submitExp: 2, correctBonusExp: 5, firstCorrectBonusExp: 10, maxSubmitCount: 999 },
    homework: { submitExp: 5, resubmitExp: 1, latePenalty: 0.8 },
    comment: { publishExp: 3, replyExp: 2, likeReceivedExp: 1, maxDailyExp: 20 },
    chapter: { readExp: 1, readTimeThreshold: 30, readThresholdExp: 10, passScore: 60 },
    race: { participateExp: 10, rank1Exp: 100, rank2Exp: 80, rank3Exp: 60, participationExp: 30 },
    quiz: { submitExp: 3, passScore: 60, passBonusExp: 10 },
    general: { dailyExpCap: 100, levelStep: 100 },
    course: { showDanmaku: true, showAnnouncement: true, showComments: true, showProgress: false, defaultChapterOpen: true },
    chapterBtns: { showPlay: true, showScore: true, showSelect: true, showTimer: true, showInvite: true, showDanmaku: true, showVote: true, showQuickAnswer: true },
    courseBtns: { showProgress: true, showLeaderboard: true, showGroups: true, showGrades: true, showAnnouncements: true, showWrongBook: true },
    user: { allowSelfAvatarUpload: true, allowChangePassword: true, allowChangeEmail: true, allowChangeLocale: true, allowExportData: true },
    home: { showHero: true, showStats: true, showRecentCourses: true, showLeaderboard: true },
    courseList: { showSearch: true, showFilter: true, showSort: true, defaultView: 'grid' },
    chapterPage: { showOutline: true, showNote: true, showDanmakuPanel: true, enableFullscreen: true },
    storage: { driveSize: 1073741824, teacherMultiplier: 1 },
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

const defaultViewOpts = computed(() => [
    { label: $t('lmsConfig.defaultViewGrid'), value: 'grid' },
    { label: $t('lmsConfig.defaultViewList'), value: 'list' },
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
