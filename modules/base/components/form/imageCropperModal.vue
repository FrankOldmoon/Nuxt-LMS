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
import { Cropper, CircleStencil, RectangleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const props = defineProps<{
    title?: string
    aspectRatio?: number | null// null= 自由比例，number=固定比例
    stencilType?: 'circle' | 'rectangle'
}>()

const emit = defineEmits<{
    uploaded: [url: string]
    close: []
}>()

const internalOpen = ref(false)
const imageSrc = ref<string | null>(null)
const originalFile = ref<File | null>(null)
const uploading = ref(false)
const cropperRef = ref<any>(null)

// 根据类型选择裁剪框样式
const stencil = computed(() => props.stencilType === 'circle' ? CircleStencil : RectangleStencil)
const stencilProps = computed(() => {
    if (props.aspectRatio) {
        return { aspectRatio: props.aspectRatio }
    }
    return {}
})

// 设置待裁剪的图片并打开弹窗
function setImage(file: File) {
    originalFile.value = file
    imageSrc.value = URL.createObjectURL(file)
    internalOpen.value = true
}

// 关闭弹窗
function close() {
    internalOpen.value = false
    if (imageSrc.value) {
        URL.revokeObjectURL(imageSrc.value)
        imageSrc.value = null
        originalFile.value = null
    }
    emit('close')
}

// 确认裁剪并上传
async function handleCrop() {
    if (!cropperRef.value || !originalFile.value) return

    uploading.value = true
    try {
        // 获取裁剪后的 canvas
        const { canvas } = cropperRef.value.getResult()

        // 转换为 Blob
        const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob(resolve, 'image/webp', 0.8)
        })

        // 创建 File 对象（保留原文件名，扩展名改为 .webp）
        const webpName = originalFile.value.name.replace(/\.(png|jpg|jpeg|gif|bmp|webp)$/i, '.webp')
        const croppedFile = new File([blob], webpName, { type: 'image/webp' })

        // 上传（不再次压缩，因为已经裁剪且转为 webp）
        const formData = new FormData()
        formData.append('files', croppedFile)
        const res = await $fetch<{ data: { url: string }; success: boolean; msg: string }>('/api/files/upload', {
            method: 'POST',
            body: formData,
        })

        if (!res.success) {
            throw new Error(res.msg || '上传失败')
        }

        emit('uploaded', res.data.url)
        close()
    } catch (e: any) {
        useToast().add({ title: e.message || '裁剪上传失败', color: 'error' })
    } finally {
        uploading.value = false
    }
}

// 暴露 setImage 方法
defineExpose({ setImage })
</script>

<style scoped>
.cropper-container {
    height: 400px;
}
</style>