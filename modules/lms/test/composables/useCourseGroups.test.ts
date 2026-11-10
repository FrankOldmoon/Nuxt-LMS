/**
 * useCourseGroups composable 测试
 * @see modules/lms/composables/useCourseGroups.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetAllStubs,
  setMockI18n,
  setMockFetchHandler,
  setMockAuthUser,
  getToastCalls,
  clearToastCalls,
} from '../../../../test/setup/nuxt-stubs'
import { ref } from 'vue'

beforeEach(async () => {
  resetAllStubs()
  setMockI18n({ locale: ref('en'), t: (k: string) => k, d: (v: any) => String(v) })
  setMockFetchHandler(async () => ({ data: null, success: true, msg: '' }))
  clearToastCalls()
  // 覆盖 useAuth 桩以包含 user（源码 destructure 自动获得）
  const baseUseAuth = (globalThis as any).useAuth
  ;(globalThis as any).useAuth = () => {
    const base = baseUseAuth()
    return { ...base }
  }
  // 桩 useAuthLms（auto-import from lms）
  ;(globalThis as any).useAuthLms = () => ({
    isCourseTeacher: (cid: number) => cid === 5,
    isCourseEditor: (cid: number) => cid === 5,
    isCourseStaff: (cid: number) => cid === 5,
    canEditCourse: (cid: number) => cid === 5,
  })
  // 桩 useClassUsers（auto-import from lms）
  const studentsRef = ref<any[]>([])
  ;(globalThis as any).useClassUsers = () => ({
    students: studentsRef,
    fetchUsers: vi.fn(),
  })
  ;(globalThis as any).__studentsRef = studentsRef
})

/** 构造假 DragEvent */
function makeDragEvent(): any {
  return {
    dataTransfer: { effectAllowed: '' },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: { value: '' },
  }
}

describe('composables/useCourseGroups', () => {
  it('初始状态', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    expect(r.activeTab.value).toBe('members')
    expect(r.loading.value).toBe(false)
    expect(r.saving.value).toBe(false)
    expect(r.ungrouped.value).toEqual([])
    expect(r.groupData.value).toEqual({})
    expect(r.dropTarget.value).toBe(null)
    expect(r.selectedGroupName.value).toBe('')
  })

  it('canEdit：admin 永远 true', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 99, classId: 1 }, isOpen)
    expect(r.canEdit.value).toBe(true)
  })

  it('canEdit：teacher 是课程教师时 true', async () => {
    setMockAuthUser({ id: 2, name: 't' }, [{ code: 'teacher', name: 'Teacher' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 5, classId: 1 }, isOpen)
    expect(r.canEdit.value).toBe(true)
  })

  it('canEdit：学生 false', async () => {
    setMockAuthUser({ id: 3, name: 's' }, [{ code: 'student', name: 'Student' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 99, classId: 1 }, isOpen)
    expect(r.canEdit.value).toBe(false)
  })

  it('tabs 有 3 项：members/chat/files', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    expect(r.tabs.value.length).toBe(3)
    expect(r.tabs.value[0].value).toBe('members')
    expect(r.tabs.value[1].value).toBe('chat')
    expect(r.tabs.value[2].value).toBe('files')
  })

  it('getStudentObj：从 studentMap 取学生', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    const studentsRef = (globalThis as any).__studentsRef
    studentsRef.value = [{ id: 5, name: 'Alice', avatarImg: 'a.png' }]
    const s = r.getStudentObj({ userId: 5, name: 'fallback', avatarImg: '' })
    expect(s.id).toBe(5)
    expect(s.name).toBe('Alice')
  })

  it('getStudentObj：未找到时用 fallback', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    const studentsRef = (globalThis as any).__studentsRef
    studentsRef.value = []
    const s = r.getStudentObj({ userId: 99, name: 'fallback', avatarImg: 'fb.png' })
    expect(s.id).toBe(99)
    expect(s.name).toBe('fallback')
  })

  it('addGroup：添加空分组', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    r.addGroup()
    const keys = Object.keys(r.groupData.value)
    expect(keys.length).toBe(1)
    expect(keys[0]).toMatch(/^group_\d+$/)
    expect(r.groupData.value[keys[0]]).toEqual([])
  })

  it('removeGroup：成员移回 ungrouped', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    r.groupData.value = { g1: [{ userId: 1, name: 'a' }, { userId: 2, name: 'b' }] }
    r.groupNames.value = { g1: 'g1' }
    r.removeGroup('g1')
    expect(r.groupData.value.g1).toBeUndefined()
    expect(r.ungrouped.value.length).toBe(2)
  })

  it('onDrop：从 ungrouped 移到分组', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    r.ungrouped.value = [{ userId: 1, name: 'a', avatarImg: '', score: 0, _isLeader: false }]
    r.groupData.value = { g1: [] }
    const student = r.ungrouped.value[0]
    const startEvent = makeDragEvent()
    r.onDragStart(startEvent, student, null)
    const dropEvent = makeDragEvent()
    r.onDrop(dropEvent, 'g1')
    expect(r.ungrouped.value.length).toBe(0)
    expect(r.groupData.value.g1.length).toBe(1)
    expect(r.groupData.value.g1[0].userId).toBe(1)
  })

  it('onDrop：从分组移到 ungrouped', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    const student = { userId: 1, name: 'a', avatarImg: '', score: 0, _isLeader: false }
    r.groupData.value = { g1: [student] }
    r.ungrouped.value = []
    const startEvent = makeDragEvent()
    r.onDragStart(startEvent, student, 'g1')
    const dropEvent = makeDragEvent()
    r.onDrop(dropEvent, 'ungrouped')
    expect(r.groupData.value.g1.length).toBe(0)
    expect(r.ungrouped.value.length).toBe(1)
  })

  it('onDrop：无 dragData 时 no-op', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    r.ungrouped.value = [{ userId: 1, name: 'a' }]
    const dropEvent = makeDragEvent()
    // 不调用 onDragStart，dragData 为 null
    r.onDrop(dropEvent, 'g1')
    expect(r.ungrouped.value.length).toBe(1)
  })

  it('onRename：修改分组名', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    r.groupData.value = { oldName: [{ userId: 1, name: 'a' }] }
    r.groupNames.value = { oldName: 'oldName' }
    const e: any = { target: { value: 'newName' } }
    r.onRename('oldName', e)
    expect(r.groupData.value.newName).toBeDefined()
    expect(r.groupData.value.oldName).toBeUndefined()
    expect(r.groupNames.value.newName).toBe('newName')
  })

  it('onRename：空字符串时保留原名', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    r.groupData.value = { oldName: [{ userId: 1, name: 'a' }] }
    r.groupNames.value = { oldName: 'oldName' }
    const e: any = { target: { value: '   ' } }
    r.onRename('oldName', e)
    expect(r.groupData.value.oldName).toBeDefined()
  })

  it('saveGroups：成功时 toast success', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    let calledUrl = ''
    setMockFetchHandler(async (url: string) => {
      if (url.includes('/api/courses/groups')) {
        calledUrl = url
        return { data: null, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    r.groupData.value = { g1: [{ userId: 1, name: 'a' }] }
    await r.saveGroups()
    expect(calledUrl).toContain('/api/courses/groups')
    const toasts = getToastCalls()
    expect(toasts.some((t) => t.color === 'success')).toBe(true)
  })

  it('loadData：isOpen=true 触发加载', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    let groupsCalled = false
    setMockFetchHandler(async (url: string) => {
      if (url.includes('/api/courses/groups')) {
        groupsCalled = true
        return { data: [], success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    isOpen.value = true
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(groupsCalled).toBe(true)
    expect(r.activeTab.value).toBe('members')
  })

  it('buildGroups（通过 loadData）：c_ 前缀标识组长', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const studentsRef = (globalThis as any).__studentsRef
    studentsRef.value = [
      { id: 1, name: 'a', avatarImg: '' },
      { id: 2, name: 'b', avatarImg: '' },
    ]
    setMockFetchHandler(async (url: string) => {
      if (url.includes('/api/courses/groups')) {
        return {
          data: [
            { userId: 1, group: 'c_team1', score: 90 },
            { userId: 2, group: 'team1', score: 80 },
          ],
          success: true,
          msg: '',
        }
      }
      return { data: null, success: true, msg: '' }
    })
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    isOpen.value = true
    await new Promise((resolve) => setTimeout(resolve, 0))
    // buildGroups 后应有 team1 分组
    expect(r.groupData.value.team1).toBeDefined()
    expect(r.groupData.value.team1.length).toBe(2)
    // 组长（c_ 前缀）在前面
    expect(r.groupData.value.team1[0]._isLeader).toBe(true)
    expect(r.groupData.value.team1[0].userId).toBe(1)
    expect(r.groupData.value.team1[1]._isLeader).toBe(false)
  })

  it('groupOptions：返回分组列表', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 1, classId: 1 }, isOpen)
    r.groupData.value = { g1: [], g2: [] }
    expect(r.groupOptions.value.length).toBe(2)
    expect(r.groupOptions.value[0]).toEqual({ label: 'g1', value: 'g1' })
  })

  it('activeGroupId：admin 用 selectedGroupName', async () => {
    setMockAuthUser({ id: 1, name: 'admin' }, [{ code: 'admin', name: 'Admin' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 7, classId: 1 }, isOpen)
    r.selectedGroupName.value = 'teamA'
    expect(r.activeGroupId.value).toBe('7_teamA')
  })

  it('activeGroupId：学生用 myGroupName', async () => {
    setMockAuthUser({ id: 2, name: 's' }, [{ code: 'student', name: 'Student' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 99, classId: 1 }, isOpen)
    r.groupData.value = { teamB: [{ userId: 2, name: 's' }] }
    expect(r.myGroupName.value).toBe('teamB')
    expect(r.activeGroupId.value).toBe('99_teamB')
  })

  it('myGroupMembers：返回当前用户所在分组成员', async () => {
    setMockAuthUser({ id: 2, name: 's' }, [{ code: 'student', name: 'Student' }])
    const isOpen = ref(false)
    const { useCourseGroups } = await import('../../composables/useCourseGroups')
    const r = useCourseGroups({ courseId: 99, classId: 1 }, isOpen)
    r.groupData.value = { teamB: [{ userId: 2, name: 's' }, { userId: 3, name: 't' }] }
    expect(r.myGroupMembers.value.length).toBe(2)
  })
})
