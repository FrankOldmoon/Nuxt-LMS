<template>
    <Teleport to="body">
        <Transition name="image-modal">
            <div v-if="open" class="image-modal-overlay" @click="close">
                <!-- Image fills screen -->
                <img v-if="currentImage" :src="currentImage" class="image-modal-img image-modal-img-png"
                    @click.stop="next" />
                <!-- Top toolbar (hover to show): left counter / right close -->
                <div class="image-modal-toolbar" @click.stop>
                    <span class="image-modal-counter">{{ currentIndex + 1 }} / {{ images.length }}</span>
                    <UButton icon="i-lucide-x" color="neutral" variant="solid" size="sm" @click="close" />
                </div>

                <!-- Left/right navigation (hover to show) -->
                <UButton v-if="images.length > 1" icon="i-lucide-chevron-left" color="neutral" variant="solid" size="lg"
                    class="image-modal-nav image-modal-nav-left" :disabled="images.length <= 1" @click.stop="prev" />
                <UButton v-if="images.length > 1" icon="i-lucide-chevron-right" color="neutral" variant="solid"
                    size="lg" class="image-modal-nav image-modal-nav-right" :disabled="images.length <= 1"
                    @click.stop="next" />

                <!-- BottomThumbnail（hover Show）-->
                <div v-if="images.length > 1" class="image-modal-thumbs" @click.stop>
                    <div v-for="(img, idx) in images" :key="idx" class="image-modal-thumb"
                        :class="{ active: idx === currentIndex }" @click="currentIndex = idx">
                        <img :src="img" />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useImageModal } from './useImageModal'

const props = defineProps({
    open: { type: Boolean, default: false },
    images: { type: Array, default: () => [] },
    initialIndex: { type: Number, default: 0 },
})

const emit = defineEmits(['update:open'])

const {
    currentIndex,
    currentImage,
    close,
    prev,
    next,
} = useImageModal(props, emit)

// PNG usually has transparent channel，Previewlay one layer whenWhiteBottomavoid hard-to-see transparent areas
const isPng = computed(() => {
    const src = currentImage.value
    if (!src) return false
    if (src.startsWith('data:')) return /image\/png/i.test(src)
    const clean = src.split('?')[0].split('#')[0]
    return /\.png$/i.test(clean)
})
</script>

<style scoped>
    @import './imageModal.css';

    /* PNG with transparent channel，Previewlay whenWhiteBottomavoid hard-to-see transparent areas */
    .image-modal-img-png {
        background: #fff;
    }
</style>
