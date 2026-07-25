<template>
  <!-- 触发按钮 -->
  <UButton
    icon="i-lucide-crop"
    size="sm"
    variant="outline"
    :title="$t('admin.form.cropImage')"
    @click="openPicker"
  />

  <!-- 隐藏的 file input -->
  <input
    ref="fileInputRef"
    type="file"
    accept="image/*"
    class="hidden"
    @change="onFileChange"
  />

  <!-- 复用 base 的 FormImageCropperModal，绑定 uploaded 回调 -->
  <FormImageCropperModal
    ref="cropperRef"
    :title="$t('admin.form.cropImage')"
    :stencil-type="stencilType"
    :aspect-ratio="aspectRatio"
    @uploaded="onUploaded"
    @close="onClose"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

/**
 * 图片裁剪触发器
 * - 点击按钮 → 弹出文件选择 → 选完后 FormImageCropperModal 自动打开
 * - 用户确认裁剪 → 上传 → emit uploaded(url)
 *
 * 复用 modules/base/components/form/imageCropperModal.vue，避免重复实现。
 */
const props = withDefaults(defineProps<{
  /** 裁剪框样式 */
  stencilType?: 'circle' | 'rectangle'
  /** 固定宽高比（不传则自由比例） */
  aspectRatio?: number | null
}>(), {
  stencilType: 'rectangle',
  aspectRatio: 1,
})

const emit = defineEmits<{
  uploaded: [url: string]
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const cropperRef = ref<any>(null)

function openPicker() {
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  // 清空 value，允许重复选择同一文件
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  // 触发 FormImageCropperModal 的 setImage
  if (cropperRef.value && typeof cropperRef.value.setImage === 'function') {
    cropperRef.value.setImage(file)
  } else {
    console.warn('[ImageCropperTrigger] cropperRef.setImage is not available')
  }
}

function onUploaded(url: string) {
  emit('uploaded', url)
}

function onClose() {
  // 由 FormImageCropperModal 内部处理 URL.revokeObjectURL
}
</script>
