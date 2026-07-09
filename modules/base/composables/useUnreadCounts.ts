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

  return { counts, refresh }
}
