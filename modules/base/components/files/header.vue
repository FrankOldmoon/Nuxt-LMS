<template>
  <div class="flex items-center justify-between p-4 pb-3">
    <h3 class="text-lg font-semibold">{{ title }}</h3>
    <div class="flex items-center gap-3">
      <UButton icon="i-lucide-upload" color="primary" variant="soft" size="xs" :label="t('common.upload')"
        :loading="uploading" @click="triggerUpload" />
      <input ref="fileInputRef" type="file" class="hidden" @change="onChange" />
      <!-- 个人空间使用 -->
      <span v-if="!group" class="text-xs text-gray-400">
        {{ t('myFiles.used') }}: {{ formatBytes(usage.used) }}
        <template v-if="!usage.unlimited"> / {{ formatBytes(usage.quota) }}</template>
        <template v-else> / ∞</template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatBytes } from '../../utils/fileUtils'

const props = defineProps<{
  group?: string
  title: string
  uploading: boolean
  usage: { used: number; quota: number; free: number; unlimited: boolean }
}>()

const emit = defineEmits<{
  /** 用户选好文件，交给父组件上传 */
  upload: [file: File]
}>()

const { t } = useI18n()

const fileInputRef = ref<HTMLInputElement | null>(null)
function triggerUpload() {
  fileInputRef.value?.click()
}
function onChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('upload', file)
  input.value = ''
}
</script>
