<template>
  <div>
    <!-- select question type：ContentParent ComponentRender（include ::select Dropdown），thislocationNoneneedTemplate -->
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
