/**
 * LMS 站点统计（谷歌分析 / 百度统计）
 *
 * 留空 = 不注入对应统计脚本。
 * token 本身是公开的（统计脚本必须运行在浏览器端），因此整段放入公开配置。
 */
export const analyticsDefaults = {
  analytics: {
    googleTrackingId: '',
    baiduTrackingId: '',
  },
}
