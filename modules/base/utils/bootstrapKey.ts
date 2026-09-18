/**
 * 首屏引导数据的 useFetch key（站点配置 / LMS 公开配置 / 首页数据共用）
 *
 * 应用启动时只发一次请求：
 * - 仅 base 运行：plugins/site-config.ts 拉 /api/config/get
 * - base + lms 运行：plugins/bootstrap.ts 拉 /api/bootstrap（一次带回三份数据）
 *
 * WS 广播刷新（site-config-changed / lms-config-changed / home-changed）
 * 统一用 refreshNuxtData(BOOTSTRAP_KEY) 触发。
 */
export const BOOTSTRAP_KEY = 'bootstrap-singleton-fetch'
