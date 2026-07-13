/**
 * useImportSheet composable 测试
 * @see modules/admin/composables/useImportSheet.ts
 *
 * 导入弹窗逻辑：表头/初始数据生成、行提取、模板下载、结果状态
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs, getToastCalls, setMockI18n } from '../../../../test/setup/nuxt-stubs'
import { ref, nextTick } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
})

function col(jsName: string) {
  return {
    name: jsName, jsName, dataType: 'string', columnType: 'PgString',
    notNull: false, hasDefault: false, isPrimaryKey: false, isAutoIncrement: false,
    isTimestamp: false, isDeletedAt: false,
  }
}

describe('composables/useImportSheet', () => {
  it('headers 从 columns 生成', async () => {
    const { useImportSheet } = await import('../../composables/useImportSheet')
    const { headers } = useImportSheet(() => [col('name'), col('email')], ref(false), vi.fn())
    expect(headers.value).toEqual(['name', 'email'])
  })

  it('initialData 生成表头行 + 空行', async () => {
    const { useImportSheet } = await import('../../composables/useImportSheet')
    const { initialData } = useImportSheet(() => [col('name'), col('email')], ref(false), vi.fn())
    expect(initialData.value[1][0]).toEqual({ v: '' })
    expect(initialData.value[1][1]).toEqual({ v: '' })
  })

  it('doImport 空行时 toast 警告', async () => {
    const { useImportSheet } = await import('../../composables/useImportSheet')
    const sheetRef = ref({ getRows: () => [[''], ['']] })
    const { sheetRef: sRef, doImport } = useImportSheet(() => [col('name')], ref(false), vi.fn())
    sRef.value = sheetRef.value
    await doImport()
    expect(getToastCalls()).toHaveLength(1)
    expect(getToastCalls()[0].color).toBe('warning')
  })

  it('doImport 有效行触发 onImport', async () => {
    const { useImportSheet } = await import('../../composables/useImportSheet')
    const onImport = vi.fn()
    const { sheetRef, doImport } = useImportSheet(() => [col('name'), col('age')], ref(false), onImport)
    sheetRef.value = { getRows: () => [['Alice', '30'], ['', '']] }
    await doImport()
    expect(onImport).toHaveBeenCalledWith([{ name: 'Alice', age: '30' }])
  })

  it('open 变 true 时重置 result', async () => {
    const { useImportSheet } = await import('../../composables/useImportSheet')
    const open = ref(false)
    const { result } = useImportSheet(() => [col('name')], open, vi.fn())
    result.value = { inserted: 5, errors: [] }
    open.value = true
    await nextTick()
    expect(result.value).toBeNull()
  })

  it('downloadTemplate 生成 CSV', async () => {
    const { useImportSheet } = await import('../../composables/useImportSheet')
    const { downloadTemplate } = useImportSheet(() => [col('name'), col('email')], ref(false), vi.fn())
    const clickSpy = vi.fn()
    const revokeSpy = vi.fn()
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:url') as any
    globalThis.URL.revokeObjectURL = revokeSpy as any
    const origCreate = document.createElement
    document.createElement = (() => ({ href: '', download: '', click: clickSpy })) as any
    try {
      downloadTemplate()
      expect(clickSpy).toHaveBeenCalled()
      expect(revokeSpy).toHaveBeenCalled()
    } finally {
      document.createElement = origCreate
    }
  })
})
