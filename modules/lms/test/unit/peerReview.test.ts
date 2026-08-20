/**
 * peerReview 工具单元测试
 * @see modules/lms/server/utils/peerReview.ts
 */
import { describe, it, expect } from 'vitest'

async function load() {
  return await import('../../server/utils/peerReview')
}

const OPTIONS = [
  { key: 'a', label: '认真度', maxScore: 10 },
  { key: 'b', label: '准确性', maxScore: 5 },
]

describe('validateScores', () => {
  it('合法分值通过', async () => {
    const { validateScores } = await load()
    expect(validateScores({ a: 8, b: 5 }, OPTIONS)).toBeNull()
  })

  it('缺失全部选项返回错误', async () => {
    const { validateScores } = await load()
    expect(validateScores({}, OPTIONS)).toMatch(/至少评价一项/)
  })

  it('未知 key 返回错误', async () => {
    const { validateScores } = await load()
    expect(validateScores({ a: 8, c: 3 }, OPTIONS)).toMatch(/未知的评价项/)
  })

  it('超过 maxScore 返回错误', async () => {
    const { validateScores } = await load()
    expect(validateScores({ a: 8, b: 6 }, OPTIONS)).toMatch(/0~5/)
  })

  it('负数返回错误', async () => {
    const { validateScores } = await load()
    expect(validateScores({ a: -1 }, OPTIONS)).toMatch(/0~10/)
  })

  it('非对象返回错误', async () => {
    const { validateScores } = await load()
    expect(validateScores(null as any, OPTIONS)).toMatch(/格式不正确/)
  })

  it('部分选项缺失按 0 计（仍合法）', async () => {
    const { validateScores } = await load()
    expect(validateScores({ b: 3 }, OPTIONS)).toBeNull()
  })
})
