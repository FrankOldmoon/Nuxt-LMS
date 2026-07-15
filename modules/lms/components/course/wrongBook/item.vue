<template>
  <div class="rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
    <!-- Header: question type / name / wrong count / course ID -->
    <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800">
      <UIcon name="i-lucide-x-circle" class="size-4 text-red-500 shrink-0" />
      <span class="text-sm font-medium flex-1 truncate">
        {{ item.name || $t('common.unnamed') }}
      </span>
      <UTooltip :text="$t('chapter.wrongCountHint')">
        <span class="text-xs px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded">
          {{ $t('chapter.wrongTimes', { n: item.wrongCount }) }}
        </span>
      </UTooltip>
      <span class="text-xs text-gray-400 font-mono">#{{ item.cid }}</span>
    </div>
    <!-- Question render (wrong book supports answering) -->
    <div class="p-3">
      <component :is="QuestionRender"
        :node="{ attrs: { type: 'question', content: String(item.cid) } }"
        :course-id="item.courseId" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Cross-module import: wrong book needs to directly render question component and explicitly pass courseId
import QuestionRender from '../../ueditor/extensions/nodes/vue/question/render.vue'

defineProps<{ item: any }>()
</script>
