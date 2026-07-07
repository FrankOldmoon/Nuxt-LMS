<template>
    <div class="space-y-4">
        <!-- 参数设置面板（可隐藏：render.vue 复用时由 edit.vue 提供参数） -->
        <div v-if="showSettings"
            class="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <!-- 模式选择：本地 WebLLM / 服务端 API -->
            <UFormField :label="t('ai.mode')" size="sm">
                <USelect v-model="cfgMode" :items="modeOptions" size="sm" class="w-full" />
            </UFormField>

            <!-- 本地模型设置 -->
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

            <!-- API 设置 -->
            <template v-else>
                <UFormField :label="t('ueditor.aichatModel')" size="sm" :hint="t('ueditor.aichatThinkingHint')">
                    <UInput v-model="cfgApiModel" :placeholder="t('ueditor.aichatModelPlaceholder')" size="sm"
                        class="w-full" />
                </UFormField>
                <UFormField :label="t('ueditor.aichatThinking')" size="sm" :hint="t('ueditor.aichatThinkingHint')">
                    <USwitch v-model="cfgThinking" />
                </UFormField>
            </template>

            <!-- 通用参数 -->
            <UFormField :label="t('ueditor.aichatTitle')" size="sm">
                <UInput v-model="cfgTitle" :placeholder="t('ueditor.aichatTitlePlaceholder')" size="sm" class="w-full" />
            </UFormField>
            <UFormField :label="t('ueditor.aichatPreset')" size="sm" :hint="t('ueditor.aichatPresetHint')">
                <UTextarea v-model="cfgPreset" :rows="2" size="sm" class="w-full" />
            </UFormField>
            <UFormField :label="t('ueditor.aichatOpening')" size="sm">
                <UTextarea v-model="cfgOpening" :rows="2" size="sm" class="w-full" />
            </UFormField>
        </div>

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
            :title="chatboxTitle"
            :opening="chatboxOpening"
            :preset="chatboxPreset"
            :custom-send="chatboxCustomSend"
            :model="chatboxModel"
            :thinking="chatboxThinking"
            :api-url="chatboxApiUrl"
            :disabled="chatboxDisabled"
        />
    </div>
</template>

<script setup lang="ts">
import { subscribeLLMState, loadLLM, unloadLLM, chatLLM, LOCAL_LLM_MODELS, DEFAULT_LLM_MODEL, DEFAULT_LLM_MODE } from '../../utils/ai'
import type { LLMMessage } from '../../utils/ai'

const { t } = useI18n()
const toast = useToast()

const props = withDefaults(defineProps<{
    /** 显示参数设置面板（render.vue 复用时设为 false，由 edit.vue 提供参数） */
    showSettings?: boolean
    /** 模式：local 浏览器本地 WebLLM / api 服务端 API */
    mode?: 'local' | 'api'
    title?: string
    opening?: string
    preset?: string
    /** 模型：local 时为本地模型 ID，api 时为服务端模型名 */
    model?: string
    thinking?: boolean
    apiUrl?: string
}>(), {
    showSettings: true,
    mode: DEFAULT_LLM_MODE,
    thinking: false,
})

// ===================== 可编辑配置（仅 showSettings 时使用） =====================
const cfgMode = ref<'local' | 'api'>(props.mode || DEFAULT_LLM_MODE)
const cfgTitle = ref(props.title || '')
const cfgPreset = ref(props.preset || '')
const cfgOpening = ref(props.opening || '')
const cfgThinking = ref(props.thinking || false)
const cfgApiModel = ref(props.mode === 'api' ? (props.model || '') : '')
const selectedLocalModel = ref(
    (props.mode === 'local' && props.model && LOCAL_LLM_MODELS.some(m => m.value === props.model))
        ? props.model
        : DEFAULT_LLM_MODEL,
)

const modeOptions = computed(() => [
    { label: t('ai.modeLocal'), value: 'local' },
    { label: t('ai.modeApi'), value: 'api' },
])

// ===================== 有效配置（showSettings 用内部可编辑状态，否则直接读 props 保持响应式） =====================
const effMode = computed(() => (props.showSettings ? cfgMode.value : (props.mode || DEFAULT_LLM_MODE)))
const effTitle = computed(() => (props.showSettings ? cfgTitle.value : (props.title || '')))
const effPreset = computed(() => (props.showSettings ? cfgPreset.value : (props.preset || '')))
const effOpening = computed(() => (props.showSettings ? cfgOpening.value : (props.opening || '')))
const effThinking = computed(() => (props.showSettings ? cfgThinking.value : (props.thinking || false)))
const effApiModel = computed(() => (props.showSettings ? cfgApiModel.value : (props.model || '')))
const effLocalModel = computed(() => {
    if (props.showSettings) return selectedLocalModel.value
    return LOCAL_LLM_MODELS.some(m => m.value === props.model) ? (props.model as string) : DEFAULT_LLM_MODEL
})

// ===================== 传给 chatbox 的最终参数 =====================
const chatboxTitle = computed(() => effTitle.value || (effMode.value === 'local' ? t('ai.webllmTitle') : t('ueditor.aichat')))
const chatboxPreset = computed(() => effPreset.value || (effMode.value === 'local' ? t('ai.webllmPreset') : 'You are a helpful assistant.'))
const chatboxOpening = computed(() => effOpening.value || (effMode.value === 'local' ? t('ai.webllmOpening') : ''))
const chatboxCustomSend = computed(() => (effMode.value === 'local' && state.ready ? handleCustomSend : undefined))
const chatboxDisabled = computed(() => effMode.value === 'local' && !state.ready)
const chatboxApiUrl = computed(() => (effMode.value === 'api' ? (props.apiUrl || '/api/aichat/chat') : undefined))
const chatboxModel = computed(() => (effMode.value === 'api' ? effApiModel.value : undefined))
const chatboxThinking = computed(() => (effMode.value === 'api' ? effThinking.value : undefined))

// ===================== LLM 引擎状态订阅（引擎本身不进入响应式） =====================
const state = reactive({
    ready: false,
    loading: false,
    progress: 0,
    loadedBytes: '0 MB',
    totalBytes: '',
    error: '',
})

const unsubscribe = subscribeLLMState((s) => {
    state.ready = s.ready
    state.loading = s.loading
    state.progress = s.progress
    state.loadedBytes = s.loadedBytes
    state.totalBytes = s.totalBytes
    state.error = s.error
})

// ===================== 模型加载/卸载 =====================
async function loadSelected() {
    try {
        await loadLLM(effLocalModel.value)
        if (props.showSettings) toast.add({ title: t('ai.loadSuccess'), color: 'success' })
    } catch {
        // 错误已写入 state.error
    }
}

// 默认自动加载（local 模式）
onMounted(() => {
    if (effMode.value === 'local') loadSelected()
})

// 模式切换：local→api 卸载，api→local 加载
watch(effMode, async (mode) => {
    if (mode === 'local' && !state.ready && !state.loading) {
        await loadSelected()
    } else if (mode === 'api' && state.ready) {
        await unloadLLM()
    }
})

// 本地模型切换时重新加载
watch(effLocalModel, async (newModel, oldModel) => {
    if (newModel === oldModel) return
    if (state.ready || state.loading) {
        await unloadLLM()
    }
    if (effMode.value === 'local') {
        await loadSelected()
    }
})

/**
 * 自定义发送：桥接 chatbox customSend 到 chatLLM 流式接口
 * chatbox 已把 preset 拼成 system 消息，直接透传即可
 */
async function handleCustomSend(
    messages: LLMMessage[],
    onChunk: (content: string, reasoning?: string) => void,
): Promise<void> {
    await chatLLM(messages, onChunk)
}

// 卸载时仅取消订阅（引擎为模块级单例，多实例共享，不在此释放）
onBeforeUnmount(() => {
    unsubscribe()
})
</script>
