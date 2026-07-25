<template>
  <div v-if="files.length > 0" class="mt-4 space-y-2">
    <div
      v-for="(file, idx) in files"
      :key="idx"
      class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
    >
      <!-- 文件图标 -->
      <UIcon :name="getFileIcon(file.name)" class="w-8 h-8 text-gray-400 flex-shrink-0" />

      <!-- 文件信息 -->
      <div class="flex-1 min-w-0">
        <p class="text-sm truncate">{{ file.name }}</p>
        <p class="text-xs text-gray-400">{{ formatBytes(file.size) }}</p>
      </div>

      <!-- 上传状态 -->
      <div class="flex items-center gap-2">
        <UIcon v-if="file.status === 'uploading'" name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-primary-500" />
        <UIcon v-else-if="file.status === 'success'" name="i-heroicons-check-circle" class="w-5 h-5 text-green-500" />
        <UIcon v-else-if="file.status === 'error'" name="i-heroicons-x-circle" class="w-5 h-5 text-red-500" />
        <UButton
          v-if="file.status !== 'uploading'"
          variant="ghost"
          size="xs"
          icon="i-heroicons-trash"
          class="text-red-500 hover:text-red-600"
          @click="$emit('remove', idx)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  files: { type: Array, default: () => [] },
})

defineEmits(['remove'])
</script>
