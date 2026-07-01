<template>
    <node-view-wrapper class="counter-node-wrapper">
        <div class="flex items-center justify-center w-full gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 select-none"
            contenteditable="false">
            <UButton variant="outline" size="2xs" icon="i-heroicons-minus-small" @click="decrement"
                :disabled="count <= 0" />
            <span class="text-lg font-semibold min-w-[3ch] text-center tabular-nums">{{ count }}</span>
            <UButton variant="outline" size="2xs" icon="i-heroicons-plus-small" @click="increment" />
        </div>
    </node-view-wrapper>
</template>

<script setup>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computed } from 'vue'

const props = defineProps(nodeViewProps)
const count = computed(() => Number(props.node.attrs.content))

const increment = () => {
    props.updateAttributes({ content: count.value + 1 })
}
const decrement = () => {
    if (count.value > 0) {
        props.updateAttributes({ content: count.value - 1 })
    }
}
</script>

<style scoped>

    /* 可选：避免拖动时选中内部文本 */
    .counter-node-wrapper {
        user-select: none;
    }
</style>