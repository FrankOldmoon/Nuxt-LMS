<template>
  <!-- 未登录时不显示按钮 -->
  <div v-if="isLoggedIn" class="flex items-center gap-1 mb-3 flex-wrap">
    <!-- 得分：章节得分（教师/管理员可见） -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showScore" :text="$t('chapter.score')">
      <UButton icon="i-lucide-award" color="success" variant="soft" size="xs" @click="() => { scoreOpen = true }" />
    </UTooltip>

    <!-- 选择：随机/多选学生加减分（教师/管理员可见） -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showSelect" :text="$t('chapter.select')">
      <UButton icon="i-lucide-user-check" color="warning" variant="soft" size="xs"
        @click="() => { selectOpen = true }" />
    </UTooltip>

    <!-- 计时器（教师/管理员可见，默认不给普通用户显示） -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showTimer" :text="$t('chapter.timer')">
      <UButton icon="i-lucide-timer" color="info" variant="soft" size="xs" @click="() => { timerOpen = true }" />
    </UTooltip>

    <!-- 邀请跳转（教师/管理员可见） -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showInvite" :text="$t('chapter.invite')">
      <UButton icon="i-lucide-megaphone" color="error" variant="soft" size="xs" :loading="inviting"
        @click="sendInvite" />
    </UTooltip>

    <!-- 弹幕（教师/管理员可见，默认不给普通用户显示） -->
    <UTooltip v-if="canEdit && chapterBtnsConfig.showDanmaku && chapterPageCfg.showDanmakuPanel" :text="$t('chapter.danmaku')">
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
  <!-- Lazy + v-if：这些弹窗（尤其抢答/弹幕/投票）内部用 ueditorRender，会牵出节点渲染器与
       富文本内核。仅加 Lazy 不够——组件若在 SSR 期间照常渲染，脚手架仍会把它的 chunk 放进
       modulepreload 阻塞首屏；用 v-if 让未打开的弹窗不参与 SSR 渲染，才真正移出关键路径。 -->
  <LazyChapterScoreModal v-if="scoreOpen" v-model:open="scoreOpen" :course-id="courseIdNum" :chapter-id="chapterIdNum"
    :class-id="classIdNum" />
  <LazyChapterSelectModal v-if="selectOpen" v-model:open="selectOpen" :course-id="courseIdNum" :class-id="classIdNum" :chapter-id="chapterIdNum" />
  <LazyChapterTimerModal v-if="timerOpen" v-model:open="timerOpen" />
  <LazyChapterDanmakuModal v-if="danmakuOpen" v-model:open="danmakuOpen" :class-id="classIdNum" :can-edit="canEdit" />
  <LazyChapterVoteModal v-if="voteOpen" v-model:open="voteOpen" :class-id="classIdNum" :can-edit="canEdit" />
  <LazyChapterQuickAnswerModal v-if="quickAnswerOpen" v-model:open="quickAnswerOpen" :class-id="classIdNum" :can-edit="canEdit" />
</template>

<script setup lang="ts">
const route = useRoute()
const { hasRole, user } = useAuth()
const { isCourseEditor, isCourseTeacher } = useAuthLms()
const { chapterBtnsConfig } = useLayoutState()
const { chapterPage: chapterPageCfg } = useLmsPublicConfig()
const { sendInvite: wsSendInvite } = useWebSocket()
const toast = useToast()
const { t } = useI18n()

const courseId = computed(() => route.params.id as string)
const chapterId = computed(() => route.params.cid as string)
const courseIdNum = computed(() => Number(courseId.value) || 0)
const chapterIdNum = computed(() => Number(chapterId.value) || 0)
const classIdNum = computed(() => user.value?.defaultClass?.id || user.value?.classId || 0)

// 是否已登录
const isLoggedIn = computed(() => !!user.value)

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
