import { ref, computed, inject, watch, onMounted, onBeforeUnmount } from 'vue'
import { submitQuestion, recordAnswer } from './shared'

export function useMatch(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('questionSubmitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()

  // 左侧项（原始顺序）
  const leftItems = computed(() => props.question.options || [])

  // 右侧项（打乱顺序后的 { text, originalIndex }）
  const rightItems = ref<any[]>([])

  // connections[leftIdx] = rightIdx（右侧在 rightItems 中的位置）
  const connections = ref<Record<string, number>>({})
  const selectedLeft = ref<number | null>(null)
  const hoveredRight = ref<number | null>(null)
  const mousePos = ref({ x: 0, y: 0 })

  // DOM refs
  const containerRef = ref<any>(null)
  const leftEls = ref<any[]>([])
  const rightEls = ref<any[]>([])

  const hasAnswer = computed(() => Object.keys(connections.value).length > 0)

  // 打乱右侧项
  function shuffleRight() {
    const items = (props.question.options || []).map((pair: any, i: number) => ({
      text: pair.right,
      originalIndex: i,
    }))
    // Fisher-Yates 打乱
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    // 避免刚好和原始顺序一样
    if (items.length > 1 && items.every((it, i) => it.originalIndex === i)) {
      ;[items[0], items[1]] = [items[1], items[0]]
    }
    rightItems.value = items
    leftEls.value = []
    rightEls.value = []
  }

  // 监听 question 变化初始化
  watch(() => props.question, (q) => {
    if (q?.type === 'match' && Array.isArray(q.options) && q.options.length) {
      connections.value = {}
      selectedLeft.value = null
      shuffleRight()
    }
  }, { immediate: true })

  // 监听 record 变化（fetchRecord 回填场景）
  watch(() => props.question?.record, (record) => {
    if (!Array.isArray(record) || record.length === 0) return
    // record[leftIdx] = rightOriginalIndex
    // 需要转换为 connections[leftIdx] = rightItems 中的位置
    const newConn: Record<string, number> = {}
    record.forEach((rightOriginalIdx: number, leftIdx: number) => {
      if (rightOriginalIdx < 0) return
      const rightPos = rightItems.value.findIndex(r => r.originalIndex === rightOriginalIdx)
      if (rightPos >= 0) newConn[leftIdx] = rightPos
    })
    connections.value = newConn
  }, { immediate: true })

  // 同步到 record
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

  // 点击左侧
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

  // 点击右侧
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

    // 如果该右侧已被其他左侧连接，断开那个连接
    const existingLeft = Object.keys(newConn).find(k => newConn[k] === rightIdx)
    if (existingLeft !== undefined) {
      delete newConn[existingLeft]
    }

    // 如果该左侧已连接其他右侧，替换
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

  // 获取坐标
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

  // 鼠标移动跟踪（用于临时连线）
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

  // 样式
  function leftItemClass(leftIdx: number) {
    if (selectedLeft.value === leftIdx) {
      return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300'
    }
    if (!submitted?.value) {
      return 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-900'
    }
    // 提交后着色
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
    // 提交后着色
    const leftIdx = Object.keys(connections.value).find(k => connections.value[k] === rightIdx)
    if (leftIdx === undefined) return 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900'
    const isCorrectConn = rightItems.value[rightIdx]?.originalIndex === Number(leftIdx)
    return isCorrectConn
      ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
      : 'border-red-400 bg-red-50 dark:bg-red-900/20'
  }

  function getLineColor(leftIdx: number, rightPos: number) {
    if (!submitted?.value) return '#3b82f6'
    // leftIdx 可能来自对象 key（字符串），与 originalIndex（数字）比较需统一转数字
    const isCorrectConn = rightItems.value[rightPos]?.originalIndex === Number(leftIdx)
    return isCorrectConn ? '#4ade80' : '#f87171'
  }

  function getConnectionCount(rightIdx: number) {
    return Object.values(connections.value).filter(v => v === rightIdx).length
  }

  async function submit() {
    if (!props.question) return
    // 服务端判分（show 不下发答案，本地无法判定）
    const result = await submitQuestion({
      questionId: props.questionId,
      userAnswer: buildRecordArray(),
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
      question: props.question,
    })
    if (!result) return null
    if (isCorrect) isCorrect.value = result.isCorrect
    return { isCorrect: result.isCorrect }
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
