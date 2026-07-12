import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

export interface ImageModalProps {
    open: { type: Boolean, default: false },
    images: { type: Array, default: () => [] },
    initialIndex: { type: Number, default: 0 },
}

export type ImageModalEmit = (event: 'update:open', value: boolean) => void

export function useImageModal(props: any, emit: ImageModalEmit) {
    const currentIndex = ref(props.initialIndex)

    const currentImage = computed(() => props.images[currentIndex.value])

    watch(() => props.open, (val: boolean) => {
        if (val) currentIndex.value = props.initialIndex
    })

    watch(() => props.initialIndex, (val: number) => {
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

    function onKeydown(e: KeyboardEvent) {
        if (!props.open) return
        if (e.key === 'Escape') close()
        else if (e.key === 'ArrowLeft') prev()
        else if (e.key === 'ArrowRight') next()
    }

    onMounted(() => window.addEventListener('keydown', onKeydown))
    onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

    return {
        currentIndex,
        currentImage,
        close,
        prev,
        next,
    }
}
