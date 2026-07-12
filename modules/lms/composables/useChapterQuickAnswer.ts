import type { Ref } from 'vue'

export interface ChapterQuickAnswerProps {
  classId: number
  canEdit: boolean
}

/**
 * useChapterQuickAnswer — 章节抢答
 *
 * 教师：发起/结束抢答；学生：提交抢答。
 * WebSocket 事件驱动状态同步。从 quick-answer-modal.vue 抽离，组件仅负责 UI。
 *
 * @param props 包含 classId 与 canEdit
 * @param open  弹窗开关 Ref（关闭时若教师未结束抢答，自动 endQA）
 */
export function useChapterQuickAnswer(props: ChapterQuickAnswerProps, open: Ref<boolean>) {
  const { user } = useAuth()
  const {
    sendQuickAnswerStart,
    onQuickAnswerStart,
    sendQuickAnswerSubmit,
    onQuickAnswerResult,
    sendQuickAnswerEnd,
    onQuickAnswerEnd,
  } = useWebSocket()

  const userName = computed(() => user.value?.name || 'anonymous')
  const qaQuestion = ref('')
  const qaActive = ref(false)
  const qaWinner = ref<string | null>(null)

  function startQA() {
    if (!props.classId) return
    sendQuickAnswerStart(props.classId, qaQuestion.value.trim())
    qaActive.value = true
  }

  function submitQA() {
    if (!props.classId || !qaActive.value) return
    sendQuickAnswerSubmit(props.classId, userName.value)
  }

  function endQA() {
    if (!props.classId) return
    sendQuickAnswerEnd(props.classId)
    resetQA()
  }

  function resetQA() {
    qaActive.value = false
    qaWinner.value = null
    qaQuestion.value = ''
  }

  onQuickAnswerStart((data) => {
    qaActive.value = true
    qaQuestion.value = data.question
    qaWinner.value = null
    open.value = true
  })

  onQuickAnswerResult((data) => {
    qaWinner.value = data.winner
  })

  onQuickAnswerEnd(() => {
    resetQA()
  })

  watch(open, (v) => {
    if (!v && props.canEdit && qaActive.value) {
      endQA()
    }
  })

  return {
    userName,
    qaQuestion,
    qaActive,
    qaWinner,
    startQA,
    submitQA,
    endQA,
    resetQA,
  }
}
