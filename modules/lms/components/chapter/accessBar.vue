<template>
  <div v-if="canEdit" class="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg flex-wrap">
    <!-- ChapterOnputon/off -->
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-unlock" class="size-4 text-muted" />
      <span class="text-sm font-medium">{{ $t('chapter.openToAll') }}</span>
      <USwitch v-model="isOpen" :loading="savingOpen" @update:model-value="updateOpen" />
    </div>

    <USeparator orientation="vertical" class="h-6" />

    <!-- ClassManyoption -->
    <div class="flex items-center gap-2 min-w-[200px] max-w-[480px]">
      <UIcon name="i-lucide-school" class="size-4 text-muted" />
      <span class="text-sm font-medium whitespace-nowrap">{{ $t('chapter.openClasses') }}</span>
      <USelect
        v-model="selectedClassIds"
        :items="classOptions"
        multiple
        size="sm"
        class="min-w-[200px] max-w-[400px]"
        @update:model-value="updateClassOpen"
      />
      <span v-if="isOpen" class="text-xs text-muted whitespace-nowrap">{{ $t('chapter.openClassesHint') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChapterAccessProps } from '../../composables/useChapterAccess'

const props = defineProps<ChapterAccessProps>()

const {
  canEdit,
  isOpen,
  savingOpen,
  selectedClassIds,
  classOptions,
  updateOpen,
  updateClassOpen,
} = useChapterAccess(props)
</script>
