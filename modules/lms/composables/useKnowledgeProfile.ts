import type { Ref, ComputedRef } from 'vue'

/**
 * 学生知识能力画像 composable
 *
 * 按内容标签聚合学生在该课程的学习掌握度，供 studentStats.vue 在"学习统计"下方渲染：
 * - kpRadarOption：各内容维度（题目/作业/测验/练习/阅读/讨论）的掌握度雷达（0~100）
 * - kpBarOption  ：按知识点标签的掌握度横向条形图
 * - kpStrengths / kpWeaknesses：优势 / 待加强知识点
 *
 * 数据源：/api/courses/knowledge-profile?courseId[&userId]
 * - 不传 userId 时后端默认返回当前登录学生自己的画像
 * - 传 userId 时后端会校验课程教师 / 管理员权限
 */
interface KpDimension { key: string, value: number, count: number }
interface KpTag { tag: string, mastery: number, count: number, sources: string[] }
interface KnowledgeProfileData {
  dimensions: KpDimension[]
  tags: KpTag[]
  strengths: string[]
  weaknesses: string[]
  overall: number
  taggedCount: number
}

const EMPTY_PROFILE = (): KnowledgeProfileData => ({
  dimensions: [],
  tags: [],
  strengths: [],
  weaknesses: [],
  overall: 0,
  taggedCount: 0,
})

/** 掌握度配色：优秀 / 良好 / 及格 / 待提升 */
function masteryColor(mastery: number) {
  if (mastery >= 85) return '#22c55e'
  if (mastery >= 70) return '#3b82f6'
  if (mastery >= 60) return '#f59e0b'
  return '#ef4444'
}

export function useKnowledgeProfile(
  props: {
    courseId: Ref<string | number> | ComputedRef<string | number>
    userId?: Ref<string | number> | ComputedRef<string | number>
  },
  isOpen: Ref<boolean>,
  enabled?: () => boolean,
) {
  const { t } = useI18n()
  const data = ref<KnowledgeProfileData>(EMPTY_PROFILE())
  const pending = ref(false)

  const dimLabel = (key: string) => t(`coursePanel.kpDim.${key}`)

  // 仅保留有数据的维度
  const dimensions = computed(() => data.value.dimensions
    .filter(d => d.count > 0)
    .map(d => ({ key: d.key, label: dimLabel(d.key), value: d.value })))

  const radarOption = computed(() => {
    const dims = dimensions.value
    if (!dims.length) return {}
    return {
      tooltip: {},
      radar: {
        indicator: dims.map(d => ({ name: d.label, max: 100 })),
        radius: '62%',
        splitNumber: 4,
      },
      series: [{
        type: 'radar',
        data: [{
          value: dims.map(d => d.value),
          name: t('coursePanel.knowledgeProfile'),
          areaStyle: { opacity: 0.2 },
          lineStyle: { width: 2 },
        }],
      }],
    }
  })

  const tags = computed(() => data.value.tags)
  const strengths = computed(() => data.value.strengths)
  const weaknesses = computed(() => data.value.weaknesses)
  const overall = computed(() => data.value.overall)
  const hasProfile = computed(() =>
    data.value.taggedCount > 0 || data.value.dimensions.some(d => d.count > 0))

  // 知识点掌握度：横向条形图（最多展示前 12 个标签）
  const topTags = computed(() => [...data.value.tags].sort((a, b) => b.mastery - a.mastery).slice(0, 12))

  const barOption = computed(() => {
    const list = topTags.value
    if (!list.length) return {}
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 44, top: 10, bottom: 6, containLabel: true },
      xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', fontSize: 10 } },
      yAxis: {
        type: 'category',
        inverse: true,
        data: list.map(d => d.tag),
        axisLabel: { width: 84, overflow: 'truncate', fontSize: 10 },
      },
      series: [{
        type: 'bar',
        barMaxWidth: 16,
        data: list.map(d => ({
          value: d.mastery,
          itemStyle: { color: masteryColor(d.mastery), borderRadius: [0, 4, 4, 0] },
        })),
        label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10 },
      }],
    }
  })

  const barHeight = computed(() => Math.max(200, topTags.value.length * 26 + 48))

  async function loadKnowledgeProfile() {
    const courseId = Number(toValue(props.courseId)) || 0
    if (!courseId) return
    // 未启用（如教师端）时清空，避免残留上一个学生的画像
    if (enabled && !enabled()) {
      data.value = EMPTY_PROFILE()
      return
    }
    const userId = props.userId ? Number(toValue(props.userId)) || 0 : 0
    pending.value = true
    try {
      const url = `/api/courses/knowledge-profile?courseId=${courseId}${userId ? `&userId=${userId}` : ''}`
      const resp = await cRequest<any>(url)
      if (resp) {
        data.value = {
          dimensions: Array.isArray(resp.dimensions) ? resp.dimensions : [],
          tags: Array.isArray(resp.tags) ? resp.tags : [],
          strengths: Array.isArray(resp.strengths) ? resp.strengths : [],
          weaknesses: Array.isArray(resp.weaknesses) ? resp.weaknesses : [],
          overall: Number(resp.overall) || 0,
          taggedCount: Number(resp.taggedCount) || 0,
        }
      }
    } catch (e) {
      /* 静默 */
    } finally {
      pending.value = false
    }
  }

  watch(
    [
      () => toValue(props.courseId),
      () => (props.userId ? toValue(props.userId) : 0),
      () => toValue(isOpen),
    ],
    () => {
      if (toValue(isOpen)) loadKnowledgeProfile()
    },
    { immediate: true },
  )

  return {
    kpPending: pending,
    kpDimensions: dimensions,
    kpTags: tags,
    kpStrengths: strengths,
    kpWeaknesses: weaknesses,
    kpOverall: overall,
    kpHasProfile: hasProfile,
    kpRadarOption: radarOption,
    kpBarOption: barOption,
    kpBarHeight: barHeight,
    loadKnowledgeProfile,
  }
}
