/**
 * Course-level lms_config merge
 *
 * Global lms_config + course config.lmsConfig override -> merged result
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { mergeConfig } from '../tree'
import { getLmsRawConfig } from './state'

/** Async: read course config by courseId + merge */
export async function getCourseLmsConfig(courseId: number): Promise<any> {
  const globalConfig = getLmsRawConfig()
  if (!courseId) return globalConfig
  try {
    const course = await db.query.courses.findFirst({ where: eq(schema.courses.id, courseId) })
    const courseLmsConfig = (course?.config as any)?.lmsConfig
    if (courseLmsConfig) return mergeConfig(globalConfig, courseLmsConfig)
  } catch (e) {
    console.error('[lms_config] Failed to read course config', e)
  }
  return globalConfig
}

/** Sync: directly merge from the loaded courseConfig object (no DB query) */
export function mergeCourseLmsConfig(courseConfig: any): any {
  const globalConfig = getLmsRawConfig()
  const courseLmsConfig = courseConfig?.lmsConfig
  if (courseLmsConfig) return mergeConfig(globalConfig, courseLmsConfig)
  return globalConfig
}
