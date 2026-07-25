<template>
  <div>
    <!-- 填空题型：内容在父组件渲染，此处无需模板 -->
  </div>
</template>

<script setup>
import { useFill } from './useFill'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const { hasAnswer, submit, reset, fillCorrectAnswer } = useFill(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
