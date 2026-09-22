import { ref, computed, inject, watch, nextTick } from 'vue'
import { submitQuestion, recordAnswer } from './shared'

export function useSort(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('questionSubmitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()

  // dragList: [{ originalIndex: 2 }, { originalIndex: 0 }, ...] — 驱动 vuedraggable
  const dragList = ref([])
  // 防止 dragList watcher → recordAnswer → record watcher → dragList 循环
  let isRecording = false
  // 记录回填中：由 record watcher 设置，期间 dragList watcher 不应清除 submitted/fromRecord
  let restoring = false
  // 加固①：用户是否真正拖过。拖过之后，迟到 / 重复的 record 回填一律忽略，
  // 否则会把学生正在进行的排序覆盖掉（表现为"拖过去又被弹回"）
  let userTouched = false
  // 加固②：上次初始化对应的题目身份与结构签名。
  // 同一道题被重新请求（网络重试 / 重新拉取）会拿到新的 question 对象，
  // 若照着对象变化就 shuffle，会把学生的排序清掉重洗；只有换题或题目结构变了才重建。
  let lastKey: any = null
  let lastShape = ''
  // userOrder: 从 dragList 派生的原始索引数组
  const userOrder = computed(() => dragList.value.map(item => item.originalIndex))

  const hasAnswer = computed(() => userOrder.value.length > 0)

  /** 结构签名：题号 + 选项个数，用来判断"还是不是同一道题" */
  function shapeOf(q: any) {
    return `${q?.type}|${Array.isArray(q?.options) ? q.options.length : 0}`
  }

  // 初始化：打乱顺序
  function shuffle() {
    const options = props.question.options || []
    const indices = options.map((_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    // 避免刚好和正确顺序一样（如果超过1项）
    if (indices.length > 1 && indices.every((v, i) => v === i)) {
      ;[indices[0], indices[1]] = [indices[1], indices[0]]
    }
    dragList.value = indices.map(idx => ({ originalIndex: idx }))
  }

  /** 换题 / 首次进入：重新打乱，并视为"尚未作答" */
  function resetForNewQuestion() {
    userTouched = false
    shuffle()
  }

  /** 用户真正开始拖动（vuedraggable 的 start 事件）→ 标记为已作答 */
  function onDragStart() {
    userTouched = true
  }

  // 监听 question 变化时初始化
  watch(() => props.question, (q) => {
    if (q?.type !== 'sort' || !Array.isArray(q.options) || !q.options.length) return
    const key = props.questionId || q
    const shape = shapeOf(q)
    // 同一道题重新请求：保留学生当前排序，不重洗
    if (key === lastKey && shape === lastShape) return
    lastKey = key
    lastShape = shape
    resetForNewQuestion()
  }, { immediate: true })

  // 监听 record 变化（fetchRecord 回填场景）
  watch(() => props.question?.record, (record) => {
    if (isRecording) return
    if (!Array.isArray(record) || record.length === 0) return
    // 学生已开始作答：忽略后到的回填，避免覆盖进行中的排序
    if (userTouched) return
    restoring = true
    dragList.value = record.map(idx => ({ originalIndex: idx }))
    nextTick(() => { restoring = false })
  }, { immediate: true })



  // dragList 变化时实时记录
  watch(dragList, () => {
    if (restoring) return
    if (submitted.value) {
      submitted.value = false
    }
    if (fromRecord.value) {
      fromRecord.value = false
    }
    isRecording = true
    recordAnswer(props.question, [...userOrder.value])
    nextTick(() => { isRecording = false })
  }, { deep: true })

  function getItemText(originalIndex) {
    const opt = props.question.options?.[originalIndex]
    if (typeof opt === 'string') return opt
    return String(opt || '')
  }

  function itemClass(originalIndex) {
    if (!submitted.value) {
      return 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-900'
    }
    if (isCorrect.value) {
      return 'border-green-400 bg-green-50 dark:bg-green-900/20'
    }
    // 答错：每个位置单独着色
    const correctOrder = props.question.answer || []
    const currentPos = userOrder.value.indexOf(originalIndex)
    if (correctOrder[currentPos] === originalIndex) {
      return 'border-green-400 bg-green-50 dark:bg-green-900/20'
    }
    return 'border-red-400 bg-red-50 dark:bg-red-900/20'
  }

  async function submit() {
    if (!props.question || !userOrder.value.length) return
    // 服务端判分（show 不下发答案，本地无法判定）
    const result = await submitQuestion({
      questionId: props.questionId,
      userAnswer: [...userOrder.value],
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
      question: props.question,
    })
    if (!result) return null
    isCorrect.value = result.isCorrect
    return { isCorrect: result.isCorrect }
  }

  function reset() {
    shuffle()
  }

  // 填充正确答案
  function fillCorrectAnswer() {
    const correctOrder = props.question.answer || []
    if (correctOrder.length) {
      dragList.value = correctOrder.map(idx => ({ originalIndex: idx }))
      recordAnswer(props.question, [...correctOrder])
    }
  }

  return {
    dragList,
    submitted,
    isCorrect,
    hasAnswer,
    getItemText,
    itemClass,
    submit,
    reset,
    fillCorrectAnswer,
    onDragStart,
  }
}
