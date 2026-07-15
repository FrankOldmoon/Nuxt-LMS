import type { Ref } from 'vue'

export interface ChapterQuickAnswerProps {
  classId: number
  canEdit: boolean
}

/**
 * useChapterQuickAnswer — Chapter quick answer
 *
 * Teacher: start/end quick answer; Student: submit quick answer.
 * WebSocket event-driven state sync. Extracted from quick-answer-modal.vue, component only handles UI.
 *
 * @param props Contains classId and canEdit
 * @param open  Modal open Ref (auto endQA if teacher hasn't ended when closing)
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
