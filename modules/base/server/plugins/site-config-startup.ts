/**
 * 服务启动时加载 site_config 到内存缓存，并初始化默认值
 */
import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"
import { DEFAULT_SITE_CONFIG, reloadSiteConfig } from "../utils/siteConfig"

export default defineNitroPlugin(async () => {
  // 若 site_config 不存在则插入默认值
  try {
    const row = await db.query.configs.findFirst({
      where: eq(schema.configs.id, 'site_config'),
    })
    if (!row) {
      await db.insert(schema.configs).values({
        id: 'site_config',
        value: DEFAULT_SITE_CONFIG,
      })
      console.log('[site_config] 已初始化默认配置')
    }
  } catch (e) {
    console.error('[site_config] 初始化失败', e)
  }
  await reloadSiteConfig()
})
