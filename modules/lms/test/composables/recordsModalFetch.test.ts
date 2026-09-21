/**
 * recordsModal composable 的 fetchRecords 导出回归测试
 * @see modules/lms/components/lms/recordsModal/{question,comment,quiz}/use*Records.ts
 *
 * 背景：记录弹窗的刷新按钮为 @click="fetchRecords"，而 index.vue 从 composable
 * 解构该函数。曾经 question / comment / quiz 的 composable 漏在 return 中导出
 * fetchRecords，导致按钮的 handler 为 undefined、点击刷新完全无效；而组件测试
 * 用的是 mock（手工补了 fetchRecords），无法发现该问题。
 *
 * 本文件直接实例化真实 composable 断言其导出 fetchRecords，并验证调用后写回 rows。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n, setMockFetchHandler } from '../../../../test/setup/nuxt-stubs'

const baseProps = { modelValue: false, courseId: 1, cid: 2 }

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  ;(globalThis as any).useClassUsers = () => ({
    students: ref([{ id: 1, name: 'alice', username: 'alice', rollNumber: 1 }]),
    fetchUsers: vi.fn(),
    currentClassId: ref(1),
  })
})

describe('recordsModal composables 导出 fetchRecords', () => {
  it('useQuestionRecords 导出 fetchRecords', async () => {
    const { useQuestionRecords } = await import('../../components/lms/recordsModal/question/useQuestionRecords')
    const ctx: any = useQuestionRecords({ ...baseProps, question: {} } as any, () => {})
    expect(typeof ctx.fetchRecords).toBe('function')
  })

  it('useCommentRecords 导出 fetchRecords，调用后写入 rows', async () => {
    setMockFetchHandler(async () => ({ data: [{ userId: 1, record: 'hi' }], success: true, msg: '' }))
    const { useCommentRecords } = await import('../../components/lms/recordsModal/comment/useCommentRecords')
    const ctx: any = useCommentRecords(baseProps as any, () => {})
    expect(typeof ctx.fetchRecords).toBe('function')
    await ctx.fetchRecords()
    expect(ctx.rows.value[0].record).toBe('hi')
  })

  it('useQuizRecords 导出 fetchRecords', async () => {
    const { useQuizRecords } = await import('../../components/lms/recordsModal/quiz/useQuizRecords')
    const ctx: any = useQuizRecords({ ...baseProps, quizPoint: 1, questions: [] } as any, () => {})
    expect(typeof ctx.fetchRecords).toBe('function')
  })
})
