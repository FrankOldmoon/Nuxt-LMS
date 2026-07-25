<template>
  <div>
    <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.shortAnswerRegexLabel') }}</label>
    <UInput
      v-model="regexPattern"
      :placeholder="$t('question.shortAnswerRegexPlaceholder')"
      size="sm"
      class="w-full font-mono"
    />
    <p class="text-xs text-gray-400 mt-1">{{ $t('question.shortAnswerRegexHint') }}</p>

    <!-- 正则测试 -->
    <div class="mt-2 p-2 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
      <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.shortAnswerTestLabel') }}</label>
      <UInput
        v-model="testInput"
        :placeholder="$t('question.shortAnswerTestPlaceholder')"
        size="xs"
        class="w-full"
      />
      <p class="text-xs mt-1" :class="testResult ? 'text-green-500' : 'text-red-500'">
        {{ testResult ? $t('question.shortAnswerMatch') : $t('question.shortAnswerNoMatch') }}
      </p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  form: { type: Object, required: true },
})
const { t } = useI18n()

// 正则模式字符串
const regexPattern = ref('')

// form.answer → regexPattern（初始化 + 响应外部变更，如 AI 生成）
watch(() => props.form.answer, (ans) => {
  let val = ''
  if (Array.isArray(ans) && ans.length && typeof ans[0] === 'string') {
    val = ans[0]
  } else if (typeof ans === 'string') {
    val = ans
  }
  if (val !== regexPattern.value) {
    regexPattern.value = val
  }
}, { immediate: true })

// regexPattern → form.answer（存储为 [regexString]）
watch(regexPattern, (val) => {
  const newVal = [val || '']
  const current = props.form.answer
  // 值相同时跳过，避免与 form.answer → regexPattern 的 watch 形成反馈环
  if (Array.isArray(current) && current.length === 1 && current[0] === newVal[0]) return
  props.form.answer = newVal
  props.form.options = []
}, { immediate: true })

// 正则测试
const testInput = ref('')

const testResult = computed(() => {
  if (!regexPattern.value || !testInput.value) return false
  try {
    const re = new RegExp(regexPattern.value)
    return re.test(testInput.value)
  } catch {
    return false
  }
})
</script>
