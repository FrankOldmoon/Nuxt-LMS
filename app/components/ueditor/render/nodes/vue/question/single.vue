<template>
    <div>
        <!-- 选项列表 -->
        <div class="space-y-2">
            <label v-for="(opt, idx) in question.options" :key="idx"
                class="flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors"
                :class="optionClass(idx)" @click="select(idx)">
                <span class="shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center"
                    :class="dotClass(idx)">
                    <span v-if="selected === idx" class="w-2.5 h-2.5 rounded-full bg-current"></span>
                </span>
                <span class="flex-1 text-sm">
                    <ueditorRender :json="opt" />
                </span>
            </label>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { submitQuestion, recordAnswer, contentToText, isRichDoc } from './shared.ts'

const props = defineProps({
    question: { type: Object, required: true },
    questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const selected = ref(-1)

const hasAnswer = computed(() => selected.value >= 0)

function select(idx) {
    if (submitted.value) return
    selected.value = idx
    recordAnswer(props.question, [idx])
}

function optionClass(idx) {
    if (submitted.value) {
        const correct = props.question.answer[0] === idx
        if (correct) return 'border-green-400 bg-green-50 dark:bg-green-900/20'
        if (selected.value === idx && !correct) return 'border-red-400 bg-red-50 dark:bg-red-900/20'
        return 'border-gray-200 dark:border-gray-600'
    }
    return selected.value === idx
        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
}

function dotClass(idx) {
    if (submitted.value) {
        const correct = props.question.answer[0] === idx
        if (correct) return 'border-green-400 text-green-500'
        if (selected.value === idx && !correct) return 'border-red-400 text-red-500'
        return 'border-gray-300 dark:border-gray-500'
    }
    return selected.value === idx
        ? 'border-blue-400 text-blue-500'
        : 'border-gray-300 dark:border-gray-500'
}

function submit() {
    if (!props.question || selected.value < 0) return
    const correct = selected.value === props.question.answer[0]
    isCorrect.value = correct
    submitQuestion({
        questionId: props.questionId,
        userAnswer: [selected.value],
        isCorrect: correct,
    })
    return { isCorrect: correct }
}

function reset() {
    selected.value = -1
}

defineExpose({ submit, reset, hasAnswer })
</script>
