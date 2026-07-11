/**
 * fkLabel 工具测试
 * @see modules/admin/utils/fkLabel.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

function makeCol(over: Partial<any>): any {
  return {
    name: over.jsName || 'col',
    jsName: over.jsName || 'col',
    dataType: 'number',
    columnType: 'PgInteger',
    notNull: false,
    hasDefault: false,
    isPrimaryKey: false,
    isAutoIncrement: false,
    isTimestamp: false,
    isDeletedAt: false,
    ...over,
  }
}

describe('utils/fkLabel - fkLabelColumn', () => {
  it('覆盖表返回 name', async () => {
    const { fkLabelColumn } = await import('../../utils/fkLabel')
    for (const t of ['users', 'classes', 'courses', 'chapters', 'roles', 'permissions', 'categories', 'files', 'tokens', 'medals']) {
      expect(fkLabelColumn(t)).toBe('name')
    }
  })

  it('未覆盖表默认返回 name', async () => {
    const { fkLabelColumn } = await import('../../utils/fkLabel')
    expect(fkLabelColumn('unknownTable')).toBe('name')
  })
})

describe('utils/fkLabel - extractFkMap', () => {
  it('从列定义提取 FK 映射', async () => {
    const { extractFkMap } = await import('../../utils/fkLabel')
    const cols = [
      makeCol({ jsName: 'id', isPrimaryKey: true }),
      makeCol({ jsName: 'userId', fkTable: 'users' }),
      makeCol({ jsName: 'courseId', fkTable: 'courses' }),
      makeCol({ jsName: 'name' }),
    ]
    const map = extractFkMap(cols)
    expect(map.userId).toEqual({ table: 'users', labelColumn: 'name' })
    expect(map.courseId).toEqual({ table: 'courses', labelColumn: 'name' })
    expect(map.name).toBeUndefined()
    expect(map.id).toBeUndefined()
  })

  it('无 FK 列返回空对象', async () => {
    const { extractFkMap } = await import('../../utils/fkLabel')
    const cols = [makeCol({ jsName: 'id' }), makeCol({ jsName: 'name' })]
    expect(extractFkMap(cols)).toEqual({})
  })

  it('fkLabel 显式指定时优先使用', async () => {
    const { extractFkMap } = await import('../../utils/fkLabel')
    const cols = [makeCol({ jsName: 'classId', fkTable: 'classes', fkLabel: 'title' })]
    const map = extractFkMap(cols)
    expect(map.classId).toEqual({ table: 'classes', labelColumn: 'title' })
  })
})
