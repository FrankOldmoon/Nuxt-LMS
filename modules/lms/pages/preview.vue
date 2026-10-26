<template>
  <div class="mx-auto max-w-4xl px-4 py-6">
    <h1 class="text-2xl font-bold">{{ $t('filePreview.title') }}</h1>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ $t('filePreview.subtitle') }}</p>

    <!-- 文件选择输入（放在拖拽区外，避免点击事件冒泡重复触发） -->
    <input ref="inputEl" type="file" class="hidden" @change="onPick" />

    <!-- 拖拽 / 点击选择 -->
    <div
      class="preview-dropzone mt-4"
      :class="{ 'is-dragover': dragDepth > 0 }"
      role="button"
      tabindex="0"
      @click="openPicker"
      @keydown.enter.prevent="openPicker"
      @keydown.space.prevent="openPicker"
      @dragenter.prevent="dragDepth++"
      @dragleave.prevent="dragDepth = Math.max(0, dragDepth - 1)"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <UIcon name="i-lucide-cloud-upload" class="size-10 text-gray-400" />
      <p class="text-sm text-gray-600 dark:text-gray-300">
        {{ dragDepth > 0 ? $t('filePreview.dropNow') : $t('filePreview.dragHint') }}
      </p>
      <p class="text-xs text-gray-400">{{ $t('filePreview.clickHint') }}</p>
    </div>

    <!-- 已选文件 + 预览 -->
    <div v-if="file" class="mt-5">
      <div class="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5">
        <UIcon :name="fileIcon" class="size-8 shrink-0 text-gray-400" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium" :title="file.name">{{ file.name }}</div>
          <div class="text-xs text-gray-400">{{ sizeText }}</div>
        </div>
        <UButton icon="i-lucide-refresh-cw" variant="ghost" color="neutral" size="sm"
          :aria-label="$t('filePreview.replace')" @click="openPicker" />
        <UButton icon="i-lucide-download" variant="ghost" color="neutral" size="sm"
          :aria-label="$t('common.download')" :href="objectUrl" :download="file.name" />
        <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm"
          :aria-label="$t('filePreview.clear')" @click="clearFile" />
      </div>

      <!-- 复用 ueditor file 扩展的预览渲染器（office / pdf / 图片 / 视频 / 3D / zip / 文本代码） -->
      <div class="preview-panel mt-3">
        <UeditorFilePreview :key="objectUrl" :url="objectUrl" :name="file.name" allow-blob />
      </div>
    </div>
  </div>
</template>

<script setup>
import UeditorFilePreview from '../components/ueditor/render/nodes/file-preview.vue'

// /preview：本地选择/拖拽文件后预览，不上传服务器。
// 预览逻辑完全复用 ueditor `file` 扩展的 file-preview.vue（office/3d/zip/文本等预览器一致）。
const inputEl = ref(null)
const dragDepth = ref(0)
const file = ref(null)
const objectUrl = ref('')

function setFile(f) {
  if (!f) return
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  file.value = f
  objectUrl.value = URL.createObjectURL(f)
}

function openPicker() {
  inputEl.value?.click()
}

function onPick(e) {
  const f = e.target.files?.[0]
  if (f) setFile(f)
  e.target.value = '' // 允许再次选择同一文件
}

function onDrop(e) {
  dragDepth.value = 0
  const f = e.dataTransfer?.files?.[0]
  if (f) setFile(f)
}

function clearFile() {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  file.value = null
  objectUrl.value = ''
}

const ext = computed(() => (file.value?.name || '').split('.').pop()?.toLowerCase() || '')

const fileIcon = computed(() => {
  const e = ext.value
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(e)) return 'i-lucide-image'
  if (['doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'pdf'].includes(e)) return 'i-lucide-file-text'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) return 'i-lucide-file-archive'
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(e)) return 'i-lucide-video'
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(e)) return 'i-lucide-music'
  return 'i-lucide-file'
})

const sizeText = computed(() => {
  const n = file.value?.size || 0
  if (n <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(i ? 1 : 0)} ${units[i]}`
})

onBeforeUnmount(() => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})
</script>

<style scoped>
.preview-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 160px;
  padding: 24px;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}
.preview-dropzone:hover,
.preview-dropzone.is-dragover {
  border-color: var(--ui-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.04);
}
.preview-panel {
  height: 70vh;
  min-height: 360px;
  overflow: auto;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}
</style>
