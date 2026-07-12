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
import { useVfilesRender } from './useVfilesRender'

const props = defineProps({
    node: Object,
})

const { navItems, selectedFile } = useVfilesRender(props)
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
