import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/** Column config storage key prefix (same source as menu's admin:menu, stored in configs table) */
export const COLUMN_CONFIG_PREFIX = 'admin:columns:'

/** Default hidden columns: timestamps + password (not shown in list/show/form) */
export const DEFAULT_HIDDEN_COLUMNS = ['createdAt', 'updatedAt', 'deletedAt', 'password']

export interface ColumnConfig {
  /** List of hidden column jsNames */
  hidden: string[]
}

function columnConfigKey(tableName: string): string {
  return `${COLUMN_CONFIG_PREFIX}${tableName}`
}

/** Read column config: returns default hidden list if no record in configs table */
export async function getColumnConfig(tableName: string): Promise<ColumnConfig> {
  const key = columnConfigKey(tableName)
  const rows = await db
    .select()
    .from(schema.configs)
    .where(eq(schema.configs.id, key))
    .limit(1)

  // jsonb column is unknown, uniformly handled as any (consistent with menu.ts)
  const stored = rows[0]?.value as any as ColumnConfig | null
  if (stored && Array.isArray(stored.hidden)) {
    return { hidden: stored.hidden }
  }
  return { hidden: [...DEFAULT_HIDDEN_COLUMNS] }
}

/** Save column config to configs table (upsert) */
export async function setColumnConfig(tableName: string, hidden: string[]): Promise<void> {
  await upsertConfig(columnConfigKey(tableName), { hidden })
}
