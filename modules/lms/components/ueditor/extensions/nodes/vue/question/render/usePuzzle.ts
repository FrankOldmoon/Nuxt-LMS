import { ref, computed, inject, watch } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared'

export function usePuzzle(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('question submitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()

  // from options ReadImage URL andsplit count
  const opts = computed(() => {
    const o = props.question.options
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      return { url: o.url || '', split: Number(o.split) || 3 }
    }
    return { url: '', split: 3 }
  })
  const imageUrl = computed(() => opts.value.url)
  const split = computed(() => opts.value.split)

  // pieces: UserrowcolumnsoriginalStartIndexArray
  // pieces[0] = originalStartIndex 2 representsPosition 0 Show 2 block
  const pieces = ref([])
  const selectedPos = ref(null)

  const hasAnswer = computed(() => pieces.value.length > 0)

  // shuffleOrder
  function shuffle() {
    const n = split.value * split.value
    const indices = Array.from({ length: n }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    // avoid justGoodandCorrectOrdersame
    if (indices.length > 1 && indices.every((v, i) => v === i)) {
      ;[indices[0], indices[1]] = [indices[1], indices[0]]
    }
    pieces.value = indices
    recordAnswer(props.question, [...indices])
  }

  // listen question changeInitialize
  watch(() => props.question, (q) => {
    if (q?.type === 'puzzle' && opts.value.url) {
      shuffle()
    }
  }, { immediate: true })

  // listen record change（fetchRecord backfill scenario）
  watch(() => props.question?.record, (record) => {
    if (!Array.isArray(record) || record.length === 0) return
    pieces.value = [...record]
  }, { immediate: true })

  // Click swap
  function onPieceClick(pos) {
    if (submitted.value) {
      submitted.value = false
    }
    if (fromRecord.value) {
      fromRecord.value = false
    }
    if (selectedPos.value === null) {
      selectedPos.value = pos
    } else if (selectedPos.value === pos) {
      selectedPos.value = null
    } else {
      // swap
      const arr = [...pieces.value]
      ;[arr[selectedPos.value], arr[pos]] = [arr[pos], arr[selectedPos.value]]
      pieces.value = arr
      selectedPos.value = null
      recordAnswer(props.question, [...arr])
    }
  }

  // each blockBackgroundStyle
  function pieceStyle(originalIndex) {
    const s = split.value
    const row = Math.floor(originalIndex / s)
    const col = originalIndex % s
    const posX = s > 1 ? (col / (s - 1)) * 100 : 0
    const posY = s > 1 ? (row / (s - 1)) * 100 : 0
    return {
      backgroundImage: `url(${imageUrl.value})`,
      backgroundSize: `${s * 100}% ${s * 100}%`,
      backgroundPosition: `${posX}% ${posY}%`,
    }
  }

  function pieceClass(pos, originalIndex) {
    if (selectedPos.value === pos) {
      return 'ring-2 ring-blue-500 ring-offset-1'
    }
    if (!submitted.value) return ''
    if (isCorrect.value) {
      return 'ring-1 ring-green-400'
    }
    // answerWrong：block by blockColor
    const correctOrder = props.question.answer || []
    if (correctOrder[pos] === originalIndex) {
      return 'ring-1 ring-green-400'
    }
    return 'ring-1 ring-red-400'
  }

  function submit() {
    if (!props.question || !pieces.value.length) return
    const correctOrder = props.question.answer || []
    const correct = correctOrder.length === pieces.value.length &&
      pieces.value.every((idx, i) => idx === correctOrder[i])
    isCorrect.value = correct
    submitQuestion({
      questionId: props.questionId,
      userAnswer: [...pieces.value],
      isCorrect: correct,
      correctRate: computeCorrectRate(props.question),
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
    })
    return { isCorrect: correct }
  }

  function reset() {
    shuffle()
    selectedPos.value = null
  }

  function fillCorrectAnswer() {
    const correctOrder = props.question.answer || []
    if (correctOrder.length) {
      pieces.value = [...correctOrder]
      recordAnswer(props.question, [...correctOrder])
    }
    selectedPos.value = null
  }

  return {
    pieces,
    selectedPos,
    imageUrl,
    split,
    hasAnswer,
    onPieceClick,
    pieceStyle,
    pieceClass,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
