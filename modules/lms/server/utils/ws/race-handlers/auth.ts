/**
 * WS 竞赛控制鉴权
 *
 * raceStart / raceQuestion / raceQuestionEnd / raceEnd 属于教师控制消息，
 * 直接决定竞赛计分与结算落库，必须验证发送者是该课程的教师（或管理员/全局教师），
 * 防止任何登录用户（甚至未登录 WS 客户端）伪造竞赛会话给任意课程/任意用户记分。
 */
import { isCourseTeacher } from '../../auth'

function sendError(peer: any, message: string) {
  try { peer?.send(JSON.stringify({ type: 'error', message })) } catch { /* peer 已断开 */ }
}

/**
 * 校验 peer 是课程教师/管理员/全局教师；失败时向 peer 发送 error 并返回 null（调用方直接 return）。
 * 与前端教师控件口径一致：hasRole('teacher') || hasRole('admin')，外加课程教师（isTeacher/isEditor/observer）。
 */
export async function requireWsRaceTeacher(peer: any, courseId: number): Promise<any | null> {
  const user = peer?._authUser || null
  if (!user?.id) {
    sendError(peer, 'Unauthorized')
    return null
  }
  const roles: string[] = Array.isArray(user.roles) ? user.roles : []
  if (roles.includes('admin') || roles.includes('teacher')) return user
  try {
    if (await isCourseTeacher(user.id, courseId)) return user
  } catch { /* 查库失败视为无权限 */ }
  sendError(peer, 'Forbidden: 仅课程教师可控制竞赛')
  return null
}
