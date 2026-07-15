/**
 * Unified response wrapper utility tests
 * @see modules/base/server/utils/response.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  setMockQuery,
  resetAllStubs,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('server/utils/response - cResp', () => {
  it('默认 success=true 时 data 包装正确', async () => {
    const { cResp } = await import('../../server/utils/response')
    const result = cResp({ id: 1, name: 'Alice' })
    expect(result).toEqual({ data: { id: 1, name: 'Alice' }, msg: '', success: true })
  })

  it('可指定 msg', async () => {
    const { cResp } = await import('../../server/utils/response')
    const result = cResp(null, 'ok')
    expect(result).toEqual({ data: null, msg: 'ok', success: true })
  })

  it('可指定 success=false', async () => {
    const { cResp } = await import('../../server/utils/response')
    const result = cResp(null, 'failed', false)
    expect(result).toEqual({ data: null, msg: 'failed', success: false })
  })

  it('支持嵌套对象数据', async () => {
    const { cResp } = await import('../../server/utils/response')
    const data = { users: [{ id: 1 }], total: 10 }
    const result = cResp(data)
    expect(result.data).toEqual(data)
  })
})

describe('server/utils/response - getQueryId', () => {
  it('返回 query 中 id 转 Number', async () => {
    const { getQueryId } = await import('../../server/utils/response')
    setMockQuery({ id: '42' })
    expect(getQueryId({} as any)).toBe(42)
  })

  it('id 不存在返回 NaN（Number(undefined) = NaN）', async () => {
    const { getQueryId } = await import('../../server/utils/response')
    setMockQuery({})
    expect(getQueryId({} as any)).toBeNaN()
  })

  it('id 非数字返回 NaN', async () => {
    const { getQueryId } = await import('../../server/utils/response')
    setMockQuery({ id: 'not-a-number' })
    expect(getQueryId({} as any)).toBeNaN()
  })
})

describe('server/utils/response - requireQueryId', () => {
  it('有效 id 返回数字', async () => {
    const { requireQueryId } = await import('../../server/utils/response')
    setMockQuery({ id: '5' })
    expect(requireQueryId({} as any)).toBe(5)
  })

  it('id 缺失或 0 返回 null', async () => {
    const { requireQueryId } = await import('../../server/utils/response')
    setMockQuery({})
    expect(requireQueryId({} as any)).toBeNull()
    setMockQuery({ id: '0' })
    expect(requireQueryId({} as any)).toBeNull()
  })

  it('event 参数优先于全局 mock', async () => {
    const { requireQueryId } = await import('../../server/utils/response')
    setMockQuery({ id: '1' })
    expect(requireQueryId({ query: { id: 99 } } as any)).toBe(99)
  })
})
