/**
 * Automatically build the search index on server startup
 * Delayed execution ensures the database connection is ready
 */
export default defineNitroPlugin(() => {
  setTimeout(async () => {
    try {
      const task = await import('../tasks/build-search')
      await task.default.run({ payload: {}, context: {} } as any)
      console.log('[startup] Search index initialization complete')
    } catch (e) {
      console.error('[startup] Search index initialization failed:', e)
    }
  }, 5000)
})
