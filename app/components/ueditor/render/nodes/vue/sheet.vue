<template>
    <div class="sheet-render-container">
        <div class="sheet-render-body" :style="{ height: `${sheetHeight}px` }">
            <Sheet
                :col-widths="{}"
                :row-count="100"
                :show-header="true"
                :show-footer="false"
                :show-context-menu="false"
                :active="true"
                :initial-data="cellData"
            />
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    node: Object,
})

const config = computed(() => {
    try {
        const raw = props.node?.attrs?.content
        if (raw) return JSON.parse(raw)
    } catch (_) { /* noop */ }
    return {}
})

const sheetHeight = computed(() => Number(config.value.height) || 300)
const cellData = computed(() => config.value.cellData || null)
</script>

<style scoped>
.sheet-render-container {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
    margin: 12px 0;
}
.sheet-render-body {
    width: 100%;
    min-height: 200px;
}
</style>
