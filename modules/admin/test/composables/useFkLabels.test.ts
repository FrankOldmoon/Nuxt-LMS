/**
 * useFkLabels composable tests
 * @see modules/admin/composables/useFkLabels.ts
 *
 * FK label resolution: scan FK columns, fetch /api/admin/fk-options, generate mapping
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs, setMockFetchHandler } from '../../../../test/setup/nuxt-stubs'
import { computed, nextTick } from 'vue'

beforeEach(() => {
  resetAllStubs()
})

function col(overrides: Record<string, any> = {}) {
  return {
    name: 'c', jsName: overrides.jsName || 'c', dataType: 'string', columnType: 'PgString',
    notNull: false, hasDefault: false, isPrimaryKey: false, isAutoIncrement: false,
    isTimestamp: false, isDeletedAt: false, ...overrides,
  }
}

describe('composables/useFkLabels', () => {
  it('无 FK 列时 fkLabels 为空对象', async () => {
    const { useFkLabels } = await import('../../composables/useFkLabels')
    const columns = computed(() => [col({ jsName: 'name' })])
    const { fkLabels } = useFkLabels(columns)
    await nextTick()
    expect(fkLabels.value).toEqual({})
  })

  it('拉取 FK 选项并生成 id→label 映射', async () => {
    setMockFetchHandler(async (url: string) => {
      if (url.includes('fk-options')) {
        return { data: [{ id: 1, label: 'Alice' }, { id: 2, label: 'Bob' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useFkLabels } = await import('../../composables/useFkLabels')
    const columns = computed(() => [col({ jsName: 'userId', fkTable: 'users' })])
    const { fkLabels } = useFkLabels(columns)
    await vi.waitFor(() => {
      expect(fkLabels.value.userId).toBeDefined()
    })
    expect(fkLabels.value.userId[1]).toBe('Alice')
    expect(fkLabels.value.userId[2]).toBe('Bob')
  })

  it('同 fkTable 只拉取一次（缓存）', async () => {
    const fetchSpy = vi.fn()
    setMockFetchHandler(async (url: string) => {
      if (url.includes('fk-options')) {
        fetchSpy(url)
        return { data: [{ id: 1, label: 'A' }], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useFkLabels } = await import('../../composables/useFkLabels')
    const columns = computed(() => [
      col({ jsName: 'userId', fkTable: 'users' }),
      col({ jsName: 'ownerId', fkTable: 'users' }),
    ])
    const { fkLabels } = useFkLabels(columns)
    await vi.waitFor(() => {
      expect(fkLabels.value.userId).toBeDefined()
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fkLabels.value.userId[1]).toBe('A')
    expect(fkLabels.value.ownerId[1]).toBe('A')
  })

  it('cRequest 失败时 fkLabels 对应列为空对象', async () => {
    setMockFetchHandler(async () => { throw new Error('network error') })
    const { useFkLabels } = await import('../../composables/useFkLabels')
    const columns = computed(() => [col({ jsName: 'userId', fkTable: 'users' })])
    const { fkLabels } = useFkLabels(columns)
    await vi.waitFor(() => {
      expect(fkLabels.value.userId).toBeDefined()
    })
    expect(fkLabels.value.userId).toEqual({})
  })
})
