<template>
  <!-- Hide buttons when not logged in -->
  <div v-if="isLoggedIn" class="flex items-center gap-1 mb-3 flex-wrap">
    <!-- Score：Chapter Score (visible to teachers/admins) -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showScore" :text="$t('chapter.score')">
      <UButton icon="i-lucide-award" color="success" variant="soft" size="xs" @click="() => { scoreOpen = true }" />
    </UTooltip>

    <!-- Select: randomly/multi-select students to add/subtract score (visible to teachers/admins) -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showSelect" :text="$t('chapter.select')">
      <UButton icon="i-lucide-user-check" color="warning" variant="soft" size="xs"
        @click="() => { selectOpen = true }" />
    </UTooltip>

    <!-- Timer -->
    <UTooltip v-if="chapterBtnsConfig.showTimer" :text="$t('chapter.timer')">
      <UButton icon="i-lucide-timer" color="info" variant="soft" size="xs" @click="() => { timerOpen = true }" />
    </UTooltip>

    <!-- Invite navigate(visible to teachers/admins) -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showInvite" :text="$t('chapter.invite')">
      <UButton icon="i-lucide-megaphone" color="error" variant="soft" size="xs" :loading="inviting"
        @click="sendInvite" />
    </UTooltip>

    <!-- Danmaku: hidden when chapterBtnsConfig.showDanmaku is off OR chapterPage.showDanmakuPanel is off -->
    <UTooltip v-if="(canEdit || showDanmaku) && chapterBtnsConfig.showDanmaku && chapterPageCfg.showDanmakuPanel" :text="$t('chapter.danmaku')">
      <UButton icon="i-lucide-message-square-text" color="success" variant="soft" size="xs"
        @click="() => { danmakuOpen = true }" />
    </UTooltip>

    <!-- Vote(visible to teachers/admins) -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showVote" :text="$t('chapter.vote')">
      <UButton icon="i-lucide-vote" color="primary" variant="soft" size="xs" @click="() => { voteOpen = true }" />
    </UTooltip>

    <!-- quick answer(visible to teachers/admins) -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showQuickAnswer" :text="$t('chapter.quickAnswer')">
      <UButton icon="i-lucide-hand" color="warning" variant="soft" size="xs" @click="() => { quickAnswerOpen = true }" />
    </UTooltip>
  </div>

  <!-- Modal -->
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
const { hasRole, user } = useAuth()
const { isCourseEditor, isCourseTeacher } = useAuthLms()
const { showDanmaku, chapterBtnsConfig } = useLayoutState()
const { sendInvite: wsSendInvite } = useWebSocket()
const { chapterPage: chapterPageCfg } = useLmsPublicConfig()
const toast = useToast()
const { t } = useI18n()

const courseId = computed(() => route.params.id as string)
const chapterId = computed(() => route.params.cid as string)
const courseIdNum = computed(() => Number(courseId.value) || 0)
const chapterIdNum = computed(() => Number(chapterId.value) || 0)
const classIdNum = computed(() => user.value?.defaultClass?.id || user.value?.classId || 0)

// Whether logged in
const isLoggedIn = computed(() => !!user.value)

// Teacher or Admin only can operate Score/Select
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

// Send Invite: Notify all students in class to jump to current Chapter
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
