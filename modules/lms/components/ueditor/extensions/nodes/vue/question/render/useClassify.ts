import { ref, computed, inject, watch, nextTick } from 'vue'
import { submitQuestion, recordAnswer } from './shared'

export function useClassify(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('questionSubmitted')!
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')!
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')!
  const { courseId, chapterId } = useLmsContext()

  // 扁平化所有选项：[{ text, flatIndex, correctCat }]
  const flatItems = computed(() => {
    const result: any[] = []
    const options = props.question.options || []
    options.forEach((cat, ci) => {
      ;(cat.items || []).forEach((text: any) => {
        result.push({ text, flatIndex: result.length, correctCat: ci })
      })
    })
    return result
  })

  // 分类名称列表
  const categories = computed(() => props.question.options || [])

  // 池子（未分类的项）和各分类桶
  const pool = ref<any[]>([])
  const catBuckets = ref<any[]>([])

  // 防止 record ↔ 拖拽 互相触发的循环
  let restoring = false

  // 初始化：所有项打乱后放入池子
  function initBuckets() {
    const options = props.question.options || []
    catBuckets.value = options.map(() => [])
    const items = flatItems.value.map(item => ({ ...item }))
    // Fisher-Yates 打乱
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    pool.value = items
    doSyncRecord()
  }

  // 从当前 pool/catBuckets 构建 record 数组
  function buildRecord() {
    const answer = props.question.answer || []
    const record = new Array(answer.length).fill(-1)
    // 池子中的项：-1（默认值，无需显式设置）
    // 分类桶中的项：对应的分类索引
    catBuckets.value.forEach((bucket, ci) => {
      bucket?.forEach((item: any) => {
        record[item.flatIndex] = ci
      })
    })
    return record
  }

  // 同步到 question.record（带循环保护）
  function doSyncRecord() {
    if (restoring) return
    const record = buildRecord()
    // 检查是否与当前 record 一致，避免不必要的更新
    const current = props.question.record
    if (Array.isArray(current) && current.length === record.length &&
        record.every((v: any, i: number) => v === current[i])) return
    recordAnswer(props.question, record)
  }

  // 监听 question 变化初始化
  watch(() => props.question, (q: any) => {
    if (q?.type === 'classify' && Array.isArray(q.options) && q.options.length) {
      initBuckets()
    }
  }, { immediate: true })

  // 监听 record 变化（fetchRecord 回填场景）
  watch(() => props.question?.record, (record: any) => {
    if (!Array.isArray(record) || record.length === 0) return
    // 检查是否与当前状态一致，避免循环
    const current = buildRecord()
    if (current.length === record.length && record.every((v: any, i: number) => v === current[i])) return
    // 从 record 恢复状态
    restoring = true
    const items = flatItems.value.map(item => ({ ...item }))
    const options = props.question.options || []
    catBuckets.value = options.map(() => [])
    const newPool: any[] = []
    record.forEach((catIdx: any, flatIdx: number) => {
      const item = items.find(it => it.flatIndex === flatIdx)
      if (!item) return
      if (catIdx >= 0 && catBuckets.value[catIdx]) {
        catBuckets.value[catIdx].push(item)
      } else {
        newPool.push(item)
      }
    })
    pool.value = newPool
    nextTick(() => { restoring = false })
  }, { immediate: true })

  // 拖拽时更新 record
  watch([pool, catBuckets], () => {
    if (submitted.value) {
      submitted.value = false
    }
    if (fromRecord.value) {
      fromRecord.value = false
    }
    doSyncRecord()
  }, { deep: true })

  const hasAnswer = computed(() => {
    return catBuckets.value.some(bucket => bucket && bucket.length > 0)
  })

  function poolItemClass() {
    return 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300'
  }

  function bucketItemClass(element: any, ci: number) {
    if (!submitted.value) {
      return 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    }
    if (element.correctCat === ci) {
      return 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    }
    return 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }

  async function submit() {
    if (!props.question) return
    const record = buildRecord()
    // 服务端判分（show 不下发答案，本地无法判定）
    const result = await submitQuestion({
      questionId: props.questionId,
      userAnswer: record,
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
    initBuckets()
  }

  // 填充正确答案：将每项放入正确的分类
  function fillCorrectAnswer() {
    const answer = props.question.answer || []
    if (!answer.length) return
    restoring = true
    const items = flatItems.value.map(item => ({ ...item }))
    const options = props.question.options || []
    catBuckets.value = options.map(() => [])
    pool.value = []
    answer.forEach((catIdx: any, flatIdx: number) => {
      const item = items.find(it => it.flatIndex === flatIdx)
      if (!item) return
      if (catIdx >= 0 && catBuckets.value[catIdx]) {
        catBuckets.value[catIdx].push(item)
      }
    })
    recordAnswer(props.question, [...answer])
    nextTick(() => { restoring = false })
  }

  return {
    pool,
    catBuckets,
    categories,
    hasAnswer,
    poolItemClass,
    bucketItemClass,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
