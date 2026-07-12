<template>
    <div class="space-y-4">
        <!-- 参数设置面板（可隐藏：render.vue 复用时由 edit.vue 提供参数） -->
        <AiLlmSettingsPanel v-if="showSettings" />

        <!-- 本地模型加载进度（local 模式始终可见，含 showSettings=false 场景） -->
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

        <!-- 准备中（CDN / 引擎初始化，尚无进度） -->
        <div v-if="effMode === 'local' && state.loading && state.progress === 0"
            class="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-400">
            <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
            <span>{{ t('ai.loading') }}</span>
        </div>

        <!-- 错误提示 -->
        <div v-if="effMode === 'local' && state.error"
            class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div class="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <UIcon name="i-lucide-alert-triangle" class="size-4" />
                <span>{{ state.error }}</span>
            </div>
        </div>

        <!-- 聊天界面（核心） -->
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
            @user-message="onUserMessage"
            @message="onMessage"
        />
    </div>
</template>

<script setup lang="ts">
import type { LlmProps } from '../../../composables/useLlm'

const props = withDefaults(defineProps<LlmProps>(), {
    showSettings: true,
    // mode/thinking/title/opening/preset/model/apiUrl/ttsGender/aiConfig 不设默认值，
    // undefined 表示"未传"，用于区分"显式传值"和"需要回退 lms_config"
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
    onChunk, onUserMessage, onMessage, refreshMessages, getMessages,
} = useLlm(props, emit)

defineExpose({ refreshMessages, getMessages })
</script>
