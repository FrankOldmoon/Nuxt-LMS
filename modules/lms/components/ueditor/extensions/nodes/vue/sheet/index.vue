<template>
    <div class="p-2">
        <Edit v-if="showConfig" :config="config" @update:config="onConfigChange" @close="showConfig = false" />
    </div>
    <!-- Sheet 组件（始终显示，交互式编辑） -->
    <div class="vue-node-body" :style="{ height: `${sheetHeight}px` }">
        <Sheet ref="sheetRef" :col-widths="{}" :row-count="100" :show-tools="true" :show-footer="false"
            :show-context-menu="true" :active="true" :initial-data="initialCellData" @change="onDataChange" />
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import Edit from './edit.vue'

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

// 一次性快照：仅用于初始化 Sheet，不会因本地保存而变化
// 避免 onDataChange 保存后 config.cellData 变化 → 触发 Sheet 的 initialData watch → 重新初始化（销毁当前工作簿）
const initialCellData = ref(config.value.cellData || null)

// 跟踪上次保存的数据，避免不必要的 updateAttributes 调用
let lastSavedDataStr = JSON.stringify(config.value.cellData || null)

function onConfigChange(newConfig) {
    // 先保存当前数据，再用最新数据更新 initialCellData，避免 reset() 丢失未保存的输入
    flushSave()
    initialCellData.value = config.value.cellData || null

    config.value = newConfig
    lastSavedDataStr = JSON.stringify(newConfig.cellData || null)
    props.updateAttributes({ content: JSON.stringify(newConfig) })
    showConfig.value = false
    nextTick(() => sheetRef.value?.reset())
}

let saveTimer = null
function flushSave() {
    if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
    }
    const cellData = sheetRef.value?.getCellData?.()
    if (!cellData) return
    const dataStr = JSON.stringify(cellData)
    if (dataStr === lastSavedDataStr) return
    lastSavedDataStr = dataStr
    const newConfig = { ...config.value, height: sheetHeight.value, cellData }
    config.value = newConfig
    props.updateAttributes({ content: JSON.stringify(newConfig) })
}

function onDataChange() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
        saveTimer = null
        flushSave()
    }, 500)
}

// 定期自动保存（安全网：防止事件监听遗漏导致数据丢失）
let autoSaveTimer = null
function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') flushSave()
}

onMounted(() => {
    autoSaveTimer = setInterval(() => { flushSave() }, 3000)
    document.addEventListener('visibilitychange', handleVisibilityChange)
})

// 组件卸载前刷新未保存的数据
onBeforeUnmount(() => {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer)
        autoSaveTimer = null
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    flushSave()
})
</script>
