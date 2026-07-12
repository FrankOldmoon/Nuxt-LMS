/**
 * 课程级 lms_config 合并
 *
 * 全局 lms_config + 课程 config.lmsConfig 覆盖 → 合并结果
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { mergeConfig } from '../tree'
import { getLmsRawConfig } from './state'

/** 异步：按 courseId 读取课程配置 + 合并 */
export async function getCourseLmsConfig(courseId: number): Promise<any> {
  const globalConfig = getLmsRawConfig()
  if (!courseId) return globalConfig
  try {
    const course = await db.query.courses.findFirst({ where: eq(schema.courses.id, courseId) })
    const courseLmsConfig = (course?.config as any)?.lmsConfig
    if (courseLmsConfig) return mergeConfig(globalConfig, courseLmsConfig)
  } catch (e) {
    console.error('[lms_config] 读取课程配置失败', e)
  }
  return globalConfig
}

/** 同步：从已加载的 courseConfig 对象直接合并（无 DB 查询） */
export function mergeCourseLmsConfig(courseConfig: any): any {
  const globalConfig = getLmsRawConfig()
  const courseLmsConfig = courseConfig?.lmsConfig
  if (courseLmsConfig) return mergeConfig(globalConfig, courseLmsConfig)
  return globalConfig
}
