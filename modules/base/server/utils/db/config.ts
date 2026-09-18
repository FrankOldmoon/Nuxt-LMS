import { db, schema } from "@nuxthub/db"
import { bumpConfigVersion } from "../config/version"

/**
 * 配置项 upsert（插入或更新）
 *
 * 写入后 bump 配置版本戳，使所有进程在下次请求时失效并重载缓存（跨进程一致性）。
 */
export async function upsertConfig(id: string, value: any) {
  await db
    .insert(schema.configs)
    .values({ id, value })
    .onConflictDoUpdate({
      target: schema.configs.id,
      set: { value },
    })
  await bumpConfigVersion()
}
