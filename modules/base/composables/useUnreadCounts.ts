/**
 * 全局未读计数状态
 *
 * 数据来源：/api/home 返回的 notifyUnread / msgUnread
 * - home 接口由 doc/lms 模块提供，doc/lms 未启用时返回空数据，未读数回退为 0
 * - cRequest.use 按 URL 自动去重，与 doc 模块的 useHome() 共享同一份 useFetch 缓存
 * - 弹窗关闭后：调用 refresh() 重新拉取，及时更新已读状态
 */
type UnreadCounts = {
  notifyUnread: number
  msgUnread: number
}

export function useUnreadCounts() {
  // 直接 fetch /api/home，不依赖 doc 模块的 useHome()
  // cRequest.use 按 URL 自动去重，与 doc 模块的 useHome() 共享同一份 useFetch 缓存
  // default 与 useHome() 保持一致，避免 useAsyncData "different default" 警告
  const { data: homeData, refresh: refreshHome } = cRequest.use<any>('/api/home', {
    default: () => ({ categories: [], courses: [] }),
  })

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
