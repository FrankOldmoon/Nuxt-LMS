<template>
    <div class="p-2">
        <Edit v-if="showConfig" :config="config" @update:config="onConfigChange" @close="showConfig = false" />
    </div>
    <!-- Sheet Component（Start and end show，interactiveEdit） -->
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

// onetimespropertyFastaccording：onlyuseinInitialize Sheet，nowillbecauselocalGroundSaveandchange
// avoid onDataChange SaveBack config.cellData change → Trigger Sheet  initialData watch → HeavyNewInitialize（DestroyCurrentWorkbook）
const initialCellData = ref(config.value.cellData || null)

// TrackUptimesSaveData，avoid unmustneed updateAttributes Call
let lastSavedDataStr = JSON.stringify(config.value.cellData || null)

function onConfigChange(newConfig) {
    // firstSaveCurrent Data，thenuseLatestData Update initialCellData，avoid reset() lost unSaveInput
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

// periodicAuto save（safety net：preventEventevent listener missing causesDatalost）
let autoSaveTimer = null
function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') flushSave()
}

onMounted(() => {
    autoSaveTimer = setInterval(() => { flushSave() }, 3000)
    document.addEventListener('visibilitychange', handleVisibilityChange)
})

// ComponentUnmountFrontRefreshnotSaveData
onBeforeUnmount(() => {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer)
        autoSaveTimer = null
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    flushSave()
})
</script>
