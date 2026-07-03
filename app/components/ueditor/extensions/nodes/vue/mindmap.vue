<template>
    <node-view-wrapper class="mindmap-node-wrapper">
        <div class="mindmap-node-container" contenteditable="false">
            <!-- 工具栏 -->
            <div class="mindmap-node-toolbar">
                <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-network" class="text-gray-500" />
                    <span class="text-sm font-medium">{{ t('ueditor.mindmap') }}</span>
                </div>
                <div class="flex items-center gap-1">
                    <UButton icon="i-lucide-settings-2" color="neutral" variant="ghost" size="2xs"
                        @click="toggleEditor" />
                    <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="2xs" @click="deleteNode" />
                </div>
            </div>

            <!-- Markdown 编辑区 -->
            <div v-if="showEditor" class="mindmap-node-editor">
                <monaco v-model="markdownText" language="markdown" />
                <div class="flex justify-end gap-2 mt-2">
                    <UButton size="xs" color="neutral" variant="outline" @click="showEditor = false">{{
                        t('common.cancel') }}</UButton>
                    <UButton size="xs" color="primary" @click="applyMarkdown">{{ t('common.save') }}</UButton>
                </div>
            </div>

            <!-- 引用渲染端组件预览 -->
            <UeditorRenderNodesVueMindmap v-show="!showEditor" :node="node" />
        </div>
    </node-view-wrapper>
</template>

<script setup>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const showEditor = ref(false)
const markdownText = ref(props.node.attrs.content || '')

function toggleEditor() {
    markdownText.value = props.node.attrs.content || ''
    showEditor.value = !showEditor.value
}

function applyMarkdown() {
    props.updateAttributes({ content: markdownText.value })
    showEditor.value = false
}

function deleteNode() {
    props.deleteNode()
}
</script>

<style scoped>
.mindmap-node-container {
    border: 1px solid var(--umo-content-node-border, #e5e7eb);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}

.mindmap-node-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
}

.mindmap-node-editor {
    padding: 12px;
}

.mindmap-textarea {
    width: 100%;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 8px;
    font-size: 13px;
    font-family: monospace;
    resize: vertical;
    outline: none;
}

.mindmap-textarea:focus {
    border-color: #2563eb;
}
</style>
