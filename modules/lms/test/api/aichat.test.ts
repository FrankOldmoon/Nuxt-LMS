/**
 * aichat API endpoint tests
 * @see modules/lms/server/api/aichat/*.ts
 *
 * Coverage:
 * - award.post.ts  AI question-generation points reward (virtual questionCid to prevent abuse)
 * - tts.post.ts    TTS speech synthesis
 * - chat.post.ts   AI Chat proxy (SSE streaming)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'

const _mockDb = createMockDb()
const _mockSchema: any = {
  userQuestions: { userId: 'userId', courseId: 'courseId', questionCid: 'questionCid', correctRate: 'correctRate', score: 'score', submitCount: 'submitCount' },
  configs: { id: 'id', value: 'value' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

// mock submit handler — directly execute the inner function
vi.mock('../../server/utils/submit/handler', () => ({
  withSubmitHandler: (_label: string, fn: any) => fn,
}))

// mock submit/questions utilities (award.post.ts imports from upsert + calc)
vi.mock('../../server/utils/submit/questions/upsert', () => ({
  upsertUserQuestion: vi.fn().mockImplementation(async ({ userId, courseId, questionCid, isCorrect, score }) => {
    if (isCorrect) {
      return { existing: null, newSubmitCount: 1, scoreDelta: score }
    }
    return { existing: null, newSubmitCount: 1, scoreDelta: 0 }
  }),
}))
vi.mock('../../server/utils/submit/questions/calc', () => ({
  calcQuestionGainedExp: vi.fn().mockReturnValue(5),
  calcQuestionGainedCoin: vi.fn().mockReturnValue(5),
  calcQuestionScoreDelta: vi.fn().mockReturnValue(0),
}))
vi.mock('../../server/utils/submit/progress', () => ({
  notifyCourseProgress: vi.fn().mockResolvedValue(undefined),
  notifyCourseProgressMax: vi.fn().mockResolvedValue(undefined),
}))

// mock edge-tts-universal
vi.mock('edge-tts-universal', () => ({
  EdgeTTS: class {
    constructor(_text: string, _voice: string, _opts: any) {}
    async synthesize() {
      return {
        audio: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' }),
      }
    }
  },
}))

import { resetAllStubs, setMockAuthState, setMockLmsConfig } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  installLmsAutoImports()
})

// ====================== award.post.ts ======================

describe('API: aichat/award', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/aichat/award.post')).default
    await expect(handler(makeEvent({ body: { course_id: 1, chapter_id: 1 } }))).rejects.toThrow()
  })

  it('缺少 course_id 抛出 SubmitContextError', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/aichat/award.post')).default
    // withSubmitHandler mock directly executes the function, so SubmitContextError will be thrown
    await expect(handler(makeEvent({ body: { chapter_id: 1, correct_rate: 1, point: 10 } }))).rejects.toThrow(/course_id/)
  })

  it('首次答对返回 gainedExp + score', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/aichat/award.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, chapter_id: 1, correct_rate: 1, point: 10 } }))
    expect(r.success).toBe(true)
    expect(r.data.score).toBe(10)
  })

  it('答错 (correct_rate=0) gainedExp=0 但 score=0', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const { calcQuestionGainedExp } = await import('../../server/utils/submit/questions/calc')
    ;(calcQuestionGainedExp as any).mockReturnValueOnce(0)
    const handler = (await import('../../server/api/aichat/award.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, chapter_id: 1, correct_rate: 0, point: 10 } }))
    expect(r.success).toBe(true)
    expect(r.data.score).toBe(0)
  })

  it('使用 ai_question_id 派生虚拟 questionCid', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const { upsertUserQuestion } = await import('../../server/utils/submit/questions/upsert')
    const spy = vi.fn().mockResolvedValue({ existing: null, newSubmitCount: 1, scoreDelta: 5 })
    ;(upsertUserQuestion as any).mockImplementationOnce(spy)
    const handler = (await import('../../server/api/aichat/award.post')).default
    const r = await handler(makeEvent({ body: { course_id: 1, chapter_id: 2, correct_rate: 1, point: 10, ai_question_id: 42 } }))
    expect(r.success).toBe(true)
    expect(spy).toHaveBeenCalled()
    // Derived formula: -100000000 - 2*100000 - 42 = -100200042
    const calledCid = spy.mock.calls[0][0].questionCid
    expect(calledCid).toBe(-100000000 - 2 * 100000 - 42)
  })
})

// ====================== tts.post.ts ======================

describe('API: aichat/tts', () => {
  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/aichat/tts.post')).default
    await expect(handler(makeEvent({ body: { text: 'hello' } }))).rejects.toThrow()
  })

  it('text 为空返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/aichat/tts.post')).default
    const r = await handler(makeEvent({ body: { text: '' } }))
    expect(r.success).toBe(false)
  })

  it('text 缺失返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/aichat/tts.post')).default
    const r = await handler(makeEvent({ body: {} }))
    expect(r.success).toBe(false)
  })

  it('TTS 合成成功返回 Buffer', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/aichat/tts.post')).default
    const r = await handler(makeEvent({ body: { text: '你好' } }))
    // Buffer instance (3 bytes)
    expect(Buffer.isBuffer(r)).toBe(true)
    expect(r.length).toBe(3)
  })

  it('指定 voice + lang + gender 参数', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/aichat/tts.post')).default
    const r = await handler(makeEvent({ body: { text: 'hi', voice: 'zh-CN-XiaoxiaoNeural', lang: 'zh-CN', gender: 'female', rate: 1.5, pitch: 1.2, volume: 0.8 } }))
    expect(Buffer.isBuffer(r)).toBe(true)
  })
})

// ====================== chat.post.ts ======================

describe('API: aichat/chat', () => {
  /** Create a mock ReadableStream for fetch return */
  function makeMockStream(chunks: string[]) {
    const encoder = new TextEncoder()
    let i = 0
    return new ReadableStream({
      pull(controller) {
        if (i < chunks.length) {
          controller.enqueue(encoder.encode(chunks[i]))
          i++
        } else {
          controller.close()
        }
      },
    })
  }

  it('未登录抛 401', async () => {
    const handler = (await import('../../server/api/aichat/chat.post')).default
    await expect(handler(makeEvent({ body: { messages: [] } }))).rejects.toThrow()
  })

  it('未配置 API Key 返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    setMockLmsConfig({ ai: { llmApiKey: '', llmApiUrl: 'http://x' } })
    const handler = (await import('../../server/api/aichat/chat.post')).default
    const r = await handler(makeEvent({ body: { messages: [{ role: 'user', content: 'hi' }] } }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/API Key/)
  })

  it('未配置 API URL 返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    setMockLmsConfig({ ai: { llmApiKey: 'sk-test', llmApiUrl: '' } })
    const handler = (await import('../../server/api/aichat/chat.post')).default
    const r = await handler(makeEvent({ body: { messages: [{ role: 'user', content: 'hi' }] } }))
    expect(r.success).toBe(false)
    expect(r.msg).toMatch(/API URL/)
  })

  it('messages 为空返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    setMockLmsConfig({ ai: { llmApiKey: 'sk-test', llmApiUrl: 'http://x', model: 'gpt-4' } })
    const handler = (await import('../../server/api/aichat/chat.post')).default
    const r = await handler(makeEvent({ body: { messages: [] } }))
    expect(r.success).toBe(false)
  })

  it('成功转发 SSE 流（mock fetch 返回 stream）', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    setMockLmsConfig({ ai: { llmApiKey: 'sk-test', llmApiUrl: 'http://x.com', model: 'gpt-4' } })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: makeMockStream([
        'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" there"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    })
    ;(globalThis as any).fetch = mockFetch
    const handler = (await import('../../server/api/aichat/chat.post')).default
    const r = await handler(makeEvent({ body: { messages: [{ role: 'user', content: 'hello' }] } }))
    // sendStream returns ReadableStream
    expect(r).toBeDefined()
    expect(mockFetch).toHaveBeenCalled()
    const callArgs = mockFetch.mock.calls[0]
    expect(callArgs[0]).toMatch(/chat\/completions/)
    const reqBody = JSON.parse(callArgs[1].body)
    expect(reqBody.model).toBe('gpt-4')
    expect(reqBody.messages).toEqual([{ role: 'user', content: 'hello' }])
    expect(reqBody.stream).toBe(true)
  })

  it('使用前端传入的 model 覆盖默认', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    setMockLmsConfig({ ai: { llmApiKey: 'sk-test', llmApiUrl: 'http://x.com', model: 'default-model' } })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: makeMockStream(['data: [DONE]\n\n']),
    })
    ;(globalThis as any).fetch = mockFetch
    const handler = (await import('../../server/api/aichat/chat.post')).default
    await handler(makeEvent({ body: { messages: [{ role: 'user', content: 'hi' }], model: 'gpt-4o' } }))
    const reqBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(reqBody.model).toBe('gpt-4o')
  })

  it('上游返回非 200 时返回失败', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    setMockLmsConfig({ ai: { llmApiKey: 'sk-test', llmApiUrl: 'http://x.com', model: 'gpt-4' } })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'internal error',
    })
    ;(globalThis as any).fetch = mockFetch
    const handler = (await import('../../server/api/aichat/chat.post')).default
    const r = await handler(makeEvent({ body: { messages: [{ role: 'user', content: 'hi' }] } }))
    expect(r.success).toBe(false)
    expect(r.data.status).toBe(500)
  })

  it('thinking=true 启用 enabled 模式', async () => {
    setMockAuthState({ id: 1, username: 's', name: 's', roles: ['student'], permissions: [] })
    setMockLmsConfig({ ai: { llmApiKey: 'sk-test', llmApiUrl: 'http://x.com', model: 'glm' } })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: makeMockStream(['data: [DONE]\n\n']),
    })
    ;(globalThis as any).fetch = mockFetch
    const handler = (await import('../../server/api/aichat/chat.post')).default
    await handler(makeEvent({ body: { messages: [{ role: 'user', content: 'hi' }], thinking: true } }))
    const reqBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(reqBody.thinking).toEqual({ type: 'enabled' })
  })
})
