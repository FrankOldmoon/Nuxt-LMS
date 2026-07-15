import { ref, computed, inject, watch, onMounted, onBeforeUnmount } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared'

export function useMatch(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('question submitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()

  // Leftitems（originalStartOrder）
  const leftItems = computed(() => props.question.options || [])

  // Rightitems（shuffleOrderBack { text, originalIndex }）
  const rightItems = ref<any[]>([])

  // connections[leftIdx] = rightIdx（Right rightItems MiddlePosition）
  const connections = ref<Record<string, number>>({})
  const selectedLeft = ref<number | null>(null)
  const hoveredRight = ref<number | null>(null)
  const mousePos = ref({ x: 0, y: 0 })

  // DOM refs
  const containerRef = ref<any>(null)
  const leftEls = ref<any[]>([])
  const rightEls = ref<any[]>([])

  const hasAnswer = computed(() => Object.keys(connections.value).length > 0)

  // shuffleRightitems
  function shuffleRight() {
    const items = (props.question.options || []).map((pair: any, i: number) => ({
      text: pair.right,
      originalIndex: i,
    }))
    // Fisher-Yates shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    // avoid justGoodandoriginalStartOrdersame
    if (items.length > 1 && items.every((it, i) => it.originalIndex === i)) {
      ;[items[0], items[1]] = [items[1], items[0]]
    }
    rightItems.value = items
    leftEls.value = []
    rightEls.value = []
  }

  // listen question changeInitialize
  watch(() => props.question, (q) => {
    if (q?.type === 'match' && Array.isArray(q.options) && q.options.length) {
      connections.value = {}
      selectedLeft.value = null
      shuffleRight()
    }
  }, { immediate: true })

  // listen record change（fetchRecord backfill scenario）
  watch(() => props.question?.record, (record) => {
    if (!Array.isArray(record) || record.length === 0) return
    // record[leftIdx] = rightOriginalIndex
    // needConvert connections[leftIdx] = rightItems MiddlePosition
    const newConn: Record<string, number> = {}
    record.forEach((rightOriginalIdx: number, leftIdx: number) => {
      if (rightOriginalIdx < 0) return
      const rightPos = rightItems.value.findIndex(r => r.originalIndex === rightOriginalIdx)
      if (rightPos >= 0) newConn[leftIdx] = rightPos
    })
    connections.value = newConn
  }, { immediate: true })

  // Syncto record
  function syncRecord() {
    const answer = props.question.answer || []
    const record = new Array(answer.length).fill(-1)
    Object.keys(connections.value).forEach(leftIdx => {
      const rightPos = connections.value[leftIdx]
      if (rightPos >= 0 && rightItems.value[rightPos]) {
        record[Number(leftIdx)] = rightItems.value[rightPos].originalIndex
      }
    })
    recordAnswer(props.question, record)
  }

  // ClickLeft
  function onLeftClick(leftIdx: number) {
    if (submitted?.value) {
      submitted.value = false
    }
    if (fromRecord?.value) {
      fromRecord.value = false
    }
    if (selectedLeft.value === leftIdx) {
      selectedLeft.value = null
    } else {
      selectedLeft.value = leftIdx
    }
  }

  // ClickRight
  function onRightClick(rightIdx: number) {
    if (submitted?.value) {
      submitted.value = false
    }
    if (fromRecord?.value) {
      fromRecord.value = false
    }
    if (selectedLeft.value === null) return

    const leftIdx = selectedLeft.value
    const newConn = { ...connections.value }

    // IftheRightalreadyOtherLeftConnection，breakOnThatitemsConnection
    const existingLeft = Object.keys(newConn).find(k => newConn[k] === rightIdx)
    if (existingLeft !== undefined) {
      delete newConn[existingLeft]
    }

    // IftheLeftConnectedOtherRight，Replace
    if (newConn[leftIdx] !== undefined) {
      delete newConn[leftIdx]
    }

    newConn[leftIdx] = rightIdx
    connections.value = newConn
    selectedLeft.value = null
    syncRecord()
  }

  function onRightHover(rightIdx: number) {
    hoveredRight.value = rightIdx
  }

  // Getcoordinate
  function getLeftX(idx: number) {
    const el = leftEls.value[idx]
    const container = containerRef.value
    if (!el || !container) return 0
    const elRect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    return elRect.right - containerRect.left
  }

  function getLeftY(idx: number) {
    const el = leftEls.value[idx]
    const container = containerRef.value
    if (!el || !container) return 0
    const elRect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    return elRect.top + elRect.height / 2 - containerRect.top
  }

  function getRightX(idx: number) {
    const el = rightEls.value[idx]
    const container = containerRef.value
    if (!el || !container) return 0
    const elRect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    return elRect.left - containerRect.left
  }

  function getRightY(idx: number) {
    const el = rightEls.value[idx]
    const container = containerRef.value
    if (!el || !container) return 0
    const elRect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    return elRect.top + elRect.height / 2 - containerRect.top
  }

  // mouse movementTrack（useintemporary connectLine）
  function onMouseMove(e: MouseEvent) {
    if (selectedLeft.value === null || !containerRef.value) return
    const containerRect = containerRef.value.getBoundingClientRect()
    mousePos.value = {
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
    }
  }

  onMounted(() => {
    window.addEventListener('mousemove', onMouseMove)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('mousemove', onMouseMove)
  })

  // Style
  function leftItemClass(leftIdx: number) {
    if (selectedLeft.value === leftIdx) {
      return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300'
    }
    if (!submitted?.value) {
      return 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-900'
    }
    // SubmitBackColor
    const rightPos = connections.value[leftIdx]
    if (rightPos === undefined) return 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900'
    const isCorrectConn = rightItems.value[rightPos]?.originalIndex === leftIdx
    return isCorrectConn
      ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
      : 'border-red-400 bg-red-50 dark:bg-red-900/20'
  }

  function rightItemClass(rightIdx: number) {
    if (!submitted?.value) {
      return 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-900'
    }
    // SubmitBackColor
    const leftIdx = Object.keys(connections.value).find(k => connections.value[k] === rightIdx)
    if (leftIdx === undefined) return 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900'
    const isCorrectConn = rightItems.value[rightIdx]?.originalIndex === Number(leftIdx)
    return isCorrectConn
      ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
      : 'border-red-400 bg-red-50 dark:bg-red-900/20'
  }

  function getLineColor(leftIdx: number, rightPos: number) {
    if (!submitted?.value) return '#3b82f6'
    const isCorrectConn = rightItems.value[rightPos]?.originalIndex === leftIdx
    return isCorrectConn ? '#4ade80' : '#f87171'
  }

  function getConnectionCount(rightIdx: number) {
    return Object.values(connections.value).filter(v => v === rightIdx).length
  }

  function submit() {
    if (!props.question) return
    const answer = props.question.answer || []
    const correct = answer.length === Object.keys(connections.value).length &&
      answer.every((_: any, leftIdx: number) => {
        const rightPos = connections.value[leftIdx]
        if (rightPos === undefined) return false
        return rightItems.value[rightPos]?.originalIndex === leftIdx
      })
    if (isCorrect) isCorrect.value = correct
    submitQuestion({
      questionId: props.questionId,
      userAnswer: buildRecordArray(),
      isCorrect: correct,
      correctRate: computeCorrectRate(props.question),
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
    })
    return { isCorrect: correct }
  }

  function buildRecordArray() {
    const answer = props.question.answer || []
    const record = new Array(answer.length).fill(-1)
    Object.keys(connections.value).forEach(leftIdx => {
      const rightPos = connections.value[leftIdx]
      if (rightPos >= 0 && rightItems.value[rightPos]) {
        record[Number(leftIdx)] = rightItems.value[rightPos].originalIndex
      }
    })
    return record
  }

  function reset() {
    connections.value = {}
    selectedLeft.value = null
    shuffleRight()
    syncRecord()
  }

  function fillCorrectAnswer() {
    const answer = props.question.answer || []
    const newConn: Record<string, number> = {}
    answer.forEach((_: any, leftIdx: number) => {
      const rightPos = rightItems.value.findIndex(r => r.originalIndex === leftIdx)
      if (rightPos >= 0) newConn[leftIdx] = rightPos
    })
    connections.value = newConn
    syncRecord()
  }

  return {
    leftItems,
    rightItems,
    connections,
    selectedLeft,
    hoveredRight,
    mousePos,
    containerRef,
    leftEls,
    rightEls,
    hasAnswer,
    onLeftClick,
    onRightClick,
    onRightHover,
    getLeftX,
    getLeftY,
    getRightX,
    getRightY,
    leftItemClass,
    rightItemClass,
    getLineColor,
    getConnectionCount,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
