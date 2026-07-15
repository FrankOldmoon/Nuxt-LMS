/**
 * LMS Search API endpoint tests
 * @see modules/lms/server/api/search.ts
 *
 * search.ts explicitly imports { getQuery } from 'h3' and { readFile } from 'fs/promises',
 * so we need to mock these two modules.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock fs/promises (search.ts depends on the file system to read JSON)
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}))

// mock h3 (search.ts explicitly imports getQuery from 'h3')
vi.mock('h3', () => ({
  getQuery: (event: any) => event?.query ?? {},
  eventHandler: (handler: any) => handler,
}))

import { readFile } from 'fs/promises'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
})

function makeEvent(opts: { query?: Record<string, any> } = {}) {
  return { cookies: {}, query: opts.query || {}, body: undefined } as any
}

describe('API: search', () => {
  it('有 courseId 时读取 search/{courseId}.json 并返回解析数据', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify([{ id: 1, title: 'Result 1' }]) as any)
    const handler = (await import('../../server/api/search')).default
    const result = await handler(makeEvent({ query: { courseId: '42' } }))
    expect(result).toEqual([{ id: 1, title: 'Result 1' }])
    // Verify readFile was called, and the path contains search/42.json
    const calledPath = String(vi.mocked(readFile).mock.calls[0][0])
    expect(calledPath).toContain('search/42.json')
  })

  it('无 courseId 时读取 search/index.json', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify([{ id: 1 }, { id: 2 }]) as any)
    const handler = (await import('../../server/api/search')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result).toEqual([{ id: 1 }, { id: 2 }])
    const calledPath = String(vi.mocked(readFile).mock.calls[0][0])
    expect(calledPath).toContain('search/index.json')
  })

  it('文件不存在（readFile 抛错）返回空数组', async () => {
    vi.mocked(readFile).mockRejectedValue(new Error('ENOENT: no such file'))
    const handler = (await import('../../server/api/search')).default
    const result = await handler(makeEvent({ query: { courseId: '999' } }))
    expect(result).toEqual([])
  })

  it('返回空 JSON 数组', async () => {
    vi.mocked(readFile).mockResolvedValue('[]' as any)
    const handler = (await import('../../server/api/search')).default
    const result = await handler(makeEvent({ query: { courseId: '1' } }))
    expect(result).toEqual([])
  })

  it('返回复杂 JSON 对象', async () => {
    const data = { courses: [{ id: 1, name: 'Course A' }], total: 1 }
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(data) as any)
    const handler = (await import('../../server/api/search')).default
    const result = await handler(makeEvent({ query: {} }))
    expect(result).toEqual(data)
  })
})
