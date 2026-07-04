<template>
    <div class="space-y-4">
        <USeparator :label="$t('lmsConfig.title')" class="my-4" />

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
    </div>
</template>

<script setup>
const props = defineProps({
    modelValue: { type: Object, default: null },
    // 课程配置场景下隐藏 course 分组（由 configForm 顶部开关单独管理）
    hideCourse: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const defaultConfig = {
    question: { submitExp: 2, correctBonusExp: 5, firstCorrectBonusExp: 10, maxSubmitCount: 999 },
    homework: { submitExp: 5, resubmitExp: 1, latePenalty: 0.8 },
    comment: { publishExp: 3, replyExp: 2, likeReceivedExp: 1, maxDailyExp: 20 },
    chapter: { readExp: 1, readTimeThreshold: 30, readThresholdExp: 10, passScore: 60 },
    race: { participateExp: 10, rank1Exp: 100, rank2Exp: 80, rank3Exp: 60, participationExp: 30 },
    quiz: { submitExp: 3, passScore: 60, passBonusExp: 10 },
    general: { dailyExpCap: 100, levelStep: 100 },
    course: { showDanmaku: true, showAnnouncement: true, showComments: true, showProgress: false, defaultChapterOpen: true },
}

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
