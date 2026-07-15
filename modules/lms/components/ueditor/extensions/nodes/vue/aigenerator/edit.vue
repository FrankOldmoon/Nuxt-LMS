<template>
    <UFormField :label="t('ueditor.aigeneratorTitle')" size="sm">
        <UInput v-model="cfgTitle" :placeholder="t('ueditor.aigeneratorTitlePlaceholder')" size="sm" class="w-full" />
    </UFormField>
    <UFormField :label="t('ueditor.aigeneratorQuestion type')" size="sm">
        <USelect v-model="cfgQuestion type" :items="typeOptions" size="sm" class="w-full" />
    </UFormField>
    <UFormField :label="t('ueditor.aigeneratorReferenceText')" size="sm" :hint="t('ueditor.aigeneratorReferenceTextHint')">
        <div class="flex items-center justify-between gap-2 mb-2">
            <label class="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
                <USwitch v-model="cfgReferenceFromChapter" :disabled="!chapterContent" />
                <span>{{ t('ueditor.aigeneratorReferenceFromChapter') }}</span>
            </label>
        </div>
        <UTextarea v-model="cfgReferenceText" :rows="4" size="sm" class="w-full"
            :placeholder="t('ueditor.aigeneratorReferenceTextPlaceholder')" />
    </UFormField>
    <UFormField :label="t('ueditor.aigeneratorPoint')" size="sm">
        <UInput v-model.number="cfgPoint" type="number" min="0" step="0.5" size="sm" class="w-full" />
    </UFormField>
    <UFormField :label="t('ueditor.aigeneratorModel')" size="sm">
        <UInput v-model="cfgModel" placeholder="glm-4.5-air" size="sm" class="w-full" />
    </UFormField>
    <UFormField :label="t('ueditor.aigeneratorThinking')" size="sm" :hint="t('ueditor.aigeneratorThinkingHint')">
        <USwitch v-model="cfgThinking" />
    </UFormField>
    <UButton size="xs" color="primary" @click="apply">{{ t('common.save') }}</UButton>
</template>

<script setup>
const props = defineProps({
    config: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:config', 'close'])
const { t } = useI18n()

// CurrentChapter Content（from useLayoutState  chapterContent，ChapterpagewillWrite）
const { chapterContent } = useLayoutState()

const cfgTitle = ref(props.config?.title || '')
const cfgQuestion type = ref(props.config?.questionType || 'single')
const cfgReferenceText = ref(props.config?.referenceText || '')
const cfgReferenceFromChapter = ref(!!props.config?.referenceFromChapter)
const cfgPoint = ref(props.config?.point ?? 1)
const cfgModel = ref(props.config?.model || 'glm-4.5-air')
const cfgThinking = ref(props.config?.thinking || false)

const typeOptions = computed(() => [
    { label: t('question.typeSingle'), value: 'single' },
    { label: t('question.typeJudge'), value: 'judge' },
    { label: t('question.typeMultiple'), value: 'multiple' },
    { label: t('question.typeFill'), value: 'fill' },
    { label: t('question.typeSelect'), value: 'select' },
    { label: t('question.typeSort'), value: 'sort' },
    { label: t('question.typeClassify'), value: 'classify' },
    { label: t('question.typeMatch'), value: 'match' },
    { label: t('question.typeShortAnswer'), value: 'short-answer' },
])

// Open「fromCurrent chapter extract text」when，AutouseChapterPlain Textoverlay referenceText
watch(cfgReferenceFromChapter, (val) => {
    if (val) {
        const text = extractPlainText(chapterContent.value)
        cfgReferenceText.value = text
    }
})

function apply() {
    const newConfig = {
        ...props.config,
        title: cfgTitle.value,
        questionType: cfgQuestion type.value,
        referenceText: cfgReferenceText.value,
        referenceFromChapter: cfgReferenceFromChapter.value,
        point: Number(cfgPoint.value) || 1,
        model: cfgModel.value,
        thinking: cfgThinking.value,
    }
    emit('update:config', newConfig)
    emit('close')
}
</script>
