<template>
  <DocToc>
    <template #extra>
      <ChapterBtns />
      <ClassUserCard />

      <!-- 章节学习进度（heading 汇总）- 仅登录用户显示 -->
      <div v-if="isLoggedIn && chapterTask && totalHeadings > 0" class="pt-4 my-4 border-t border-default">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs text-muted">{{ $t('coursePanel.progress') }}</span>
          <span class="text-xs font-semibold" :class="allDone ? 'text-success' : 'text-primary'">
            {{ doneHeadings }}/{{ totalHeadings }}
          </span>
        </div>
        <div class="w-full h-2 bg-elevated rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500" :class="allDone ? 'bg-success' : 'bg-primary'"
            :style="{ width: `${progressPercent}%` }" />
        </div>
      </div>
    </template>
  </DocToc>
</template>

<script setup lang="ts">
/**
 * lms 目录：import doc 的 DocToc，通过 #extra 插槽注入 lms 专有内容。
 *
 * 核心逻辑（播放按钮 / 全屏导航 / 内容编辑器 / handleSaveClick）
 * 由 DocToc 提供，改 doc 版本时 lms 自动同步。
 */
import DocToc from '../../../doc/components/layout/toc.vue'

const { user } = useAuth()

// 是否已登录
const isLoggedIn = computed(() => !!user.value)

// 章节任务上下文（仅章节页存在，课程页为 null）
const chapterTask = useChapterTask()

// heading 学习进度汇总
const totalHeadings = computed(() => chapterTask?.taskMap.value.headings.length ?? 0)
const doneHeadings = computed(() => {
  if (!chapterTask) return 0
  return chapterTask.taskMap.value.headings.filter(h => chapterTask.taskStatus.value[h.id]).length
})
const progressPercent = computed(() => {
  if (totalHeadings.value === 0) return 0
  return Math.round((doneHeadings.value / totalHeadings.value) * 100)
})
const allDone = computed(() => totalHeadings.value > 0 && doneHeadings.value === totalHeadings.value)
</script>
