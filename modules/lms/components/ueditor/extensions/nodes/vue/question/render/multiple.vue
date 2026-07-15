<template>
  <div>
    <!-- optionitemsList -->
    <div class="space-y-2">
      <label
        v-for="(opt, idx) in question.options"
        :key="idx"
        class="flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors"
        :class="option Class(idx)"
        @click="toggle(idx)"
      >
        <span class="shrink-0 w-5 h-5 rounded border-2 mt-0.5 flex items-center justify-center transition-colors"
          :class="checkClass(idx)">
          <span v-if="selected.includes(idx)" class="text-xs">✓</span>
        </span>
        <span class="shrink-0 text-sm font-medium text-muted mt-0.5 w-5">{{ String.fromCharCode(65 + idx) }}</span>
        <span class="flex-1 text-sm">
          <ueditorRender :json="opt" />
        </span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { useMultiple } from './useMultiple'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const { selected, hasAnswer, toggle, option Class, checkClass, submit, reset, fillCorrectAnswer } = useMultiple(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
