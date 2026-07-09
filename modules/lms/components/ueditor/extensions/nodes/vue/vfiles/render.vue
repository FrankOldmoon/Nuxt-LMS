<template>
    <div class="vfiles-render-container">
        <div class="flex" style="min-height: 300px;">
            <!-- 左侧导航 -->
            <div class="vfiles-render-nav">
                <UNavigationMenu :items="navItems" orientation="vertical" class="w-full" />
            </div>
            <!-- 右侧内容展示 -->
            <div class="vfiles-render-content">
                <div v-if="selectedFile" class="flex flex-col h-full">
                    <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <UIcon name="i-lucide-file" class="size-4 text-gray-400" />
                        <span class="text-sm font-medium">{{ selectedFile.label }}</span>
                    </div>
                    <div class="flex-1 overflow-auto">
                        <ueditorRender :json="selectedFile.content" />
                    </div>
                </div>
                <div v-else class="flex items-center justify-center h-full text-gray-400 text-sm">
                    {{ $t('ueditor.vfilesSelectHint') }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    node: Object,
})

const { t } = useI18n()

const config = computed(() => {
    try {
        const raw = props.node?.attrs?.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return { items: [] }
})

const selectedId = ref(null)

// 自动选择第一个文件
watch(() => config.value.items, (items) => {
    if (!selectedId.value && items && items.length) {
        function findFirstFile(nodes) {
            for (const n of nodes) {
                if (n.type === 'file') return n.id
                if (n.children) {
                    const f = findFirstFile(n.children)
                    if (f) return f
                }
            }
            return null
        }
        selectedId.value = findFirstFile(items)
    }
}, { immediate: true })

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
            }
            if (item.type === 'file') {
                navItem.onSelect = () => { selectedId.value = item.id }
                if (item.id === selectedId.value) navItem.active = true
            }
            if (item.children && item.children.length) {
                navItem.children = build(item.children)
                if (item.children.some(c => c.id === selectedId.value || (c.children && containsActive(c.children)))) {
                    navItem.defaultOpen = true
                }
            }
            return navItem
        })
    }
    return build(config.value.items || [])
})

function containsActive(items) {
    return items.some(i => i.id === selectedId.value || (i.children && containsActive(i.children)))
}
</script>

<style scoped>
.vfiles-render-container {
    margin: 12px 0;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
    overflow: hidden;
}
.vfiles-render-nav {
    width: 220px;
    border-right: 1px solid #e5e7eb;
    padding: 8px;
    overflow-y: auto;
    max-height: 500px;
}
.vfiles-render-content {
    flex: 1;
    padding: 16px;
    min-width: 0;
    max-height: 500px;
    overflow: hidden;
}
</style>
