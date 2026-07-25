/**
 * userCard 实时刷新触发器
 *
 * 任何会改变当前用户积分/经验的操作（答题、交作业、评论等）完成后，
 * 调用 refresh() 自增计数，userCard.vue 监听此 trigger 自动重新拉取积分。
 *
 * 跨组件通信：userCard 在 layout 侧栏，提交组件在页面主区域，
 * 通过 useState 的全局状态实现响应式联动，无需 ref 透传或事件总线。
 */
export function useUserCard() {
  const refreshTrigger = useState<number>('user-card-refresh-trigger', () => 0)

  /** 通知 userCard 重新拉取课程/章节积分 */
  function refresh() {
    refreshTrigger.value++
  }

  return { refreshTrigger, refresh }
}
