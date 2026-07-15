<template>
  <div>
    <!-- Fill in the Blanktype：ContentParent ComponentRender，thislocationNoneneedTemplate -->
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
