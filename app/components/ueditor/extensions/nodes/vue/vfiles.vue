<template>
    <node-view-wrapper class="vfiles-node-wrapper">
        <div class="vfiles-node-container" contenteditable="false">
            <!-- 工具栏 -->
            <div class="vfiles-node-toolbar">
                <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-folder-tree" class="text-gray-500" />
                    <span class="text-sm font-medium">{{ t('ueditor.vfiles') }}</span>
                </div>
                <div class="flex items-center gap-1">
                    <UButton icon="i-lucide-settings-2" color="neutral" variant="ghost" size="2xs"
                        @click="toggleConfig" />
                    <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="2xs" @click="deleteNode" />
                </div>
            </div>

            <!-- 配置面板：管理文件树 -->
            <div v-if="showConfig" class="vfiles-node-config">
                <div class="flex items-center gap-2 mb-2">
                    <UButton icon="i-lucide-folder-plus" size="xs" variant="outline" color="neutral"
                        :label="t('ueditor.vfilesAddFolder')" @click="addItem('folder')" />
                    <UButton icon="i-lucide-file-plus" size="xs" variant="outline" color="neutral"
                        :label="t('ueditor.vfilesAddFile')" @click="addItem('file')" />
                </div>
                <div class="vfiles-edit-tree">
                    <div v-for="(node, idx) in editItems" :key="node.id"
                        :style="{ paddingLeft: node.depth * 16 + 'px' }" class="vfiles-edit-row">
                        <UIcon :name="node.type === 'folder' ? 'i-lucide-folder' : 'i-lucide-file'"
                            class="text-gray-400 size-4 shrink-0" />
                        <UInput v-model="node.label"
                            :placeholder="node.type === 'folder' ? t('ueditor.vfilesFolderName') : t('ueditor.vfilesFileName')"
                            size="xs" class="flex-1" />
                        <UButton v-if="node.type === 'folder'" icon="i-lucide-file-plus" color="neutral" variant="ghost"
                            size="2xs" @click="addChild(node, 'file')" />
                        <UButton v-if="node.type === 'folder'" icon="i-lucide-folder-plus" color="neutral"
                            variant="ghost" size="2xs" @click="addChild(node, 'folder')" />
                        <UButton icon="i-lucide-chevron-up" color="neutral" variant="ghost" size="2xs"
                            :disabled="idx === 0" @click="moveItem(idx, -1)" />
                        <UButton icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="2xs"
                            :disabled="idx === editItems.length - 1" @click="moveItem(idx, 1)" />
                        <UButton icon="i-lucide-x" color="error" variant="ghost" size="2xs" @click="removeItem(idx)" />
                    </div>
                </div>
                <USeparator class="my-2" />
                <UButton size="xs" color="primary" @click="applyConfig">{{ t('common.save') }}</UButton>
            </div>

            <!-- 预览模式 -->
            <div v-show="!showConfig" class="vfiles-node-body">
                <div class="flex" style="min-height: 300px;">
                    <!-- 左侧导航 -->
                    <div class="vfiles-nav">
                        <UNavigationMenu :items="navItems" orientation="vertical" class="w-full" @select="onSelect" />
                    </div>
                    <!-- 右侧内容编辑 -->
                    <div class="vfiles-content">
                        <div v-if="selectedFile" class="flex flex-col h-full">
                            <div
                                class="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
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
    return { items: [] }
}
const config = ref(parseConfig())

// 扁平化列表（配置编辑用），带 depth
const editItems = ref([])
let idCounter = 0
function flattenTree(items, depth = 0) {
    const result = []
    for (const item of items) {
        result.push({ ...item, depth })
    }
    return result
}
function rebuildEditItems() {
    editItems.value = []
    function walk(items, depth) {
        for (const item of items) {
            editItems.value.push({
                id: item.id || `n${idCounter++}`,
                label: item.label || '',
                type: item.type || 'file',
                content: item.content || '',
                depth,
            })
            if (item.children && item.children.length) {
                walk(item.children, depth + 1)
            }
        }
    }
    walk(config.value.items || [], 0)
}

function toggleConfig() {
    if (!showConfig.value) {
        rebuildEditItems()
    }
    showConfig.value = !showConfig.value
}

// 将扁平 editItems 转回树
function buildTree() {
    const items = JSON.parse(JSON.stringify(editItems.value))
    const root = { children: [] }
    const stack = [root]
    for (const node of items) {
        while (stack.length > node.depth + 1) stack.pop()
        const parent = stack[stack.length - 1]
        const item = { id: node.id, label: node.label, type: node.type }
        if (node.type === 'file') item.content = node.content
        else item.children = []
        parent.children.push(item)
        if (node.type === 'folder') {
            stack.push(item)
        }
    }
    return root.children
}

function applyConfig() {
    const items = buildTree()
    const newConfig = { items }
    config.value = newConfig
    props.updateAttributes({ content: JSON.stringify(newConfig) })
    showConfig.value = false
    selectedId.value = null
}

// 配置面板操作
function addItem(type) {
    editItems.value.push({ id: `n${idCounter++}`, label: '', type, content: '', depth: 0 })
}
function addChild(parentNode, type) {
    const idx = editItems.value.indexOf(parentNode)
    editItems.value.splice(idx + 1, 0, { id: `n${idCounter++}`, label: '', type, content: '', depth: parentNode.depth + 1 })
}
function removeItem(idx) {
    const node = editItems.value[idx]
    const removedDepth = node.depth
    editItems.value.splice(idx, 1)
    // 删除子节点
    while (idx < editItems.value.length && editItems.value[idx].depth > removedDepth) {
        editItems.value.splice(idx, 1)
    }
}
function moveItem(idx, dir) {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= editItems.value.length) return
    const node = editItems.value[idx]
    const target = editItems.value[newIdx]
    // 不能移入比自己层级深的节点后（会变成别的文件夹的子项）
    if (dir > 0 && target.depth > node.depth) return
    // 调整 depth
    const items = editItems.value
    const moved = items.splice(idx, 1)[0]
    items.splice(newIdx, 0, moved)
}

// 预览模式：导航菜单
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

function onSelect(e) {
    // NavigationMenu select 事件
}

function deleteNode() {
    props.deleteNode()
}

// 编辑文件内容时防抖保存
let saveTimer = null
watch(() => selectedFile.value?.content, () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
        // 更新 config 中对应文件的内容
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

<style scoped>
.vfiles-node-container {
    border: 1px solid var(--umo-content-node-border, #e5e7eb);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}

.vfiles-node-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
}

.vfiles-node-config {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: #f3f4f6;
}

.vfiles-edit-tree {
    max-height: 400px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.vfiles-edit-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px;
    background: #fff;
    border-radius: 4px;
}

.vfiles-node-body {
    padding: 0;
}

.vfiles-nav {
    width: 220px;
    border-right: 1px solid #e5e7eb;
    padding: 8px;
    overflow-y: auto;
    max-height: 400px;
}

.vfiles-content {
    flex: 1;
    padding: 12px;
    min-width: 0;
    max-height: 400px;
    overflow: hidden;
}
</style>
