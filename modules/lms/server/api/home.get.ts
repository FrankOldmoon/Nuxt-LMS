import { getHomeData } from '../utils/homeData'

/**
 * 首页聚合端点：分类 + 课程（含章节数/教师） + 站点配置
 *
 * 注：lms 启用时首屏引导走 /api/bootstrap（把首页数据与站点配置 / LMS 公开配置合并），
 * 本端点保留用于向后兼容与单独调用。
 */
export default eventHandler(async (event) => {
  return cResp(await getHomeData(event))
})
