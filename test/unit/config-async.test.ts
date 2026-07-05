import { describe, it, expect, vi, beforeEach } from 'vitest'

// ====================== Mocks ======================

const configsFindFirst = vi.fn().mockResolvedValue(null)
const coursesFindFirst = vi.fn().mockResolvedValue(null)

vi.mock('@nuxthub/db', () => ({
  db: {
    query: {
      configs: { findFirst: configsFindFirst },
      courses: { findFirst: coursesFindFirst },
    },
  },
  schema: {
    configs: { id: 'id' },
    courses: { id: 'id' },
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ op: 'eq', a, b })),
}))

// Stub console.error to suppress expected error logs
vi.stubGlobal('console', {
  ...console,
  error: vi.fn(),
})

const { getLmsConfig, reloadLmsConfig, getCourseLmsConfig, DEFAULT_LMS_CONFIG } =
  await import('../../server/utils/lmsConfig')
const { getSiteConfig, reloadSiteConfig } =
  await import('../../server/utils/siteConfig')

// ====================== LMS async config ======================

describe('reloadLmsConfig', () => {
  beforeEach(() => {
    configsFindFirst.mockClear()
    ;(console.error as any).mockClear?.()
  })

  it('loads config from DB and merges with defaults', async () => {
    configsFindFirst.mockResolvedValue({ value: { question: { submitExp: 99 } } })
    const config = await reloadLmsConfig()
    expect(config.question.submitExp).toBe(99) // overridden
    expect(config.question.correctBonusExp).toBe(5) // default
    expect(config.course.showDanmaku).toBe(true) // default
  })

  it('uses defaults when DB returns null', async () => {
    configsFindFirst.mockResolvedValue(null)
    const config = await reloadLmsConfig()
    expect(config).toEqual(DEFAULT_LMS_CONFIG)
  })

  it('falls back to defaults on DB error', async () => {
    configsFindFirst.mockRejectedValue(new Error('DB connection failed'))
    const config = await reloadLmsConfig()
    expect(config).toEqual(DEFAULT_LMS_CONFIG)
    expect(console.error).toHaveBeenCalled()
  })
})

describe('getLmsConfig', () => {
  beforeEach(() => {
    configsFindFirst.mockClear()
  })

  it('returns cached config without DB query when already loaded', async () => {
    // Force reload to set cache with known value
    configsFindFirst.mockResolvedValue({ value: { question: { submitExp: 50 } } })
    await reloadLmsConfig()
    const callCount = configsFindFirst.mock.calls.length

    // Second call should use cache
    const config = await getLmsConfig()
    expect(configsFindFirst.mock.calls.length).toBe(callCount) // no new DB query
    expect(config.question.submitExp).toBe(50)
  })
})

describe('getCourseLmsConfig', () => {
  beforeEach(async () => {
    coursesFindFirst.mockClear()
    // Reset LMS config cache to defaults
    configsFindFirst.mockResolvedValue(null)
    await reloadLmsConfig()
  })

  it('returns global config when courseId is 0', async () => {
    const config = await getCourseLmsConfig(0)
    expect(coursesFindFirst).not.toHaveBeenCalled()
    expect(config).toEqual(DEFAULT_LMS_CONFIG)
  })

  it('merges course lmsConfig over global config', async () => {
    coursesFindFirst.mockResolvedValue({
      config: { lmsConfig: { question: { submitExp: 99 } } },
    })
    const config = await getCourseLmsConfig(5)
    expect(config.question.submitExp).toBe(99)
    expect(config.question.correctBonusExp).toBe(5) // default
  })

  it('returns global config when course has no lmsConfig', async () => {
    coursesFindFirst.mockResolvedValue({ config: null })
    const config = await getCourseLmsConfig(5)
    expect(config).toEqual(DEFAULT_LMS_CONFIG)
  })

  it('returns global config when course not found', async () => {
    coursesFindFirst.mockResolvedValue(null)
    const config = await getCourseLmsConfig(999)
    expect(config).toEqual(DEFAULT_LMS_CONFIG)
  })

  it('falls back to global config on DB error', async () => {
    coursesFindFirst.mockRejectedValue(new Error('DB error'))
    const config = await getCourseLmsConfig(5)
    expect(config).toEqual(DEFAULT_LMS_CONFIG)
  })
})

// ====================== Site async config ======================

describe('reloadSiteConfig', () => {
  beforeEach(() => {
    configsFindFirst.mockClear()
    ;(console.error as any).mockClear?.()
    // Clear env vars that might affect test
    delete process.env.MAIL_HOST
    delete process.env.MAIL_PORT
    delete process.env.MAIL_SECURE
    delete process.env.MAIL_USER
    delete process.env.MAIL_PASS
    delete process.env.MAIL_FROM
    delete process.env.SITE_URL
  })

  it('loads site config from DB and merges with defaults', async () => {
    configsFindFirst.mockResolvedValue({ value: { siteTitle: 'My LMS' } })
    const config = await reloadSiteConfig()
    expect(config.siteTitle).toBe('My LMS') // overridden
    expect(config.allowRegistration).toBe(true) // default
  })

  it('uses defaults when DB returns null', async () => {
    configsFindFirst.mockResolvedValue(null)
    const config = await reloadSiteConfig()
    expect(config.siteTitle).toBe('Nuxt Hub')
  })

  it('falls back to defaults on DB error', async () => {
    configsFindFirst.mockRejectedValue(new Error('DB error'))
    const config = await reloadSiteConfig()
    expect(config.siteTitle).toBe('Nuxt Hub')
    expect(console.error).toHaveBeenCalled()
  })

  it('overrides mail config from env vars', async () => {
    process.env.MAIL_HOST = 'smtp.example.com'
    process.env.MAIL_PORT = '587'
    process.env.MAIL_SECURE = 'false'
    process.env.MAIL_USER = 'user@example.com'
    process.env.MAIL_PASS = 'secret'
    process.env.MAIL_FROM = 'LMS <noreply@example.com>'
    process.env.SITE_URL = 'https://lms.example.com'

    configsFindFirst.mockResolvedValue(null)
    const config = await reloadSiteConfig()
    expect(config.mail.host).toBe('smtp.example.com')
    expect(config.mail.port).toBe(587)
    expect(config.mail.secure).toBe(false)
    expect(config.mail.user).toBe('user@example.com')
    expect(config.mail.pass).toBe('secret')
    expect(config.mail.from).toBe('LMS <noreply@example.com>')
    expect(config.mail.siteUrl).toBe('https://lms.example.com')
  })

  it('handles invalid MAIL_PORT gracefully', async () => {
    process.env.MAIL_PORT = 'not-a-number'
    configsFindFirst.mockResolvedValue(null)
    const config = await reloadSiteConfig()
    // Falls back to default port (465)
    expect(config.mail.port).toBe(465)
  })

  it('handles MAIL_SECURE=false string', async () => {
    process.env.MAIL_SECURE = 'false'
    configsFindFirst.mockResolvedValue(null)
    const config = await reloadSiteConfig()
    expect(config.mail.secure).toBe(false)
  })

  it('handles MAIL_SECURE=true string', async () => {
    process.env.MAIL_SECURE = 'true'
    configsFindFirst.mockResolvedValue(null)
    const config = await reloadSiteConfig()
    expect(config.mail.secure).toBe(true)
  })
})

describe('getSiteConfig', () => {
  beforeEach(() => {
    configsFindFirst.mockClear()
  })

  it('returns cached config without DB query when already loaded', async () => {
    // Force reload to set cache with known value
    configsFindFirst.mockResolvedValue({ value: { siteTitle: 'Cached' } })
    await reloadSiteConfig()
    const callCount = configsFindFirst.mock.calls.length

    // Second call should use cache
    const config = await getSiteConfig()
    expect(configsFindFirst.mock.calls.length).toBe(callCount)
    expect(config.siteTitle).toBe('Cached')
  })
})
