import { getHomeData } from '../utils/homeData'
import { getLmsPublicConfig } from '../utils/lmsPublicConfig'

/**
 * 首屏引导数据（一次请求带回三份）
 *
 * 之前 SSR 首屏要顺序等待 3 个异步插件各自的请求：
 *   /api/config/get → /api/config/lms-public → /api/home
 * 现在合并为一次 /api/bootstrap（服务端内部并发取数），首屏只等 1 个请求。
 *
 * - siteConfig：站点配置安全子集（base 提供 getSiteConfigPublic）
 * - lmsPublicConfig：LMS 公开配置（同步，读内存缓存）
 * - home：分类 + 课程（含章节数/教师） + 站点配置
 *
 * 鉴权：无（与三个原端点一致，均为公开数据；首页课程可见性由 getHomeData 内部按登录态处理）
 */
export default eventHandler(async (event) => {
  const [siteConfig, home] = await Promise.all([
    getSiteConfigPublic(),
    getHomeData(event),
  ])

  return cResp({
    siteConfig,
    lmsPublicConfig: getLmsPublicConfig(),
    home,
  })
})
