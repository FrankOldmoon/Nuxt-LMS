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

// 从 content 中提取答案
const parsedAnswers = computed(() => {
  const content = props.form.content
  if (typeof content === 'string') {
    // 字符串格式：从 {{}} 中提取答案
    const matches = content.match(/\{\{(.+?)\}\}/g)
    if (!matches) return []
    return matches.map(m => m.replace(/^\{\{|\}\}$/g, '').trim())
  } else if (content && typeof content === 'object') {
    // UEditor JSON 格式：提取 type 为 inputs 的节点的 attrs.content 作为答案
    return extractAnswersFromDoc(content)
  }
  return []
})

// 同步到 form.answer
watch(parsedAnswers, (answers) => {
  props.form.options = []
  props.form.answer = answers
}, { immediate: true })

function extractAnswersFromDoc(node) {
  const answers = []
  if (!node) return answers
  
  // 如果是 inputs 节点，提取 attrs.content 作为答案
  if (node.type === 'inputs' && node.attrs && node.attrs.content) {
    answers.push(node.attrs.content)
  }
  
  // 递归处理子节点
  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      answers.push(...extractAnswersFromDoc(child))
    }
  }
  
  return answers
}
</script>
