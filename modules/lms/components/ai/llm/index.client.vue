<template>
    <div class="space-y-4">
        <!-- Parameter Settings Panel (can hide: render.vue duplicates it, used by edit.vue to provide parameters) -->
        <AiLlmSettingsPanel v-if="showSettings" />

        <!-- Local model loading progress (always visible in local mode, includes showSettings=false scenario) -->
        <div v-if="effMode === 'local' && state.loading && state.progress > 0"
            class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div class="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 mb-2">
                <UIcon name="i-lucide-download" class="size-4 animate-pulse" />
                <span>{{ t('ai.downloading') }} {{ state.progress }}%</span>
            </div>
            <div class="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 transition-all duration-300" :style="{ width: `${state.progress}%` }" />
            </div>
            <div class="text-xs text-blue-600 dark:text-blue-300 mt-1">
                {{ state.loadedBytes }} / {{ state.totalBytes }}
            </div>
        </div>

        <!-- Preparing (CDN / engine init, still no progress) -->
        <div v-if="effMode === 'local' && state.loading && state.progress === 0"
            class="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-400">
            <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
            <span>{{ t('ai.loading') }}</span>
        </div>

        <!-- Error Hint -->
        <div v-if="effMode === 'local' && state.error"
            class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div class="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <UIcon name="i-lucide-alert-triangle" class="size-4" />
                <span>{{ state.error }}</span>
            </div>
        </div>

        <!-- Chat interface (core) -->
        <aiChatbox
            ref="chatboxRef"
            :title="chatboxTitle"
            :opening="chatboxOpening"
            :preset="chatboxPreset"
            :custom-send="chatboxCustomSend"
            :model="chatboxModel"
            :thinking="chatboxThinking"
            :api-url="chatboxApiUrl"
            :tts-gender="effTtsGender"
            :disabled="chatboxDisabled"
            height-class="h-[200px] sm:h-[450px]"
            @chunk="onChunk"
            @user-message="on UserMessage"
            @message="onMessage"
        />
    </div>
</template>

<script setup lang="ts">
import type { LlmProps } from '../../../composables/useLlm'

const props = withDefaults(defineProps<LlmProps>(), {
    showSettings: true,
    // mode/thinking/title/opening/preset/model/apiUrl/ttsGender/aiConfig: no default value,
    // undefined represents "not passed", used to distinguish "explicitly pass value" and "needs to fall back to lms_config"
})

const emit = defineEmits<{
    chunk: [content: string]
    'user-message': [text: string]
    message: [msg: any]
}>()

const {
    showSettings, t, effMode, state, chatboxRef,
    chatboxTitle, chatboxOpening, chatboxPreset, chatboxCustomSend,
    chatboxModel, chatboxThinking, chatboxApiUrl, effTtsGender, chatboxDisabled,
    onChunk, on UserMessage, onMessage, refreshMessages, getMessages,
} = useLlm(props, emit)

defineExpose({ refreshMessages, getMessages })
</script>
