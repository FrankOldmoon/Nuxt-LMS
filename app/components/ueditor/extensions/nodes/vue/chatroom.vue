<template>
    <chatroomView :node="node" />
</template>

<script setup>
import { inject } from 'vue'
import chatroomView from '../../../render/nodes/vue/chatroom.vue'
const props = defineProps({
    node: Object,
})

// 设置节点工具栏元信息（显示标题 + 删除按钮）
const { t } = useI18n()
const meta = inject('nodeViewMeta')
meta.title = t('chatroom.label')
meta.icon = 'i-lucide-message-square-text'
meta.hasSettings = false
</script>

