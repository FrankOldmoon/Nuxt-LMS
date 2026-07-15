<template>
  <!-- Trigger button -->
  <UButton
    icon="i-lucide-crop"
    size="sm"
    variant="outline"
    :title="$t('admin.form.cropImage')"
    @click="openPicker"
  />

  <!-- Hidden file input -->
  <input
    ref="fileInputRef"
    type="file"
    accept="image/*"
    class="hidden"
    @change="onFileChange"
  />

  <!-- Reuse base's FormImageCropperModal, bind uploaded callback -->
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
 * Image crop trigger
 * - Click button → open file picker → FormImageCropperModal opens automatically after selection
 * - User confirms crop → upload → emit uploaded(url)
 *
 * Reuses modules/base/components/form/imageCropperModal.vue to avoid duplicate implementation.
 */
const props = withDefaults(defineProps<{
  /** Crop box style */
  stencilType?: 'circle' | 'rectangle'
  /** Fixed aspect ratio (free ratio if not provided) */
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
  // Clear value to allow selecting the same file repeatedly
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  // Trigger FormImageCropperModal's setImage
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
  // URL.revokeObjectURL is handled internally by FormImageCropperModal
}
</script>
