/**
 * 弹幕发送鉴权（课程级总开关 + 学生发送权限）单元测试
 * @see modules/lms/server/utils/ws/class-handlers/join.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../server/utils/ws/state', () => ({
  joinClassRoom: vi.fn(),
  broadcastToClass: vi.fn(),
}))
vi.mock('../../server/utils/ws/staff', () => ({
  isStaffUser: vi.fn(),
}))

import { handleClassDanmaku } from '../../server/utils/ws/class-handlers/join'
import { broadcastToClass } from '../../server/utils/ws/state'
import { isStaffUser } from '../../server/utils/ws/staff'

const tick = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  vi.clearAllMocks()
  // 默认：总开关开、学生可发送
  ;(globalThis as any).getCourseLmsConfig = vi.fn().mockResolvedValue({ danmaku: { enableDanmaku: true, studentCanSend: true } })
  ;(globalThis as any).getLmsConfigSync = vi.fn().mockReturnValue(null)
  vi.mocked(isStaffUser).mockResolvedValue(true)
})

describe('handleClassDanmaku 鉴权', () => {
  it('总开关关闭时不广播', async () => {
    ;(globalThis as any).getCourseLmsConfig = vi.fn().mockResolvedValue({ danmaku: { enableDanmaku: false } })
    handleClassDanmaku({}, { classId: 1, courseId: 2, text: 'hi', from: 'a', userId: 1 })
    await tick()
    expect(broadcastToClass).not.toHaveBeenCalled()
  })

  it('允许学生发送时广播', async () => {
    handleClassDanmaku({}, { classId: 1, courseId: 2, text: 'hi', from: 'a', userId: 1 })
    await tick()
    expect(broadcastToClass).toHaveBeenCalled()
  })

  it('禁止学生发送 + 普通用户时静默不广播', async () => {
    ;(globalThis as any).getCourseLmsConfig = vi.fn().mockResolvedValue({ danmaku: { enableDanmaku: true, studentCanSend: false } })
    vi.mocked(isStaffUser).mockResolvedValue(false)
    handleClassDanmaku({}, { classId: 1, courseId: 2, text: 'hi', from: 'a', userId: 5 })
    await tick()
    expect(broadcastToClass).not.toHaveBeenCalled()
  })

  it('禁止学生发送 + 教师时可广播', async () => {
    ;(globalThis as any).getCourseLmsConfig = vi.fn().mockResolvedValue({ danmaku: { enableDanmaku: true, studentCanSend: false } })
    vi.mocked(isStaffUser).mockResolvedValue(true)
    handleClassDanmaku({ _userId: 1 }, { classId: 1, courseId: 2, text: 'hi', from: 't' })
    await tick()
    expect(broadcastToClass).toHaveBeenCalled()
  })
})