<template>
  <div>
    <label class="text-xs text-gray-500 mb-1 block">{{ fillHintText }}</label>
    <div v-if="parsedAnswers.length" class="flex flex-wrap gap-2">
      <div
        v-for="(ans, idx) in parsedAnswers"
        :key="idx"
        class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded text-sm"
      >
        <span class="text-xs text-gray-400">#{{ idx + 1 }}</span>
        <span class="font-medium text-blue-700 dark:text-blue-300">{{ ans }}</span>
      </div>
    </div>
    <div v-else class="text-xs text-gray-400 py-2">
      {{ $t('question.fillPlaceholderHint') }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  form: { type: Object, required: true },
})

const { t } = useI18n()

const fillHintText = computed(() => t('question.fillAnswerHint'))

// 从 content 中提取 {{text}} 作为答案
const parsedAnswers = computed(() => {
  const text = extractText(props.form.content)
  const matches = text.match(/\{\{(.+?)\}\}/g)
  if (!matches) return []
  return matches.map(m => m.replace(/^\{\{|\}\}$/g, '').trim())
})

// 同步到 form.answer
watch(parsedAnswers, (answers) => {
  props.form.options = []
  props.form.answer = answers
}, { immediate: true })

function extractText(content) {
  if (typeof content === 'string') return content
  if (content && typeof content === 'object') {
    return extractFromDoc(content)
  }
  return ''
}

function extractFromDoc(node) {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.text) return node.text
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractFromDoc).join('')
  }
  return ''
}
</script>
