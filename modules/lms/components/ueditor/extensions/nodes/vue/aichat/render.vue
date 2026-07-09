<template>
    <!-- 复用 AiLlm，隐藏参数设置（由 edit.vue 提供参数） -->
    <AiLlm
        :show-settings="false"
        :mode="config.mode || 'api'"
        :title="config.title"
        :opening="config.opening"
        :preset="config.preset"
        :model="config.model"
        :thinking="config.thinking"
    />
</template>

<script setup>

const props = defineProps({
    node: Object,
})

const config = computed(() => {
    try {
        const raw = props.node?.attrs?.content
        if (raw) return JSON.parse(raw)
    } catch { /* noop */ }
    return {}
})
</script>
