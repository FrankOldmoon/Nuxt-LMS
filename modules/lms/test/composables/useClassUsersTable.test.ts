/**
 * useClassUsersTable composable 测试
 * @see modules/lms/composables/useClassUsersTable.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockLmsContext,
  setMockFetchHandler,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  setMockLmsContext(1, 0)
  setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
  // useClassUsersTable 依赖 useClassUsers, useWebSocket, useLmsContext
  const { useClassUsers } = await import('../../composables/useClassUsers')
  ;(globalThis as any).useClassUsers = () => ({
    classUsers: ref([]),
    classUsersLoading: ref(false),
    students: ref([]),
    teachers: ref([]),
    fetchUsers: vi.fn(),
    clearUsers: vi.fn(),
  })
  // useWebSocket stub with onOnlineUpdate / onRaceOnlineUpdate
  const wsHandlers: Record<string, Array<(data: any) => void>> = {}
  ;(globalThis as any).useWebSocket = () => ({
    onOnlineUpdate: (cb: (data: any) => void) => {
      ;(wsHandlers.online ||= []).push(cb)
      return () => {}
    },
    onRaceOnlineUpdate: (cb: (data: any) => void) => {
      ;(wsHandlers.raceOnline ||= []).push(cb)
      return () => {}
    },
  })
  ;(globalThis as any).__wsHandlers = wsHandlers
})

function makeProps(overrides: any = {}) {
  return {
    classId: 10,
    courseId: 1,
    hideActions: false,
    hideTeachers: false,
    hideNumber: false,
    loading: false,
    showChart: false,
    showOnline: false,
    showGroup: false,
    ...overrides,
  }
}

describe('composables/useClassUsersTable', () => {
  it('初始状态', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    expect(r.users.value).toEqual([])
    expect(r.pending.value).toBe(false)
    expect(r.sorting.value).toEqual([{ id: 'preferName', desc: false }])
    expect(r.activeTab.value).toBe('students')
  })

  it('teachers 和 students 分离', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    r.users.value = [
      { id: 1, name: 'stu1', isTeacher: false },
      { id: 2, name: 'teach1', isTeacher: true },
      { id: 3, name: 'stu2', isTeacher: false },
    ]
    expect(r.teachers.value.length).toBe(1)
    expect(r.students.value.length).toBe(2)
  })

  it('tabItems 有 students 和 groups', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    expect(r.tabItems.value.length).toBe(2)
    expect(r.tabItems.value[0].value).toBe('students')
    expect(r.tabItems.value[1].value).toBe('groups')
  })

  it('groupTableRows 初始为空', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    expect(r.groupTableRows.value).toEqual([])
  })

  it('onOnlineUpdate 更新 onlineMap', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    const handlers = (globalThis as any).__wsHandlers
    handlers.online[0]({ userId: 5, online: true })
    expect(r.onlineMap[5]).toBe(true)
    handlers.online[0]({ userId: 5, online: false })
    expect(r.onlineMap[5]).toBe(false)
  })

  it('onRaceOnlineUpdate 也更新 onlineMap', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    const handlers = (globalThis as any).__wsHandlers
    handlers.raceOnline[0]({ userId: 7, online: true })
    expect(r.onlineMap[7]).toBe(true)
  })

  it('columns 包含 name/preferName/rollNumber', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    const cols = r.columns.value
    const ids = cols.map((c: any) => c.id || c.accessorKey)
    expect(ids).toContain('name')
    expect(ids).toContain('preferName')
    expect(ids).toContain('rollNumber')
  })

  it('hideNumber=true 时不包含 number 列', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps({ hideNumber: true }), { UButton: () => {} })
    const cols = r.columns.value
    const ids = cols.map((c: any) => c.id || c.accessorKey)
    expect(ids).not.toContain('number')
  })

  it('hideActions=true 时不包含 actions 列', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps({ hideActions: true }), { UButton: () => {} })
    const cols = r.columns.value
    const ids = cols.map((c: any) => c.id || c.accessorKey)
    expect(ids).not.toContain('actions')
    expect(ids).not.toContain('resetPassword')
  })

  it('showOnline=true 时包含 online 列', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps({ showOnline: true }), { UButton: () => {} })
    const cols = r.columns.value
    const ids = cols.map((c: any) => c.id || c.accessorKey)
    expect(ids).toContain('online')
  })

  it('extraColumns 带 canSort 时自动补 accessorKey', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps({
      extraColumns: [{ id: 'score', header: 'Score', canSort: true }],
    }), { UButton: () => {} })
    const cols = r.columns.value
    const scoreCol = cols.find((c: any) => c.id === 'score')
    expect(scoreCol).toBeDefined()
    expect(scoreCol.accessorKey).toBe('score')
  })

  it('numberMap 从 students 初始化', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    r.users.value = [
      { id: 1, name: 'a', isTeacher: false, number: '01' },
      { id: 2, name: 'b', isTeacher: false, number: '02' },
    ]
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(r.numberMap[1]).toBe('01')
    expect(r.numberMap[2]).toBe('02')
  })

  it('openEdit 设置 editingUserId', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    r.editModal.value = { show: vi.fn() }
    r.openEdit(5)
    expect(r.editingUserId.value).toBe(5)
    expect(r.editModal.value.show).toHaveBeenCalled()
  })

  it('openReset 打开弹窗并清空密码', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    r.openReset(7)
    expect(r.resetOpen.value).toBe(true)
    expect(r.resetPassword.value).toBe('')
  })

  it('autoFillNumbers 按排序顺序编号', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    // 默认按 preferName 升序排序：a(id=2) 在前 → number '1'，b(id=1) → number '2'
    r.users.value = [
      { id: 1, name: 'b', preferName: 'b', isTeacher: false },
      { id: 2, name: 'a', preferName: 'a', isTeacher: false },
    ]
    await new Promise((resolve) => setTimeout(resolve, 0))
    await r.autoFillNumbers()
    expect(r.numberMap[2]).toBe('1')
    expect(r.numberMap[1]).toBe('2')
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'success')).toBe(true)
  })

  it('doResetPassword 空密码不调用', async () => {
    let called = false
    setMockFetchHandler(async (url) => {
      if (url.includes('/api/users/reset-password')) called = true
      return { data: null, success: true, msg: '' }
    })
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    r.openReset(5)
    r.resetPassword.value = ''
    await r.doResetPassword()
    expect(called).toBe(false)
  })

  it('doResetPassword 成功时 toast + 关闭弹窗', async () => {
    setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    r.openReset(5)
    r.resetPassword.value = 'newpass'
    await r.doResetPassword()
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'success')).toBe(true)
    expect(r.resetOpen.value).toBe(false)
  })

  it('chartData 取前 10 名学生按分数排序', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    r.users.value = [
      { id: 1, name: 'a', isTeacher: false, score: 50 },
      { id: 2, name: 'b', isTeacher: false, score: 90 },
      { id: 3, name: 'c', isTeacher: false, score: 70 },
    ]
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(r.chartData.value.length).toBe(3)
    expect(r.chartData.value[0].score).toBe(90) // 降序
  })

  it('refresh 调用 fetchClassUsers', async () => {
    const fetchSpy = vi.fn()
    ;(globalThis as any).useClassUsers = () => ({
      classUsers: ref([]),
      classUsersLoading: ref(false),
      students: ref([]),
      teachers: ref([]),
      fetchUsers: fetchSpy,
      clearUsers: vi.fn(),
    })
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    r.refresh()
    expect(fetchSpy).toHaveBeenCalledWith(10, 1)
  })

  it('groupColumns 有 4 列', async () => {
    const { useClassUsersTable } = await import('../../composables/useClassUsersTable')
    const r = useClassUsersTable(makeProps(), { UButton: () => {} })
    expect(r.groupColumns.value.length).toBe(4)
  })
})
