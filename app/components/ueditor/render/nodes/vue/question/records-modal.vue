<template>
    <UModal v-model:open="open" scrollable fullscreen>
        <template #content>
            <div class="p-6 space-y-4 min-w-[600px]">
                <h2 class="text-lg font-semibold">{{ $t('record.questionRecords') }}</h2>

                <ClassUsersTable :rows="rows" :loading="pending" :extra-columns="extraColumns"
                    :hide-actions="true" :hide-teachers="true" :default-sort="defaultSort">
                    <!-- record 列：显示学生选择/填写的具体内容 + 正确与否 -->
                    <template #record-cell="{ row }">
                        <div class="flex items-start gap-2">
                            <template v-if="row.original.record">
                                <UIcon :name="recordIcon(row.original.record)" class="w-3.5 h-3.5 mt-0.5 shrink-0"
                                    :class="recordIconClass(row.original.record)" />
                                <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span v-for="(ans, idx) in formatUserAnswer(row.original.record)" :key="idx"
                                        class="text-xs px-1.5 py-0.5 rounded"
                                        :class="answerItemClass(row.original.record, idx)">
                                        {{ ans }}
                                    </span>
                                    <span class="text-xs text-gray-400">→ {{ formatCorrectRate(row.original.record) }}</span>
                                </div>
                            </template>
                            <span v-else class="text-xs text-gray-400">-</span>
                        </div>
                    </template>
                </ClassUsersTable>

                <!-- 选项分布柱状图（仅 single/multiple 类型） -->
                <ClientOnly v-if="showOptionChart">
                    <div class="mt-4 pt-4 border-t border-default">
                        <h3 class="text-sm font-medium mb-2">{{ $t('record.optionDistribution') }}</h3>
                        <Chart :option="optionChartOption" height="240" />
                    </div>
                </ClientOnly>
            </div>
        </template>
    </UModal>
</template>

<script setup>
import { computeCorrectRate } from './shared.ts'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    courseId: { type: Number, default: 0 },
    cid: { type: Number, default: 0 },
    question: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const { students, fetchUsers, currentClassId } = useClassUsers()

const open = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const rows = ref([])
const pending = ref(false)

const extraColumns = computed(() => [{
    id: 'record',
    header: t('record.colRecord'),
    sortingFn: (a, b) => (a.original.record ? 1 : 0) - (b.original.record ? 1 : 0),
}])

const defaultSort = [{ id: 'record', desc: true }]

// 先用缓存学生数据填充 table，再异步合并 records
function buildRows(recordsData) {
    const recordMap = new Map((recordsData || []).map(r => [r.userId, r.record]))
    rows.value = students.value.map(s => ({
        id: s.id,
        name: s.name,
        preferName: s.preferName,
        rollNumber: s.rollNumber,
        avatarImg: s.avatarImg,
        record: recordMap.get(s.id) || null,
    }))
    // 有记录的排前面
    rows.value.sort((a, b) => {
        const aHas = a.record ? 1 : 0
        const bHas = b.record ? 1 : 0
        return bHas - aHas
    })
}

async function fetchRecords() {
    if (!props.courseId || !props.cid) {
        rows.value = []
        return
    }
    // 先用缓存学生数据立即显示 table
    buildRows([])
    pending.value = true
    try {
        const data = await cRequest(`/api/lms/questions/records?course_id=${props.courseId}&cid=${props.cid}`)
        buildRows(data)
    } catch {
        rows.value = []
    } finally {
        pending.value = false
    }
}

watch(open, (val) => {
    if (val) fetchRecords()
})

// 格式化作答内容
function formatUserAnswer(record) {
  const userAns = Array.isArray(record?.records) ? record.records : []
  const q = props.question
  if (!q) return userAns.map(String)
  const type = q.type

  if (type === 'single' || type === 'judge' || type === 'multiple') {
    return userAns.map(idx => String.fromCharCode(65 + Number(idx)))
  }
  if (type === 'sort') {
    // 显示用户排列的选项文本
    const options = q.options || []
    return userAns.map(idx => options[idx] || `#${idx}`)
  }
  if (type === 'classify') {
    // 显示每项及其被分到的分类
    const options = q.options || []
    const flatItems = []
    options.forEach(cat => {
      (cat.items || []).forEach(item => flatItems.push(item))
    })
    return userAns.map((catIdx, i) => {
      const cat = options[catIdx]
      const catName = cat?.name || `#${Number(catIdx) + 1}`
      return `${flatItems[i] || `#${i}`} → ${catName}`
    })
  }
  if (type === 'puzzle') {
    // 拼图题：显示用户排列的序号
    return userAns.map((idx, i) => `#${i + 1}→${Number(idx) + 1}`)
  }
  if (type === 'html') {
    // HTML 题：显示 correct_rate
    return [`${t('question.htmlCorrectRate')}: ${Math.round((Number(userAns[0]) || 0) * 100)}%`]
  }
  if (type === 'short-answer') {
    // 简答题：显示用户输入文本
    return [String(userAns[0] || '')]
  }
  if (type === 'match') {
    // 连线题：显示用户的配对（left → right 文本）
    const options = q.options || []
    return options.map((pair, i) => {
      const rightIdx = Number(userAns[i])
      if (rightIdx < 0 || isNaN(rightIdx)) return `${pair.left} → ?`
      const rightPair = options[rightIdx]
      return `${pair.left} → ${rightPair?.right || '?'}`
    })
  }
  if (type === 'composite') {
    // 大题：显示各子题的得分率
    const subs = Array.isArray(q.content) ? q.content : []
    return subs.map((sub, i) => {
      const subRecord = Array.isArray(userAns[i]) ? userAns[i] : []
      const subQ = { ...sub, record: subRecord }
      const rate = computeCorrectRate(subQ)
      return `#${i + 1} ${sub.name || ''}: ${Math.round(rate * 100)}%`
    })
  }
  return userAns.map(String)
}

function formatCorrectRate(record) {
  const rate = Number(record?.correctRate) || 0
  if (rate >= 1) return `${t('record.correct')} ( ${record.score}分 )`
  if (rate > 0) return `${t('record.partial')} ${Math.round(rate * 100)}% ( ${record.score}分 )`
  return `${t('record.wrong')} ( ${record.score}分 )`
}

function answerItemClass(record, idx) {
  const q = props.question
  if (!q) return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
  const userAns = Array.isArray(record?.records) ? record.records : []
  const answer = Array.isArray(q.answer) ? q.answer : []
  const type = q.type
  const val = userAns[idx]

  if (type === 'single' || type === 'judge' || type === 'multiple') {
    return answer.includes(Number(val))
      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
      : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
  }
  if (type === 'sort') {
    // 对比每个位置的索引是否正确
    return Number(val) === Number(answer[idx])
      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
      : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
  }
  if (type === 'classify') {
    // 对比每项的分类索引是否正确
    return Number(val) === Number(answer[idx])
      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
      : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
  }
  if (type === 'puzzle') {
    // 对比每个位置的原始索引是否正确
    return Number(val) === Number(answer[idx])
      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
      : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
  }
  if (type === 'html') {
    // HTML 题：根据 correct_rate 着色
    const rate = Number(val) || 0
    if (rate >= 1) return 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
    if (rate > 0) return 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300'
    return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
  }
  if (type === 'short-answer') {
    // 简答题：用正则判断
    try {
      const re = new RegExp(answer[0] || '')
      return re.test(String(val || ''))
        ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
        : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
    } catch {
      return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
    }
  }
  if (type === 'match') {
    // 连线题：对比 left[idx] 是否连到了 right[idx]
    return Number(val) === Number(answer[idx])
      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
      : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
  }
  if (type === 'composite') {
    // 大题：根据子题得分率着色
    const subs = Array.isArray(q.content) ? q.content : []
    const sub = subs[idx]
    if (!sub) return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
    const subQ = { ...sub, record: Array.isArray(val) ? val : [] }
    const rate = computeCorrectRate(subQ)
    if (rate >= 1) return 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
    if (rate > 0) return 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300'
    return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
  }
  return String(val).trim() === String(answer[idx] || '').trim()
    ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300'
    : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
}

function recordIconClass(record) {
    const rate = Number(record?.correctRate) || 0
    if (rate >= 1) return 'text-green-500'
    if (rate > 0) return 'text-yellow-500'
    return 'text-red-500'
}

function recordIcon(record) {
    const rate = Number(record?.correctRate) || 0
    if (rate >= 1) return 'i-heroicons-check-circle'
    if (rate > 0) return 'i-heroicons-exclamation-circle'
    return 'i-heroicons-x-circle'
}

// ====================== 选项分布柱状图（single/multiple） ======================
const showOptionChart = computed(() => {
    const type = props.question?.type
    return type === 'single' || type === 'multiple'
})

// 统计每个选项被选择的人数
const optionCounts = computed(() => {
    const q = props.question
    if (!q || !showOptionChart.value) return []
    const options = q.options || []
    const counts = new Array(options.length).fill(0)
    for (const row of rows.value) {
        const rec = row.record
        if (!rec || !Array.isArray(rec.records)) continue
        for (const idx of rec.records) {
            const i = Number(idx)
            if (i >= 0 && i < counts.length) counts[i]++
        }
    }
    return options.map((opt, i) => ({
        label: String.fromCharCode(65 + i),
        text: typeof opt === 'string' ? opt : (opt?.text || opt?.name || ''),
        count: counts[i],
        isCorrect: Array.isArray(q.answer) && q.answer.includes(i),
    }))
})

const optionChartOption = computed(() => {
    const data = optionCounts.value
    if (!data.length) return {}
    const correctAnswer = Array.isArray(props.question?.answer) ? props.question.answer : []
    return {
        grid: { left: 40, right: 20, top: 20, bottom: 60 },
        xAxis: {
            type: 'category',
            data: data.map(d => d.label),
            axisLabel: { fontSize: 12, color: '#6b7280' },
            axisTick: { show: false },
            axisLine: { lineStyle: { color: '#e5e7eb' } },
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            splitLine: { show: true, lineStyle: { type: 'dashed', color: '#e5e7eb' } },
            axisLabel: { fontSize: 10, color: '#9ca3af' },
        },
        series: [{
            type: 'bar',
            data: data.map(d => ({
                value: d.count,
                itemStyle: {
                    color: d.isCorrect ? '#22c55e' : '#60a5fa',
                    borderRadius: [4, 4, 0, 0],
                },
            })),
            barWidth: '50%',
            label: {
                show: true,
                position: 'top',
                fontSize: 12,
                fontWeight: 'bold',
                color: '#374151',
                formatter: '{c}',
            },
            animationDuration: 600,
        }],
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                const idx = params[0]?.dataIndex
                if (idx == null) return ''
                const d = data[idx]
                return `${d.label}: ${d.text}<br/>${t('record.selectedCount')}: ${d.count}${d.isCorrect ? ` (${t('record.correctAnswer')})` : ''}`
            },
        },
        animation: true,
        animationDuration: 600,
    }
})
</script>
