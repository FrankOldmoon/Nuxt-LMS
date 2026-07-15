<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-3xl' }">
    <UButton
      icon="i-lucide-history"
      color="info"
      variant="outline"
      size="sm"
      :label="$t('layout.history')"
      class="justify-start"
    />

    <template #body>
      <div class="flex flex-col gap-4 h-[70vh] min-w-[480px]">
        <!-- Loading -->
        <div v-if="pending" class="flex items-center justify-center gap-2 py-10 text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-5" />
          <span class="text-sm">{{ $t('layout.historyLoading') }}</span>
        </div>

        <!-- EmptyStatus -->
        <div v-else-if="!versions.length" class="flex items-center justify-center py-10 text-muted text-sm">
          {{ $t('layout.historyEmpty') }}
        </div>

        <template v-else>
          <!-- Upside：ContentPreview -->
          <div class="flex-1 min-h-0 overflow-y-auto border border-default rounded-lg p-4 bg-elevated/30">
            <UeditorRender :json="currentVersion?.content" />
          </div>

          <!-- Downside：Pagination + Resume -->
          <ChapterHistoryModalFooter
            :page="page"
            :total="versions.length"
            :current-version="currentVersion"
            :restoring="restoring"
            @prev="prevPage"
            @next="nextPage"
            @restore="handleRestore(currentVersion!.id)"
          />
        </template>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{ table: string; id: number }>()
const {
  open, versions, pending, restoring, page, currentVersion,
  handleRestore, prevPage, nextPage,
} = useChapterHistory(props)
</script>
