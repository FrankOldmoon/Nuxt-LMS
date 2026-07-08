<template>
    <div class="vue-node-config">
        <!-- 视频上传 -->
        <UFormField :label="t('ueditor.ivideoFile')" size="sm">
            <FormInputFile v-model="form.src" :multiple="false" :placeholder="t('ueditor.ivideoSelectHint')" />
        </UFormField>

        <!-- 视频预览（可拖动到目标时间点后点击「使用当前时间」捕获时间戳） -->
        <div v-if="form.src">
            <label class="text-xs text-gray-500 mb-1 block">{{ t('ueditor.ivideoPreview') }}</label>
            <video ref="previewVideo" :src="form.src" controls preload="metadata"
                class="w-full rounded border border-gray-200 dark:border-gray-700" style="max-height: 240px;" />
        </div>

        <!-- 互动题目列表 -->
        <div>
            <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium">{{ t('ueditor.ivideoQuestions') }} ({{ form.questions.length }})</label>
                <UButton size="xs" variant="outline" icon="i-lucide-plus" :label="t('ueditor.ivideoSelectQuestion')"
                    @click="pickerOpen = true" />
            </div>
            <div v-if="form.questions.length" class="space-y-2">
                <div v-for="(q, idx) in form.questions" :key="idx"
                    class="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded">
                    <UIcon name="i-lucide-circle-help" class="size-4 text-gray-400 shrink-0" />
                    <span class="text-sm flex-1">{{ t('courseData.questionLabel') }} #{{ q.cid }}</span>
                    <UInput v-model.number="q.at" type="number" size="xs" class="w-20" :placeholder="0" />
                    <span class="text-xs text-gray-400">{{ t('ueditor.ivideoTimeUnit') }}</span>
                    <UButton v-if="form.src" icon="i-lucide-target" color="neutral" variant="ghost" size="2xs"
                        :label="t('ueditor.ivideoUseCurrentTime')" @click="captureTime(idx)" />
                    <span class="text-xs text-gray-400 w-12 text-right tabular-nums">{{ formatTime(q.at) }}</span>
                    <UButton icon="i-lucide-x" color="error" variant="ghost" size="2xs"
                        @click="form.questions.splice(idx, 1)" />
                </div>
            </div>
            <p v-else class="text-sm text-gray-400">{{ t('ueditor.ivideoNoQuestions') }}</p>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <UButton color="primary" @click="apply">{{ t('common.save') }}</UButton>
        </div>

        <!-- 题目选择器 -->
        <UeditorContentPicker v-model="pickerOpen" type="questions" @confirm="onPickQuestions" />
    </div>
</template>

<script setup>
const props = defineProps({
    config: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:config', 'close'])
const { t } = useI18n()

const previewVideo = ref(null)
const pickerOpen = ref(false)

// 从 config 深拷贝初始化 form（避免直接修改 props）
const form = ref(parseForm(props.config))

function parseForm(cfg) {
    return {
        src: cfg?.src || '',
        questions: Array.isArray(cfg?.questions)
            ? cfg.questions.map(q => ({ cid: Number(q.cid) || 0, at: Number(q.at) || 0 }))
                .filter(q => q.cid > 0)
            : [],
    }
}

function onPickQuestions(cids) {
    for (const cid of cids) {
        if (!form.value.questions.some(q => q.cid === cid)) {
            form.value.questions.push({ cid, at: 0 })
        }
    }
}

// 捕获预览视频当前时间作为题目弹出时间点
function captureTime(idx) {
    const v = previewVideo.value
    if (!v) return
    form.value.questions[idx].at = Math.floor(v.currentTime)
}

function formatTime(s) {
    if (s == null || isNaN(s) || s < 0) return '00:00'
    const sec = Math.floor(s)
    const m = Math.floor(sec / 60)
    const ss = sec % 60
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function apply() {
    // 按时间升序排序，保证播放时按顺序触发
    const questions = form.value.questions
        .slice()
        .sort((a, b) => a.at - b.at)
    emit('update:config', { src: form.value.src, questions })
    emit('close')
}
</script>
