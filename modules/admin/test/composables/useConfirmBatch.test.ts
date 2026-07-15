/**
 * useConfirmBatch composable tests
 * @see modules/admin/composables/useConfirmBatch.ts
 *
 * Batch/single confirm dialog (delete/restore/permanent delete)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetAllStubs, setMockI18n } from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string, params?: any) => `${k}:${JSON.stringify(params || {})}`, d: (v: any) => String(v) })
})

describe('composables/useConfirmBatch', () => {
  it('confirmBatch 打开确认弹窗', async () => {
    const { useConfirmBatch } = await import('../../composables/useConfirmBatch')
    const { confirmOpen, confirmBatch } = useConfirmBatch(vi.fn(), vi.fn(), vi.fn())
    expect(confirmOpen.value).toBe(false)
    confirmBatch('delete', [{ id: 1 }, { id: 2 }])
    expect(confirmOpen.value).toBe(true)
  })

  it('confirmText 包含行数信息', async () => {
    const { useConfirmBatch } = await import('../../composables/useConfirmBatch')
    const { confirmText, confirmBatch } = useConfirmBatch(vi.fn(), vi.fn(), vi.fn())
    confirmBatch('delete', [{ id: 1 }, { id: 2 }])
    expect(confirmText.value).toContain('2')
  })

  it('onSingleDelete/Restore/Remove 触发对应 confirmText', async () => {
    const { useConfirmBatch } = await import('../../composables/useConfirmBatch')
    const { confirmText, onSingleDelete, onSingleRestore, onSingleRemove } = useConfirmBatch(vi.fn(), vi.fn(), vi.fn())
    onSingleDelete({ id: 10 })
    expect(confirmText.value).toContain('Delete')
    onSingleRestore({ id: 20 })
    expect(confirmText.value).toContain('Restore')
    onSingleRemove({ id: 30 })
    expect(confirmText.value).toContain('Remove')
  })

  it('confirmColor: restore 为 success，其余为 error', async () => {
    const { useConfirmBatch } = await import('../../composables/useConfirmBatch')
    const { confirmColor, confirmBatch } = useConfirmBatch(vi.fn(), vi.fn(), vi.fn())
    confirmBatch('delete', [{ id: 1 }])
    expect(confirmColor.value).toBe('error')
    confirmBatch('remove', [{ id: 1 }])
    expect(confirmColor.value).toBe('error')
    confirmBatch('restore', [{ id: 1 }])
    expect(confirmColor.value).toBe('success')
  })

  it('executeConfirm 调用对应 batch 函数并关闭弹窗', async () => {
    const { useConfirmBatch } = await import('../../composables/useConfirmBatch')
    const batchDelete = vi.fn().mockResolvedValue(undefined)
    const batchRestore = vi.fn().mockResolvedValue(undefined)
    const { confirmOpen, confirmLoading, confirmBatch, executeConfirm } = useConfirmBatch(batchDelete, vi.fn(), batchRestore)
    confirmBatch('delete', [{ id: 1 }])
    await executeConfirm()
    expect(batchDelete).toHaveBeenCalledWith([{ id: 1 }])
    expect(confirmOpen.value).toBe(false)
    expect(confirmLoading.value).toBe(false)
  })

  it('executeConfirm restore 调用 batchRestore', async () => {
    const { useConfirmBatch } = await import('../../composables/useConfirmBatch')
    const batchRestore = vi.fn().mockResolvedValue(undefined)
    const { confirmBatch, executeConfirm } = useConfirmBatch(vi.fn(), vi.fn(), batchRestore)
    confirmBatch('restore', [{ id: 5 }])
    await executeConfirm()
    expect(batchRestore).toHaveBeenCalledWith([{ id: 5 }])
  })
})
