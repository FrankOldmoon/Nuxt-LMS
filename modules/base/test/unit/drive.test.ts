/**
 * base module drive (disk quota) utility tests
 * @see modules/base/server/utils/drive.ts
 *
 * Tests getDriveQuota / getDriveUsed / checkDriveSpace
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ---- Mock @nuxthub/db ----
const _mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn(),
}
const _mockSchema = {
  files: { size: 'size', userId: 'userId', deletedAt: 'deletedAt' },
}
vi.mock('@nuxthub/db', () => ({ db: _mockDb, schema: _mockSchema }))

// ---- Mock config（getConfigSync）----
let _configValues: Record<string, any> = {}
vi.mock('../../server/utils/config/state', () => ({
  getConfigSync: (key: string) => _configValues[key],
}))

import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  _configValues = {}
  // Reset db chain
  _mockDb.select = vi.fn().mockReturnThis()
  _mockDb.from = vi.fn().mockReturnThis()
  _mockDb.where = vi.fn()
})

describe('server/utils/drive - getDriveQuota', () => {
  it('admin 角色返回 Infinity', async () => {
    const { getDriveQuota } = await import('../../server/utils/drive')
    const quota = await getDriveQuota({ id: 1, roles: ['admin'] })
    expect(quota).toBe(Infinity)
  })

  it('teacher 角色返回 driveQuota * teacherMultiplier', async () => {
    _configValues['site:driveQuota'] = '2147483648' // 2GB
    _configValues['site:teacherDriveMultiplier'] = '2'
    const { getDriveQuota } = await import('../../server/utils/drive')
    const quota = await getDriveQuota({ id: 1, roles: ['teacher'] })
    expect(quota).toBe(2147483648 * 2)
  })

  it('普通用户返回 driveQuota（默认 1GB）', async () => {
    const { getDriveQuota } = await import('../../server/utils/drive')
    const quota = await getDriveQuota({ id: 1, roles: ['student'] })
    expect(quota).toBe(1073741824) // default 1GB
  })

  it('配置值为 NaN 时回退默认 1073741824', async () => {
    _configValues['site:driveQuota'] = 'not-a-number'
    const { getDriveQuota } = await import('../../server/utils/drive')
    const quota = await getDriveQuota({ id: 1, roles: ['student'] })
    expect(quota).toBe(1073741824)
  })

  it('teacher multiplier 为 NaN 时回退 1', async () => {
    _configValues['site:driveQuota'] = '1073741824'
    _configValues['site:teacherDriveMultiplier'] = 'bad'
    const { getDriveQuota } = await import('../../server/utils/drive')
    const quota = await getDriveQuota({ id: 1, roles: ['teacher'] })
    expect(quota).toBe(1073741824)
  })
})

describe('server/utils/drive - getDriveUsed', () => {
  it('返回 sum 结果（Number 转换）', async () => {
    _mockDb.where.mockResolvedValueOnce([{ total: '524288000' }])
    const { getDriveUsed } = await import('../../server/utils/drive')
    const used = await getDriveUsed(1)
    expect(used).toBe(524288000)
    expect(_mockDb.select).toHaveBeenCalled()
    expect(_mockDb.from).toHaveBeenCalledWith(_mockSchema.files)
  })

  it('无文件时返回 0', async () => {
    _mockDb.where.mockResolvedValueOnce([])
    const { getDriveUsed } = await import('../../server/utils/drive')
    const used = await getDriveUsed(99)
    expect(used).toBe(0)
  })

  it('total 为 null 时返回 0', async () => {
    _mockDb.where.mockResolvedValueOnce([{ total: null }])
    const { getDriveUsed } = await import('../../server/utils/drive')
    const used = await getDriveUsed(1)
    expect(used).toBe(0)
  })
})

describe('server/utils/drive - checkDriveSpace', () => {
  it('admin 直接返回 ok:true', async () => {
    const { checkDriveSpace } = await import('../../server/utils/drive')
    const result = await checkDriveSpace({ id: 1, roles: ['admin'] }, 999999)
    expect(result.ok).toBe(true)
    expect(result.quota).toBe(Infinity)
  })

  it('普通用户未超限返回 ok:true', async () => {
    _mockDb.where.mockResolvedValueOnce([{ total: '500000000' }]) // ~500MB used
    const { checkDriveSpace } = await import('../../server/utils/drive')
    const result = await checkDriveSpace({ id: 1, roles: ['student'] }, 1000000) // +1MB
    expect(result.ok).toBe(true)
    expect(result.used).toBe(500000000)
    expect(result.after).toBe(501000000)
  })

  it('普通用户超限返回 ok:false', async () => {
    _mockDb.where.mockResolvedValueOnce([{ total: '1073741824' }]) // 1GB used (full)
    const { checkDriveSpace } = await import('../../server/utils/drive')
    const result = await checkDriveSpace({ id: 1, roles: ['student'] }, 1) // +1 byte
    expect(result.ok).toBe(false)
    expect(result.quota).toBe(1073741824)
  })

  it('刚好等于配额时 ok:true（<= 判断）', async () => {
    _mockDb.where.mockResolvedValueOnce([{ total: '1073741820' }]) // 4 bytes short
    const { checkDriveSpace } = await import('../../server/utils/drive')
    const result = await checkDriveSpace({ id: 1, roles: ['student'] }, 4)
    expect(result.ok).toBe(true)
    expect(result.after).toBe(result.quota)
  })
})
