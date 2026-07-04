<template>
  <div class="flex items-center gap-1 mb-3 flex-wrap">
    <!-- 播放：全屏播放模式 -->
    <UTooltip :text="playFullscreen ? $t('chapter.exitPlay') : $t('chapter.play')">
      <UButton
        :icon="playFullscreen ? 'i-lucide-minimize' : 'i-lucide-play'"
        :color="playFullscreen ? 'error' : 'primary'"
        variant="soft"
        size="xs"
        @click="togglePlay"
      />
    </UTooltip>

    <!-- 得分：章节得分（教师/管理员可见） -->
    <UTooltip v-if="canEdit" :text="$t('chapter.score')">
      <UButton icon="i-lucide-award" color="success" variant="soft" size="xs" @click="() => { scoreOpen = true }" />
    </UTooltip>

    <!-- 选择：随机/多选学生加减分（教师/管理员可见） -->
    <UTooltip v-if="canEdit" :text="$t('chapter.select')">
      <UButton icon="i-lucide-user-check" color="warning" variant="soft" size="xs" @click="() => { selectOpen = true }" />
    </UTooltip>

    <!-- 计时器 -->
    <UTooltip :text="$t('chapter.timer')">
      <UButton icon="i-lucide-timer" color="info" variant="soft" size="xs" @click="() => { timerOpen = true }" />
    </UTooltip>
  </div>

  <!-- 弹窗 -->
  <ChapterScoreModal v-model:open="scoreOpen" :course-id="courseIdNum" :chapter-id="chapterIdNum" :class-id="classIdNum" />
  <ChapterSelectModal v-model:open="selectOpen" :course-id="courseIdNum" :class-id="classIdNum" />
  <ChapterTimerModal v-model:open="timerOpen" />
</template>

<script setup lang="ts">
const route = useRoute()
const { hasRole, isCourseTeacher, user } = useAuth()
const { playFullscreen, togglePlay } = useChapterBtns()

const courseId = computed(() => route.params.id as string)
const chapterId = computed(() => route.params.cid as string)
const courseIdNum = computed(() => Number(courseId.value) || 0)
const chapterIdNum = computed(() => Number(chapterId.value) || 0)
const classIdNum = computed(() => user.value?.defaultClass?.id || 0)

// 教师或管理员才能操作得分/选择
const canEdit = computed(() => {
  if (hasRole('admin')) return true
  return courseIdNum.value ? isCourseTeacher(courseIdNum.value) : false
})

const scoreOpen = ref(false)
const selectOpen = ref(false)
const timerOpen = ref(false)
</script>
