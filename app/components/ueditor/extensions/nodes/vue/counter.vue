<template>
    <div class="vue-node-body p-2">
        <div class="flex items-center justify-center w-full gap-2">
            <UButton variant="outline" size="2xs" icon="i-heroicons-minus-small" @click="decrement"
                :disabled="count <= 0" />
            <span class="text-lg font-semibold min-w-[3ch] text-center tabular-nums">{{ count }}</span>
            <UButton variant="outline" size="2xs" icon="i-heroicons-plus-small" @click="increment" />
        </div>
    </div>
</template>

<script setup>
import { nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const meta = inject('nodeViewMeta')

// counter 无标题无设置，仅显示删除按钮
meta.hasSettings = false

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
