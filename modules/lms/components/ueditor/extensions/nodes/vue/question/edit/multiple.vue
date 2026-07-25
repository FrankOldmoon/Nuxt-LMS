<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <label class="text-xs text-gray-500">{{ $t('question.optionsLabel') }}</label>
      <UButton variant="ghost" size="2xs" icon="i-heroicons-plus" @click="addOption">{{ $t('question.addOption') }}</UButton>
    </div>
    <div class="space-y-2">
      <div v-for="(opt, idx) in form.options" :key="idx" class="flex items-start gap-2">
        <!-- Checkbox 选择正确答案 -->
        <UCheckbox
          :model-value="isAnswer(idx)"
          class="mt-2 shrink-0"
          @change="toggleAnswer(idx)"
        />
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
}
if (!Array.isArray(props.form.answer)) {
  props.form.answer = []
}

function isAnswer(idx) {
  return props.form.answer.includes(idx)
}

function toggleAnswer(idx) {
  const ans = [...props.form.answer]
  const pos = ans.indexOf(idx)
  if (pos > -1) ans.splice(pos, 1)
  else ans.push(idx)
  // 按选项索引升序排序
  props.form.answer = ans.sort((a, b) => a - b)
}

function addOption() {
  if (!Array.isArray(props.form.options)) props.form.options = []
  props.form.options.push('')
}

function removeOption(idx) {
  props.form.options.splice(idx, 1)
  props.form.answer = props.form.answer
    .filter(a => a !== idx)
    .map(a => (a > idx ? a - 1 : a))
}
</script>
