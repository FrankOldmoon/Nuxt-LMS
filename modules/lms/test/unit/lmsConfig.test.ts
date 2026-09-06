/**
 * lms 模块 LMS 配置工具测试（纯逻辑部分）
 * @see modules/lms/server/utils/lmsConfig.ts
 *
 * 测试 flattenTree / unflattenTree / mergeConfig / buildLmsConfigPairs
 * 这些函数为纯逻辑，不触发 db 调用（但模块顶层 import @nuxthub/db 需 mock 防报错）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock @nuxthub/db（模块顶层 import，需 mock 防止初始化报错）
vi.mock('@nuxthub/db', () => ({
  db: { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), query: {} },
  schema: {},
}))

// vi.mock 会提升到 import 之前，此处可安全导入被测模块
import { flattenTree, unflattenTree, mergeConfig } from '../../server/utils/lmsConfig/tree'
import { buildLmsConfigPairs } from '../../server/utils/lmsConfig/migration'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('server/utils/lmsConfig - flattenTree', () => {
  it('嵌套对象正确拍平', () => {
    const result: Record<string, any> = {}
    flattenTree('', { a: { b: 1, c: 2 } }, result)
    expect(result).toEqual({ 'a.b': 1, 'a.c': 2 })
  })

  it('三层嵌套正确拍平', () => {
    const result: Record<string, any> = {}
    flattenTree('', { a: { b: { c: 1 } } }, result)
    expect(result).toEqual({ 'a.b.c': 1 })
  })

  it('null 作为叶子保留，undefined 跳过', () => {
    const result: Record<string, any> = {}
    flattenTree('', { a: null, b: undefined, c: 1 }, result)
    // null 视为叶子值保留，只有 undefined 被跳过
    expect(result).toEqual({ a: null, c: 1 })
  })

  it('Array 视为叶子值', () => {
    const result: Record<string, any> = {}
    flattenTree('', { a: [1, 2, 3] }, result)
    expect(result).toEqual({ a: [1, 2, 3] })
  })

  it('Date 视为叶子值', () => {
    const date = new Date('2024-01-01')
    const result: Record<string, any> = {}
    flattenTree('', { a: date }, result)
    expect(result).toEqual({ a: date })
  })

  it('带 prefix 时拼接键名', () => {
    const result: Record<string, any> = {}
    flattenTree('root', { a: 1 }, result)
    expect(result).toEqual({ 'root.a': 1 })
  })

  it('顶层为空字符串 prefix', () => {
    const result: Record<string, any> = {}
    flattenTree('', { a: 1 }, result)
    expect(result).toEqual({ a: 1 })
  })

  it('顶层 obj 为 null/undefined 直接返回', () => {
    const result: Record<string, any> = {}
    flattenTree('x', null, result)
    expect(result).toEqual({})
    flattenTree('x', undefined, result)
    expect(result).toEqual({})
  })
})

describe('server/utils/lmsConfig - unflattenTree', () => {
  it('拍平键还原为嵌套树', () => {
    const result = unflattenTree({ 'a.b': 1, 'a.c': 2 })
    expect(result).toEqual({ a: { b: 1, c: 2 } })
  })

  it('多层嵌套', () => {
    const result = unflattenTree({ 'a.b.c': 1 })
    expect(result).toEqual({ a: { b: { c: 1 } } })
  })

  it('undefined 值跳过', () => {
    const result = unflattenTree({ 'a.b': undefined, 'a.c': 1 })
    expect(result).toEqual({ a: { c: 1 } })
  })

  it('空对象返回空对象', () => {
    const result = unflattenTree({})
    expect(result).toEqual({})
  })

  it('覆盖非对象值为对象', () => {
    // 'a' 先设为 1，遇到 'a.b' 时发现 a 不是对象，覆盖为 {} 后写入 b
    const result = unflattenTree({ 'a': 1, 'a.b': 2 })
    expect(result).toEqual({ a: { b: 2 } })
  })
})

describe('server/utils/lmsConfig - mergeConfig', () => {
  it('无 overrides 返回 defaults', () => {
    const result = mergeConfig({ a: 1 }, null)
    expect(result).toEqual({ a: 1 })
  })

  it('无 overrides（undefined）返回 defaults', () => {
    const result = mergeConfig({ a: 1 }, undefined)
    expect(result).toEqual({ a: 1 })
  })

  it('defaults 为叶子时返回 overrides', () => {
    const result = mergeConfig(42, { a: 1 })
    expect(result).toEqual({ a: 1 })
  })

  it('深层合并（递归对象）', () => {
    const defaults = { a: { b: 1, c: 2 } }
    const overrides = { a: { c: 3, d: 4 } }
    const result = mergeConfig(defaults, overrides)
    expect(result).toEqual({ a: { b: 1, c: 3, d: 4 } })
  })

  it('Array 视为叶子（不递归）', () => {
    const defaults = { a: [1, 2] }
    const overrides = { a: [3, 4] }
    const result = mergeConfig(defaults, overrides)
    expect(result).toEqual({ a: [3, 4] })
  })

  it('overrides 中 undefined 保留 defaults 值', () => {
    const defaults = { a: 1, b: 2 }
    const overrides = { a: undefined, b: 3 }
    const result = mergeConfig(defaults, overrides)
    expect(result).toEqual({ a: 1, b: 3 })
  })

  it('defaults 中不存在的 key 直接取 overrides 值', () => {
    const defaults = { a: 1 }
    const overrides = { b: 2 }
    const result = mergeConfig(defaults, overrides)
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('三层嵌套递归合并', () => {
    const defaults = { a: { b: { c: 1, d: 2 } } }
    const overrides = { a: { b: { d: 3 } } }
    const result = mergeConfig(defaults, overrides)
    expect(result).toEqual({ a: { b: { c: 1, d: 3 } } })
  })
})

describe('server/utils/lmsConfig - buildLmsConfigPairs', () => {
  it('返回带 lms: 前缀的键值对数组', () => {
    const result = buildLmsConfigPairs({ question: { submitExp: 2 } })
    expect(result).toEqual([{ key: 'lms:question.submitExp', value: 2 }])
  })

  it('空对象返回空数组', () => {
    const result = buildLmsConfigPairs({})
    expect(result).toEqual([])
  })

  it('多层嵌套正确拍平', () => {
    const result = buildLmsConfigPairs({ a: { b: { c: 1, d: 2 } } })
    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ key: 'lms:a.b.c', value: 1 })
    expect(result).toContainEqual({ key: 'lms:a.b.d', value: 2 })
  })

  it('数组值作为叶子', () => {
    const result = buildLmsConfigPairs({ tags: ['a', 'b'] })
    expect(result).toEqual([{ key: 'lms:tags', value: ['a', 'b'] }])
  })
})

describe('server/utils/lmsConfig - applyEnvOverride（DB 优先，env 仅兜底）', () => {
  it('DB 已填写的字段不被 env 覆盖', async () => {
    process.env.AI_API_KEY = 'env-key'
    process.env.AI_API_URL = 'https://env-url'
    process.env.AI_MODEL = 'env-model'
    const { applyEnvOverride } = await import('../../server/utils/lmsConfig/cache/env-override')
    const cfg: any = { ai: { llmApiKey: 'db-key', llmApiUrl: '', model: undefined } }
    applyEnvOverride(cfg)
    expect(cfg.ai.llmApiKey).toBe('db-key') // DB 值优先
    expect(cfg.ai.llmApiUrl).toBe('https://env-url') // 为空时 env 兜底
    expect(cfg.ai.model).toBe('env-model')
    delete process.env.AI_API_KEY
    delete process.env.AI_API_URL
    delete process.env.AI_MODEL
  })

  it('ai 段不存在时创建并全部走 env 兜底', async () => {
    delete process.env.AI_API_KEY
    process.env.AI_API_URL = 'https://env-url'
    const { applyEnvOverride } = await import('../../server/utils/lmsConfig/cache/env-override')
    const cfg: any = {}
    applyEnvOverride(cfg)
    expect(cfg.ai.llmApiKey).toBeUndefined()
    expect(cfg.ai.llmApiUrl).toBe('https://env-url')
    delete process.env.AI_API_URL
  })
})
