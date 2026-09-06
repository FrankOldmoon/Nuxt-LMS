<template>
  <div>
    <!-- select 题型：内容在父组件渲染（含 select 节点下拉框），此处无需模板 -->
  </div>
</template>

<script setup>
import { useSelect } from './useSelect'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const { hasAnswer, submit, reset, fillCorrectAnswer } = useSelect(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>