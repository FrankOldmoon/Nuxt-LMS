/**
 * useChapterQuickAnswer composable 测试
 * @see modules/lms/composables/useChapterQuickAnswer.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  // 桩 useWebSocket（auto-import）：记录 send 调用 + 暴露 on 回调以测试
  const handlers: Record<string, Array<(data: any) => void>> = {}
  const sends: any[] = []
  ;(globalThis as any).useWebSocket = () => ({
    sendQuickAnswerStart: (classId: number, question: string) => {
      sends.push({ type: 'start', classId, question })
    },
    onQuickAnswerStart: (cb: (data: any) => void) => {
      ;(handlers.quickAnswerStart ||= []).push(cb)
      return () => {}
    },
    sendQuickAnswerSubmit: (classId: number, from: string) => {
      sends.push({ type: 'submit', classId, from })
    },
    onQuickAnswerResult: (cb: (data: any) => void) => {
      ;(handlers.quickAnswerResult ||= []).push(cb)
      return () => {}
    },
    sendQuickAnswerEnd: (classId: number) => {
      sends.push({ type: 'end', classId })
    },
    onQuickAnswerEnd: (cb: () => void) => {
      ;(handlers.quickAnswerEnd ||= []).push(cb as (data: any) => void)
      return () => {}
    },
  })
  ;(globalThis as any).__qaHandlers = handlers
  ;(globalThis as any).__qaSends = sends
})

describe('composables/useChapterQuickAnswer', () => {
  it('初始状态', async () => {
    const open = ref(false)
    setMockAuthUser({ id: 1, name: 'alice' })
    const { useChapterQuickAnswer } = await import('../../composables/useChapterQuickAnswer')
    const r = useChapterQuickAnswer({ classId: 10, canEdit: true }, open)
    expect(r.qaQuestion.value).toBe('')
    expect(r.qaActive.value).toBe(false)
    expect(r.qaWinner.value).toBeNull()
    expect(r.userName.value).toBe('alice')
  })

  it('userName 未登录时为 anonymous', async () => {
    const open = ref(false)
    const { useChapterQuickAnswer } = await import('../../composables/useChapterQuickAnswer')
    const r = useChapterQuickAnswer({ classId: 10, canEdit: true }, open)
    expect(r.userName.value).toBe('anonymous')
  })

  it('startQA 无 classId 不发送', async () => {
    const open = ref(false)
    const { useChapterQuickAnswer } = await import('../../composables/useChapterQuickAnswer')
    const r = useChapterQuickAnswer({ classId: 0, canEdit: true }, open)
    r.startQA()
    expect((globalThis as any).__qaSends).toHaveLength(0)
    expect(r.qaActive.value).toBe(false)
  })

  it('startQA 发送 start 事件并激活', async () => {
    const open = ref(false)
    const { useChapterQuickAnswer } = await import('../../composables/useChapterQuickAnswer')
    const r = useChapterQuickAnswer({ classId: 10, canEdit: true }, open)
    r.qaQuestion.value = 'What is 2+2?'
    r.startQA()
    const sends = (globalThis as any).__qaSends
    expect(sends).toHaveLength(1)
    expect(sends[0].type).toBe('start')
    expect(sends[0].classId).toBe(10)
    expect(sends[0].question).toBe('What is 2+2?')
    expect(r.qaActive.value).toBe(true)
  })

  it('submitQA 未激活时不发送', async () => {
    const open = ref(false)
    setMockAuthUser({ id: 1, name: 'alice' })
    const { useChapterQuickAnswer } = await import('../../composables/useChapterQuickAnswer')
    const r = useChapterQuickAnswer({ classId: 10, canEdit: false }, open)
    r.submitQA()
    expect((globalThis as any).__qaSends).toHaveLength(0)
  })

  it('submitQA 激活时发送', async () => {
    const open = ref(false)
    setMockAuthUser({ id: 1, name: 'alice' })
    const { useChapterQuickAnswer } = await import('../../composables/useChapterQuickAnswer')
    const r = useChapterQuickAnswer({ classId: 10, canEdit: false }, open)
    r.qaActive.value = true
    r.submitQA()
    const sends = (globalThis as any).__qaSends
    expect(sends).toHaveLength(1)
    expect(sends[0].type).toBe('submit')
    expect(sends[0].from).toBe('alice')
  })

  it('endQA 发送 end 事件并 reset', async () => {
    const open = ref(false)
    const { useChapterQuickAnswer } = await import('../../composables/useChapterQuickAnswer')
    const r = useChapterQuickAnswer({ classId: 10, canEdit: true }, open)
    r.qaQuestion.value = 'q'
    r.qaActive.value = true
    r.endQA()
    const sends = (globalThis as any).__qaSends
    expect(sends.some((s: any) => s.type === 'end')).toBe(true)
    expect(r.qaActive.value).toBe(false)
    expect(r.qaQuestion.value).toBe('')
    expect(r.qaWinner.value).toBeNull()
  })

  it('resetQA 清空状态', async () => {
    const open = ref(false)
    const { useChapterQuickAnswer } = await import('../../composables/useChapterQuickAnswer')
    const r = useChapterQuickAnswer({ classId: 10, canEdit: true }, open)
    r.qaQuestion.value = 'q'
    r.qaActive.value = true
    r.qaWinner.value = 'alice'
    r.resetQA()
    expect(r.qaActive.value).toBe(false)
    expect(r.qaQuestion.value).toBe('')
    expect(r.qaWinner.value).toBeNull()
  })

  it('收到 quickAnswerStart 事件时设置状态并打开弹窗', async () => {
    const open = ref(false)
    const { useChapterQuickAnswer } = await import('../../composables/useChapterQuickAnswer')
    const r = useChapterQuickAnswer({ classId: 10, canEdit: false }, open)
    const handlers = (globalThis as any).__qaHandlers
    handlers.quickAnswerStart[0]({ question: 'Q1' })
    expect(r.qaActive.value).toBe(true)
    expect(r.qaQuestion.value).toBe('Q1')
    expect(r.qaWinner.value).toBeNull()
    expect(open.value).toBe(true)
  })

  it('收到 quickAnswerResult 事件时设置 winner', async () => {
    const open = ref(false)
    const { useChapterQuickAnswer } = await import('../../composables/useChapterQuickAnswer')
    const r = useChapterQuickAnswer({ classId: 10, canEdit: false }, open)
    const handlers = (globalThis as any).__qaHandlers
    handlers.quickAnswerResult[0]({ winner: 'alice' })
    expect(r.qaWinner.value).toBe('alice')
  })

  it('收到 quickAnswerEnd 事件时 reset', async () => {
    const open = ref(false)
    const { useChapterQuickAnswer } = await import('../../composables/useChapterQuickAnswer')
    const r = useChapterQuickAnswer({ classId: 10, canEdit: false }, open)
    r.qaActive.value = true
    r.qaQuestion.value = 'q'
    const handlers = (globalThis as any).__qaHandlers
    handlers.quickAnswerEnd[0]({})
    expect(r.qaActive.value).toBe(false)
    expect(r.qaQuestion.value).toBe('')
  })

  it('弹窗关闭且教师未结束时自动 endQA', async () => {
    const open = ref(true)
    const { useChapterQuickAnswer } = await import('../../composables/useChapterQuickAnswer')
    const r = useChapterQuickAnswer({ classId: 10, canEdit: true }, open)
    r.qaActive.value = true
    const sendsBefore = (globalThis as any).__qaSends.length
    open.value = false
    await new Promise((resolve) => setTimeout(resolve, 0))
    const sends = (globalThis as any).__qaSends
    expect(sends.length).toBeGreaterThan(sendsBefore)
    expect(sends.some((s: any) => s.type === 'end')).toBe(true)
  })

  it('弹窗关闭且 canEdit=false 时不 endQA', async () => {
    const open = ref(true)
    const { useChapterQuickAnswer } = await import('../../composables/useChapterQuickAnswer')
    const r = useChapterQuickAnswer({ classId: 10, canEdit: false }, open)
    r.qaActive.value = true
    const sendsBefore = (globalThis as any).__qaSends.length
    open.value = false
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect((globalThis as any).__qaSends.length).toBe(sendsBefore)
  })
})
