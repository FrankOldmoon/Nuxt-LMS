<template>
    <div class="mindmap-render-wrapper">
        <div ref="mindmapRef" class="mindmap-render-preview" :style="{ height: dynamicHeight + 'px', width: dynamicWidth }" />
    </div>
</template>

<script setup>
import { useMindmapRender } from './useMindmapRender'

const props = defineProps({
    node: Object,
})

const { mindmapRef, dynamicHeight, dynamicWidth } = useMindmapRender(props)
</script>

<style scoped>
.mindmap-render-wrapper {
    width: 100%;
    overflow: auto;
    margin: 12px 0;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
}

.mindmap-render-preview {
    min-height: 300px;
    background: #fff;
}
</style>
