<template>
    <div class="office-render-container">
        <div v-if="config.url" class="office-render-preview" :style="{ height: `${config.height || 600}px` }">
            <iframe
                :src="previewUrl"
                class="office-iframe"
                frameborder="0"
                allowfullscreen
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

const previewUrl = computed(() => {
    const url = config.value.url
    if (!url) return ''
    return `https://view.officeapps.live.com/embed/?url=${encodeURIComponent(encodeURI(url))}`
})
</script>

<style scoped>
.office-render-container {
    margin: 12px 0;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}
.office-render-preview {
    width: 100%;
}
.office-iframe {
    width: 100%;
    height: 100%;
    border: none;
    min-height: 400px;
}
</style>
