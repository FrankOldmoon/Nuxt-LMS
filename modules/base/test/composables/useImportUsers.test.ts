/**
 * composables/useImportUsers tests
 * @see modules/base/composables/useImportUsers.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import {
  resetAllStubs,
  setMockFetchHandler,
  clearMockFetchHandler,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
})

describe('composables/useImportUsers - 常量与初始状态', () => {
  it('HEADERS 包含 7 个列', async () => {
    const { useImportUsers } = await import('../../composables/useImportUsers')
    const { HEADERS } = useImportUsers(ref(false))
    expect(HEADERS).toEqual(['username', 'email', 'name', 'prefer_name', 'english_name', 'password', 'class'])
  })

  it('COL_WIDTHS 包含各列宽度', async () => {
    const { useImportUsers } = await import('../../composables/useImportUsers')
    const { COL_WIDTHS } = useImportUsers(ref(false))
    expect(COL_WIDTHS[0]).toBe(110)
    expect(COL_WIDTHS[1]).toBe(180)
    expect(COL_WIDTHS[6]).toBe(100)
  })

  it('importing/importMsg/importOk 初始值', async () => {
    const { useImportUsers } = await import('../../composables/useImportUsers')
    const { importing, importMsg, importOk } = useImportUsers(ref(false))
    expect(importing.value).toBe(false)
    expect(importMsg.value).toBe('')
    expect(importOk.value).toBe(true)
  })
})

describe('composables/useImportUsers - doImport 校验', () => {
  it('无 sheetRef 时设置错误信息', async () => {
    const { useImportUsers } = await import('../../composables/useImportUsers')
    const { doImport, importMsg, importOk } = useImportUsers(ref(false))
    await doImport()
    expect(importOk.value).toBe(false)
    expect(importMsg.value).toBe('importUsers.notReady')
  })

  it('无数据行时设置 noData 错误', async () => {
    const { useImportUsers } = await import('../../composables/useImportUsers')
    const { sheetRef, doImport, importMsg, importOk } = useImportUsers(ref(false))
    sheetRef.value = { getRows: () => [], reset: () => {} }
    await doImport()
    expect(importOk.value).toBe(false)
    expect(importMsg.value).toBe('importUsers.noData')
  })
})

describe('composables/useImportUsers - doImport 成功', () => {
  it('导入成功后弹 toast 并重置 sheet', async () => {
    vi.useFakeTimers()
    try {
      setMockFetchHandler(async () => ({ data: null, success: true, msg: 'imported 3 users' }))
      const { useImportUsers } = await import('../../composables/useImportUsers')
      const resetSpy = vi.fn()
      const { sheetRef, doImport, importOk, importMsg, importing } = useImportUsers(ref(false))
      sheetRef.value = {
        getRows: () => [['alice', 'a@x.com', 'Alice', 'Al', 'A', 'pwd', 'C1']],
        reset: resetSpy,
      }
      const p = doImport()
      await p
      expect(importOk.value).toBe(true)
      expect(importMsg.value).toBe('imported 3 users')
      expect(importing.value).toBe(false)
      const calls = getToastCalls()
      expect(calls[0].color).toBe('success')
      expect(calls[0].title).toBe('imported 3 users')
      // reset is called after setTimeout 500ms
      vi.advanceTimersByTime(600)
      expect(resetSpy).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('正确映射 rows 到 users 对象并提交', async () => {
    let capturedBody: any
    setMockFetchHandler(async (_url, opts: any) => {
      capturedBody = opts.body
      return { data: null, success: true, msg: 'ok' }
    })
    const { useImportUsers } = await import('../../composables/useImportUsers')
    const { sheetRef, doImport } = useImportUsers(ref(false))
    sheetRef.value = {
      getRows: () => [['u1', 'e1', 'n1', 'p1', 'en1', 'pw1', 'c1']],
      reset: () => {},
    }
    await doImport()
    expect(capturedBody.users).toEqual([
      { username: 'u1', email: 'e1', name: 'n1', prefer_name: 'p1', english_name: 'en1', password: 'pw1', class: 'c1' },
    ])
  })
})

describe('composables/useImportUsers - doImport 失败', () => {
  it('success=false 时显示错误信息', async () => {
    setMockFetchHandler(async () => ({
      data: { errors: ['err1', 'err2', 'err3'] },
      success: false,
      msg: 'failed',
    }))
    const { useImportUsers } = await import('../../composables/useImportUsers')
    const { sheetRef, doImport, importOk, importMsg } = useImportUsers(ref(false))
    sheetRef.value = { getRows: () => [['u1']], reset: () => {} }
    await doImport()
    expect(importOk.value).toBe(false)
    expect(importMsg.value).toBe('err1; err2; err3')
  })

  it('success=false 且无 errors 时显示 msg', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'batch failed' }))
    const { useImportUsers } = await import('../../composables/useImportUsers')
    const { sheetRef, doImport, importMsg } = useImportUsers(ref(false))
    sheetRef.value = { getRows: () => [['u1']], reset: () => {} }
    await doImport()
    expect(importMsg.value).toBe('batch failed')
  })

  it('fetch 抛错时显示异常信息', async () => {
    setMockFetchHandler(async () => { throw new Error('network down') })
    const { useImportUsers } = await import('../../composables/useImportUsers')
    const { sheetRef, doImport, importOk, importMsg } = useImportUsers(ref(false))
    sheetRef.value = { getRows: () => [['u1']], reset: () => {} }
    await doImport()
    expect(importOk.value).toBe(false)
    expect(importMsg.value).toBe('network down')
  })
})

describe('composables/useImportUsers - watch isOpen', () => {
  it('关闭弹窗时清空 importMsg', async () => {
    const { useImportUsers } = await import('../../composables/useImportUsers')
    const isOpen = ref(true)
    const { importMsg } = useImportUsers(isOpen)
    importMsg.value = 'some message'
    isOpen.value = false
    await vi.waitFor(() => {
      expect(importMsg.value).toBe('')
    })
  })
})
