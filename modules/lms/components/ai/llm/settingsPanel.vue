<template>
    <div class="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <!-- mode select: local WebLLM / server API -->
        <UFormField :label="t('ai.mode')" size="sm">
            <USelect v-model="cfgMode" :items="modeOptions" size="sm" class="w-full" />
        </UFormField>

        <!-- local model settings -->
        <template v-if="cfgMode === 'local'">
            <UFormField :label="t('ai.localModel')" size="sm">
                <USelect v-model="selectedLocalModel" :items="LOCAL_LLM_MODELS" size="sm" class="w-full"
                    :disabled="state.loading" />
            </UFormField>
            <div class="flex items-center gap-2">
                <UIcon v-if="state.loading" name="i-lucide-loader-2" class="size-4 animate-spin text-blue-500" />
                <UIcon v-else-if="state.ready" name="i-lucide-check-circle" class="size-4 text-green-500" />
                <UIcon v-else name="i-lucide-download" class="size-4 text-gray-400" />
                <span class="text-xs"
                    :class="state.ready ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'">
                    {{ state.loading ? t('ai.loading') : (state.ready ? t('ai.loaded') : t('ai.notLoaded')) }}
                </span>
                <UButton v-if="!state.ready && !state.loading" :label="t('ai.loadModel')" icon="i-lucide-download"
                    color="primary" size="xs" @click="loadSelected" />
                <UButton v-if="state.ready" :label="t('ai.unloadModel')" icon="i-lucide-x" color="neutral"
                    variant="outline" size="xs" @click="unloadLLM" />
            </div>
        </template>

        <!-- API Settings -->
        <template v-else-if="cfgMode === 'api'">
            <UFormField :label="t('ueditor.aichatModel')" size="sm" :hint="t('ueditor.aichatThinkingHint')">
                <UInput v-model="cfgApiModel" :placeholder="t('ueditor.aichatModelPlaceholder')" size="sm"
                    class="w-full" />
            </UFormField>
            <UFormField :label="t('ueditor.aichatThinking')" size="sm" :hint="t('ueditor.aichatThinkingHint')">
                <USwitch v-model="cfgThinking" />
            </UFormField>
        </template>

        <!-- Ollama Settings (browser direct connection to local Ollama) -->
        <template v-else-if="cfgMode === 'ollama'">
            <UFormField :label="t('ai.ollamaUrl')" size="sm" :hint="t('ai.ollamaUrlHint')">
                <UInput v-model="cfgOllamaUrl" placeholder="http://localhost:11434" size="sm" class="w-full" />
            </UFormField>
            <UFormField :label="t('ai.ollamaModel')" size="sm">
                <UInput v-model="cfgOllamaModel" placeholder="llama3.2" size="sm" class="w-full" />
            </UFormField>
        </template>

        <!-- common parameters -->
        <UFormField :label="t('ueditor.aichatTitle')" size="sm">
            <UInput v-model="cfgTitle" :placeholder="t('ueditor.aichatTitlePlaceholder')" size="sm" class="w-full" />
        </UFormField>
        <UFormField :label="t('ueditor.aichatPreset')" size="sm" :hint="t('ueditor.aichatPresetHint')">
            <UTextarea v-model="cfgPreset" :rows="2" size="sm" class="w-full" />
        </UFormField>
        <UFormField :label="t('ueditor.aichatOpening')" size="sm">
            <UTextarea v-model="cfgOpening" :rows="2" size="sm" class="w-full" />
        </UFormField>
        <UFormField :label="t('ai.ttsGender')" size="sm">
            <USelect v-model="cfgTtsGender" :items="genderOptions" size="sm" class="w-full" />
        </UFormField>
    </div>
</template>

<script setup lang="ts">
const {
    t, cfgMode, cfgTitle, cfgPreset, cfgOpening, cfgThinking,
    cfgApiModel, cfgOllamaUrl, cfgOllamaModel, cfgTtsGender, selectedLocalModel,
    modeOptions, genderOptions, state, loadSelected, unloadLLM, LOCAL_LLM_MODELS,
} = useLlmContext()
</script>
