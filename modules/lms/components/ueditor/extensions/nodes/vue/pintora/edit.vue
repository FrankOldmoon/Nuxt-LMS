<template>
    <div class="w-full space-y-2 flex flex-col">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <label class="text-xs text-gray-500 shrink-0">{{ t('pintora.height') }}</label>
                <UInput v-model.number="height" type="number" size="xs" min="0" class="w-32"
                    :placeholder="t('pintora.heightPlaceholder')" />
            </div>
            <!-- Pintora 官方在线编辑器：示例参考 -->
            <a :href="LIVE_EDITOR_URL" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
                <UIcon name="i-lucide-external-link" class="size-3" />
                {{ t('pintora.liveEditor') }}
            </a>
        </div>
        <Monaco v-model="code" language="plaintext" />
        <UButton size="xs" color="primary" class="self-end mt-2" @click="emit('close')">
            {{ t('common.save') }}
        </UButton>
    </div>
</template>

<script setup>
const props = defineProps({
    config: { type: String, default: '' },
    height: { type: [Number, String], default: 0 },
})
const emit = defineEmits(['update:config', 'update:height', 'close'])
const { t } = useI18n()

// Pintora 官方在线编辑器（语法示例）
const LIVE_EDITOR_URL = 'https://pintorajs.vercel.app/demo/live-editor'

const code = ref(props.config || '')
const height = ref(Number(props.height) || 0)

// 实时预览：输入时即通知父组件持久化
watch(code, () => {
    emit('update:config', code.value)
})
watch(height, (v) => {
    emit('update:height', Number(v) || 0)
})
</script>
