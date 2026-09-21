/**
 * 登录态变化后同步课程导航与章节解锁状态。
 *
 * 背景：章节能否进入（chapter.accessible）由服务端按「请求当时的登录用户」计算，
 * 并随 /api/courses/show 一起下发。而登录 / 注册 / 登出只会刷新 /api/auth/me
 * （并广播 auth:changed），不会重拉课程数据 —— 于是章节列表一直沿用登录前
 * （未登录）算出的加锁状态，必须整页刷新才更新。
 *
 * 这里监听 base 在登录 / 注册 / 登出后派发的 window 事件 auth:changed：
 * 1. 清掉 /api/courses/show 的 asyncData 缓存（含侧边栏 'side:' 前缀），
 *    让「登录前已访问过、当前未挂载」的课程页在下次挂载时重新请求；
 * 2. 自增课程导航版本号，触发已挂载的 useCourseDetailPage / useAside
 *    清缓存并重新拉取，章节卡片与侧边栏的锁状态随之更新。
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const { notifyCourseNavUpdate } = useLayoutState()

  window.addEventListener('auth:changed', () => {
    const nuxtApp = useNuxtApp()
    for (const key of Object.keys(nuxtApp.payload.data)) {
      if (key.includes('/api/courses/show')) {
        delete nuxtApp.payload.data[key]
      }
    }
    notifyCourseNavUpdate()
  })
})
