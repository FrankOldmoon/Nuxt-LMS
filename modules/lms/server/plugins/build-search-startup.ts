/**
 * 服务启动时自动构建搜索索引
 * 延迟执行确保数据库连接已就绪
 */
export default defineNitroPlugin(() => {
  setTimeout(async () => {
    try {
      const task = await import('../tasks/build-search')
      await task.default.run({ payload: {}, context: {} } as any)
      console.log('[startup] 搜索索引初始化完成')
    } catch (e) {
      console.error('[startup] 搜索索引初始化失败:', e)
    }
  }, 5000)
})
