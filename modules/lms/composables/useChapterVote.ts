import type { Ref } from 'vue'

/**
 * Chapter voting modal logic
 * - Teacher: create vote, view real-time progress, end vote
 * - Student: vote, view results
 * - Listen to WebSocket vote events (start/update/end)
 */
export function useChapterVote(props: { classId: number; canEdit: boolean }, open: Ref<boolean>) {
  const { user } = useAuth()
  const { sendVoteStart, onVoteStart, sendVoteSubmit, onVoteUpdate, sendVoteEnd, onVoteEnd } = useWebSocket()

  // Teacher: create vote
  const question = ref('')
  const options = ref(['', ''])
  const activeVoteId = ref<string | null>(null)

  // Vote state
  const voteQuestion = ref('')
  const voteOptions = ref<string[]>([])
  const voteResults = ref<number[]>([])
  const voteTotal = ref(0)
  const voted = ref(false)

  const canStartVote = computed(() => !!question.value.trim() && options.value.every(o => o.trim()))

  function addOption() {
    options.value.push('')
  }
  function removeOption(i: number) {
    if (options.value.length > 2) options.value.splice(i, 1)
  }

  function startVote() {
    if (!props.classId || !canStartVote.value) return
    const id = `vote-${Date.now()}`
    const opts = options.value.map(o => o.trim())
    sendVoteStart(props.classId, id, question.value.trim(), opts)
    activeVoteId.value = id
    voteQuestion.value = question.value.trim()
    voteOptions.value = opts
    voteResults.value = new Array(opts.length).fill(0)
    voteTotal.value = 0
  }

  function submitVote(index: number) {
    if (!props.classId || !activeVoteId.value) return
    sendVoteSubmit(props.classId, activeVoteId.value, index, user.value?.name || 'anonymous')
    voted.value = true
  }

  function endVote() {
    if (!props.classId || !activeVoteId.value) return
    sendVoteEnd(props.classId, activeVoteId.value)
    resetVote()
  }

  function resetVote() {
    activeVoteId.value = null
    voteQuestion.value = ''
    voteOptions.value = []
    voteResults.value = []
    voteTotal.value = 0
    voted.value = false
    question.value = ''
    options.value = ['', '']
  }

  function barWidth(i: number) {
    if (!voteTotal.value) return '0%'
    return `${((voteResults.value[i] || 0) / voteTotal.value * 100).toFixed(1)}%`
  }

  // Listen to vote events
  onVoteStart((data) => {
    activeVoteId.value = data.voteId
    voteQuestion.value = data.question
    voteOptions.value = data.options
    voteResults.value = new Array(data.options.length).fill(0)
    voteTotal.value = 0
    voted.value = false
    open.value = true
  })

  onVoteUpdate((data) => {
    if (data.voteId !== activeVoteId.value) return
    voteResults.value = data.results
    voteTotal.value = data.total
  })

  onVoteEnd((data) => {
    if (data.voteId !== activeVoteId.value) return
    voteResults.value = data.results
    voteTotal.value = data.total
  })

  // Reset for teacher when modal closes
  watch(open, (v) => {
    if (!v && props.canEdit && activeVoteId.value) {
      endVote()
    }
  })

  return {
    question, options, activeVoteId, voteQuestion, voteOptions, voteResults, voteTotal, voted,
    canStartVote, addOption, removeOption, startVote, submitVote, endVote, resetVote, barWidth,
  }
}
