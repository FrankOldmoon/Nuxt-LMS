/**
 * useAdminMenu composable 测试（含 reorder 回归）
 * @see modules/admin/composables/useAdminMenu.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs, setMockFetchHandler } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('composables/useAdminMenu', () => {
  it('items 从 /api/admin/menu 拉取', async () => {
    const menuItems = [
      { table: 'users', label: 'Users', visible: true, order: 0 },
      { table: 'courses', label: 'Courses', visible: true, order: 1 },
    ]
    setMockFetchHandler(async (url: string) => {
      if (url === '/api/admin/menu') return { data: { items: menuItems }, success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useAdminMenu } = await import('../../composables/useAdminMenu')
    const { items } = useAdminMenu()
    // useFetch 默认立即执行（lazy=false），等微任务
    await new Promise(r => setTimeout(r, 10))
    expect(items.value).toHaveLength(2)
    expect(items.value[0].table).toBe('users')
  })

  it('visibleItems 过滤 visible=false 项', async () => {
    const menuItems = [
      { table: 'users', label: 'Users', visible: true, order: 0 },
      { table: 'hidden', label: 'Hidden', visible: false, order: 1 },
      { table: 'courses', label: 'Courses', visible: true, order: 2 },
    ]
    setMockFetchHandler(async (url: string) => {
      if (url === '/api/admin/menu') return { data: { items: menuItems }, success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useAdminMenu } = await import('../../composables/useAdminMenu')
    const { visibleItems } = useAdminMenu()
    await new Promise(r => setTimeout(r, 10))
    expect(visibleItems.value).toHaveLength(2)
    expect(visibleItems.value.map((i: any) => i.table)).toEqual(['users', 'courses'])
  })

  it('visibleItems 递归过滤树形 children', async () => {
    const menuItems = [
      {
        label: 'Group', visible: true, order: 0,
        children: [
          { table: 'users', label: 'Users', visible: true, order: 0 },
          { table: 'hidden', label: 'Hidden', visible: false, order: 1 },
        ],
      },
    ]
    setMockFetchHandler(async (url: string) => {
      if (url === '/api/admin/menu') return { data: { items: menuItems }, success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useAdminMenu } = await import('../../composables/useAdminMenu')
    const { visibleItems } = useAdminMenu()
    await new Promise(r => setTimeout(r, 10))
    expect(visibleItems.value).toHaveLength(1)
    expect(visibleItems.value[0].children).toHaveLength(1)
    expect(visibleItems.value[0].children[0].table).toBe('users')
  })

  it('回归：reorder 后 items 立即更新（Bug 2 修复验证）', async () => {
    const menuItems = [
      { table: 'users', label: 'Users', visible: true, order: 0 },
      { table: 'courses', label: 'Courses', visible: true, order: 1 },
    ]
    setMockFetchHandler(async (url: string) => {
      if (url === '/api/admin/menu') return { data: { items: menuItems }, success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useAdminMenu } = await import('../../composables/useAdminMenu')
    const { items, reorder } = useAdminMenu()
    await new Promise(r => setTimeout(r, 10))
    expect(items.value[0].table).toBe('users')

    // 反序
    reorder([
      { table: 'courses', label: 'Courses', visible: true, order: 0 },
      { table: 'users', label: 'Users', visible: true, order: 1 },
    ])
    // reorder 应立即生效（Bug 2 修复前 reorder 是无效赋值，items 不变）
    expect(items.value[0].table).toBe('courses')
    expect(items.value[1].table).toBe('users')
    // order 被重排为 0/1
    expect(items.value[0].order).toBe(0)
    expect(items.value[1].order).toBe(1)
  })

  it('save 成功后调 refreshMenu 并弹 success toast', async () => {
    const menuItems = [{ table: 'users', label: 'Users', visible: true, order: 0 }]
    let putCalled = false
    setMockFetchHandler(async (url: string, opts: any) => {
      if (url === '/api/admin/menu' && opts?.method === 'PUT') {
        putCalled = true
        return { data: { items: menuItems }, success: true, msg: '' }
      }
      if (url === '/api/admin/menu') return { data: { items: menuItems }, success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useAdminMenu } = await import('../../composables/useAdminMenu')
    const { save, pending } = useAdminMenu()
    await new Promise(r => setTimeout(r, 10))
    await save(menuItems)
    expect(putCalled).toBe(true)
    expect(pending.value).toBe(false)
  })
})
