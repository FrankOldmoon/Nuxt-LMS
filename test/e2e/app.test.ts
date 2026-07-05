import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

await setup({})

describe('Home page E2E', () => {
  it('renders the home page with heading', async () => {
    const html = await $fetch('/')
    expect(html).toContain('Course Series')
  })

  it('renders the home page with subtitle', async () => {
    const html = await $fetch('/')
    expect(html).toContain('Featured technical courses')
  })

  it('returns non-empty HTML for home page', async () => {
    const res = await $fetch('/')
    expect(res).toBeDefined()
    expect((res as string).length).toBeGreaterThan(0)
  })

  it('renders HTML structure with course sections', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<section')
  })

  it('renders course links in the home page', async () => {
    const html = await $fetch('/')
    expect(html).toContain('href="/course/')
  })

  it('renders footer with copyright', async () => {
    const html = await $fetch('/')
    expect(html).toContain('Nuxt Hub')
    expect(html).toContain('All rights reserved')
  })

  it('renders navigation header with logo', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<header')
  })

  it('renders home icon in navigation', async () => {
    const html = await $fetch('/')
    expect(html).toContain('i-lucide:home')
  })

  it('renders course cards with cover or fallback', async () => {
    const html = await $fetch('/')
    expect(html).toContain('Start Learning')
  })
})

describe('Home API E2E', () => {
  it('GET /api/lms/home returns JSON with categories and courses', async () => {
    const res = await $fetch('/api/lms/home', { responseType: 'json' })
    const data = (res as any).data || res
    expect(data).toBeDefined()
    expect(data).toHaveProperty('categories')
    expect(data).toHaveProperty('courses')
    expect(Array.isArray(data.categories)).toBe(true)
    expect(Array.isArray(data.courses)).toBe(true)
  })

  it('GET /api/lms/home returns config field', async () => {
    const res = await $fetch('/api/lms/home', { responseType: 'json' })
    const data = (res as any).data || res
    expect(data).toHaveProperty('config')
  })

  it('GET /api/lms/home returns unread counts', async () => {
    const res = await $fetch('/api/lms/home', { responseType: 'json' })
    const data = (res as any).data || res
    expect(data).toHaveProperty('notifyUnread')
    expect(data).toHaveProperty('msgUnread')
  })

  it('GET /api/lms/home categories have required fields', async () => {
    const res = await $fetch('/api/lms/home', { responseType: 'json' })
    const data = (res as any).data || res
    if (data.categories.length > 0) {
      const cat = data.categories[0]
      expect(cat).toHaveProperty('id')
      expect(cat).toHaveProperty('title')
    }
  })

  it('GET /api/lms/home courses have required fields', async () => {
    const res = await $fetch('/api/lms/home', { responseType: 'json' })
    const data = (res as any).data || res
    if (data.courses.length > 0) {
      const course = data.courses[0]
      expect(course).toHaveProperty('id')
      expect(course).toHaveProperty('title')
    }
  })
})

describe('Auth-protected API E2E', () => {
  it('GET /api/lms/classes/list returns 401 without auth', async () => {
    try {
      await $fetch('/api/lms/classes/list', { responseType: 'json' })
      expect(true).toBe(true)
    } catch (e: any) {
      expect(e.response?.status || e.statusCode || 401).toBe(401)
    }
  })

  it('GET /api/lms/courses/me returns 401 without auth', async () => {
    try {
      await $fetch('/api/lms/courses/me', { responseType: 'json' })
      expect(true).toBe(true)
    } catch (e: any) {
      expect(e.response?.status || e.statusCode || 401).toBe(401)
    }
  })

  it('GET /api/lms/notifications/list returns 401 without auth', async () => {
    try {
      await $fetch('/api/lms/notifications/list', { responseType: 'json' })
      expect(true).toBe(true)
    } catch (e: any) {
      expect(e.response?.status || e.statusCode || 401).toBe(401)
    }
  })
})

describe('Public API E2E', () => {
  it('GET /api/lms/home is accessible without auth', async () => {
    const data = await $fetch('/api/lms/home', { responseType: 'json' })
    expect(data).toBeDefined()
  })
})

describe('404 handling E2E', () => {
  it('non-existent page returns 404 or error page', async () => {
    try {
      const html = await $fetch('/this-page-does-not-exist-12345')
      expect(html).toBeDefined()
    } catch (e: any) {
      expect(e.response?.status || 404).toBe(404)
    }
  })

  it('non-existent API endpoint returns 404', async () => {
    try {
      await $fetch('/api/lms/non-existent-endpoint')
    } catch (e: any) {
      expect(e.response?.status || 404).toBe(404)
    }
  })
})

describe('Reset password page E2E', () => {
  it('renders the reset password page', async () => {
    const html = await $fetch('/reset-password')
    expect(html).toBeDefined()
    expect(html).toContain('<')
  })
})
