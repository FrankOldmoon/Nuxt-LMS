<template>
    <div v-if="showConfig" class="vue-node-config">
        <div class="flex items-center gap-3">
            <UFormField :label="$t('chapter.minutes')" size="xs">
                <UInput v-model.number="cfgMinutes" type="number" min="0" max="180" size="sm" class="w-24" />
            </UFormField>
            <UFormField :label="$t('chapter.seconds')" size="xs">
                <UInput v-model.number="cfgSeconds" type="number" min="0" max="59" size="sm" class="w-24" />
            </UFormField>
            <UButton size="xs" color="neutral" variant="outline" @click="showConfig = false">{{ $t('common.close') }}</UButton>
        </div>
    </div>
    <div class="vue-node-body">
        <UeditorRenderNodesVueTimer :node="node" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const showConfig = inject('nodeViewShowConfig')
const meta = inject('nodeViewMeta')

meta.icon = 'i-lucide-timer'
meta.hasSettings = true

const parseConfig = () => {
    try {
        const raw = props.node.attrs.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return { minutes: 1, seconds: 0 }
}

const config = ref(parseConfig())
const cfgMinutes = ref(config.value.minutes ?? 1)
const cfgSeconds = ref(config.value.seconds ?? 0)

meta.title = t('chapter.timer')

watch(showConfig, (val) => {
    if (val) {
        cfgMinutes.value = config.value.minutes ?? 1
        cfgSeconds.value = config.value.seconds ?? 0
    }
})

// 分秒变化时立即保存到编辑器文档
watch([cfgMinutes, cfgSeconds], () => {
    const m = Math.max(0, Math.min(180, Number(cfgMinutes.value) || 0))
    const s = Math.max(0, Math.min(59, Number(cfgSeconds.value) || 0))
    const newConfig = { minutes: m, seconds: s }
    config.value = newConfig
    props.updateAttributes({ content: JSON.stringify(newConfig) })
})
</script>
