<template>
    <div class="space-y-4">
        <!-- Video Upload -->
        <UFormField :label="t('question.videoFile')" size="sm">
            <FormInputFile v-model="form.src" :multiple="false" :placeholder="t('question.videoSelectHint')" />
        </UFormField>

        <!-- VideoPreview（candragtotargetTimePointBackClick「makeuseCurrent Time」CaptureTimeclick） -->
        <div v-if="form.src">
            <label class="text-xs text-gray-500 mb-1 block">{{ t('question.videoPreview') }}</label>
            <video ref="previewVideo" :src="form.src" controls preload="metadata"
                class="w-full rounded border border-gray-200 dark:border-gray-700" style="max-height: 240px;" />
        </div>

        <!-- popup question list -->
        <div>
            <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium">{{ t('question.videoQuestions') }} ({{ form.questions.length }})</label>
                <UButton size="xs" variant="outline" icon="i-lucide-plus" :label="t('question.videoSelectQuestion')"
                    @click="pickerOpen = true" />
            </div>
            <div v-if="form.questions.length" class="space-y-2">
                <div v-for="(q, idx) in form.questions" :key="idx"
                    class="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded">
                    <UIcon name="i-lucide-circle-help" class="size-4 text-gray-400 shrink-0" />
                    <span class="text-sm flex-1">{{ t('courseData.questionLabel') }} #{{ q.cid }}</span>
                    <UInput v-model.number="q.at" type="number" size="xs" class="w-20" :placeholder="0" />
                    <span class="text-xs text-gray-400">{{ t('question.videoTimeUnit') }}</span>
                    <UButton v-if="form.src" icon="i-lucide-target" color="neutral" variant="ghost" size="2xs"
                        :label="t('question.videoUseCurrentTime')" @click="captureTime(idx)" />
                    <span class="text-xs text-gray-400 w-12 text-right tabular-nums">{{ formatTime(q.at) }}</span>
                    <UButton icon="i-lucide-x" color="error" variant="ghost" size="2xs"
                        @click="form.questions.splice(idx, 1)" />
                </div>
            </div>
            <p v-else class="text-sm text-gray-400">{{ t('question.videoNo questions') }}</p>
        </div>

        <!-- Description -->
        <div class="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded">
            {{ t('question.videoEditHint') }}
        </div>

        <!-- Question selecteditor -->
        <UeditorContentPicker v-model="pickerOpen" type="questions" @confirm="onPickQuestions" />
    </div>
</template>

<script setup>
const props = defineProps({
    form: { type: Object, required: true },
})
const { t } = useI18n()

const previewVideo = ref(null)
const pickerOpen = ref(false)

// form.options mustmustYesObject：{ src, questions: [{cid, at}] }
// Parent Component onTypeChange MiddleInitializeObject，ThisInsidedirectlyRead-write
function ensureOptions() {
    if (!props.form.options || typeof props.form.options !== 'object' || Array.isArray(props.form.options)) {
        props.form.options = { src: '', questions: [] }
    }
    if (!Array.isArray(props.form.options.questions)) {
        props.form.options.questions = []
    }
    if (typeof props.form.options.src !== 'string') {
        props.form.options.src = ''
    }
}
ensureOptions()

const form = props.form.options  // simplifyTemplateReference

function onPickQuestions(cids) {
    for (const cid of cids) {
        if (!form.questions.some(q => q.cid === cid)) {
            form.questions.push({ cid, at: 0 })
        }
    }
}

// CapturePreviewVideoCurrent TimeasQuestionpopupTimePoint
function captureTime(idx) {
    const v = previewVideo.value
    if (!v) return
    form.questions[idx].at = Math.floor(v.currentTime)
}

function formatTime(s) {
    if (s == null || isNaN(s) || s < 0) return '00:00'
    const sec = Math.floor(s)
    const m = Math.floor(sec / 60)
    const ss = sec % 60
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
</script>
