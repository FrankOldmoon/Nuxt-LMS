/**
 * Files API 端点测试
 * @see modules/base/server/api/files/*.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const _mockDb = {
  query: {
    files: { findFirst: vi.fn() },
    userCourses: { findMany: vi.fn() },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  offset: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
}
const _mockSchema = {
  files: {
    id: 'id', name: 'name', hash: 'hash', path: 'path', type: 'type',
    size: 'size', userId: 'userId', group: 'group', deletedAt: 'deletedAt',
  },
  users: { id: 'id', username: 'username' },
  userCourses: { userId: 'userId', courseId: 'courseId', group: 'group' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

// h3: download/serve 显式 import sendStream/setResponseHeader/createError
vi.mock('h3', () => ({
  sendStream: async (_e: any, s: any) => s,
  setResponseHeader: vi.fn(() => {}),
  createError: (opts: any) => {
    const err = new Error(opts.message || opts.statusMessage || 'Error')
    ;(err as any).statusCode = opts.statusCode ?? 500
    ;(err as any).statusMessage = opts.statusMessage
    return err
  },
}))

// fs: download/serve 用 createReadStream + access；保留 promises.readFile 给静态分析
vi.mock('fs', async (importActual) => {
  const actual = await importActual<typeof import('fs')>()
  return {
    ...actual,
    access: vi.fn((_path: any, cb: any) => cb(null)),
    createReadStream: vi.fn(() => 'mock-stream' as any),
  }
})

// upload utils: 控制来源解析、校验、落盘
vi.mock('../../server/utils/upload/parse', () => ({
  UploadError: class UploadError extends Error {
    code: string = 'generic'
    extra: any = {}
    constructor(msg: string, code?: string, extra?: any) {
      super(msg)
      this.code = code || 'generic'
      this.extra = extra || {}
    }
  },
  resolveUploadSource: vi.fn(),
}))
vi.mock('../../server/utils/upload/validate', () => ({
  validateUpload: vi.fn(),
  buildDedupWhere: vi.fn(() => 'mock-where'),
  isSvgContent: vi.fn(() => true),
  sanitizeSvg: vi.fn((b: any) => b),
}))
vi.mock('../../server/utils/upload/persist', () => ({
  sha256Hex: vi.fn(() => 'mock-hash'),
  persistUploadedFile: vi.fn(),
}))

import { resetAllStubs, setMockAuthState, setMockDriveSpace, setMockDriveQuota, setMockDriveUsed } from '../../../../test/setup/nuxt-stubs'
import { access } from 'fs'
import { resolveUploadSource, UploadError } from '../../server/utils/upload/parse'
import { validateUpload } from '../../server/utils/upload/validate'
import { persistUploadedFile } from '../../server/utils/upload/persist'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
})

function makeEvent(body: any = undefined, query: any = {}) {
  return { cookies: {}, body, query } as any
}

function resetChain() {
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn().mockReturnThis()
  _mockDb.orderBy = vi.fn().mockReturnThis()
  _mockDb.limit = vi.fn().mockReturnThis()
  _mockDb.offset = vi.fn().mockReturnThis()
  _mockDb.insert = vi.fn().mockReturnThis()
  _mockDb.values = vi.fn().mockReturnThis()
  _mockDb.update = vi.fn().mockReturnThis()
  _mockDb.set = vi.fn().mockReturnThis()
  _mockDb.delete = vi.fn().mockReturnThis()
  _mockDb.query.files.findFirst = vi.fn()
  // 重置 upload util mock
  vi.mocked(resolveUploadSource).mockReset()
  vi.mocked(validateUpload).mockReset()
  vi.mocked(persistUploadedFile).mockReset()
  // 重置 fs.access 默认行为（文件存在）
  vi.mocked(access).mockImplementation(((_p: any, cb: any) => cb(null)) as any)
}

describe('API: files/delete.post (soft delete)', () => {
  beforeEach(resetChain)

  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/delete.post')).default
    await expect(handler(makeEvent({ id: 1 }))).rejects.toThrow()
  })

  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(false)
  })

  it('文件不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue(null as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 999 }))
    expect(result.success).toBe(false)
  })

  it('个人文件：他用户不能删', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, userId: 2, group: null, path: '/a/b.png',
    } as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 1 }))
    expect(result.success).toBe(false)
  })

  it('个人文件：所有者可删（软删除）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, userId: 1, group: null, path: '/a/b.png',
    } as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 1 }))
    expect(result.success).toBe(true)
    expect(result.data.id).toBe(1)
    // 软删除：调用 update.set({deletedAt: ...})，不调用 fs.rm
    expect(db.update).toHaveBeenCalled()
    expect(db.delete).not.toHaveBeenCalled()
  })

  it('小组文件：非组内成员不可删', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 2, userId: 99, group: '1_team-a', path: '/team/file.png',
    } as any)
    vi.mocked(db.query.userCourses.findMany).mockResolvedValue([] as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 2 }))
    expect(result.success).toBe(false)
  })

  it('小组文件：组内成员可删', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 2, userId: 99, group: '1_team-a', path: '/team/file.png',
    } as any)
    vi.mocked(db.query.userCourses.findMany).mockResolvedValue([{ group: 'team-a' }] as any)
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 2 }))
    expect(result.success).toBe(true)
  })

  it('软删除：源代码不再 import node:fs/promises.rm（已不再删除物理文件）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, userId: 1, group: null, path: '/a/b.png',
    } as any)
    // 静态校验：源码不应再 import node:fs/promises（软删除不删物理文件）
    const source = await import('node:fs').then(fs =>
      fs.promises.readFile('/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/modules/base/server/api/files/delete.post.ts', 'utf8')
    )
    expect(source).not.toMatch(/from\s+['"]node:fs\/promises['"]/)
    expect(source).not.toMatch(/\brm\s*\(/) // 不应有 rm() 调用
    const handler = (await import('../../server/api/files/delete.post')).default
    const result = await handler(makeEvent({ id: 1 }))
    expect(result.success).toBe(true)
  })
})

describe('API: files/upload.post — 软删除后重新上传', () => {
  it('查重 WHERE 子句包含 isNull(deletedAt)（源代码静态校验）', async () => {
    const text = await (await import('node:fs')).promises.readFile(
      '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/modules/base/server/utils/upload/validate.ts',
      'utf8'
    )
    // dedup 查重（主流程 + catch 分支）必须过滤 deletedAt
    const matches = text.match(/isNull\(schema\.files\.deletedAt\)/g) || []
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('buildDedupWhere 同时覆盖主查重与 catch 冲突查重', async () => {
    const text = await (await import('node:fs')).promises.readFile(
      '/Users/oldmoon/Documents/ubuntu/nuxt_lms_2026/modules/base/server/utils/upload/validate.ts',
      'utf8'
    )
    // buildDedupWhere 必须在 group 与非 group 两个分支都包含 isNull(deletedAt)
    expect(text).toMatch(/and\(eq\(schema\.files\.hash, hash\), eq\(schema\.files\.group, group\), isNull\(schema\.files\.deletedAt\)\)/)
    expect(text).toMatch(/and\(eq\(schema\.files\.hash, hash\), isNull\(schema\.files\.group\), isNull\(schema\.files\.deletedAt\)\)/)
  })
})

// ====================== upload.post 功能测试 ======================

describe('API: files/upload.post (functional)', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/upload.post')).default
    await expect(handler(makeEvent({}))).rejects.toThrow()
  })

  it('来源解析失败（empty）返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockRejectedValue(new UploadError('请上传文件', 'empty'))
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/请上传/)
  })

  it('来源解析失败（远程图片）返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockRejectedValue(new Error('timeout'))
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({ url: 'http://x/y.png' }))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/远程图片获取失败/)
  })

  it('校验失败（大小/类型）返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockResolvedValue({
      buffer: Buffer.from('x'), originalName: 'bad.exe', ext: '.exe', fileType: 'application/x-msdownload', group: '',
    })
    vi.mocked(validateUpload).mockImplementation(() => {
      throw new UploadError('不允许上传该类型文件', 'type')
    })
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/不允许/)
  })

  it('网盘空间不足返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockResolvedValue({
      buffer: Buffer.from('x'), originalName: 'ok.png', ext: '.png', fileType: 'image/png', group: '',
    })
    vi.mocked(validateUpload).mockImplementation(() => {})
    setMockDriveSpace({ ok: false, quota: 1024, used: 1000 })
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(false)
    expect(result.msg).toMatch(/空间不足/)
    expect(result.data.need).toBe(1)
  })

  it('查重命中已存在文件返回已有 URL', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockResolvedValue({
      buffer: Buffer.from('x'), originalName: 'ok.png', ext: '.png', fileType: 'image/png', group: '',
    })
    vi.mocked(validateUpload).mockImplementation(() => {})
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({ id: 99, path: '/dir/99.png' } as any)
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(true)
    expect(result.msg).toMatch(/已存在/)
    expect(result.data.url).toContain('/api/files/serve?pathname=')
  })

  it('成功上传新文件', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockResolvedValue({
      buffer: Buffer.from('hello'), originalName: 'new.png', ext: '.png', fileType: 'image/png', group: '',
    })
    vi.mocked(validateUpload).mockImplementation(() => {})
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue(null as any)
    vi.mocked(persistUploadedFile).mockResolvedValue({ id: 42, finalDbPath: '/dir/42.png' })
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(true)
    expect(result.msg).toMatch(/上传成功/)
    expect(result.data.id).toBe(42)
    expect(result.data.url).toContain('/api/files/serve?pathname=')
    expect(vi.mocked(persistUploadedFile)).toHaveBeenCalledWith(expect.objectContaining({ userId: 1 }))
  })

  it('persist 抛错且 catch 查重命中则返回已有 URL', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(resolveUploadSource).mockResolvedValue({
      buffer: Buffer.from('hello'), originalName: 'dup.png', ext: '.png', fileType: 'image/png', group: '',
    })
    vi.mocked(validateUpload).mockImplementation(() => {})
    const { db } = await import('@nuxthub/db')
    // 第一次 findFirst（主查重）返回 null，第二次（catch 冲突）返回已有文件
    vi.mocked(db.query.files.findFirst)
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce({ id: 77, path: '/dir/77.png' } as any)
    vi.mocked(persistUploadedFile).mockRejectedValue(new Error('unique constraint'))
    const handler = (await import('../../server/api/files/upload.post')).default
    const result = await handler(makeEvent({}))
    expect(result.success).toBe(true)
    expect(result.msg).toMatch(/已存在/)
    expect(result.data.url).toContain('/api/files/serve?pathname=')
  })
})

// ====================== download.get ======================

describe('API: files/download.get', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/download.get')).default
    await expect(handler(makeEvent(undefined, { id: '1' }))).rejects.toThrow()
  })

  it('缺少 id 抛 400', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/download.get')).default
    await expect(handler(makeEvent(undefined, {}))).rejects.toThrow()
  })

  it('文件不存在抛 404', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue(null as any)
    const handler = (await import('../../server/api/files/download.get')).default
    await expect(handler(makeEvent(undefined, { id: '999' }))).rejects.toThrow()
  })

  it('路径穿越攻击抛 403', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, name: 'evil.png', path: '../../../etc/passwd', userId: 1,
    } as any)
    const handler = (await import('../../server/api/files/download.get')).default
    await expect(handler(makeEvent(undefined, { id: '1' }))).rejects.toThrow()
  })

  it('文件在磁盘不存在抛 404', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, name: 'gone.png', path: '/dir/1.png', userId: 1,
    } as any)
    vi.mocked(access).mockImplementation(((_p: any, cb: any) => cb(new Error('ENOENT'))) as any)
    const handler = (await import('../../server/api/files/download.get')).default
    await expect(handler(makeEvent(undefined, { id: '1' }))).rejects.toThrow()
  })

  it('成功下载返回 stream', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, name: 'ok.png', path: '/dir/1.png', userId: 1,
    } as any)
    const handler = (await import('../../server/api/files/download.get')).default
    const result = await handler(makeEvent(undefined, { id: '1' }))
    expect(result).toBe('mock-stream')
  })
})

// ====================== serve.get ======================

describe('API: files/serve.get', () => {
  beforeEach(resetChain)

  it('未登录也可成功读取文件', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/serve.get')).default
    const result = await handler(makeEvent(undefined, { pathname: 'dir/1.png' }))
    expect(result).toBe('mock-stream')
  })

  it('缺少 pathname 抛 400', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/serve.get')).default
    await expect(handler(makeEvent(undefined, {}))).rejects.toThrow()
  })

  it('路径穿越攻击抛 403', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/serve.get')).default
    await expect(handler(makeEvent(undefined, { pathname: '../../../etc/passwd' }))).rejects.toThrow()
  })

  it('文件不存在抛 404', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    vi.mocked(access).mockImplementation(((_p: any, cb: any) => cb(new Error('ENOENT'))) as any)
    const handler = (await import('../../server/api/files/serve.get')).default
    await expect(handler(makeEvent(undefined, { pathname: 'dir/missing.png' }))).rejects.toThrow()
  })

  it('成功返回 stream', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/serve.get')).default
    const result = await handler(makeEvent(undefined, { pathname: 'dir/1.png' }))
    expect(result).toBe('mock-stream')
  })

  it('中文文件名：Content-Disposition 全 ASCII，不触发 ERR_INVALID_CHAR', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({ id: 1, name: '中文.png', path: '/dir/1.png' } as any)
    const h3 = await import('h3')
    const spy = vi.mocked(h3.setResponseHeader)
    const handler = (await import('../../server/api/files/serve.get')).default
    await handler(makeEvent(undefined, { pathname: 'dir/1.png' }))
    const cdCall = spy.mock.calls.find((c: any[]) => c[1] === 'Content-Disposition')
    expect(cdCall).toBeTruthy()
    const value = String(cdCall![2])
    // 整个 header 值只含 ASCII（避免 Node setHeader 的 ERR_INVALID_CHAR）
    expect(value).toMatch(/^[\x00-\x7F]*$/)
    // filename* 含 RFC 5987 编码的完整原名
    expect(value).toContain("filename*=UTF-8''")
    // filename="..." 兜底部分不含非 ASCII
    expect(value).not.toMatch(/filename="[^"]*[\u0080-\uFFFF]/)
  })

  it('所有响应带 X-Content-Type-Options: nosniff（防 MIME 嗅探 XSS）', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const spy = vi.mocked(h3.setResponseHeader)
    const handler = (await import('../../server/api/files/serve.get')).default
    await handler(makeEvent(undefined, { pathname: 'dir/1.png' }))
    const nosniff = spy.mock.calls.find((c: any[]) => c[1] === 'X-Content-Type-Options')
    expect(nosniff).toBeTruthy()
    expect(String(nosniff![2])).toBe('nosniff')
  })

  it('SVG 响应带 CSP：禁止脚本执行（直开 XSS 兜底）', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const spy = vi.mocked(h3.setResponseHeader)
    const handler = (await import('../../server/api/files/serve.get')).default
    await handler(makeEvent(undefined, { pathname: 'dir/1.svg' }))
    const csp = spy.mock.calls.find((c: any[]) => c[1] === 'Content-Security-Policy')
    expect(csp).toBeTruthy()
    // default-src 'none' ⇒ script-src 继承 'none'，内联脚本与事件处理器均被拦截
    expect(String(csp![2])).toContain("default-src 'none'")
    expect(String(csp![2])).not.toMatch(/script-src/)
  })

  it('非 SVG 响应不带 CSP 头', async () => {
    setMockAuthState(null)
    const h3 = await import('h3')
    const spy = vi.mocked(h3.setResponseHeader)
    const handler = (await import('../../server/api/files/serve.get')).default
    await handler(makeEvent(undefined, { pathname: 'dir/1.png' }))
    const csp = spy.mock.calls.find((c: any[]) => c[1] === 'Content-Security-Policy')
    expect(csp).toBeUndefined()
  })
})

// ====================== list.get ======================

describe('API: files/list.get', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/list.get')).default
    await expect(handler(makeEvent(undefined, {}))).rejects.toThrow()
  })

  it('返回分页文件列表（个人文件）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    // 2 次 select：1=count, 2=rows
    let callIdx = 0
    _mockDb.select = vi.fn(() => {
      const idx = callIdx++
      return {
        from: () => ({
          where: () => idx === 0
            ? Promise.resolve([{ total: 2 }])
            : {
                orderBy: () => ({
                  limit: () => ({
                    offset: () => Promise.resolve([
                      { id: 1, name: 'a.png', path: '/dir/1.png', type: 'image/png', size: 100, hash: 'h1', group: null, createdAt: new Date() },
                      { id: 2, name: 'b.png', path: '/dir/2.png', type: 'image/png', size: 200, hash: 'h2', group: null, createdAt: new Date() },
                    ]),
                  }),
                }),
              },
        }),
      }
    }) as any
    const handler = (await import('../../server/api/files/list.get')).default
    const result = await handler(makeEvent(undefined, { page: '1', pageSize: '10' }))
    expect(result.success).toBe(true)
    expect(result.data.total).toBe(2)
    expect(result.data.list).toHaveLength(2)
    expect(result.data.list[0].url).toContain('/api/files/serve?pathname=')
    expect(result.data.totalPages).toBe(1)
  })

  it('group 参数切换为小组文件过滤', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    let callIdx = 0
    _mockDb.select = vi.fn(() => {
      const idx = callIdx++
      return {
        from: () => ({
          where: () => idx === 0
            ? Promise.resolve([{ total: 0 }])
            : { orderBy: () => ({ limit: () => ({ offset: () => Promise.resolve([]) }) }) },
        }),
      }
    }) as any
    const handler = (await import('../../server/api/files/list.get')).default
    const result = await handler(makeEvent(undefined, { group: 'team-a' }))
    expect(result.success).toBe(true)
    expect(result.data.total).toBe(0)
    expect(result.data.list).toHaveLength(0)
  })

  it('pageSize 上限 100', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    let callIdx = 0
    let capturedLimit = 0
    _mockDb.select = vi.fn(() => {
      const idx = callIdx++
      return {
        from: () => ({
          where: () => idx === 0
            ? Promise.resolve([{ total: 0 }])
            : { orderBy: () => ({ limit: (n: number) => { capturedLimit = n; return { offset: () => Promise.resolve([]) } } }) },
        }),
      }
    }) as any
    const handler = (await import('../../server/api/files/list.get')).default
    await handler(makeEvent(undefined, { pageSize: '999' }))
    expect(capturedLimit).toBe(100)
  })
})

// ====================== rename.post ======================

describe('API: files/rename.post', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/rename.post')).default
    await expect(handler(makeEvent({ id: 1, name: 'new' }))).rejects.toThrow()
  })

  it('缺少 id 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ name: 'new' }))
    expect(result.success).toBe(false)
  })

  it('缺少 name 返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ id: 1 }))
    expect(result.success).toBe(false)
  })

  it('文件不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue(null as any)
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ id: 999, name: 'new' }))
    expect(result.success).toBe(false)
  })

  it('个人文件：非所有者不能改名', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, userId: 2, group: null, name: 'old',
    } as any)
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ id: 1, name: 'new' }))
    expect(result.success).toBe(false)
  })

  it('个人文件：所有者可改名', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 1, userId: 1, group: null, name: 'old',
    } as any)
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ id: 1, name: 'new-name' }))
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('new-name')
    expect(db.update).toHaveBeenCalled()
  })

  it('小组文件：组内成员可改名', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 2, userId: 99, group: '1_team-a', name: 'old',
    } as any)
    vi.mocked(db.query.userCourses.findMany).mockResolvedValue([{ group: 'team-a' }] as any)
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ id: 2, name: 'new-name' }))
    expect(result.success).toBe(true)
  })

  it('小组文件：非组内成员不可改名', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    const { db } = await import('@nuxthub/db')
    vi.mocked(db.query.files.findFirst).mockResolvedValue({
      id: 2, userId: 99, group: '1_team-a', name: 'old',
    } as any)
    vi.mocked(db.query.userCourses.findMany).mockResolvedValue([] as any)
    const handler = (await import('../../server/api/files/rename.post')).default
    const result = await handler(makeEvent({ id: 2, name: 'new-name' }))
    expect(result.success).toBe(false)
  })
})

// ====================== usage.get ======================

describe('API: files/usage.get', () => {
  beforeEach(resetChain)

  it('未登录抛 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/usage.get')).default
    await expect(handler(makeEvent())).rejects.toThrow()
  })

  it('返回配额信息（有限配额）', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    setMockDriveQuota(1073741824) // 1GB
    setMockDriveUsed(104857600)   // 100MB
    const handler = (await import('../../server/api/files/usage.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.quota).toBe(1073741824)
    expect(result.data.used).toBe(104857600)
    expect(result.data.free).toBe(1073741824 - 104857600)
    expect(result.data.unlimited).toBe(false)
  })

  it('无限配额返回 unlimited=true', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['admin'], permissions: [] })
    setMockDriveQuota(Infinity)
    setMockDriveUsed(999999)
    const handler = (await import('../../server/api/files/usage.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.quota).toBe(Infinity)
    expect(result.data.unlimited).toBe(true)
    expect(result.data.free).toBe(Infinity)
  })

  it('已用超过配额时 free 为 0', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    setMockDriveQuota(1000)
    setMockDriveUsed(2000)
    const handler = (await import('../../server/api/files/usage.get')).default
    const result = await handler(makeEvent())
    expect(result.success).toBe(true)
    expect(result.data.free).toBe(0)
  })
})

// ====================== files/meta.get.ts ======================
describe('API: files/meta.get', () => {
  it('未登录返回 401', async () => {
    setMockAuthState(null)
    const handler = (await import('../../server/api/files/meta.get')).default
    await expect(handler(makeEvent(undefined, { pathname: '2026/x.png' }))).rejects.toThrow()
  })

  it('按 pathname 返回原始文件名与大小', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.query.files.findFirst = vi.fn().mockResolvedValue({ name: '原图.png', size: 2048, path: '2026/x.png' })
    const handler = (await import('../../server/api/files/meta.get')).default
    const r = await handler(makeEvent(undefined, { pathname: '2026%2Fx.png' }))
    expect(r.success).toBe(true)
    expect(r.data.name).toBe('原图.png')
    expect(r.data.size).toBe(2048)
  })

  it('文件不存在返回失败', async () => {
    setMockAuthState({ id: 1, username: 'alice', roles: ['student'], permissions: [] })
    _mockDb.query.files.findFirst = vi.fn().mockResolvedValue(null)
    const handler = (await import('../../server/api/files/meta.get')).default
    const r = await handler(makeEvent(undefined, { pathname: '2026/none.png' }))
    expect(r.success).toBe(false)
  })
})
