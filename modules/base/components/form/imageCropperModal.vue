<template>
    <UModal v-model:open="internalOpen" :ui="{ content: 'sm:max-w-2xl' }">
        <template #content>
            <div class="p-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">{{ title }}</h3>
                    <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="close" />
                </div>

                <div class="cropper-container mb-4">
                    <Cropper
                        ref="cropperRef"
                        :src="imageSrc"
                        :stencil-component="stencil"
                        :stencil-props="stencilProps"
                        class="bg-muted rounded-lg"
                    />
                </div>

                <div class="flex justify-end gap-2">
                    <UButton :label="$t('common.cancel')" color="neutral" variant="ghost" @click="close" />
                    <UButton :label="$t('common.confirm')" color="primary" :loading="uploading" @click="handleCrop" />
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
    title?: string
    aspectRatio?: number | null // null= 自由比例，number=固定比例
    stencilType?: 'circle' | 'rectangle'
    /** 输出固定尺寸（如头像 128x128）；不传则保留裁剪区域原尺寸 */
    outputSize?: { width: number; height: number } | null
}>()

const emit = defineEmits<{
    uploaded: [url: string]
    close: []
}>()

const {
    Cropper,
    internalOpen, imageSrc, cropperRef, uploading,
    stencil, stencilProps,
    setImage, close: closeCropper, handleCrop,
} = useImageCropper(
    () => props.aspectRatio,
    () => props.stencilType,
    (url) => emit('uploaded', url),
    () => props.outputSize,
)

function close() {
    closeCropper()
    emit('close')
}

defineExpose({ setImage })
</script>

<style scoped>
.cropper-container {
    height: 400px;
}
</style>
