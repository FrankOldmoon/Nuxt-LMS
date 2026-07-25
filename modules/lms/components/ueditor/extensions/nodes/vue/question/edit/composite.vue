<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <label class="text-xs text-gray-500">{{ $t('question.compositeSubQuestions') }}</label>
      <UButton variant="ghost" size="2xs" icon="i-heroicons-plus" @click="addSub">
        {{ $t('question.compositeAddSub') }}
      </UButton>
    </div>

    <div v-if="!subQuestions.length" class="text-xs text-gray-400 py-2 text-center">
      {{ $t('question.compositeEmpty') }}
    </div>

    <!-- 子题列表 -->
    <div class="space-y-3">
      <div v-for="(sub, idx) in subQuestions" :key="idx"
        class="rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden">
        <!-- 子题头部 -->
        <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800">
          <span class="shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-medium">
            {{ idx + 1 }}
          </span>
          <UInput v-model="sub.name" :placeholder="$t('question.namePlaceholder')" size="xs" class="flex-1" />
          <USelect v-model="sub.type" :items="subTypeOptions" size="xs" class="w-28" @change="onSubTypeChange(idx)" />
          <UInput v-model.number="sub.point" type="number" size="xs" class="w-16" :placeholder="$t('question.pointPlaceholder')" />
          <UButton variant="ghost" size="2xs" color="red" icon="i-heroicons-x-mark" @click="removeSub(idx)" />
        </div>
        <!-- 子题内容编辑 -->
        <div class="p-3 space-y-2">
          <!-- 子题题目内容 -->
          <div>
            <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.contentLabel') }}</label>
            <richEditor v-model="sub.content" />
          </div>
          <!-- 子题特定编辑器 -->
          <component v-if="getSubEditor(sub.type)" :is="getSubEditor(sub.type)" :form="sub" />
          <!-- 子题答案解析 -->
          <div>
            <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.explanationLabel') }}</label>
            <richEditor v-model="sub.explanation" />
          </div>
        </div>
      </div>
    </div>

    <!-- 汇总信息 -->
    <div v-if="subQuestions.length" class="mt-3 p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-xs text-indigo-600 dark:text-indigo-300">
      {{ $t('question.compositeSummary', { count: subQuestions.length, point: totalPoint }) }}
    </div>
  </div>
</template>

<script setup>
import { useCompositeEdit } from './useCompositeEdit'

const props = defineProps({
  form: { type: Object, required: true },
})

const { subQuestions, subTypeOptions, totalPoint, addSub, removeSub, getSubEditor, onSubTypeChange } = useCompositeEdit(props)
</script>
