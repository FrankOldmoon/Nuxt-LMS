/**
 * composables/useUniverSheet tests
 * @see modules/base/composables/useUniverSheet.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

function makeArgs(overrides: Partial<Record<string, () => any>> = {}) {
  const defaults = {
    headers: () => ['username', 'email', 'name'],
    colWidths: () => ({ 0: 110, 1: 180, 2: 100 }),
    rowCount: () => 10,
    active: () => false,
    showTools: () => true,
    showFooter: () => true,
    showContextMenu: () => true,
    initialData: () => null,
    onChange: () => {},
  }
  return { ...defaults, ...overrides }
}

describe('composables/useUniverSheet - 初始状态', () => {
  it('sheetContainer 初始为 null', async () => {
    const { useUniverSheet } = await import('../../composables/useUniverSheet')
    const { sheetContainer } = useUniverSheet(...Object.values(makeArgs()) as any)
    expect(sheetContainer.value).toBeNull()
  })
})

describe('composables/useUniverSheet - 未初始化时的方法', () => {
  it('getRows 在未初始化时返回空数组', async () => {
    const { useUniverSheet } = await import('../../composables/useUniverSheet')
    const { getRows } = useUniverSheet(...Object.values(makeArgs()) as any)
    expect(getRows()).toEqual([])
  })

  it('getCellData 在未初始化时返回 null', async () => {
    const { useUniverSheet } = await import('../../composables/useUniverSheet')
    const { getCellData } = useUniverSheet(...Object.values(makeArgs()) as any)
    expect(getCellData()).toBeNull()
  })

  it('setSortedRows 在未初始化时不抛错', async () => {
    const { useUniverSheet } = await import('../../composables/useUniverSheet')
    const { setSortedRows } = useUniverSheet(...Object.values(makeArgs()) as any)
    expect(() => setSortedRows([['a', 'b', 'c']])).not.toThrow()
  })
})

describe('composables/useUniverSheet - active watch', () => {
  it('active=true 时触发 initSheet（无 sheetContainer 时安全退出）', async () => {
    const { useUniverSheet } = await import('../../composables/useUniverSheet')
    const activeRef = ref(false)
    const args = makeArgs({ active: () => activeRef.value })
    const { sheetContainer } = useUniverSheet(...Object.values(args) as any)
    // sheetContainer is still null, initSheet should return safely
    activeRef.value = true
    expect(sheetContainer.value).toBeNull()
  })
})
