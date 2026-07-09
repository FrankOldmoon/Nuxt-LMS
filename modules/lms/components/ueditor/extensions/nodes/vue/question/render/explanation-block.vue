<template>
  <div v-if="explanation" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
    <div class="text-xs text-gray-500 mb-1">{{ $t('question.explanationAnswer') }}</div>
    <ueditorRender v-if="isRichDoc(explanation)" :json="explanation" />
    <span v-else>{{ contentToText(explanation) }}</span>
  </div>
</template>

<script setup>
defineProps({
  explanation: { default: '' },
})

function contentToText(content) {
  if (typeof content === 'string') return content
  if (content && typeof content === 'object') return extractText(content)
  return ''
}
function extractText(node) {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.text) return node.text
  if (node.content && Array.isArray(node.content)) return node.content.map(extractText).join('')
  return ''
}
function isRichDoc(content) {
  return content && typeof content === 'object' && !Array.isArray(content) && content.type
}
</script>