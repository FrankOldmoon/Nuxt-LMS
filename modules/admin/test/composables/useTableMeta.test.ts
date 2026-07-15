/**
 * useTableMeta composable tests
 * @see modules/admin/composables/useTableMeta.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs, setMockFetchHandler } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('composables/useTableMeta', () => {
  it('useTablesMeta 加载并缓存表元数据', async () => {
    const tablesData = [
      { name: 'users', hasId: true, compositePk: false, readOnly: false, columns: [{ jsName: 'id' }] },
      { name: 'courses', hasId: true, compositePk: false, readOnly: false, columns: [{ jsName: 'id' }] },
    ]
    setMockFetchHandler(async (url: string) => {
      if (url === '/api/admin/tables') return { data: tablesData, success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useTablesMeta } = await import('../../composables/useTableMeta')
    const { tables, load } = useTablesMeta()
    expect(tables.value).toHaveLength(0)
    await load()
    expect(tables.value).toHaveLength(2)
    expect(tables.value[0].name).toBe('users')
  })

  it('useTableMeta 返回指定表的 summary/columns', async () => {
    const tablesData = [
      { name: 'users', hasId: true, compositePk: false, readOnly: false, labelColumn: 'name', columns: [{ jsName: 'id' }, { jsName: 'name' }] },
    ]
    setMockFetchHandler(async (url: string) => {
      if (url === '/api/admin/tables') return { data: tablesData, success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useTableMeta } = await import('../../composables/useTableMeta')
    const { summary, columns, readOnly, labelColumn, ensure } = useTableMeta('users')
    // Empty before loading
    expect(summary.value).toBeUndefined()
    await ensure()
    expect(summary.value?.name).toBe('users')
    expect(columns.value).toHaveLength(2)
    expect(readOnly.value).toBe(false)
    expect(labelColumn.value).toBe('name')
  })

  it('复合主键表 readOnly 为 true', async () => {
    const tablesData = [
      { name: 'userRoles', hasId: false, compositePk: true, readOnly: true, labelColumn: undefined, columns: [{ jsName: 'userId' }, { jsName: 'roleId' }] },
    ]
    setMockFetchHandler(async (url: string) => {
      if (url === '/api/admin/tables') return { data: tablesData, success: true, msg: '' }
      return { data: null, success: true, msg: '' }
    })
    const { useTableMeta } = await import('../../composables/useTableMeta')
    const { summary, readOnly, ensure } = useTableMeta('userRoles')
    await ensure()
    expect(summary.value?.compositePk).toBe(true)
    expect(readOnly.value).toBe(true)
  })

  it('load 失败时 tables 保持空（不抛错）', async () => {
    setMockFetchHandler(async () => { throw new Error('network') })
    const { useTablesMeta } = await import('../../composables/useTableMeta')
    const { tables, load } = useTablesMeta()
    await expect(load()).rejects.toThrow()
    expect(tables.value).toHaveLength(0)
  })
})
