<template>
  <div class="rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
    <!-- 头部：题型 / 名称 / 错题次数 / 课程ID -->
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
    <!-- 题目渲染（错题本支持作答） -->
    <div class="p-3">
      <component :is="QuestionRender"
        :node="{ attrs: { type: 'question', content: String(item.cid) } }"
        :course-id="item.courseId" />
    </div>
  </div>
</template>

<script setup lang="ts">
// 跨模块导入：错题本需直接渲染 question 组件，并显式传入 courseId
import QuestionRender from '../../ueditor/extensions/nodes/vue/question/render.vue'

defineProps<{ item: any }>()
</script>
