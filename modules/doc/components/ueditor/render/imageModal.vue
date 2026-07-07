<template>
    <Teleport to="body">
        <Transition name="image-modal">
            <div v-if="open" class="image-modal-overlay" @click="close">
                <div class="image-modal-toolbar" @click.stop>
                    <span class="text-sm text-gray-300">{{ currentIndex + 1 }} / {{ images.length }}</span>
                    <div class="flex items-center gap-2">
                        <UButton icon="i-lucide-chevron-left" color="neutral" variant="ghost" size="sm" :disabled="images.length <= 1" @click="prev" />
                        <UButton icon="i-lucide-chevron-right" color="neutral" variant="ghost" size="sm" :disabled="images.length <= 1" @click="next" />
                        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="close" />
                    </div>
                </div>
                <div class="image-modal-content" @click.stop>
                    <img v-if="currentImage" :src="currentImage" class="image-modal-img" @click="next" />
                </div>
                <div v-if="images.length > 1" class="image-modal-thumbs" @click.stop>
                    <div
                        v-for="(img, idx) in images"
                        :key="idx"
                        class="image-modal-thumb"
                        :class="{ active: idx === currentIndex }"
                        @click="currentIndex = idx"
                    >
                        <img :src="img" />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
const props = defineProps({
    open: { type: Boolean, default: false },
    images: { type: Array, default: () => [] },
    initialIndex: { type: Number, default: 0 },
})

const emit = defineEmits(['update:open'])

const currentIndex = ref(props.initialIndex)

const currentImage = computed(() => props.images[currentIndex.value])

watch(() => props.open, (val) => {
    if (val) currentIndex.value = props.initialIndex
})

watch(() => props.initialIndex, (val) => {
    currentIndex.value = val
})

function close() {
    emit('update:open', false)
}

function prev() {
    currentIndex.value = (currentIndex.value - 1 + props.images.length) % props.images.length
}

function next() {
    currentIndex.value = (currentIndex.value + 1) % props.images.length
}

function onKeydown(e) {
    if (!props.open) return
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowLeft') prev()
    else if (e.key === 'ArrowRight') next()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.image-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
}
.image-modal-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    flex-shrink: 0;
}
.image-modal-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    min-height: 0;
}
.image-modal-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    cursor: pointer;
}
.image-modal-thumbs {
    display: flex;
    gap: 8px;
    padding: 12px 20px;
    overflow-x: auto;
    flex-shrink: 0;
    justify-content: center;
}
.image-modal-thumb {
    flex-shrink: 0;
    width: 60px;
    height: 60px;
    border: 2px solid transparent;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    opacity: 0.5;
    transition: all 0.2s;
}
.image-modal-thumb:hover {
    opacity: 0.8;
}
.image-modal-thumb.active {
    border-color: #fff;
    opacity: 1;
}
.image-modal-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.image-modal-enter-active,
.image-modal-leave-active {
    transition: opacity 0.2s;
}
.image-modal-enter-from,
.image-modal-leave-to {
    opacity: 0;
}
</style>
