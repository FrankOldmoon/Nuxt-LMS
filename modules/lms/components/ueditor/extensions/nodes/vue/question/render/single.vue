<template>
    <div>
        <!-- 选项列表（随机展示顺序，下标映射回原始选项） -->
        <div class="space-y-2">
            <label v-for="(ori, pos) in optionOrder" :key="ori"
                class="flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors"
                :class="optionClass(ori)" @click="select(ori)">
                <span class="shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center"
                    :class="dotClass(ori)">
                    <span v-if="selected === ori" class="w-2.5 h-2.5 rounded-full bg-current"></span>
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
import { useSingle } from './useSingle'

const props = defineProps({
    question: { type: Object, required: true },
    questionId: { type: Number, default: 0 },
})

const { selected, optionOrder, optionLabel, hasAnswer, select, optionClass, dotClass, submit, reset, fillCorrectAnswer } = useSingle(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
