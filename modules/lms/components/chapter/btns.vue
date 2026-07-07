<template>
  <div class="flex items-center gap-1 mb-3 flex-wrap">
    <!-- 得分：章节得分（教师/管理员可见） -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showScore" :text="$t('chapter.score')">
      <UButton icon="i-lucide-award" color="success" variant="soft" size="xs" @click="() => { scoreOpen = true }" />
    </UTooltip>

    <!-- 选择：随机/多选学生加减分（教师/管理员可见） -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showSelect" :text="$t('chapter.select')">
      <UButton icon="i-lucide-user-check" color="warning" variant="soft" size="xs"
        @click="() => { selectOpen = true }" />
    </UTooltip>

    <!-- 计时器 -->
    <UTooltip v-if="chapterBtnsConfig.showTimer" :text="$t('chapter.timer')">
      <UButton icon="i-lucide-timer" color="info" variant="soft" size="xs" @click="() => { timerOpen = true }" />
    </UTooltip>

    <!-- 邀请跳转（教师/管理员可见） -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showInvite" :text="$t('chapter.invite')">
      <UButton icon="i-lucide-megaphone" color="error" variant="soft" size="xs" :loading="inviting"
        @click="sendInvite" />
    </UTooltip>

    <!-- 弹幕 -->
    <UTooltip v-if="(canEdit || showDanmaku) && chapterBtnsConfig.showDanmaku" :text="$t('chapter.danmaku')">
      <UButton icon="i-lucide-message-square-text" color="success" variant="soft" size="xs"
        @click="() => { danmakuOpen = true }" />
    </UTooltip>

    <!-- 投票（教师/管理员可见） -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showVote" :text="$t('chapter.vote')">
      <UButton icon="i-lucide-vote" color="primary" variant="soft" size="xs" @click="() => { voteOpen = true }" />
    </UTooltip>

    <!-- 抢答（教师/管理员可见） -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showQuickAnswer" :text="$t('chapter.quickAnswer')">
      <UButton icon="i-lucide-hand" color="warning" variant="soft" size="xs" @click="() => { quickAnswerOpen = true }" />
    </UTooltip>
  </div>

  <!-- 弹窗 -->
  <ChapterScoreModal v-model:open="scoreOpen" :course-id="courseIdNum" :chapter-id="chapterIdNum"
    :class-id="classIdNum" />
  <ChapterSelectModal v-model:open="selectOpen" :course-id="courseIdNum" :class-id="classIdNum" />
  <ChapterTimerModal v-model:open="timerOpen" />
  <ChapterDanmakuModal v-model:open="danmakuOpen" :class-id="classIdNum" :can-edit="canEdit" />
  <ChapterVoteModal v-model:open="voteOpen" :class-id="classIdNum" :can-edit="canEdit" />
  <ChapterQuickAnswerModal v-model:open="quickAnswerOpen" :class-id="classIdNum" :can-edit="canEdit" />
</template>

<script setup lang="ts">
const route = useRoute()
const { hasRole, isCourseTeacher, user } = useAuth()
const { showDanmaku, chapterBtnsConfig } = useLayoutState()
const { sendInvite: wsSendInvite } = useWebSocket()
const toast = useToast()
const { t } = useI18n()

const courseId = computed(() => route.params.id as string)
const chapterId = computed(() => route.params.cid as string)
const courseIdNum = computed(() => Number(courseId.value) || 0)
const chapterIdNum = computed(() => Number(chapterId.value) || 0)
const classIdNum = computed(() => user.value?.defaultClass?.id || user.value?.classId || 0)

// 教师或管理员才能操作得分/选择
const canEdit = computed(() => {
  if (hasRole('admin')) return true
  return courseIdNum.value ? isCourseTeacher(courseIdNum.value) : false
})

const scoreOpen = ref(false)
const selectOpen = ref(false)
const timerOpen = ref(false)
const danmakuOpen = ref(false)
const voteOpen = ref(false)
const quickAnswerOpen = ref(false)
const inviting = ref(false)

// 发送邀请：通知班级内所有学生跳转到当前章节
async function sendInvite() {
  if (!classIdNum.value || !courseIdNum.value || !chapterIdNum.value) return
  inviting.value = true
  try {
    wsSendInvite(classIdNum.value, courseIdNum.value, chapterIdNum.value, user.value?.name || 'teacher')
    toast.add({ title: t('chapter.inviteSent'), color: 'success' })
  } catch {
    toast.add({ title: t('chapter.inviteFailed'), color: 'error' })
  } finally {
    setTimeout(() => { inviting.value = false }, 1000)
  }
}
</script>
