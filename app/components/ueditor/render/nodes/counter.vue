<template>
    <div class="umo-node-view" :style="nodeStyle" data-node-view-wrapper="">
        <div class="umo-node-container umo-node-counter w-full">
            <div class="flex w-full items-center justify-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 select-none"
                contenteditable="false">
                    <UButton variant="outline" size="2xs" icon="i-heroicons-minus-small" @click="decrement"
                        :disabled="count <= 0" />
                    <span class="text-lg font-semibold min-w-[3ch] text-center tabular-nums">{{ count }}</span>
                    <UButton variant="outline" size="2xs" icon="i-heroicons-plus-small" @click="increment" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { computeAtomNodeStyle } from '../helpers' // 路径按项目调整
const props = defineProps({
    node: { type: Object, required: true },
})

const attrs = computed(() => props.node.attrs || {})
const count = ref(Number(attrs.value.content) ?? 0)
const nodeStyle = computed(() => computeAtomNodeStyle(attrs.value))

const increment = () => {
    count.value += 1
}
const decrement = () => {
    if (count.value > 0) {
        count.value -= 1
    }
}
</script>
