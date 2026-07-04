<template>
  <div>
    <label class="text-xs text-gray-500 mb-1 block">{{ fillHintText }}</label>
    <div v-if="parsedAnswers.length" class="space-y-2">
      <div
        v-for="(ans, idx) in parsedAnswers"
        :key="idx"
        class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded text-sm"
      >
        <span class="text-xs text-gray-400">#{{ idx + 1 }}</span>
        <span class="font-medium text-blue-700 dark:text-blue-300 flex-1 truncate font-mono">{{ ans }}</span>
        <UCheckbox
          v-model="regexFlags[idx]"
          :label="$t('question.fillRegex')"
          size="sm"
          @update:model-value="onRegexToggle(idx, $event)"
        />
      </div>
    </div>
    <div v-else class="text-xs text-gray-400 py-2">
      {{ $t('question.fillPlaceholderHint') }}
    </div>
    <p class="text-xs text-gray-400 mt-1">{{ $t('question.fillRegexHint') }}</p>

    <!-- 正则测试 -->
    <div v-if="hasRegex" class="mt-2 p-2 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 space-y-2">
      <div v-for="(ans, idx) in parsedAnswers" :key="'test-'+idx">
        <div v-if="regexFlags[idx]" class="space-y-1">
          <label class="text-xs text-gray-500 block">#{{ idx + 1 }} {{ $t('question.shortAnswerTestLabel') }}</label>
          <UInput v-model="testInputs[idx]" :placeholder="$t('question.shortAnswerTestPlaceholder')" size="xs" class="w-full" />
          <p class="text-xs" :class="testResults[idx] ? 'text-green-500' : 'text-red-500'">
            {{ testResults[idx] ? $t('question.fillRegexMatch') : $t('question.fillRegexNoMatch') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  form: { type: Object, required: true },
})

const { t } = useI18n()

const fillHintText = computed(() => t('question.fillAnswerHint'))

// 正则标记：与答案一一对应，标记哪些空使用正则判断
const regexFlags = ref([])
// 正则测试输入
const testInputs = ref([])

const hasRegex = computed(() => regexFlags.value.some(v => v))

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

// 同步到 form.answer 和 form.options（options 存正则标记）
watch(parsedAnswers, (answers) => {
  // 保留已有标记，补齐长度
  const oldFlags = [...regexFlags.value]
  regexFlags.value = answers.map((_, i) => oldFlags[i] || false)
  testInputs.value = answers.map((_, i) => testInputs.value[i] || '')
  props.form.answer = answers
  props.form.options = regexFlags.value.map(f => f ? 'regex' : '')
}, { immediate: true })

// 监听 form.options 回填正则标记（编辑已有题目时）
watch(() => props.form.options, (opts) => {
  if (Array.isArray(opts) && opts.length === regexFlags.value.length) {
    regexFlags.value = opts.map(v => v === 'regex')
  }
}, { immediate: true })

function onRegexToggle(idx, val) {
  // 触发同步
  props.form.options = regexFlags.value.map(f => f ? 'regex' : '')
}

// 正则测试结果
const testResults = computed(() => {
  return parsedAnswers.value.map((ans, idx) => {
    if (!regexFlags.value[idx] || !testInputs.value[idx]) return false
    try {
      return new RegExp(ans).test(testInputs.value[idx])
    } catch {
      return false
    }
  })
})

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
