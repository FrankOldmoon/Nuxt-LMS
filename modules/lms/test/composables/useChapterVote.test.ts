/**
 * useChapterVote composable test
 * @see modules/lms/composables/useChapterVote.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  const handlers: Record<string, Array<(data: any) => void>> = {}
  const sends: any[] = []
  ;(globalThis as any).useWebSocket = () => ({
    sendVoteStart: (classId: number, voteId: string, question: string, options: string[]) => {
      sends.push({ type: 'voteStart', classId, voteId, question, options })
    },
    onVoteStart: (cb: (data: any) => void) => {
      ;(handlers.voteStart ||= []).push(cb)
      return () => {}
    },
    sendVoteSubmit: (classId: number, voteId: string, optionIndex: number, from: string) => {
      sends.push({ type: 'voteSubmit', classId, voteId, optionIndex, from })
    },
    onVoteUpdate: (cb: (data: any) => void) => {
      ;(handlers.voteUpdate ||= []).push(cb)
      return () => {}
    },
    sendVoteEnd: (classId: number, voteId: string) => {
      sends.push({ type: 'voteEnd', classId, voteId })
    },
    onVoteEnd: (cb: (data: any) => void) => {
      ;(handlers.voteEnd ||= []).push(cb)
      return () => {}
    },
  })
  ;(globalThis as any).__voteHandlers = handlers
  ;(globalThis as any).__voteSends = sends
})

describe('composables/useChapterVote', () => {
  it('初始状态', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: true }, open)
    expect(r.question.value).toBe('')
    expect(r.options.value).toEqual(['', ''])
    expect(r.activeVoteId.value).toBeNull()
    expect(r.voteQuestion.value).toBe('')
    expect(r.voteOptions.value).toEqual([])
    expect(r.voteResults.value).toEqual([])
    expect(r.voteTotal.value).toBe(0)
    expect(r.voted.value).toBe(false)
  })

  it('canStartVote 计算属性', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: true }, open)
    expect(r.canStartVote.value).toBe(false)
    r.question.value = 'Q1'
    expect(r.canStartVote.value).toBe(false) // options are still all empty strings
    r.options.value = ['A', 'B']
    expect(r.canStartVote.value).toBe(true)
    r.options.value = ['A', '']
    expect(r.canStartVote.value).toBe(false)
  })

  it('addOption 增加选项', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: true }, open)
    expect(r.options.value).toHaveLength(2)
    r.addOption()
    expect(r.options.value).toHaveLength(3)
  })

  it('removeOption 数量 > 2 时移除', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: true }, open)
    r.addOption()
    r.options.value = ['A', 'B', 'C']
    r.removeOption(0)
    expect(r.options.value).toEqual(['B', 'C'])
  })

  it('removeOption 数量 = 2 时不动', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: true }, open)
    r.options.value = ['A', 'B']
    r.removeOption(0)
    expect(r.options.value).toEqual(['A', 'B'])
  })

  it('startVote 无 classId 不发送', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 0, canEdit: true }, open)
    r.question.value = 'Q1'
    r.options.value = ['A', 'B']
    r.startVote()
    expect((globalThis as any).__voteSends).toHaveLength(0)
  })

  it('startVote canStartVote=false 不发送', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: true }, open)
    r.question.value = '' // Missing keyword
    r.options.value = ['A', 'B']
    r.startVote()
    expect((globalThis as any).__voteSends).toHaveLength(0)
  })

  it('startVote 成功发送并初始化结果', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: true }, open)
    r.question.value = 'Q1'
    r.options.value = [' A ', 'B', ' C ']
    r.startVote()
    const sends = (globalThis as any).__voteSends
    expect(sends).toHaveLength(1)
    expect(sends[0].type).toBe('voteStart')
    expect(sends[0].question).toBe('Q1')
    expect(sends[0].options).toEqual(['A', 'B', 'C']) // Already trimmed
    expect(r.activeVoteId.value).toBeTruthy()
    expect(r.voteQuestion.value).toBe('Q1')
    expect(r.voteOptions.value).toEqual(['A', 'B', 'C'])
    expect(r.voteResults.value).toEqual([0, 0, 0])
    expect(r.voteTotal.value).toBe(0)
  })

  it('submitVote 无 activeVoteId 不发送', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: false }, open)
    r.submitVote(0)
    expect((globalThis as any).__voteSends).toHaveLength(0)
    expect(r.voted.value).toBe(false)
  })

  it('submitVote 成功发送并标记 voted', async () => {
    const open = ref(false)
    setMockAuthUser({ id: 1, name: 'alice' })
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: false }, open)
    r.activeVoteId.value = 'vote-1'
    r.submitVote(1)
    const sends = (globalThis as any).__voteSends
    expect(sends).toHaveLength(1)
    expect(sends[0].type).toBe('voteSubmit')
    expect(sends[0].optionIndex).toBe(1)
    expect(sends[0].from).toBe('alice')
    expect(r.voted.value).toBe(true)
  })

  it('endVote 发送 end 并 reset', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: true }, open)
    r.activeVoteId.value = 'vote-1'
    r.question.value = 'Q1'
    r.options.value = ['A', 'B']
    r.endVote()
    const sends = (globalThis as any).__voteSends
    expect(sends.some((s: any) => s.type === 'voteEnd')).toBe(true)
    expect(r.activeVoteId.value).toBeNull()
    expect(r.question.value).toBe('')
  })

  it('resetVote 清空所有状态', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: true }, open)
    r.activeVoteId.value = 'vote-1'
    r.voteQuestion.value = 'Q1'
    r.voteOptions.value = ['A', 'B']
    r.voteResults.value = [1, 2]
    r.voteTotal.value = 3
    r.voted.value = true
    r.question.value = 'Q1'
    r.options.value = ['A', 'B']
    r.resetVote()
    expect(r.activeVoteId.value).toBeNull()
    expect(r.voteQuestion.value).toBe('')
    expect(r.voteOptions.value).toEqual([])
    expect(r.voteResults.value).toEqual([])
    expect(r.voteTotal.value).toBe(0)
    expect(r.voted.value).toBe(false)
    expect(r.question.value).toBe('')
    expect(r.options.value).toEqual(['', ''])
  })

  it('barWidth 计算百分比', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: false }, open)
    expect(r.barWidth(0)).toBe('0%')
    r.voteResults.value = [3, 7]
    r.voteTotal.value = 10
    expect(r.barWidth(0)).toBe('30.0%')
    expect(r.barWidth(1)).toBe('70.0%')
    expect(r.barWidth(2)).toBe('0.0%') // Out of bounds returns 0
  })

  it('收到 voteStart 事件时初始化并打开弹窗', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: false }, open)
    const handlers = (globalThis as any).__voteHandlers
    handlers.voteStart[0]({ voteId: 'vote-x', question: 'Q?', options: ['A', 'B'] })
    expect(r.activeVoteId.value).toBe('vote-x')
    expect(r.voteQuestion.value).toBe('Q?')
    expect(r.voteOptions.value).toEqual(['A', 'B'])
    expect(r.voteResults.value).toEqual([0, 0])
    expect(r.voted.value).toBe(false)
    expect(open.value).toBe(true)
  })

  it('收到 voteUpdate 事件时更新结果', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: false }, open)
    r.activeVoteId.value = 'vote-x'
    const handlers = (globalThis as any).__voteHandlers
    handlers.voteUpdate[0]({ voteId: 'vote-x', results: [3, 7], total: 10 })
    expect(r.voteResults.value).toEqual([3, 7])
    expect(r.voteTotal.value).toBe(10)
  })

  it('收到 voteUpdate 事件 voteId 不匹配时不更新', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: false }, open)
    r.activeVoteId.value = 'vote-x'
    r.voteResults.value = [1, 2]
    r.voteTotal.value = 3
    const handlers = (globalThis as any).__voteHandlers
    handlers.voteUpdate[0]({ voteId: 'other', results: [99, 99], total: 999 })
    expect(r.voteResults.value).toEqual([1, 2])
    expect(r.voteTotal.value).toBe(3)
  })

  it('收到 voteEnd 事件时更新最终结果', async () => {
    const open = ref(false)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: false }, open)
    r.activeVoteId.value = 'vote-x'
    const handlers = (globalThis as any).__voteHandlers
    handlers.voteEnd[0]({ voteId: 'vote-x', results: [5, 5], total: 10 })
    expect(r.voteResults.value).toEqual([5, 5])
    expect(r.voteTotal.value).toBe(10)
  })

  it('弹窗关闭且教师有 activeVote 时自动 endVote', async () => {
    const open = ref(true)
    const { useChapterVote } = await import('../../composables/useChapterVote')
    const r = useChapterVote({ classId: 10, canEdit: true }, open)
    r.activeVoteId.value = 'vote-x'
    const sendsBefore = (globalThis as any).__voteSends.length
    open.value = false
    await new Promise((resolve) => setTimeout(resolve, 0))
    const sends = (globalThis as any).__voteSends
    expect(sends.length).toBeGreaterThan(sendsBefore)
    expect(sends.some((s: any) => s.type === 'voteEnd')).toBe(true)
  })
})
