import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

/**
 * LMS 学习行为参数默认配置
 */
export const DEFAULT_LMS_CONFIG = {
  // 题目相关
  question: {
    submitExp: 2,              // 每次提交题目获得的经验值
    correctBonusExp: 5,        // 答对额外经验值
    firstCorrectBonusExp: 10,  // 首次答对额外经验值
    maxSubmitCount: 999,       // 最大提交次数（超过不再计分）
  },
  // 作业相关
  homework: {
    submitExp: 5,              // 每次提交作业获得的经验值
    resubmitExp: 1,            // 重新提交经验值
    latePenalty: 0.8,          // 迟交系数（最终分数 * 0.8）
  },
  // 评论相关
  comment: {
    publishExp: 3,             // 发布评论经验值
    replyExp: 2,               // 回复评论经验值
    likeReceivedExp: 1,        // 被点赞经验值
    maxDailyExp: 20,           // 每日评论经验上限
  },
  // 章节学习
  chapter: {
    readExp: 1,                // 每分钟阅读经验值
    readTimeThreshold: 30,     // 阅读时长阈值（分钟），达到后奖励
    readThresholdExp: 10,      // 达到阈值奖励经验值
    passScore: 60,             // 章节及格分
  },
  // 竞赛
  race: {
    participateExp: 10,        // 参与竞赛经验值
    rank1Exp: 100,             // 第1名经验值
    rank2Exp: 80,              // 第2名经验值
    rank3Exp: 60,              // 第3名经验值
    participationExp: 30,      // 完成竞赛基础经验值
  },
  // 测验
  quiz: {
    submitExp: 3,              // 提交测验经验值
    passScore: 60,             // 及格分
    passBonusExp: 10,          // 及格奖励经验值
  },
  // 通用
  general: {
    dailyExpCap: 100,          // 每日经验上限
    levelStep: 100,            // 每级所需经验（线性）
  },
  // 网盘存储
  storage: {
    driveSize: 1073741824,     // 个人网盘空间上限（字节），默认 1GB
    teacherMultiplier: 1,      // teacher 角色空间倍率（driveSize * teacherMultiplier）
  },
}

// 内存缓存
let _lmsConfig: any = null
let _loaded = false

/**
 * 深度合并默认配置和数据库配置
 */
function mergeConfig(defaults: any, overrides: any): any {
  if (!overrides) return defaults
  const result = { ...defaults }
  for (const key of Object.keys(defaults)) {
    if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
      result[key] = mergeConfig(defaults[key], overrides[key] || {})
    } else {
      result[key] = overrides[key] !== undefined ? overrides[key] : defaults[key]
    }
  }
  return result
}

/**
 * 获取 LMS 配置（带缓存）
 */
export async function getLmsConfig(): Promise<any> {
  if (_loaded && _lmsConfig) return _lmsConfig
  return reloadLmsConfig()
}

/**
 * 同步获取已缓存的 LMS 配置（未加载时返回默认值）
 */
export function getLmsConfigSync(): any {
  return _lmsConfig || DEFAULT_LMS_CONFIG
}

/**
 * 重新从数据库加载 LMS 配置并更新缓存
 */
export async function reloadLmsConfig(): Promise<any> {
  try {
    const row = await db.query.configs.findFirst({
      where: eq(schema.configs.id, 'lms_config'),
    })
    _lmsConfig = mergeConfig(DEFAULT_LMS_CONFIG, row?.value || {})
  } catch (e) {
    console.error('[lms_config] 加载失败，使用默认配置', e)
    _lmsConfig = DEFAULT_LMS_CONFIG
  }
  _loaded = true
  return _lmsConfig
}

/**
 * 获取合并后的课程级配置
 * 全局 lms_config + 课程 config 中的 lms_config 覆盖
 */
export async function getCourseLmsConfig(courseId: number): Promise<any> {
  const globalConfig = getLmsConfigSync()
  if (!courseId) return globalConfig
  try {
    const course = await db.query.courses.findFirst({
      where: eq(schema.courses.id, courseId),
    })
    const courseLmsConfig = (course?.config as any)?.lmsConfig
    if (courseLmsConfig) {
      return mergeConfig(globalConfig, courseLmsConfig)
    }
  } catch (e) {
    console.error('[lms_config] 读取课程配置失败', e)
  }
  return globalConfig
}

/**
 * 同步获取合并后的课程级配置（课程配置从已加载的 course 对象读取，无额外 DB 查询）
 */
export function mergeCourseLmsConfig(courseConfig: any): any {
  const globalConfig = getLmsConfigSync()
  const courseLmsConfig = courseConfig?.lmsConfig
  if (courseLmsConfig) {
    return mergeConfig(globalConfig, courseLmsConfig)
  }
  return globalConfig
}
