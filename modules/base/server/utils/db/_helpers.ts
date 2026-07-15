import { schema } from "@nuxthub/db"

/**
 * Validate that the table name is defined in schema, throw error if invalid
 */
export function validateTable(tableName: string | undefined): string {
  if (!tableName || !(tableName in schema)) {
    throw createError({ statusCode: 400, message: `Invalid table name: ${tableName}` })
  }
  return tableName
}

/** Get the definition of the specified table in schema (private helper, for internal use by db/ sub-files) */
export function getTable(tableName: string) {
  return (schema as any)[tableName]
}
