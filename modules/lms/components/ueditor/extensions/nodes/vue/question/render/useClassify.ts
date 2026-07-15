import { ref, computed, inject, watch, nextTick } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared'

export function useClassify(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('question submitted')!
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')!
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')!
  const { courseId, chapterId } = useLmsContext()

  // flattenAlloptionitems：[{ text, flatIndex, correctCat }]
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

  // CategoryNameList
  const categories = computed(() => props.question.options || [])

  // poolSon（notCategoryitems）andeachCategorybucket
  const pool = ref<any[]>([])
  const catBuckets = ref<any[]>([])

  // prevent record ↔ drag mutualTriggerloop
  let restoring = false

  // Initialize：AllitemsshuffleBackput in poolSon
  function initBuckets() {
    const options = props.question.options || []
    catBuckets.value = options.map(() => [])
    const items = flatItems.value.map(item => ({ ...item }))
    // Fisher-Yates shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    pool.value = items
    doSyncRecord()
  }

  // fromCurrent pool/catBuckets Build record Array
  function buildRecord() {
    const answer = props.question.answer || []
    const record = new Array(answer.length).fill(-1)
    // poolSonMiddleitems：-1（Default Value，Noneneed to explicitlySettings）
    // CategorybucketMiddleitems：RightshouldCategoryIndex
    catBuckets.value.forEach((bucket, ci) => {
      bucket?.forEach((item: any) => {
        record[item.flatIndex] = ci
      })
    })
    return record
  }

  // Syncto question.record（with cycle protection）
  function doSyncRecord() {
    if (restoring) return
    const record = buildRecord()
    // checkYesNoandCurrent record consistent，avoid unmustneedUpdate
    const current = props.question.record
    if (Array.isArray(current) && current.length === record.length &&
        record.every((v: any, i: number) => v === current[i])) return
    recordAnswer(props.question, record)
  }

  // listen question changeInitialize
  watch(() => props.question, (q: any) => {
    if (q?.type === 'classify' && Array.isArray(q.options) && q.options.length) {
      initBuckets()
    }
  }, { immediate: true })

  // listen record change（fetchRecord backfill scenario）
  watch(() => props.question?.record, (record: any) => {
    if (!Array.isArray(record) || record.length === 0) return
    // checkYesNoandCurrentStatusconsistent，avoid loop
    const current = buildRecord()
    if (current.length === record.length && record.every((v: any, i: number) => v === current[i])) return
    // from record ResumeStatus
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

  // when draggingUpdate record
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

  function submit() {
    if (!props.question) return
    const record = buildRecord()
    const answer = props.question.answer || []
    const correct = answer.length === record.length &&
      record.every((cat: any, i: number) => cat === answer[i])
    isCorrect.value = correct
    submitQuestion({
      questionId: props.questionId,
      userAnswer: record,
      isCorrect: correct,
      correctRate: computeCorrectRate(props.question),
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
    })
    return { isCorrect: correct }
  }

  function reset() {
    initBuckets()
  }

  // fillCorrectAnswer：willeachitemsputCorrectCategory
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
