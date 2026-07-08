<template>
    <Teleport to="body">
        <Transition name="image-modal">
            <div v-if="open" class="image-modal-overlay" @click="close">
                <!-- 图片铺满屏幕 -->
                <img v-if="currentImage" :src="currentImage" class="image-modal-img" @click.stop="next" />

                <!-- 顶部工具栏（hover 显示）：左计数 / 右关闭 -->
                <div class="image-modal-toolbar" @click.stop>
                    <span class="image-modal-counter">{{ currentIndex + 1 }} / {{ images.length }}</span>
                    <UButton icon="i-lucide-x" color="neutral" variant="solid" size="sm" @click="close" />
                </div>

                <!-- 左右导航（hover 显示）-->
                <UButton v-if="images.length > 1" icon="i-lucide-chevron-left" color="neutral" variant="solid"
                    size="lg" class="image-modal-nav image-modal-nav-left" :disabled="images.length <= 1"
                    @click.stop="prev" />
                <UButton v-if="images.length > 1" icon="i-lucide-chevron-right" color="neutral" variant="solid"
                    size="lg" class="image-modal-nav image-modal-nav-right" :disabled="images.length <= 1"
                    @click.stop="next" />

                <!-- 底部缩略图（hover 显示）-->
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
    /* 背景透明度 50% */
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
}
.image-modal-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    cursor: pointer;
}

/* ===== 覆盖层 UI：默认隐藏，hover 后显示 ===== */
.image-modal-toolbar,
.image-modal-nav,
.image-modal-thumbs {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
}
.image-modal-overlay:hover .image-modal-toolbar,
.image-modal-overlay:hover .image-modal-nav,
.image-modal-overlay:hover .image-modal-thumbs {
    opacity: 1;
    pointer-events: auto;
}

/* 顶部工具栏 */
.image-modal-toolbar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
}
.image-modal-counter {
    color: #fff;
    font-size: 14px;
    background: rgba(0, 0, 0, 0.5);
    padding: 4px 10px;
    border-radius: 6px;
}

/* 左右导航 */
.image-modal-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
}
.image-modal-nav-left {
    left: 20px;
}
.image-modal-nav-right {
    right: 20px;
}

/* 底部缩略图 */
.image-modal-thumbs {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    gap: 8px;
    padding: 12px 20px;
    overflow-x: auto;
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
