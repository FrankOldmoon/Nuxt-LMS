<template>
  <div class="space-y-2">
    <!-- 子题列表 -->
    <SubQuestionRenderer
      v-for="(sub, idx) in subQuestions"
      :key="idx"
      ref="subRefs"
      :sub-question="sub"
      :index="idx"
      :show-answer="showAnswer"
      @answer-change="(record) => onAnswerChange(idx, record)"
    />

    <!-- 无子题提示 -->
    <div v-if="!subQuestions.length" class="text-center py-4 text-gray-400 text-sm">
      {{ $t('question.compositeNoSub') }}
    </div>
  </div>
</template>

<script setup>
import SubQuestionRenderer from './sub-question.vue'
import { useCompositeRender } from './useCompositeRender'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const {
  subQuestions,
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
