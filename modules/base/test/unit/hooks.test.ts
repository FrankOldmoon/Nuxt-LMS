/**
 * base module hooks tests
 * @see modules/base/server/utils/hooks.ts
 *
 * Tests registerOnMeEnrich / runOnMeEnrich / registerOnUserImported / runOnUserImported
 * Pure logic, no db dependency. Focus on error isolation and result merging.
 *
 * Note: hooks.ts uses module-level singleton arrays, need vi.resetModules() to isolate each test.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.resetModules()
})

describe('server/utils/hooks - onMeEnrich', () => {
  it('无注册函数时 runOnMeEnrich 返回空对象', async () => {
    const { runOnMeEnrich } = await import('../../server/utils/hooks')
    const result = await runOnMeEnrich({ id: 1 })
    expect(result).toEqual({})
  })

  it('注册单个函数后返回其结果', async () => {
    const { registerOnMeEnrich, runOnMeEnrich } = await import('../../server/utils/hooks')
    registerOnMeEnrich(async (user) => ({ role: 'admin', label: user.id }))
    const result = await runOnMeEnrich({ id: 42 })
    expect(result).toEqual({ role: 'admin', label: 42 })
  })

  it('注册多个函数后合并所有结果（后者覆盖同名 key）', async () => {
    const { registerOnMeEnrich, runOnMeEnrich } = await import('../../server/utils/hooks')
    registerOnMeEnrich(async () => ({ a: 1, b: 2 }))
    registerOnMeEnrich(async () => ({ b: 3, c: 4 }))
    const result = await runOnMeEnrich({ id: 1 })
    expect(result).toEqual({ a: 1, b: 3, c: 4 })
  })

  it('某个函数抛错时不影响其他函数执行（错误隔离）', async () => {
    const { registerOnMeEnrich, runOnMeEnrich } = await import('../../server/utils/hooks')
    registerOnMeEnrich(async () => ({ good: 1 }))
    registerOnMeEnrich(async () => { throw new Error('boom') })
    registerOnMeEnrich(async () => ({ good2: 2 }))
    const result = await runOnMeEnrich({ id: 1 })
    expect(result).toEqual({ good: 1, good2: 2 })
  })

  it('函数返回 null 时不合并（跳过）', async () => {
    const { registerOnMeEnrich, runOnMeEnrich } = await import('../../server/utils/hooks')
    registerOnMeEnrich(async () => ({ a: 1 }))
    registerOnMeEnrich(async () => null as any)
    const result = await runOnMeEnrich({ id: 1 })
    expect(result).toEqual({ a: 1 })
  })
})

describe('server/utils/hooks - onUserImported', () => {
  it('无注册函数时 runOnUserImported 不报错', async () => {
    const { runOnUserImported } = await import('../../server/utils/hooks')
    await expect(runOnUserImported([], [])).resolves.toBeUndefined()
  })

  it('注册后按顺序执行所有函数', async () => {
    const { registerOnUserImported, runOnUserImported } = await import('../../server/utils/hooks')
    const calls: string[] = []
    registerOnUserImported(async () => { calls.push('first') })
    registerOnUserImported(async () => { calls.push('second') })
    await runOnUserImported([{ id: 1 }], [{ name: 'a' }])
    expect(calls).toEqual(['first', 'second'])
  })

  it('函数抛错时记录错误但不中断后续函数', async () => {
    const { registerOnUserImported, runOnUserImported } = await import('../../server/utils/hooks')
    const calls: string[] = []
    registerOnUserImported(async () => { calls.push('first'); throw new Error('boom') })
    registerOnUserImported(async () => { calls.push('second') })
    await runOnUserImported([], [])
    expect(calls).toEqual(['first', 'second'])
  })

  it('传递 inserted 和 rawUsers 参数给注册函数', async () => {
    const { registerOnUserImported, runOnUserImported } = await import('../../server/utils/hooks')
    let receivedInserted: any
    let receivedRaw: any
    registerOnUserImported(async (inserted, raw) => {
      receivedInserted = inserted
      receivedRaw = raw
    })
    const inserted = [{ id: 1, name: 'A' }]
    const raw = [{ name: 'A', class: 'C1' }]
    await runOnUserImported(inserted, raw)
    expect(receivedInserted).toEqual(inserted)
    expect(receivedRaw).toEqual(raw)
  })
})
