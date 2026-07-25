/**
 * useAdminTable composable 测试
 * @see modules/admin/composables/useAdminTable.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs, setMockFetchHandler, getToastCalls } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

/** 构造 mock /api/crud/:table/list 响应 */
function mockListResponse(data: any[] = [], opts: { hasId?: boolean; columns?: any[] } = {}) {
  const hasId = opts.hasId ?? true
  return {
    data,
    total: data.length,
    meta: {
      name: 'users',
      hasId,
      compositePk: !hasId,
      readOnly: !hasId,
      labelColumn: 'name',
      columns: opts.columns || [
        { jsName: 'id', isPrimaryKey: true, isAutoIncrement: true, dataType: 'number' },
        { jsName: 'name', dataType: 'string' },
      ],
    },
    columns: opts.columns || [
      { jsName: 'id', isPrimaryKey: true, isAutoIncrement: true, dataType: 'number' },
      { jsName: 'name', dataType: 'string' },
    ],
  }
}

describe('composables/useAdminTable - 基础状态', () => {
  it('初始状态默认值', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    expect(t.page.value).toBe(1)
    expect(t.pageSize.value).toBe(20)
    expect(t.sort.value).toBeNull()
    expect(t.search.value).toBe('')
    expect(t.filters.value).toHaveLength(0)
    expect(t.includeDeleted.value).toBe(false)
    expect(t.rows.value).toEqual([])
    expect(t.total.value).toBe(0)
    expect(t.pending.value).toBe(false)
  })

  it('rowKeyOf 有 id 用 String(id)', async () => {
    setMockFetchHandler(async () => ({ data: mockListResponse(), success: true, msg: '' }))
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    await t.load()
    expect(t.rowKeyOf({ id: 5, name: 'a' })).toBe('5')
  })

  it('rowKeyOf 复合主键用 PK 列拼 -', async () => {
    const cols = [
      { jsName: 'userId', isPrimaryKey: true, dataType: 'number' },
      { jsName: 'roleId', isPrimaryKey: true, dataType: 'number' },
    ]
    setMockFetchHandler(async () => ({ data: mockListResponse([], { hasId: false, columns: cols }), success: true, msg: '' }))
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('userRoles')
    await t.load()
    expect(t.rowKeyOf({ userId: 1, roleId: 2 })).toBe('1-2')
    expect(t.hasId.value).toBe(false)
  })
})

describe('composables/useAdminTable - load & buildQuery', () => {
  it('load 拉取数据并填充 rows/total/meta', async () => {
    const rows = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
    setMockFetchHandler(async (url: string) => {
      if (url.startsWith('/api/crud/users/list')) return { data: mockListResponse(rows), success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    await t.load()
    expect(t.rows.value).toHaveLength(2)
    expect(t.total.value).toBe(2)
    expect(t.meta.value).toBeTruthy()
    expect(t.columns.value).toHaveLength(2)
  })

  it('buildQuery 包含 page/pageSize（Bug 3 回归：不再有冗余三元）', async () => {
    setMockFetchHandler(async () => ({ data: mockListResponse(), success: true, msg: '' }))
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    t.page.value = 3
    t.pageSize.value = 50
    // buildQuery 是内部函数，通过 load 时的 URL 间接验证
    let capturedUrl = ''
    setMockFetchHandler(async (url: string) => {
      capturedUrl = url
      return { data: mockListResponse(), success: true, msg: '' }
    })
    await t.load()
    expect(capturedUrl).toContain('page=3')
    expect(capturedUrl).toContain('pageSize=50')
  })

  it('load 失败弹 error toast 并清空 rows', async () => {
    setMockFetchHandler(async () => { throw new Error('加载失败') })
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    await t.load()
    expect(t.rows.value).toEqual([])
    expect(t.total.value).toBe(0)
    expect(t.pending.value).toBe(false)
    expect(getToastCalls().some((c: any) => c.color === 'error')).toBe(true)
  })

  it('toggleSort 切换 asc→desc→null', async () => {
    setMockFetchHandler(async () => ({ data: mockListResponse(), success: true, msg: '' }))
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    t.toggleSort('name')
    expect(t.sort.value).toEqual({ column: 'name', dir: 'asc' })
    t.toggleSort('name')
    expect(t.sort.value).toEqual({ column: 'name', dir: 'desc' })
    t.toggleSort('name')
    expect(t.sort.value).toBeNull()
  })

  it('toggleTrash 切换 includeDeleted 并重置选择', async () => {
    setMockFetchHandler(async () => ({ data: mockListResponse(), success: true, msg: '' }))
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    await t.load()
    t.toggleSelect('1')
    expect(t.selectedKeys.value.has('1')).toBe(true)
    t.toggleTrash()
    expect(t.includeDeleted.value).toBe(true)
    expect(t.selectedKeys.value.size).toBe(0)
  })
})

describe('composables/useAdminTable - 选择', () => {
  it('toggleSelect 切换单选', async () => {
    const rows = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }]
    setMockFetchHandler(async () => ({ data: mockListResponse(rows), success: true, msg: '' }))
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    await t.load()
    t.toggleSelect('1')
    expect(t.selectedKeys.value.has('1')).toBe(true)
    t.toggleSelect('1')
    expect(t.selectedKeys.value.has('1')).toBe(false)
  })

  it('toggleSelectAll 全选/取消全选', async () => {
    const rows = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }]
    setMockFetchHandler(async () => ({ data: mockListResponse(rows), success: true, msg: '' }))
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    await t.load()
    t.toggleSelectAll()
    expect(t.selectedKeys.value.size).toBe(2)
    expect(t.allSelected.value).toBe(true)
    t.toggleSelectAll()
    expect(t.selectedKeys.value.size).toBe(0)
    expect(t.allSelected.value).toBe(false)
  })

  it('selectedRows 返回选中的行对象', async () => {
    const rows = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }]
    setMockFetchHandler(async () => ({ data: mockListResponse(rows), success: true, msg: '' }))
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    await t.load()
    t.toggleSelect('2')
    expect(t.selectedRows.value).toHaveLength(1)
    expect(t.selectedRows.value[0].name).toBe('b')
  })
})

describe('composables/useAdminTable - CRUD', () => {
  it('addRow 发 POST 并刷新', async () => {
    let posted: any = null
    setMockFetchHandler(async (url: string, opts: any) => {
      if (url === '/api/crud/users/add') { posted = opts.body; return { data: { id: 3 }, success: true, msg: '' } }
      if (url.startsWith('/api/crud/users/list')) return { data: mockListResponse(), success: true, msg: '' }
      if (url === '/api/admin/columns/users') return { data: { hidden: [] }, success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    const result = await t.addRow({ name: 'Charlie' })
    expect(posted).toEqual({ name: 'Charlie' })
    expect(result).toEqual({ id: 3 })
  })

  it('updateRow 发 POST 含 id', async () => {
    let posted: any = null
    setMockFetchHandler(async (url: string, opts: any) => {
      if (url === '/api/crud/users/update') { posted = opts.body; return { data: null, success: true, msg: '' } }
      if (url.startsWith('/api/crud/users/list')) return { data: mockListResponse(), success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    await t.updateRow(5, { name: 'Updated' })
    expect(posted).toEqual({ id: 5, name: 'Updated' })
  })

  it('batchAction 普通表走 /api/crud/:table/batch', async () => {
    let posted: any = null
    setMockFetchHandler(async (url: string, opts: any) => {
      if (url === '/api/crud/users/batch') { posted = opts.body; return { data: null, success: true, msg: '' } }
      if (url.startsWith('/api/crud/users/list')) return { data: mockListResponse(), success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    await t.batchDelete([{ id: 1 }, { id: 2 }])
    expect(posted).toEqual({ ids: [1, 2], action: 'delete' })
  })
})

describe('composables/useAdminTable - 列可见性', () => {
  it('toggleColumn 切换隐藏并保存', async () => {
    let putBody: any = null
    setMockFetchHandler(async (url: string, opts: any) => {
      if (url === '/api/admin/columns/users' && opts?.method === 'PUT') { putBody = opts.body; return { data: { hidden: [] }, success: true, msg: '' } }
      if (url === '/api/admin/columns/users') return { data: { hidden: [] }, success: true, msg: '' }
      if (url.startsWith('/api/crud/users/list')) return { data: mockListResponse(), success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    await t.load()
    await t.loadHidden()
    t.toggleColumn('name')
    expect(t.hiddenColumns.value.has('name')).toBe(true)
    expect(putBody.hidden).toContain('name')
    // visibleColumns 排除隐藏列
    expect(t.visibleColumns.value.map((c: any) => c.jsName)).not.toContain('name')
  })

  it('showAllColumns 清空隐藏', async () => {
    setMockFetchHandler(async (url: string) => {
      if (url === '/api/admin/columns/users') return { data: { hidden: ['name'] }, success: true, msg: '' }
      if (url.startsWith('/api/crud/users/list')) return { data: mockListResponse(), success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    await t.load()
    await t.loadHidden()
    expect(t.hiddenColumns.value.has('name')).toBe(true)
    t.showAllColumns()
    expect(t.hiddenColumns.value.size).toBe(0)
  })
})

describe('composables/useAdminTable - 导入导出', () => {
  it('exportRows 拉取导出数据', async () => {
    const exportData = [{ id: 1, name: 'a' }]
    setMockFetchHandler(async (url: string) => {
      if (url.startsWith('/api/crud/users/export')) return { data: exportData, success: true, msg: '' }
      if (url.startsWith('/api/crud/users/list')) return { data: mockListResponse(), success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    const rows = await t.exportRows()
    expect(rows).toEqual(exportData)
  })

  it('importRows 发 POST 并返回 inserted/errors', async () => {
    let posted: any = null
    setMockFetchHandler(async (url: string, opts: any) => {
      if (url === '/api/crud/users/import') { posted = opts.body; return { data: { inserted: 3, errors: ['行2: 重复'] }, success: true, msg: '' } }
      if (url.startsWith('/api/crud/users/list')) return { data: mockListResponse(), success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useAdminTable } = await import('../../composables/useAdminTable')
    const t = useAdminTable('users')
    const result = await t.importRows([{ name: 'a' }, { name: 'b' }])
    expect(posted.rows).toHaveLength(2)
    expect(result.inserted).toBe(3)
    expect(result.errors).toHaveLength(1)
  })
})
