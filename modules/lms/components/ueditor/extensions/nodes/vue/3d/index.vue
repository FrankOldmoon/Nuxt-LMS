<template>
    <div class="p-2">
        <Edit v-if="showConfig" :config="config" @update:config="onConfigChange" @close="showConfig = false" />
    </div>
    <div class="vue-node-body">
        <div v-if="!hasModels" class="flex flex-col items-center justify-center py-10">
            <UIcon name="i-lucide-box" class="size-8 text-gray-300" />
            <p class="text-sm text-gray-400 mt-2">{{ t('ueditor.modelSelectHint') }}</p>
        </div>
        <Render v-else :node="node" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import Edit from './edit.vue'
import Render from './render.vue'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const showConfig = inject('nodeViewShowConfig')
const meta = inject('nodeViewMeta')

meta.icon = 'i-lucide-box'
meta.hasSettings = true

const parseConfig = () => {
    try {
        const raw = props.node.attrs.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return { models: [], height: 500, bg: '#1e293b', autoRotate: false }
}
const config = ref(parseConfig())

const hasModels = computed(() => Array.isArray(config.value.models) && config.value.models.length > 0)

meta.title = config.value.name || t('ueditor.model3d')
watch(() => config.value.name, (val) => {
    meta.title = val || t('ueditor.model3d')
})

function onConfigChange(newConfig) {
    config.value = newConfig
    props.updateAttributes({ content: JSON.stringify(newConfig) })
}
</script>
