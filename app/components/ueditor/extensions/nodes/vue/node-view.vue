<template>
    <node-view-wrapper class="counter-node-wrapper">
        <div class="flex items-center justify-center w-full gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 select-none"
            contenteditable="false">
            <component :is="comp" v-bind="props"/>
        </div>
    </node-view-wrapper>
</template>

<script setup>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

import counter from './counter.vue'

const comps = {counter}
const props = defineProps(nodeViewProps)
const comp = comps[props.node.type]

</script>
