import { db, schema } from "@nuxthub/db"

/**
 * 配置项 upsert（插入或更新）
 */
export async function upsertConfig(id: string, value: any) {
  await db
    .insert(schema.configs)
    .values({ id, value })
    .onConflictDoUpdate({
      target: schema.configs.id,
      set: { value },
    })
}
