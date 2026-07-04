<template>
    <!-- 配置面板：管理 tab 列表 -->
    <div v-if="showConfig" class="vue-node-config">
        <div v-for="(tab, idx) in editTabs" :key="idx" class="flex items-center gap-2">
            <UInput v-model="tab.label" :placeholder="t('ueditor.tabsLabel')" size="sm" class="w-40" />
            <UButton icon="i-lucide-x" color="error" variant="ghost" size="xs" @click="editTabs.splice(idx, 1)" />
        </div>
        <UButton icon="i-lucide-plus" color="neutral" variant="outline" size="xs"
            :label="t('ueditor.tabsAdd')" @click="editTabs.push({ label: '', content: '' })" />
        <USeparator />
        <UButton size="xs" color="primary" @click="applyConfig">{{ t('common.save') }}</UButton>
    </div>

    <!-- 预览/编辑区（始终显示，实时预览） -->
    <div class="vue-node-body">
        <UTabs :items="tabItems" class="p-3">
            <template #content="{ item }">
                <div style="padding-top: 12px; min-height: 60px;">
                    <RichEditor v-model="item.content" />
                </div>
            </template>
        </UTabs>
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

// 从父级 node-view.vue 注入通用状态
const showConfig = inject('nodeViewShowConfig')
const meta = inject('nodeViewMeta')

// 注册组件元信息
meta.title = t('ueditor.tabs')
meta.icon = 'i-lucide-panel-top'
meta.hasSettings = true

const parseConfig = () => {
    try {
        const raw = props.node.attrs.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
}
const config = ref(parseConfig())

const editTabs = ref([...(config.value.tabs || [{ label: 'Tab 1', content: '' }, { label: 'Tab 2', content: '' }])])

const tabItems = computed(() => editTabs.value)

// showConfig 变化时重新加载编辑 tabs
watch(showConfig, (val) => {
    if (val) {
        editTabs.value = [...(config.value.tabs || [{ label: 'Tab 1', content: '' }, { label: 'Tab 2', content: '' }])]
    }
})

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
</script>
