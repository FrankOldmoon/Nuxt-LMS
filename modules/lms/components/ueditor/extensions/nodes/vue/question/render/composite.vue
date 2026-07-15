<template>
  <div class="space-y-2">
    <!-- child question list -->
    <Sub-questionRenderer
      v-for="(sub, idx) in sub-questions"
      :key="idx"
      ref="subRefs"
      :sub-question="sub"
      :index="idx"
      :show-answer="showAnswer"
      @answer-change="(record) => onAnswerChange(idx, record)"
    />

    <!-- Nonechild questionTip -->
    <div v-if="!sub-questions.length" class="text-center py-4 text-gray-400 text-sm">
      {{ $t('question.compositeNoSub') }}
    </div>
  </div>
</template>

<script setup>
import Sub-questionRenderer from './subQuestion.vue'
import { useCompositeRender } from './useCompositeRender'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const {
  sub-questions,
  subRefs,
  showAnswer,
  hasAnswer,
  onAnswerChange,
  submit,
  reset,
  fillCorrectAnswer,
} = useCompositeRender(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
