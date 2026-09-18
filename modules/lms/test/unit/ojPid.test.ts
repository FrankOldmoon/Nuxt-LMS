/**
 * OJ pid 解析测试
 * @see modules/lms/server/utils/questions/oj.ts
 *
 * 回归：OJ 题目的 content 在被 show.ts 回填为「题目正文」后不能再当 pid 用，
 * pid 必须取 options.pid，否则 getOjStatus 会拿正文去查记录，永远查不到 AC。
 */
import { describe, it, expect } from 'vitest'
import { resolveOjPid } from '../../server/utils/questions/oj'

describe('utils/questions/oj - resolveOjPid', () => {
  it('优先取 options.pid（即使 content 已被回填为题目正文）', () => {
    expect(resolveOjPid({ options: { pid: 'P1001' }, content: '# Description\n\nGiven a, b and c' })).toBe('P1001')
  })

  it('options.pid 缺失时，content 是形如 pid 的短字符串则回退使用', () => {
    expect(resolveOjPid({ options: {}, content: 'P1016' })).toBe('P1016')
    expect(resolveOjPid({ content: 'P1016' })).toBe('P1016')
    expect(resolveOjPid({ content: '2' })).toBe('2')
  })

  it('content 是题目正文（含换行/空格）时不当作 pid', () => {
    expect(resolveOjPid({ options: null, content: '# Description\nprint the second variable' })).toBe('')
  })

  it('content 是非字符串（对象/空）时返回空串', () => {
    expect(resolveOjPid({ options: null, content: { type: 'doc' } })).toBe('')
    expect(resolveOjPid({ options: {} })).toBe('')
    expect(resolveOjPid(null)).toBe('')
  })

  it('数字 pid 归一化为字符串', () => {
    expect(resolveOjPid({ options: { pid: 2 } })).toBe('2')
  })
})
