/**
 * 服务启动时加载 lms_config 到内存缓存
 */
export default defineNitroPlugin(async () => {
  await reloadLmsConfig()
})
