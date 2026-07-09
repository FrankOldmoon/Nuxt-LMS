<template>
    <node-view-wrapper style="display: inline;">
        <select v-model="content" class="mx-1 inline-block px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-gray-50 dark:bg-gray-800 w-32"
            @change="onContentChange">
            <option value="" disabled>{{ placeholder }}</option>
            <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
        </select>
    </node-view-wrapper>
</template>

<script setup>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
const props = defineProps(nodeViewProps)
const { t } = useI18n()

// 从 question 编辑上下文注入 form，获取 options
const questionForm = inject('questionForm', null)
const options = computed(() => questionForm?.value?.options || [])
const placeholder = computed(() => options.value.length ? t('common.selectPlaceholder') : (props.node?.attrs?.content || t('selectNode.dropdown')))

const content = ref(props.node?.attrs?.content || '')

function onContentChange() {
    props.updateAttributes({ content: content.value })
}
</script>
