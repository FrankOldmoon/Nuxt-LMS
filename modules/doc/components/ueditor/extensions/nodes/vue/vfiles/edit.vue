<template>
    <div class="flex items-center gap-2 mb-2">
        <UButton icon="i-lucide-folder-plus" size="xs" variant="outline" color="neutral"
            :label="t('ueditor.vfilesAddFolder')" @click="addItem('folder')" />
        <UButton icon="i-lucide-file-plus" size="xs" variant="outline" color="neutral"
            :label="t('ueditor.vfilesAddFile')" @click="addItem('file')" />
    </div>
    <div class="flex flex-col gap-1 max-h-96 overflow-y-auto">
        <div v-for="(node, idx) in editItems" :key="node.id"
            :style="{ paddingLeft: node.depth * 16 + 'px' }"
            class="flex items-center gap-1 p-0.5 bg-white rounded">
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
    <UButton size="xs" color="primary" @click="apply">{{ t('common.save') }}</UButton>
</template>

<script setup>
const props = defineProps({
    config: { type: Object, default: () => ({ items: [] }) },
})
const emit = defineEmits(['update:config', 'close'])
const { t } = useI18n()

const editItems = ref([])
let idCounter = 0

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
    walk(props.config?.items || [], 0)
}

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
        if (node.type === 'folder') stack.push(item)
    }
    return root.children
}

function apply() {
    const items = buildTree()
    emit('update:config', { items })
    emit('close')
}

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
    while (idx < editItems.value.length && editItems.value[idx].depth > removedDepth) {
        editItems.value.splice(idx, 1)
    }
}
function moveItem(idx, dir) {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= editItems.value.length) return
    const node = editItems.value[idx]
    const target = editItems.value[newIdx]
    if (dir > 0 && target.depth > node.depth) return
    const items = editItems.value
    const moved = items.splice(idx, 1)[0]
    items.splice(newIdx, 0, moved)
}

// 组件挂载时从 config 重建 editItems
onMounted(() => {
    rebuildEditItems()
})
</script>
