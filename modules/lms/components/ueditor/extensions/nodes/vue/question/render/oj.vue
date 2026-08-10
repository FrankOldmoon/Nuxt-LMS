<template>
  <div class="space-y-3">
    <!-- OJ 题目内容（show.ts 已用 fetchOj 返回值替换 content） -->
    <div v-if="contentIsPid" class="text-sm text-amber-500">
      {{ $t('question.ojLoadFailed') }}
    </div>
    <div v-else>
      <ueditorRender :json="question.content"/>
    </div>

    <!-- 前往 OJ 解题 + 手动复查状态 -->
    <div class="flex items-center gap-3">
      <a v-if="ojLink" :href="ojLink" target="_blank" rel="noopener"
        class="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline">
        <UIcon name="i-lucide-external-link" class="size-4" />
        {{ $t('question.ojSolve') }}
      </a>
      <UButton size="xs" variant="outline" :loading="checking" icon="i-lucide-refresh-cw"
        :label="$t('question.ojCheckStatus')" @click="checkStatus" />
    </div>
  </div>
</template>

<script setup>
import { useOj } from './useOj'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const {
  ojLink, problemHtml, problemText, contentIsPid,
  checking, checkStatus,
  submit, reset, hasAnswer, fillCorrectAnswer,
} = useOj(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
