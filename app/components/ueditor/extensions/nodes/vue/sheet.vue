<template>
    <node-view-wrapper class="sheet-node-wrapper">
        <div class="sheet-node-container" contenteditable="false">
            <!-- 工具栏 -->
            <div class="sheet-node-toolbar">
                <span class="text-xs text-gray-500">{{ t('ueditor.sheet') }}</span>
                <div class="flex items-center gap-1">
                    <UButton
                        icon="i-lucide-settings-2"
                        color="neutral"
                        variant="ghost"
                        size="2xs"
                        @click="toggleConfig"
                    />
                    <UButton
                        icon="i-lucide-trash-2"
                        color="error"
                        variant="ghost"
                        size="2xs"
                        @click="deleteNode"
                    />
                </div>
            </div>

            <!-- 配置面板 -->
            <div v-if="showConfig" class="sheet-node-config">
                <UFormField :label="t('ueditor.sheetHeight')" size="sm">
                    <UInput
                        v-model.number="configHeight"
                        type="number"
                        size="sm"
                        :placeholder="300"
                    />
                </UFormField>
                <UButton size="xs" color="primary" @click="applyConfig">
                    {{ t('common.save') }}
                </UButton>
            </div>

            <!-- Sheet 组件 -->
            <div class="sheet-node-body" :style="{ height: `${sheetHeight}px` }">
                <Sheet
                    ref="sheetRef"
                    :col-widths="{}"
                    :row-count="100"
                    :show-header="true"
                    :show-footer="false"
                    :show-context-menu="true"
                    :active="true"
                    :initial-data="config.cellData"
                    @change="onDataChange"
                />
            </div>
        </div>
    </node-view-wrapper>
</template>

<script setup>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const sheetRef = ref(null)
const showConfig = ref(false)

// 从 node attrs 解析配置
const parseConfig = () => {
    try {
        const raw = props.node.attrs.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
}

const config = ref(parseConfig())

const sheetHeight = computed(() => Number(config.value.height) || 300)

// 配置面板临时值
const configHeight = ref(sheetHeight.value)

function toggleConfig() {
    configHeight.value = sheetHeight.value
    showConfig.value = !showConfig.value
}

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

// 数据变化时自动保存到 node attrs（防抖 800ms）
let saveTimer = null
function onDataChange() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
        const cellData = sheetRef.value?.getCellData?.()
        if (cellData) {
            const newConfig = {
                ...config.value,
                height: sheetHeight.value,
                cellData,
            }
            config.value = newConfig
            props.updateAttributes({ content: JSON.stringify(newConfig) })
        }
    }, 800)
}

function deleteNode() {
    props.deleteNode()
}
</script>

<style scoped>
.sheet-node-container {
    border: 1px solid var(--umo-content-node-border, #e5e7eb);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}
.sheet-node-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
}
.sheet-node-config {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    padding: 8px;
    background: #f3f4f6;
    border-bottom: 1px solid #e5e7eb;
    flex-wrap: wrap;
}
.sheet-node-body {
    width: 100%;
    min-height: 200px;
}
</style>
