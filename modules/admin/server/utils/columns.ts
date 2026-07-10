import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/** 列配置存储 key 前缀（与 menu 的 admin:menu 同源，存 configs 表） */
export const COLUMN_CONFIG_PREFIX = 'admin:columns:'

/** 默认隐藏列：时间戳 + 密码（list/show/form 均不展示） */
export const DEFAULT_HIDDEN_COLUMNS = ['createdAt', 'updatedAt', 'deletedAt', 'password']

export interface ColumnConfig {
  /** 隐藏列的 jsName 列表 */
  hidden: string[]
}

function columnConfigKey(tableName: string): string {
  return `${COLUMN_CONFIG_PREFIX}${tableName}`
}

/** 读取列配置：configs 表无记录则返回默认隐藏列表 */
export async function getColumnConfig(tableName: string): Promise<ColumnConfig> {
  const key = columnConfigKey(tableName)
  const rows = await db
    .select()
    .from(schema.configs)
    .where(eq(schema.configs.id, key))
    .limit(1)

  // jsonb 列为 unknown，统一以 any 处理（与 menu.ts 一致）
  const stored = rows[0]?.value as any as ColumnConfig | null
  if (stored && Array.isArray(stored.hidden)) {
    return { hidden: stored.hidden }
  }
  return { hidden: [...DEFAULT_HIDDEN_COLUMNS] }
}

/** 保存列配置到 configs 表（upsert） */
export async function setColumnConfig(tableName: string, hidden: string[]): Promise<void> {
  await upsertConfig(columnConfigKey(tableName), { hidden })
}
