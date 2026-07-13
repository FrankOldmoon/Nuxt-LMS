/**
 * useManagerIo composable 测试
 * @see modules/admin/composables/useManagerIo.ts
 *
 * Manager 导入/导出弹窗编排
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs, getToastCalls, setMockI18n } from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string, params?: any) => `${k}:${JSON.stringify(params || {})}`, d: (v: any) => String(v) })
})

describe('composables/useManagerIo', () => {
  it('初始状态默认值', async () => {
    const { useManagerIo } = await import('../../composables/useManagerIo')
    const { importOpen, exportOpen, exportRows, exporting } = useManagerIo(vi.fn(), vi.fn())
    expect(importOpen.value).toBe(false)
    expect(exportOpen.value).toBe(false)
    expect(exportRows.value).toEqual([])
    expect(exporting.value).toBe(false)
  })

  it('onImport 调用 importRows 并关闭弹窗', async () => {
    const { useManagerIo } = await import('../../composables/useManagerIo')
    const importRows = vi.fn().mockResolvedValue({ inserted: 3, errors: [] })
    const { importOpen, onImport } = useManagerIo(importRows, vi.fn())
    importOpen.value = true
    await onImport([{ name: 'A' }])
    expect(importRows).toHaveBeenCalledWith([{ name: 'A' }])
    expect(importOpen.value).toBe(false)
    // 成功 toast
    expect(getToastCalls()).toHaveLength(1)
    expect(getToastCalls()[0].color).toBe('success')
  })

  it('onImport 有 errors 时 toast 为 warning', async () => {
    const { useManagerIo } = await import('../../composables/useManagerIo')
    const importRows = vi.fn().mockResolvedValue({ inserted: 2, errors: ['err1'] })
    const { onImport } = useManagerIo(importRows, vi.fn())
    await onImport([])
    expect(getToastCalls()[0].color).toBe('warning')
  })

  it('openExport 拉取数据并打开弹窗', async () => {
    const { useManagerIo } = await import('../../composables/useManagerIo')
    const fetchExportRows = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }])
    const { exportOpen, exportRows, exporting, openExport } = useManagerIo(vi.fn(), fetchExportRows)
    await openExport()
    expect(exportOpen.value).toBe(true)
    expect(exportRows.value).toHaveLength(2)
    expect(exporting.value).toBe(false)
  })

  it('openExport 失败时 toast 报错', async () => {
    const { useManagerIo } = await import('../../composables/useManagerIo')
    const fetchExportRows = vi.fn().mockRejectedValue(new Error('fetch failed'))
    const { exportOpen, exporting, openExport } = useManagerIo(vi.fn(), fetchExportRows)
    await openExport()
    expect(exportOpen.value).toBe(false)
    expect(exporting.value).toBe(false)
    expect(getToastCalls()).toHaveLength(1)
    expect(getToastCalls()[0].color).toBe('error')
  })
})
