/**
 * 全局未读计数状态
 *
 * 数据来源：/api/lms/home 返回的 notifyUnread / msgUnread
 * - home 接口在所有页面（含首页）SSR 阶段都会被调用（useHome / useLmsConfig）
 * - 本 composable 复用 useHome() 的 useFetch 缓存（同 URL 自动去重），不产生额外请求
 * - 弹窗关闭后：调用 refresh() 重新拉取，及时更新已读状态
 */
type UnreadCounts = {
  notifyUnread: number
  msgUnread: number
}

export function useUnreadCounts() {
  // 复用 useHome 的 useFetch（同 URL 自动去重）
  const { data: homeData, refresh: refreshHome } = useHome()

  const counts = computed<UnreadCounts>(() => ({
    notifyUnread: (homeData.value as any)?.notifyUnread ?? 0,
    msgUnread: (homeData.value as any)?.msgUnread ?? 0,
  }))

  /** 刷新 home 数据（未读数随之更新） */
  async function refresh() {
    await refreshHome()
  }

  return { counts, refresh }
}
