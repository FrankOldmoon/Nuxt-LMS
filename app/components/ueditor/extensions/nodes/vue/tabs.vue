<template>
    <node-view-wrapper class="tabs-node-wrapper">
        <div class="tabs-node-container" contenteditable="false">
            <!-- 工具栏 -->
            <div class="tabs-node-toolbar">
                <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-panel-top" class="text-gray-500" />
                    <span class="text-sm font-medium">{{ t('ueditor.tabs') }}</span>
                </div>
                <div class="flex items-center gap-1">
                    <UButton icon="i-lucide-settings-2" color="neutral" variant="ghost" size="2xs" @click="toggleConfig" />
                    <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="2xs" @click="deleteNode" />
                </div>
            </div>

            <!-- 配置面板：管理 tab 列表 -->
            <div v-if="showConfig" class="tabs-node-config">
                <div v-for="(tab, idx) in editTabs" :key="idx" class="flex items-center gap-2">
                    <UInput v-model="tab.label" :placeholder="t('ueditor.tabsLabel')" size="sm" class="w-40" />
                    <UButton icon="i-lucide-x" color="error" variant="ghost" size="xs" @click="editTabs.splice(idx, 1)" />
                </div>
                <UButton
                    icon="i-lucide-plus"
                    color="neutral"
                    variant="outline"
                    size="xs"
                    :label="t('ueditor.tabsAdd')"
                    @click="editTabs.push({ label: '', content: '' })"
                />
                <USeparator />
                <UButton size="xs" color="primary" @click="applyConfig">{{ t('common.save') }}</UButton>
            </div>

            <!-- 编辑模式：UTabs + RichEditor -->
            <div v-show="!showConfig" class="tabs-node-body">
                <UTabs :items="tabItems">
                    <template #content="{ item }">
                        <div class="tabs-edit-content">
                            <RichEditor v-model="item.content" />
                        </div>
                    </template>
                </UTabs>
            </div>
        </div>
    </node-view-wrapper>
</template>

<script setup>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const showConfig = ref(false)

const parseConfig = () => {
    try {
        const raw = props.node.attrs.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
}
const config = ref(parseConfig())

const editTabs = ref([...(config.value.tabs || [{ label: 'Tab 1', content: '' }, { label: 'Tab 2', content: '' }])])

// UTabs 用的 items，直接引用 editTabs 中的对象（v-model 双向绑定）
const tabItems = computed(() => editTabs.value)

function toggleConfig() {
    editTabs.value = [...(config.value.tabs || [{ label: 'Tab 1', content: '' }, { label: 'Tab 2', content: '' }])]
    showConfig.value = !showConfig.value
}

function applyConfig() {
    const tabs = editTabs.value.filter(t => t.label.trim())
    const newConfig = { tabs: tabs.length ? tabs : [{ label: 'Tab 1', content: '' }] }
    config.value = newConfig
    editTabs.value = [...newConfig.tabs]
    props.updateAttributes({ content: JSON.stringify(newConfig) })
    showConfig.value = false
}

// RichEditor 内容变化时自动保存到 node attrs（防抖）
let saveTimer = null
watch(tabItems, () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
        const newConfig = { tabs: editTabs.value }
        config.value = newConfig
        props.updateAttributes({ content: JSON.stringify(newConfig) })
    }, 800)
}, { deep: true })

function deleteNode() {
    props.deleteNode()
}
</script>

<style scoped>
.tabs-node-container {
    border: 1px solid var(--umo-content-node-border, #e5e7eb);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}
.tabs-node-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
}
.tabs-node-config {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: #f3f4f6;
}
.tabs-node-body {
    padding: 12px;
}
.tabs-edit-content {
    padding-top: 12px;
    min-height: 60px;
}
</style>
