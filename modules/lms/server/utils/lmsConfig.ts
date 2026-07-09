import { db, schema } from "@nuxthub/db"
import { eq, like } from "drizzle-orm"

/**
 * LMS 学习行为参数默认配置
 *
 * 存储模式：拍平到 configs 表（id = "lms:section.key"，value = 标量）
 * 运行时内存中维护树形缓存，与历史 DEFAULT 树形接口保持兼容。
 *
 * 内部数据流：
 *   reloadLmsConfig()    → 读 configs 表所有 lms:* 行 → 拍平 key/value 表
 *                          → unflatten 成树 → 存到 _lmsConfig（cache）
 *                          → 应用 env 覆盖（AI_API_KEY 等）
 *
 *   getLmsConfigSync()   → 返回 _lmsConfig 引用（未加载则返回 deep-clone 的默认）
 *   getCourseLmsConfig() → 全局树 + 课程级 course.config.lmsConfig 深合并
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
  // 用户相关设置（控制用户端可用功能；admin/teacher 不受此限制）
  user: {
    allowSelfAvatarUpload: true,  // 是否允许普通用户自行上传头像
    allowChangePassword: true,    // 是否允许普通用户修改密码
    allowChangeEmail: true,       // 是否允许普通用户修改邮箱
    allowChangeLocale: true,      // 是否允许普通用户切换界面语言
    allowExportData: true,        // 是否允许普通用户导出个人学习数据
  },
  // 首页显隐开关（lms 首页 Hero/统计/最近学习/排行榜）
  home: {
    showHero: true,
    showStats: true,
    showRecentCourses: true,
    showLeaderboard: true,
  },
  // 课程列表显隐与默认视图
  courseList: {
    showSearch: true,            // 顶部搜索框
    showFilter: true,            // 标签/级别筛选
    showSort: true,              // 排序控件
    defaultView: 'grid',         // 'grid' | 'list'
  },
  // 章节播放页显隐开关
  chapterPage: {
    showOutline: true,           // 左侧大纲
    showNote: true,              // 笔记面板
    showDanmakuPanel: true,      // 弹幕面板
    enableFullscreen: true,      // 全屏播放
  },
  // AI 助手配置（全局默认值，单课程可通过 config.lmsConfig.ai 覆盖）
  ai: {
    enabled: true,                   // AI 助手总开关（关闭后章节页不渲染 chatbox/llm）
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

/** LMS 拍平键前缀（与 site: 对应） */
export const LMS_KEY_PREFIX = 'lms:'

/** 历史遗留：旧版单行 json 存储的 id（迁移完成后将删除） */
const LEGACY_LMS_CONFIG_ID = 'lms_config'

// ============== 树 ↔ 拍平 互转 ==============

/**
 * 将树形对象拍平为 "section.key.sub" 形式的键
 *   flattenTree({ a: { b: 1, c: 2 } }) => { 'a.b': 1, 'a.c': 2 }
 * 非对象（Date / Array）视为叶子值。
 */
export function flattenTree(prefix: string, obj: any, result: Record<string, any>) {
  if (obj === null || obj === undefined) return
  if (typeof obj !== 'object' || Array.isArray(obj) || obj instanceof Date) {
    if (prefix) result[prefix] = obj
    return
  }
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      flattenTree(fullKey, val, result)
    } else if (val !== undefined) {
      result[fullKey] = val
    }
  }
}

/**
 * 将 "section.key" 形式的拍平键还原为嵌套树
 *   unflattenTree({ 'a.b': 1, 'a.c': 2 }) => { a: { b: 1, c: 2 } }
 */
export function unflattenTree(flat: Record<string, any>): any {
  const result: any = {}
  for (const [key, val] of Object.entries(flat)) {
    if (val === undefined) continue
    const parts = key.split('.')
    let cur = result
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]
      if (!(p in cur) || cur[p] === null || typeof cur[p] !== 'object' || Array.isArray(cur[p])) {
        cur[p] = {}
      }
      cur = cur[p]
    }
    cur[parts[parts.length - 1]] = val
  }
  return result
}

/** 深克隆（简单 JSON 兼容对象） */
function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

/**
 * 深度合并默认配置和数据库配置
 * - target 中存在的 key 优先于 defaults
 * - 不递归 Date / Array（视为叶子）
 */
export function mergeConfig(defaults: any, overrides: any): any {
  if (!overrides) return defaults
  if (defaults === null || typeof defaults !== 'object' || Array.isArray(defaults) || defaults instanceof Date) {
    return overrides === undefined ? defaults : overrides
  }
  const result: any = { ...defaults }
  for (const [key, val] of Object.entries(overrides)) {
    const defVal = (defaults as any)[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)
        && defVal !== null && typeof defVal === 'object' && !Array.isArray(defVal) && !(defVal instanceof Date)) {
      result[key] = mergeConfig(defVal, val)
    } else {
      result[key] = val === undefined ? defVal : val
    }
  }
  return result
}

// ============== 内部缓存 ==============

/** 拍平默认值（key='a.b.c' 不带 lms: 前缀） */
const _FLAT_DEFAULTS: Record<string, any> = (() => {
  const r: Record<string, any> = {}
  flattenTree('', DEFAULT_LMS_CONFIG, r)
  return r
})()

/** 树形内存缓存 */
let _lmsConfig: any = null
let _loaded = false

// ============== 公开 API ==============

/**
 * 重新从数据库加载 LMS 配置并更新缓存
 * 1. 读 configs 表所有 lms:* 行（拍平存储）
 * 2. 首次加载时若发现旧版单行 json (id='lms_config')，自动迁移为 lms:* 拍平行
 * 3. 合并 _FLAT_DEFAULTS + DB 值 → unflatten 为树 → 写入 _lmsConfig
 * 4. 应用 env 变量覆盖（AI_API_KEY / AI_API_URL / AI_MODEL）
 */
export async function reloadLmsConfig(): Promise<any> {
  // 1. 自动迁移：旧版单行 json → 拍平行（仅一次）
  await migrateLegacyLmsConfigIfNeeded()

  // 2. 读所有 lms:* 行
  let flat: Record<string, any> = { ..._FLAT_DEFAULTS }
  try {
    const rows = await db
      .select({ id: schema.configs.id, value: schema.configs.value })
      .from(schema.configs)
      .where(like(schema.configs.id, `${LMS_KEY_PREFIX}%`))
    for (const row of rows) {
      // 去掉 lms: 前缀，还原为 'section.key' 形式
      const key = row.id.startsWith(LMS_KEY_PREFIX) ? row.id.slice(LMS_KEY_PREFIX.length) : row.id
      if (row.value !== undefined && row.value !== null) {
        flat[key] = row.value
      }
    }
  } catch (e) {
    console.error('[lms_config] 加载失败，使用默认配置', e)
    flat = { ..._FLAT_DEFAULTS }
  }

  // 3. 拍平 → 树
  _lmsConfig = unflattenTree(flat)

  // 4. 环境变量覆盖 ai 配置（优先级最高）
  const env = process.env
  if (!_lmsConfig.ai) _lmsConfig.ai = {}
  if (env.AI_API_KEY) _lmsConfig.ai.llmApiKey = env.AI_API_KEY
  if (env.AI_API_URL) _lmsConfig.ai.llmApiUrl = env.AI_API_URL
  if (env.AI_MODEL) _lmsConfig.ai.model = env.AI_MODEL

  _loaded = true
  return _lmsConfig
}

/** 异步获取 LMS 配置（未加载则先加载） */
export async function getLmsConfig(): Promise<any> {
  if (_loaded && _lmsConfig) return _lmsConfig
  return reloadLmsConfig()
}

/** 同步获取已缓存的 LMS 配置（未加载时返回默认值） */
export function getLmsConfigSync(): any {
  if (_lmsConfig) return _lmsConfig
  return deepClone(DEFAULT_LMS_CONFIG)
}

/** 强制重置缓存（测试用） */
export function _resetLmsConfigCache() {
  _lmsConfig = null
  _loaded = false
}

/**
 * 将树形对象拍平为 { 'lms:section.key': value } 形式，供 upsert
 */
export function buildLmsConfigPairs(obj: any): Array<{ key: string; value: any }> {
  const flat: Record<string, any> = {}
  flattenTree('', obj, flat)
  return Object.entries(flat).map(([k, v]) => ({ key: `${LMS_KEY_PREFIX}${k}`, value: v }))
}

/**
 * 异步获取合并后的课程级配置
 * 全局 lms_config + 课程 config 中的 lmsConfig 覆盖
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

// ============== 旧版数据迁移 ==============

/**
 * 旧版单行 json 迁移到拍平行（仅一次）
 * - 检测：configs 表中 id='lms_config' 行存在
 * - 动作：拍平其 value 为 lms:* 行后删除原行
 * - 静默：若 lms:* 行已存在也跳过（避免覆盖新格式）
 */
async function migrateLegacyLmsConfigIfNeeded() {
  try {
    // 拍平行已有任意一条说明新格式生效，不再迁移
    const sample = await db
      .select({ id: schema.configs.id })
      .from(schema.configs)
      .where(like(schema.configs.id, `${LMS_KEY_PREFIX}%`))
      .limit(1)
    if (sample.length > 0) return

    const legacy = await db.query.configs.findFirst({
      where: eq(schema.configs.id, LEGACY_LMS_CONFIG_ID),
    })
    if (!legacy?.value || typeof legacy.value !== 'object') return

    const pairs = buildLmsConfigPairs(legacy.value)
    if (!pairs.length) {
      // 空对象，直接删
      await db.delete(schema.configs).where(eq(schema.configs.id, LEGACY_LMS_CONFIG_ID))
      console.log('[lms_config] 已迁移：旧 lms_config 为空，已删除')
      return
    }

    // 逐行 upsert（防御幂等）
    for (const { key, value } of pairs) {
      await db
        .insert(schema.configs)
        .values({ id: key, value })
        .onConflictDoUpdate({
          target: schema.configs.id,
          set: { value },
        })
    }
    // 删除旧行
    await db.delete(schema.configs).where(eq(schema.configs.id, LEGACY_LMS_CONFIG_ID))
    console.log(`[lms_config] 已迁移：${pairs.length} 个 lms:* 拍平键（来自旧 lms_config）`)
  } catch (e) {
    // 迁移失败不阻塞启动，记录错误
    console.error('[lms_config] 旧版数据迁移失败', e)
  }
}

/**
 * 检测：当前是否存在 lms:* 拍平行（用于插件 / 迁移检查）
 */
export async function hasLmsFlatRows(): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: schema.configs.id })
      .from(schema.configs)
      .where(like(schema.configs.id, `${LMS_KEY_PREFIX}%`))
      .limit(1)
    return rows.length > 0
  } catch {
    return false
  }
}

/**
 * 检测：当前是否仍存在旧版 lms_config 单行（迁移未完成）
 */
export async function hasLegacyLmsConfig(): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: schema.configs.id })
      .from(schema.configs)
      .where(eq(schema.configs.id, LEGACY_LMS_CONFIG_ID))
      .limit(1)
    return rows.length > 0
  } catch {
    return false
  }
}
