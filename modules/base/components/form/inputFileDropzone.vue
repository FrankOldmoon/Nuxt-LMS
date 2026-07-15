<template>
  <div
    class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
    :class="isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'"
    @click="handleClick"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
  >
    <input
      ref="fileInput"
      type="file"
      :multiple="multiple"
      class="hidden"
      @change="handleFileChange"
    />

    <div class="flex flex-col items-center gap-2">
      <UIcon name="i-heroicons-cloud-arrow-up" class="w-10 h-10 text-gray-400" />
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ placeholder || $t('upload.dragHint') }}
      </p>
      <p class="text-xs text-gray-400 dark:text-gray-500">
        {{ $t('upload.clickHint') }}
      </p>
      <UButton
        icon="i-lucide-hard-drive"
        color="neutral"
        variant="outline"
        size="xs"
        class="mt-1"
        :label="$t('myFiles.pickFromDrive')"
        @click.stop="$emit('drive-open')"
      />
    </div>

    <!-- URL input -->
    <div class="mt-3 flex items-center gap-2" @click.stop>
      <UInput
        v-model="urlInput"
        :placeholder="$t('upload.urlPlaceholder')"
        size="sm"
        icon="i-lucide-link"
        class="flex-1"
        @keydown.enter="handleAddUrl"
      />
      <UButton
        icon="i-lucide-plus"
        color="primary"
        variant="outline"
        size="sm"
        :disabled="!urlInput.trim()"
        @click="handleAddUrl"
      />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  multiple: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
})

const emit = defineEmits(['files-selected', 'url-added', 'drive-open'])

const fileInput = ref(null)
const isDragging = ref(false)
const urlInput = ref('')

function handleClick() {
  fileInput.value?.click()
}

function handleDrop(e) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length) emit('files-selected', files)
}

function handleFileChange(e) {
  const files = Array.from(e.target.files || [])
  if (files.length) emit('files-selected', files)
  e.target.value = ''
}

function handleAddUrl() {
  const url = urlInput.value.trim()
  if (!url) return
  emit('url-added', url)
  urlInput.value = ''
}
</script>
