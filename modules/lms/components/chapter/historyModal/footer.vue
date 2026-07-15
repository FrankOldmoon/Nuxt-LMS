<template>
  <div class="flex items-center justify-between gap-3 pt-2">
    <!-- VersionInfo -->
    <div class="flex items-center gap-2 min-w-0">
      <UIcon name="i-lucide-file-clock" class="size-4 text-muted shrink-0" />
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <p class="text-sm font-medium text-highlighted">
            {{ $t('layout.versionLabel', { n: page }) }}
          </p>
          <UBadge v-if="page === 1" :label="$t('layout.versionNewest')" color="primary" variant="subtle" size="xs" />
        </div>
        <p class="text-xs text-muted">{{ formatTime(currentVersion?.createdAt) }}</p>
      </div>
    </div>

    <!-- PaginationButton -->
    <div class="flex items-center gap-2">
      <UButton icon="i-lucide-chevron-left" size="sm" color="neutral" variant="outline" :disabled="page <= 1" @click="emit('prev')" />
      <span class="text-sm text-muted min-w-[60px] text-center">{{ page }} / {{ total }}</span>
      <UButton icon="i-lucide-chevron-right" size="sm" color="neutral" variant="outline" :disabled="page >= total" @click="emit('next')" />
    </div>

    <!-- ResumeButton -->
    <UButton :label="$t('layout.restore')" icon="i-lucide-rotate-ccw" size="sm" color="primary" variant="soft" :loading="restoring" @click="emit('restore')" />
  </div>
</template>

<script setup lang="ts">
interface HistoryVersion { id: number; content: any; createdAt: string }
defineProps<{
  page: number
  total: number
  currentVersion: HistoryVersion | null
  restoring: boolean
}>()
const emit = defineEmits<{ prev: []; next: []; restore: [] }>()
</script>
