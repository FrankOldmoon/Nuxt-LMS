/**
 * withSubmitHandler 错误边界测试
 * @see modules/lms/server/utils/submit/handler.ts
 *
 * M1 安全加固：非业务异常（如 SQL 错误）不得向客户端泄露内部信息。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => resetAllStubs())

async function load() {
  const [mod, ctx] = await Promise.all([
    import('../../server/utils/submit/handler'),
    import('../../server/utils/submit/context'),
  ])
  return { withSubmitHandler: mod.withSubmitHandler, SubmitContextError: ctx.SubmitContextError }
}

describe('withSubmitHandler', () => {
  it('DB 异常不泄露 SQL/内部信息（返回通用兜底文案）', async () => {
    const { withSubmitHandler } = await load()
    const handler = withSubmitHandler('提交题目失败', async () => {
      throw new Error('Failed query: insert into "user_questions" (...) values ($1,$2,$3) params: 2,1,-100200000,10,1,true')
    })
    const result = await handler({})
    expect(result.success).toBe(false)
    expect(result.msg).toBe('提交题目失败')
    expect(result.msg).not.toMatch(/Failed query|insert into|user_questions|params/)
  })

  it('SubmitContextError 返回业务校验消息', async () => {
    const { withSubmitHandler, SubmitContextError } = await load()
    const handler = withSubmitHandler('提交题目失败', async () => {
      throw new SubmitContextError('题目不存在或已删除')
    })
    const result = await handler({})
    expect(result.success).toBe(false)
    expect(result.msg).toBe('题目不存在或已删除')
  })

  it('4xx 认证/权限错误重新抛出（由 Nitro 转 HTTP）', async () => {
    const { withSubmitHandler } = await load()
    const handler = withSubmitHandler('提交题目失败', async () => {
      const e: any = new Error('forbidden')
      e.statusCode = 403
      throw e
    })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
  })

  it('成功路径透传返回值', async () => {
    const { withSubmitHandler } = await load()
    const handler = withSubmitHandler('提交题目失败', async () => ({ success: true, data: { score: 10 } }))
    await expect(handler({})).resolves.toEqual({ success: true, data: { score: 10 } })
  })
})
