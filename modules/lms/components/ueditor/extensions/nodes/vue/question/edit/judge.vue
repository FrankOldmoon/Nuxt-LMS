<template>
  <div>
    <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.optionsLabel') }}</label>
    <div class="flex gap-4">
      <label
        v-for="(opt, idx) in form.options"
        :key="idx"
        class="flex-1 flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors"
        :class="form.answer[0] === idx ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'"
        @click="selectAnswer(idx)"
      >
        <span class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
          :class="form.answer[0] === idx ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-500'">
          <span v-if="form.answer[0] === idx" class="w-2 h-2 rounded-full bg-white"></span>
        </span>
        <span class="text-sm font-medium">{{ opt }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  form: { type: Object, required: true },
})

const { t } = useI18n()

// fixed optionitems：Correct / Error
props.form.options = [t('question.correct'), t('question.wrong')]
if (!props.form.answer?.length) props.form.answer = [0]

function selectAnswer(idx) {
  props.form.answer = [idx]
}
</script>
