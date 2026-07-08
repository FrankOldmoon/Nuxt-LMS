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
  // 课程功能开关（全局默认值，单课程可通过 config.lmsConfig.course 覆盖）
  course: {
    showDanmaku: true,           // 弹幕功能
    showAnnouncement: true,      // 显示公告
    showComments: true,          // 显示评论
    showProgress: false,         // 显示学习进度
    defaultChapterOpen: true,    // 新章节默认开放
  },
  // 章节按钮开关（aside 侧边栏顶部 + 章节页按钮行）
  chapterBtns: {
    showPlay: true,              // 播放（全屏模式）
    showScore: true,             // 章节得分
    showSelect: true,            // 随机/多选学生
    showTimer: true,             // 计时器
    showInvite: true,            // 邀请跳转
    showDanmaku: true,           // 弹幕
    showVote: true,              // 投票
    showQuickAnswer: true,       // 抢答
  },
  // 课程按钮开关（aside 工具栏）
  courseBtns: {
    showProgress: true,          // 学习进度
    showLeaderboard: true,       // 排行榜
    showGroups: true,            // 小组
    showGrades: true,            // 成绩
    showAnnouncements: true,     // 公告
    showWrongBook: true,         // 错题本
  },
  // 网盘存储
  storage: {
    driveSize: 1073741824,     // 个人网盘空间上限（字节），默认 1GB
    teacherMultiplier: 1,      // teacher 角色空间倍率（driveSize * teacherMultiplier）
  },
  // AI 助手配置（全局默认值，单课程可通过 config.lmsConfig.ai 覆盖）
  ai: {
    mode: 'api',                    // 'local' 浏览器本地 WebLLM / 'api' 服务端 API / 'ollama' 本地 Ollama
    model: '',                      // API 模型名（空=服务端默认，env AI_MODEL 可覆盖）
    thinking: false,                // API 思考模式（local/ollama 忽略）
    apiUrl: '/api/aichat/chat',     // 前端调用的服务端代理端点（api 模式）
    llmApiUrl: '',                  // 后端实际 LLM API 地址（env AI_API_URL 覆盖，如 https://open.bigmodel.cn/api/paas/v4）
    llmApiKey: '',                  // 后端实际 LLM API Key（env AI_API_KEY 覆盖，敏感信息不暴露给前端）
    ollamaUrl: 'http://localhost:11434', // 本地 Ollama 服务地址（ollama 模式，浏览器直连）
    ollamaModel: '',                // Ollama 模型名（如 llama3.2, qwen2.5）
    title: '',                      // 聊天标题（空=组件默认）
    preset: '',                     // 系统预设/角色设定（空=组件默认）
    opening: '',                    // 开场消息（空=组件默认）
    ttsGender: 'female',            // TTS 语音性别：'female' | 'male'
  },
}

// 内存缓存
let _lmsConfig: any = null
let _loaded = false

/**
 * 深度合并默认配置和数据库配置
 */
export function mergeConfig(defaults: any, overrides: any): any {
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

  // 环境变量覆盖 ai 配置（优先级最高，留空则保持数据库/默认值）
  // 敏感信息（API Key）适合通过 .env 注入，不入库
  const env = process.env
  if (env.AI_API_KEY) _lmsConfig.ai.llmApiKey = env.AI_API_KEY
  if (env.AI_API_URL) _lmsConfig.ai.llmApiUrl = env.AI_API_URL
  if (env.AI_MODEL) _lmsConfig.ai.model = env.AI_MODEL

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
