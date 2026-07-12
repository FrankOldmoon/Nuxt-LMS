<template>
  <div v-if="explanation" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
    <div class="text-xs text-gray-500 mb-1">{{ $t('question.explanationAnswer') }}</div>
    <ueditorRender :json="explanation" />
  </div>
</template>

<script setup>
defineProps({
  explanation: { default: '' },
})
</script>