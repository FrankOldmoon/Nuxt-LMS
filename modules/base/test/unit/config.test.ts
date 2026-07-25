/**
 * 配置加载/缓存工具测试
 * @see modules/base/server/utils/config.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock @nuxthub/db
const _mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
}
vi.mock('@nuxthub/db', () => ({
  db: _mockDb,
  schema: {
    configs: { id: 'id', value: 'value' },
  },
}))

import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  vi.clearAllMocks()
  // 清理环境变量
  delete process.env.MAIL_HOST
  delete process.env.MAIL_PORT
  delete process.env.MAIL_USER
  delete process.env.MAIL_PASS
  delete process.env.MAIL_FROM
  delete process.env.SITE_URL
})

describe('server/utils/config - DEFAULT_SITE_CONFIG', () => {
  it('导出默认配置对象', async () => {
    const { DEFAULT_SITE_CONFIG } = await import('../../server/utils/config/defaults')
    expect(DEFAULT_SITE_CONFIG['site:title']).toBe('AI LMS')
    expect(DEFAULT_SITE_CONFIG['site:allowRegistration']).toBe(false)
    expect(DEFAULT_SITE_CONFIG['site:allowForgotPassword']).toBe(true)
    expect(DEFAULT_SITE_CONFIG['site:pageSize']).toBe(20)
    expect(DEFAULT_SITE_CONFIG['site:driveQuota']).toBeGreaterThan(0)
  })
})

describe('server/utils/config - reloadConfig', () => {
  it('从数据库加载 site:* 配置并合并默认值', async () => {
    const { reloadConfig } = await import('../../server/utils/config/reload')
    const { getConfigSync } = await import('../../server/utils/config/state')
    const fakeRows = [
      { id: 'site:title', value: 'My LMS' },
      { id: 'site:allowRegistration', value: true },
    ]
    // mock db.select().from().where() → 链终结
    const chain = _mockDb.select()
    chain.where = vi.fn().mockResolvedValueOnce(fakeRows)
    _mockDb.select.mockReturnValueOnce(chain as any)

    const result = await reloadConfig()
    expect(result['site:title']).toBe('My LMS') // 来自 DB
    expect(result['site:allowRegistration']).toBe(true) // 来自 DB
    expect(result['site:pageSize']).toBe(20) // 默认值
    expect(getConfigSync('site:title')).toBe('My LMS')
  })

  it('数据库查询失败时回退到默认值', async () => {
    const { reloadConfig } = await import('../../server/utils/config/reload')
    const chain = _mockDb.select()
    chain.where = vi.fn().mockRejectedValueOnce(new Error('DB error'))
    _mockDb.select.mockReturnValueOnce(chain as any)

    const result = await reloadConfig()
    expect(result['site:title']).toBe('AI LMS')
    expect(result['site:pageSize']).toBe(20)
  })

  it('env 变量优先级最高（MAIL_HOST 等）', async () => {
    process.env.MAIL_HOST = 'smtp.gmail.com'
    process.env.MAIL_PORT = '587'
    process.env.MAIL_USER = 'test@gmail.com'
    process.env.MAIL_PASS = 'secret'
    process.env.MAIL_FROM = 'noreply@gmail.com'
    const chain = _mockDb.select()
    chain.where = vi.fn().mockResolvedValueOnce([])
    _mockDb.select.mockReturnValueOnce(chain as any)
    const { reloadConfig } = await import('../../server/utils/config/reload')
    const result = await reloadConfig()
    expect(result['site:mail.host']).toBe('smtp.gmail.com')
    expect(result['site:mail.port']).toBe(587)
    expect(result['site:mail.user']).toBe('test@gmail.com')
    expect(result['site:mail.pass']).toBe('secret')
    expect(result['site:mail.from']).toBe('noreply@gmail.com')
  })
})

describe('server/utils/config - getConfig', () => {
  it('未加载时自动 reload', async () => {
    const { getConfig } = await import('../../server/utils/config/reload')
    const chain = _mockDb.select()
    chain.where = vi.fn().mockResolvedValueOnce([])
    _mockDb.select.mockReturnValueOnce(chain as any)
    const v = await getConfig('site:title')
    expect(v).toBe('AI LMS')
  })

  it('传 key 返回单值', async () => {
    const { getConfig } = await import('../../server/utils/config/reload')
    const chain = _mockDb.select()
    chain.where = vi.fn().mockResolvedValueOnce([])
    _mockDb.select.mockReturnValueOnce(chain as any)
    const v = await getConfig('site:pageSize')
    expect(v).toBe(20)
  })

  it('不传 key 返回整个配置副本', async () => {
    const { getConfig } = await import('../../server/utils/config/reload')
    const chain = _mockDb.select()
    chain.where = vi.fn().mockResolvedValueOnce([])
    _mockDb.select.mockReturnValueOnce(chain as any)
    const v = await getConfig()
    expect(v['site:title']).toBe('AI LMS')
    expect(typeof v).toBe('object')
  })
})

describe('server/utils/config - getConfigSync', () => {
  it('未加载时返回默认值', async () => {
    const { getConfigSync } = await import('../../server/utils/config/state')
    expect(getConfigSync('site:title')).toBe('AI LMS')
  })

  it('返回缓存值', async () => {
    const { reloadConfig } = await import('../../server/utils/config/reload')
    const { getConfigSync } = await import('../../server/utils/config/state')
    const chain = _mockDb.select()
    chain.where = vi.fn().mockResolvedValueOnce([{ id: 'site:title', value: 'Cached' }])
    _mockDb.select.mockReturnValueOnce(chain as any)
    await reloadConfig()
    expect(getConfigSync('site:title')).toBe('Cached')
  })
})

describe('server/utils/config - getConfigByPrefix', () => {
  it('按前缀返回去掉前缀的配置项', async () => {
    const { reloadConfig, getConfigByPrefix } = await import('../../server/utils/config/reload')
    const chain = _mockDb.select()
    chain.where = vi.fn().mockResolvedValueOnce([])
    _mockDb.select.mockReturnValueOnce(chain as any)
    await reloadConfig()
    // prefix 含 '.' 才能去掉前导点
    const mail = await getConfigByPrefix('site:mail.')
    expect(mail).toHaveProperty('host')
    expect(mail).toHaveProperty('port')
    expect(mail).toHaveProperty('user')
  })

  it('不带 . 时返回的 key 含前导点（slice 不跳过点）', async () => {
    const { reloadConfig, getConfigByPrefix } = await import('../../server/utils/config/reload')
    const chain = _mockDb.select()
    chain.where = vi.fn().mockResolvedValueOnce([])
    _mockDb.select.mockReturnValueOnce(chain as any)
    await reloadConfig()
    const mail = await getConfigByPrefix('site:mail')
    // 实际行为：key 为 '.host' '.port' 等
    expect(mail).toHaveProperty('.host')
  })
})
