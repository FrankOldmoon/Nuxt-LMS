<template>
    <node-view-wrapper class="vue-node-wrapper">
        <div class="vue-node-container" contenteditable="false">
            <!-- 工具栏（仅有 meta.title 时显示） -->
            <div v-if="meta.title" class="vue-node-toolbar">
                <div class="flex items-center gap-2">
                    <UIcon v-if="meta.icon" :name="meta.icon" class="text-gray-500" />
                    <span class="text-sm font-medium">{{ meta.title }}</span>
                </div>
                <div class="flex items-center gap-1">
                    <UButton v-if="meta.hasSettings" icon="i-lucide-settings-2" color="neutral" variant="ghost"
                        size="2xs" @click="showConfig = !showConfig" />
                    <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="2xs"
                        @click="props.deleteNode()" />
                </div>
            </div>

            <!-- 动态加载的组件（自行渲染 config panel + body） -->
            <div v-if="loading" class="vue-node-loading">加载中...</div>
            <component v-else-if="comp" :is="comp" v-bind="props" style="width:100%" />
        </div>
    </node-view-wrapper>
</template>

<script setup>
import { ref, reactive, watch, provide } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const comp = ref(null)
const loading = ref(false)

// ====================== 通用状态（provide 给子组件） ======================

// 配置面板开关
const showConfig = ref(false)

// 组件元信息（子组件在 setup 中设置）
const meta = reactive({
    title: '',
    icon: '',
    hasSettings: false,
})

// 提供给子组件
provide('nodeViewShowConfig', showConfig)
provide('nodeViewMeta', meta)

// ====================== 动态加载子组件 ======================

watch(
    () => props.node.attrs.type,
    async (type) => {
        // 切换组件时重置 meta
        meta.title = ''
        meta.icon = ''
        meta.hasSettings = false
        showConfig.value = false

        comp.value = null
        if (!type) return
        loading.value = true
        try {
            let mod
            try {
                mod = await import(`./${type}.vue`)
            } catch {
                mod = await import(`./${type}/index.vue`)
            }
            comp.value = mod.default
        } catch (err) {
            console.warn(`组件 ${type} 不存在，加载失败`, err)
        } finally {
            loading.value = false
        }
    },
    { immediate: true }
)
</script>

<style>
/* ====================== 通用样式（非 scoped，子组件可直接使用） ====================== */
.vue-node-container {
    border: 1px solid var(--umo-content-node-border, #e5e7eb);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}

.vue-node-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
}

.vue-node-config {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: #f3f4f6;
}

.vue-node-body {
    padding: 0;
}

.vue-node-loading {
    padding: 12px;
    text-align: center;
    color: #9ca3af;
    font-size: 13px;
}

/* dark mode */
.dark .vue-node-container {
    background: #1f2937;
}
.dark .vue-node-toolbar {
    background: #111827;
    border-bottom-color: #374151;
}
.dark .vue-node-config {
    background: #111827;
}
</style>
