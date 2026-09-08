/**
 * 全局未读计数状态
 *
 * 数据来源：/api/notifications/unread 返回 { notifyUnread, msgUnread }
 * - cRequest.use 按 URL 自动去重，多处调用共享同一份 useFetch 缓存
 * - 弹窗关闭后：调用 refresh() 重新拉取，及时更新已读状态
 */
type UnreadCounts = {
  notifyUnread: number
  msgUnread: number
}

// 模块级 flag：notify WS 处理器只注册一次
let _wsRegistered = false

export function useUnreadCounts() {
  const { data, refresh: refreshData } = cRequest.use<UnreadCounts>('/api/notifications/unread', {
    default: () => ({ notifyUnread: 0, msgUnread: 0 }),
  })

  const counts = computed<UnreadCounts>(() => ({
    notifyUnread: data.value?.notifyUnread ?? 0,
    msgUnread: data.value?.msgUnread ?? 0,
  }))

  /** 刷新未读数 */
  async function refresh() {
    await refreshData()
  }

  // 收到管理员广播通知（WS type='notify'）时刷新未读数；
  // cRequest.use 按 URL 共享缓存，刷新任一实例即全局更新（含各 header 铃铛角标）。
  if (import.meta.client && !_wsRegistered) {
    _wsRegistered = true
    try {
      registerWsHandler('notify', () => {
        refreshData()
      })
    } catch {
      // WS 未启用时静默忽略
    }
  }

  return { counts, refresh }
}
