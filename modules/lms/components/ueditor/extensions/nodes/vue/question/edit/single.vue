<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <label class="text-xs text-gray-500">{{ $t('question.optionsLabel') }}</label>
      <UButton variant="ghost" size="2xs" icon="i-heroicons-plus" @click="addOption">{{ $t('question.addOption') }}</UButton>
    </div>
    <div class="space-y-2">
      <div v-for="(opt, idx) in form.options" :key="idx" class="flex items-start gap-2">
        <!-- Radio 选择正确答案 -->
        <label class="flex items-center gap-1 mt-2 shrink-0 cursor-pointer" @click="selectAnswer(idx)">
          <span class="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0"
            :class="form.answer[0] === idx ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-500'">
            <span v-if="form.answer[0] === idx" class="w-2 h-2 rounded-full bg-white"></span>
          </span>
          <span class="text-[11px] text-gray-400">{{ $t('question.answerLabel') }}</span>
        </label>
        <!-- 选项内容 -->
        <div class="flex-1">
          <richEditor v-model="form.options[idx]" />
        </div>
        <!-- 删除 -->
        <UButton variant="ghost" size="2xs" color="red" icon="i-heroicons-x-mark" class="mt-2 shrink-0" @click="removeOption(idx)" />
      </div>
    </div>
    <div v-if="!form.options.length" class="text-xs text-gray-400 py-2 text-center">
      {{ $t('question.noOptions') }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  form: { type: Object, required: true },
})

// 默认 4 个空选项
if (!props.form.options?.length) {
  props.form.options = ['', '', '', '']
  props.form.answer = [0]
}

function selectAnswer(idx) {
  props.form.answer = [idx]
}

// 选项级 markdown 开关（存 extra.optionMarkdown[idx]，缺省/true = markdown）
function isOptionMarkdown(idx) {
  return props.form.extra?.optionMarkdown?.[idx] !== false
}

function setOptionMarkdown(idx, val) {
  if (!props.form.extra || typeof props.form.extra !== 'object') props.form.extra = {}
  if (!Array.isArray(props.form.extra.optionMarkdown)) props.form.extra.optionMarkdown = []
  props.form.extra.optionMarkdown[idx] = val
  console.debug('[question edit] option', idx, 'markdown =', val)
}

function addOption() {
  if (!Array.isArray(props.form.options)) props.form.options = []
  props.form.options.push('')
}

function removeOption(idx) {
  props.form.options.splice(idx, 1)
  if (props.form.answer[0] === idx) props.form.answer = [0]
  else if (props.form.answer[0] > idx) props.form.answer = [props.form.answer[0] - 1]
}
</script>
