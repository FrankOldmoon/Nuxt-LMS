/**
 * OpenAI 兼容对外网关 API 端点测试
 * @see modules/lms/server/api/openai/v1/*.ts
 * @see modules/lms/server/utils/openai/gateway.ts
 *
 * 覆盖：
 * - chat/completions.post.ts  Bearer Token 鉴权、配置校验、请求体透传、流式/非流式转发
 * - models.get.ts             模型列表（需鉴权）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  createMockDb, resetDb, installLmsAutoImports, makeEvent,
} from '../../../../test/setup/db-helpers'
import { resetAllStubs, setMockLmsConfig } from '../../../../test/setup/nuxt-stubs'
import * as openaiGateway from '../../server/utils/openai/gateway'

const _mockDb = createMockDb()
const _mockSchema: any = { configs: { id: 'id', value: 'value' } }
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

beforeEach(() => {
  resetAllStubs()
  resetDb(_mockDb)
  installLmsAutoImports()
  // gateway 工具在源码中走 Nitro auto-import，测试环境手动暴露到 globalThis
  Object.assign(globalThis, openaiGateway)
})

// 系统设置 → AI 的 api_url / api_token（llmApiUrl / llmApiKey）
const AI_CFG = { llmApiKey: 'sk-test', llmApiUrl: 'http://x.com/v1', model: 'gpt-4' }

/** 构造带 Authorization 头的 mock event（缺省带正确 token，传 null 表示不带） */
function evt(opts: { body?: any; auth?: string | null } = {}) {
  const e: any = makeEvent({ body: opts.body })
  if (opts.auth !== null) {
    e.headers = { Authorization: `Bearer ${opts.auth ?? 'sk-test'}` }
  }
  return e
}

/** 创建 mock ReadableStream 用于 fetch 返回（SSE 场景） */
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

// ====================== chat/completions.post.ts ======================

describe('API: openai/v1/chat/completions', () => {
  it('缺少 Authorization 头返回 401 OpenAI 错误格式', async () => {
    setMockLmsConfig({ ai: AI_CFG })
    const handler = (await import('../../server/api/openai/v1/chat/completions.post')).default
    const r = await handler(evt({ auth: null, body: { messages: [{ role: 'user', content: 'hi' }] } }))
    expect(r.error.type).toBe('invalid_request_error')
    expect(r.error.code).toBe('invalid_api_key')
  })

  it('token 错误返回 401', async () => {
    setMockLmsConfig({ ai: AI_CFG })
    const handler = (await import('../../server/api/openai/v1/chat/completions.post')).default
    const r = await handler(evt({ auth: 'sk-wrong', body: { messages: [{ role: 'user', content: 'hi' }] } }))
    expect(r.error.code).toBe('invalid_api_key')
  })

  it('系统未配置 llmApiKey 时端点视为关闭（401）', async () => {
    setMockLmsConfig({ ai: { ...AI_CFG, llmApiKey: '' } })
    const handler = (await import('../../server/api/openai/v1/chat/completions.post')).default
    const r = await handler(evt({ body: { messages: [{ role: 'user', content: 'hi' }] } }))
    expect(r.error.code).toBe('invalid_api_key')
  })

  it('系统未配置 llmApiUrl 返回 500', async () => {
    setMockLmsConfig({ ai: { ...AI_CFG, llmApiUrl: '' } })
    const handler = (await import('../../server/api/openai/v1/chat/completions.post')).default
    const r = await handler(evt({ body: { messages: [{ role: 'user', content: 'hi' }] } }))
    expect(r.error.type).toBe('api_error')
    expect(r.error.message).toMatch(/API URL/)
  })

  it('messages 缺失或为空返回 400', async () => {
    setMockLmsConfig({ ai: AI_CFG })
    const handler = (await import('../../server/api/openai/v1/chat/completions.post')).default
    const r1 = await handler(evt({ body: {} }))
    const r2 = await handler(evt({ body: { messages: [] } }))
    expect(r1.error.type).toBe('invalid_request_error')
    expect(r2.error.message).toMatch(/messages/)
  })

  it('非流式：原样透传请求体并返回上游 JSON', async () => {
    setMockLmsConfig({ ai: AI_CFG })
    const upstreamJson = { id: 'cmpl-1', choices: [{ message: { role: 'assistant', content: 'hello' } }] }
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => upstreamJson })
    ;(globalThis as any).fetch = mockFetch
    const handler = (await import('../../server/api/openai/v1/chat/completions.post')).default
    const body = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.7,
    }
    const r = await handler(evt({ body }))
    expect(r).toEqual(upstreamJson)
    // 上游 URL：base URL 自动补 /chat/completions
    const callArgs = mockFetch.mock.calls[0]
    expect(callArgs[0]).toBe('http://x.com/v1/chat/completions')
    // 转发上游用同一 token
    expect(callArgs[1].headers.Authorization).toBe('Bearer sk-test')
    // 请求体原样透传（保留 temperature，不注入 thinking / stream_options）
    const reqBody = JSON.parse(callArgs[1].body)
    expect(reqBody.model).toBe('gpt-4o')
    expect(reqBody.temperature).toBe(0.7)
    expect(reqBody).not.toHaveProperty('thinking')
    expect(reqBody).not.toHaveProperty('stream_options')
  })

  it('model 缺省时回填系统设置 ai.model', async () => {
    setMockLmsConfig({ ai: AI_CFG })
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    ;(globalThis as any).fetch = mockFetch
    const handler = (await import('../../server/api/openai/v1/chat/completions.post')).default
    await handler(evt({ body: { messages: [{ role: 'user', content: 'hi' }] } }))
    const reqBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(reqBody.model).toBe('gpt-4')
  })

  it('流式：返回 ReadableStream 并透传', async () => {
    setMockLmsConfig({ ai: AI_CFG })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: makeMockStream(['data: {"choices":[{"delta":{"content":"hi"}}]}\n\n', 'data: [DONE]\n\n']),
    })
    ;(globalThis as any).fetch = mockFetch
    const handler = (await import('../../server/api/openai/v1/chat/completions.post')).default
    const r = await handler(evt({ body: { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }], stream: true } }))
    expect(r).toBeInstanceOf(ReadableStream)
    const reqBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(reqBody.stream).toBe(true)
  })

  it('上游返回非 200 时透传状态与错误摘要', async () => {
    setMockLmsConfig({ ai: AI_CFG })
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'internal error' })
    ;(globalThis as any).fetch = mockFetch
    const handler = (await import('../../server/api/openai/v1/chat/completions.post')).default
    const r = await handler(evt({ body: { messages: [{ role: 'user', content: 'hi' }] } }))
    expect(r.error.type).toBe('api_error')
    expect(r.error.message).toContain('500')
    expect(r.error.message).toContain('internal error')
  })

  it('上游网络异常返回 502', async () => {
    setMockLmsConfig({ ai: AI_CFG })
    const mockFetch = vi.fn().mockRejectedValue(new Error('connect refused'))
    ;(globalThis as any).fetch = mockFetch
    const handler = (await import('../../server/api/openai/v1/chat/completions.post')).default
    const r = await handler(evt({ body: { messages: [{ role: 'user', content: 'hi' }] } }))
    expect(r.error.type).toBe('api_error')
    expect(r.error.message).toMatch(/reach upstream/)
  })
})

// ====================== models.get.ts ======================

describe('API: openai/v1/models', () => {
  it('需 Bearer Token 鉴权', async () => {
    setMockLmsConfig({ ai: AI_CFG })
    const handler = (await import('../../server/api/openai/v1/models.get')).default
    const r = await handler(evt({ auth: null }))
    expect(r.error.code).toBe('invalid_api_key')
  })

  it('返回系统配置的默认模型', async () => {
    setMockLmsConfig({ ai: AI_CFG })
    const handler = (await import('../../server/api/openai/v1/models.get')).default
    const r = await handler(evt())
    expect(r.object).toBe('list')
    expect(r.data[0].id).toBe('gpt-4')
    expect(r.data[0].object).toBe('model')
  })

  it('ai.model 为空时回填兜底模型', async () => {
    setMockLmsConfig({ ai: { ...AI_CFG, model: '' } })
    const handler = (await import('../../server/api/openai/v1/models.get')).default
    const r = await handler(evt())
    expect(r.data[0].id).toBe('glm-4.5-air')
  })
})
