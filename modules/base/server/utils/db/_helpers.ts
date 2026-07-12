import { schema } from "@nuxthub/db"

/**
 * 校验表名是否在 schema 中定义，无效则抛出错误
 */
export function validateTable(tableName: string | undefined): string {
  if (!tableName || !(tableName in schema)) {
    throw createError({ statusCode: 400, message: `无效的表名: ${tableName}` })
  }
  return tableName
}

/** 获取 schema 中指定表的定义（私有 helper，供 db/ 子文件内部使用） */
export function getTable(tableName: string) {
  return (schema as any)[tableName]
}
