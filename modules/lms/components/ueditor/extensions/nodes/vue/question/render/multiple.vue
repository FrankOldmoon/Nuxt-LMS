<template>
  <div>
    <!-- 选项列表（随机展示顺序，下标映射回原始选项） -->
    <div class="space-y-2">
      <label
        v-for="(ori, pos) in optionOrder"
        :key="ori"
        class="flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors"
        :class="optionClass(ori)"
        @click="toggle(ori)"
      >
        <span class="shrink-0 w-5 h-5 rounded border-2 mt-0.5 flex items-center justify-center transition-colors"
          :class="checkClass(ori)">
          <span v-if="selected.includes(ori)" class="text-xs">✓</span>
        </span>
        <span class="shrink-0 text-sm font-medium text-muted mt-0.5 w-5">{{ optionLabel(pos) }}</span>
        <span class="flex-1 text-sm">
          <ueditorRender :json="question.options[ori]" />
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

const { selected, optionOrder, optionLabel, hasAnswer, toggle, optionClass, checkClass, submit, reset, fillCorrectAnswer } = useMultiple(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
