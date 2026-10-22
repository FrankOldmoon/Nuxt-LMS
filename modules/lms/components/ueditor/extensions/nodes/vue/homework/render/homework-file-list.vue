<template>
    <!-- 复用 ueditor file 扩展的节点渲染：文件卡片自带预览（office/zip/3d/文本在线预览）与下载按钮 -->
    <div v-if="items.length" class="space-y-1.5">
        <UeditorFileNode v-for="(file, i) in items" :key="file.url || i" :node="fileNode(file)" />
    </div>
</template>

<script setup>
import UeditorFileNode from '../../../../../render/nodes/file.vue'

const props = defineProps({
    files: { type: Array, default: () => [] },
})

const items = useFileNames(() => props.files)

// 构造假 tiptap node（attrs 与 file 节点一致），供 file 扩展渲染器直接复用
function fileNode(file) {
    return { attrs: { url: file.url, name: file.name, size: file.size } }
}
</script>
