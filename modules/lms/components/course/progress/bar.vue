<template>
  <div class="flex items-center gap-3">
    <div class="flex-1">
      <div class="flex items-center justify-between mb-1">
        <span class="text-sm text-muted">{{ $t('coursePanel.progress') }}</span>
        <span class="text-sm font-semibold text-primary">{{ percent }}%</span>
      </div>
      <div class="w-full h-2.5 bg-elevated rounded-full overflow-hidden">
        <div
          class="h-full bg-primary rounded-full transition-all duration-500"
          :style="{ width: `${percent}%` }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// CourseLearning Progressitems：ApprovedChaptercount / totalChaptercount
defineProps<{
  percent: number
}>()
</script>
