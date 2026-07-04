/**
 * 全局未读计数状态
 *
 * 数据来源：/api/lms/courses/me 返回的 notifyUnread / msgUnread
 * - 课程页：userCard 调用接口时顺带写入此状态
 * - 非课程页：header 挂载时自行调用接口（无 courseId）获取
 * - 弹窗关闭后：调用 refresh() 重新拉取，及时更新已读状态
 */
type UnreadCounts = {
  notifyUnread: number
  msgUnread: number
}

export function useUnreadCounts() {
  const counts = useState<UnreadCounts>('unread-counts', () => ({
    notifyUnread: 0,
    msgUnread: 0,
  }))

  /** 从 /api/lms/courses/me 拉取未读数（无需 courseId） */
  async function refresh() {
    try {
      const data = await cRequest<UnreadCounts>('/api/lms/courses/me')
      counts.value = {
        notifyUnread: data.notifyUnread ?? 0,
        msgUnread: data.msgUnread ?? 0,
      }
    } catch {
      // 静默忽略，保持旧值
    }
  }

  return { counts, refresh }
}
