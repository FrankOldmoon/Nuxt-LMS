<template>
  <div class="flex items-center gap-2 p-3 rounded-md"
    :class="correct ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'">
    <span class="text-lg">{{ correct ? '✓' : '✗' }}</span>
    <span class="font-medium text-sm" :class="correct ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
      {{ correct ? $t('question.correctFeedback', { point }) : $t('question.wrongFeedback') }}
    </span>
  </div>
</template>

<script setup>
defineProps({
  correct: { type: Boolean, default: false },
  point: { type: Number, default: 0 },
})
</script>