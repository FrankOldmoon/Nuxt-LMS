<template>
    <Edit v-if="showConfig" :config="config" @update:config="onConfigChange" @close="showConfig = false" />
    <!-- 预览/编辑区（始终显示，交互式编辑文件内容） -->
    <div class="vue-node-body">
        <div class="flex" style="min-height: 300px;">
            <!-- 左侧导航 -->
            <div style="width: 220px; border-right: 1px solid #e5e7eb; padding: 8px; overflow-y: auto; max-height: 400px;">
                <UNavigationMenu :items="navItems" orientation="vertical" class="w-full" />
            </div>
            <!-- 右侧内容编辑 -->
            <div style="flex: 1; padding: 12px; min-width: 0; max-height: 400px; overflow: hidden;">
                <div v-if="selectedFile" class="flex flex-col h-full">
                    <div class="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <UIcon name="i-lucide-file" class="size-4 text-gray-400" />
                        <span class="text-sm font-medium">{{ selectedFile.label }}</span>
                    </div>
                    <div class="flex-1 overflow-auto">
                        <RichEditor v-model="selectedFile.content" />
                    </div>
                </div>
                <div v-else class="flex items-center justify-center h-full text-gray-400 text-sm">
                    {{ t('ueditor.vfilesSelectHint') }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'
import Edit from './edit.vue'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const showConfig = inject('nodeViewShowConfig')
const meta = inject('nodeViewMeta')

meta.title = t('ueditor.vfiles')
meta.icon = 'i-lucide-folder-tree'
meta.hasSettings = true

const parseConfig = () => {
    try {
        const raw = props.node.attrs.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return { items: [] }
}
const config = ref(parseConfig())

function onConfigChange(newConfig) {
    config.value = newConfig
    props.updateAttributes({ content: JSON.stringify(newConfig) })
}

// 预览模式
const selectedId = ref(null)
const selectedFile = computed(() => {
    if (!selectedId.value) return null
    function find(items) {
        for (const item of items) {
            if (item.id === selectedId.value && item.type === 'file') return item
            if (item.children) {
                const found = find(item.children)
                if (found) return found
            }
        }
        return null
    }
    return find(config.value.items || [])
})

const navItems = computed(() => {
    function build(items) {
        return items.map(item => {
            const navItem = {
                label: item.label || t('ueditor.vfilesUnnamed'),
                icon: item.type === 'folder' ? 'i-lucide-folder' : 'i-lucide-file',
                _id: item.id,
                onSelect: () => { if (item.type === 'file') selectedId.value = item.id },
            }
            if (item.children && item.children.length) {
                navItem.children = build(item.children)
            }
            return navItem
        })
    }
    return build(config.value.items || [])
})

// 编辑文件内容时防抖保存
let saveTimer = null
watch(() => selectedFile.value?.content, () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
        function updateContent(items) {
            for (const item of items) {
                if (item.id === selectedId.value && item.type === 'file') {
                    item.content = selectedFile.value.content
                    return true
                }
                if (item.children && updateContent(item.children)) return true
            }
            return false
        }
        updateContent(config.value.items || [])
        props.updateAttributes({ content: JSON.stringify(config.value) })
    }, 800)
}, { deep: true })
</script>
