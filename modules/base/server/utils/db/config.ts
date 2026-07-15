import { db, schema } from "@nuxthub/db"

/**
 * Config item upsert (insert or update)
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
