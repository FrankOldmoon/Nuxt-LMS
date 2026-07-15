<template>
    <UFormField :label="t('ai.mode')" size="sm">
        <USelect v-model="cfgMode" :items="modeOptions" size="sm" class="w-full" />
    </UFormField>
    <UFormField :label="t('ueditor.aichatTitle')" size="sm">
        <UInput v-model="cfgTitle" :placeholder="t('ueditor.aichatTitlePlaceholder')" size="sm" class="w-full" />
    </UFormField>
    <UFormField :label="t('ueditor.aichatPreset')" size="sm" :hint="t('ueditor.aichatPresetHint')">
        <UTextarea v-model="cfgPreset" :rows="3" size="sm" class="w-full" />
    </UFormField>
    <UFormField :label="t('ueditor.aichatOpening')" size="sm">
        <UTextarea v-model="cfgOpening" :rows="2" size="sm" class="w-full" />
    </UFormField>
    <!-- API / Ollama mode：TextInputModelname -->
    <UFormField v-if="cfgMode === 'api' || cfgMode === 'ollama'" :label="t('ueditor.aichatModel')" size="sm">
        <UInput v-model="cfgModel" :placeholder="cfgMode === 'ollama' ? 'llama3.2' : t('ueditor.aichatModelPlaceholder')" size="sm" class="w-full" />
    </UFormField>
    <!-- localGroundmode：DropdownlocalGroundModel -->
    <UFormField v-else :label="t('ai.localModel')" size="sm">
        <USelect v-model="cfgModel" :items="LOCAL_LLM_MODELS" size="sm" class="w-full" />
    </UFormField>
    <!-- thinking only API modeValid（localGround WebLLM / Ollama not support） -->
    <UFormField v-if="cfgMode === 'api'" :label="t('ueditor.aichatThinking')" size="sm" :hint="t('ueditor.aichatThinkingHint')">
        <USwitch v-model="cfgThinking" />
    </UFormField>
    <UButton size="xs" color="primary" @click="apply">{{ t('common.save') }}</UButton>
</template>

<script setup>
import { LOCAL_LLM_MODELS, DEFAULT_LLM_MODEL } from '../../../../../../utils/ai'

const props = defineProps({
    config: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:config', 'close'])
const { t } = useI18n()

const cfgMode = ref(props.config?.mode || 'api')
const cfgTitle = ref(props.config?.title || '')
const cfgPreset = ref(props.config?.preset || '')
const cfgOpening = ref(props.config?.opening || '')
const cfgModel = ref(props.config?.model || (cfgMode.value === 'local' ? DEFAULT_LLM_MODEL : cfgMode.value === 'ollama' ? 'llama3.2' : 'glm-4.5-air'))
const cfgThinking = ref(props.config?.thinking || false)

const modeOptions = computed(() => [
    { label: t('ai.modeLocal'), value: 'local' },
    { label: t('ai.modeApi'), value: 'api' },
    { label: t('ai.modeOllama'), value: 'ollama' },
])

// Switch ModewhenReset model Rightshouldpattern reasonableDefault Value，avoid mixuse
watch(cfgMode, (newMode, oldMode) => {
    if (newMode === oldMode) return
    const isLocal model = LOCAL_LLM_MODELS.some(m => m.value === cfgModel.value)
    if (newMode === 'local' && !isLocal model) {
        cfgModel.value = DEFAULT_LLM_MODEL
    } else if (newMode === 'api' && isLocal model) {
        cfgModel.value = 'glm-4.5-air'
    } else if (newMode === 'ollama' && isLocal model) {
        cfgModel.value = 'llama3.2'
    }
})

function apply() {
    const newConfig = {
        ...props.config,
        mode: cfgMode.value,
        title: cfgTitle.value,
        preset: cfgPreset.value,
        opening: cfgOpening.value,
        model: cfgModel.value,
        thinking: cfgThinking.value,
    }
    emit('update:config', newConfig)
    emit('close')
}
</script>
