<template>
    <!-- 配置面板 -->
    <div v-if="showConfig" class="vue-node-config">
        <UFormField :label="t('ueditor.sheetHeight')" size="sm">
            <UInput v-model.number="configHeight" type="number" size="sm" :placeholder="300" />
        </UFormField>
        <UButton size="xs" color="primary" @click="applyConfig">{{ t('common.save') }}</UButton>
    </div>

    <!-- Sheet 组件（始终显示） -->
    <div class="vue-node-body" :style="{ height: `${sheetHeight}px` }">
        <Sheet ref="sheetRef" :col-widths="{}" :row-count="100" :show-tools="true" :show-footer="false"
            :show-context-menu="true" :active="true" :initial-data="config.cellData" @change="onDataChange" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const showConfig = inject('nodeViewShowConfig')
const meta = inject('nodeViewMeta')

meta.title = t('ueditor.sheet')
meta.hasSettings = true

const sheetRef = ref(null)

const parseConfig = () => {
    try {
        const raw = props.node.attrs.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
}

const config = ref(parseConfig())
const sheetHeight = computed(() => Number(config.value.height) || 300)
const configHeight = ref(sheetHeight.value)

// showConfig 打开时同步临时值
watch(showConfig, (val) => {
    if (val) configHeight.value = sheetHeight.value
})

function applyConfig() {
    const newConfig = {
        ...config.value,
        height: Number(configHeight.value) || 300,
    }
    config.value = newConfig
    props.updateAttributes({ content: JSON.stringify(newConfig) })
    showConfig.value = false
    nextTick(() => sheetRef.value?.reset())
}

let saveTimer = null
function onDataChange() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
        const cellData = sheetRef.value?.getCellData?.()
        if (cellData) {
            const newConfig = { ...config.value, height: sheetHeight.value, cellData }
            config.value = newConfig
            props.updateAttributes({ content: JSON.stringify(newConfig) })
        }
    }, 800)
}
</script>
