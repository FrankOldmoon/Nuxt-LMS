/**
 * useKnowledgeProfile composable 测试
 * @see modules/lms/composables/useKnowledgeProfile.ts
 *
 * 覆盖：
 * - 初始状态：空画像 / hasProfile=false / 空图表配置
 * - isOpen=true 触发加载并写入维度、标签、优势/待加强
 * - 传 userId 时请求附带 userId
 * - enabled=false（教师视角）时清空画像
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

const RESP = {
  dimensions: [
    { key: 'question', value: 80, count: 3 },
    { key: 'reading', value: 50, count: 4 },
    { key: 'comment', value: 0, count: 0 },
  ],
  tags: [
    { tag: '函数', mastery: 90, count: 2, sources: ['question'] },
    { tag: '循环', mastery: 40, count: 1, sources: ['homework'] },
  ],
  strengths: ['函数'],
  weaknesses: ['循环'],
  overall: 65,
  taggedCount: 2,
}

describe('composables/useKnowledgeProfile', () => {
  it('初始状态：空画像', async () => {
    const { useKnowledgeProfile } = await import('../../composables/useKnowledgeProfile')
    const r = useKnowledgeProfile({ courseId: computed(() => 1) }, ref(false))
    expect(r.kpPending.value).toBe(false)
    expect(r.kpHasProfile.value).toBe(false)
    expect(r.kpTags.value).toEqual([])
    expect(r.kpOverall.value).toBe(0)
    expect(r.kpRadarOption.value).toEqual({})
    expect(r.kpBarOption.value).toEqual({})
    expect(r.kpBarHeight.value).toBe(200)
  })

  it('isOpen=true 触发加载并生成图表配置', async () => {
    setMockFetchHandler(async (url: string) => {
      if (String(url).includes('/api/courses/knowledge-profile')) {
        return { data: RESP, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useKnowledgeProfile } = await import('../../composables/useKnowledgeProfile')
    const r = useKnowledgeProfile({ courseId: computed(() => 1) }, ref(true))
    await new Promise(res => setTimeout(res, 0))

    expect(r.kpHasProfile.value).toBe(true)
    expect(r.kpOverall.value).toBe(65)
    expect(r.kpStrengths.value).toEqual(['函数'])
    expect(r.kpWeaknesses.value).toEqual(['循环'])
    // 仅保留有数据的维度（comment count=0 被剔除）→ 2 个指示器
    const radar: any = r.kpRadarOption.value
    expect(radar.radar.indicator).toHaveLength(2)
    expect(radar.series[0].data[0].value).toHaveLength(2)
    const bar: any = r.kpBarOption.value
    expect(bar.series[0].data).toHaveLength(2)
    // 掌握度排序：函数(90) 在循环(40) 之前
    expect(bar.yAxis.data).toEqual(['函数', '循环'])
  })

  it('传 userId 时请求附带 userId', async () => {
    const calls: string[] = []
    setMockFetchHandler(async (url: string) => {
      calls.push(String(url))
      return { data: RESP, success: true, msg: '' }
    })
    const { useKnowledgeProfile } = await import('../../composables/useKnowledgeProfile')
    useKnowledgeProfile({ courseId: computed(() => 2), userId: computed(() => 77) }, ref(true))
    await new Promise(res => setTimeout(res, 0))
    expect(calls.some(u => u.includes('courseId=2') && u.includes('userId=77'))).toBe(true)
  })

  it('enabled=false 时清空画像（教师视角）', async () => {
    setMockFetchHandler(async () => ({ data: RESP, success: true, msg: '' }))
    const { useKnowledgeProfile } = await import('../../composables/useKnowledgeProfile')
    const enabled = ref(false)
    const r = useKnowledgeProfile({ courseId: computed(() => 1) }, ref(true), () => enabled.value)
    await new Promise(res => setTimeout(res, 0))
    expect(r.kpHasProfile.value).toBe(false)
  })
})
