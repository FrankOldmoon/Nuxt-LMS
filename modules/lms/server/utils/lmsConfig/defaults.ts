/**
 * LMS 学习行为参数默认配置
 *
 * 存储模式：拍平到 configs 表（id = "lms:section.key"，value = 标量）
 * 运行时内存中维护树形缓存，与历史 DEFAULT 树形接口保持兼容。
 *
 * 拆分后子模块：
 * - ./learning：题目/作业/评论/章节/测验
 * - ./race：竞赛
 * - ./ui：首页/课程/章节 UI 显隐
 * - ./user：通用/用户/网盘
 * - ./ai：AI 助手
 * - ./oj：OJ 在线评测
 * - ./codeflow：Python 在线运行器（codeflow/IDE）
 */
import { learningDefaults } from './defaults/learning'
import { raceDefaults } from './defaults/race'
import { uiDefaults } from './defaults/ui'
import { userDefaults } from './defaults/user'
import { aiDefaults } from './defaults/ai'
import { ojDefaults } from './defaults/oj'
import { codeflowDefaults } from './defaults/codeflow'
import { analyticsDefaults } from './defaults/analytics'

export const DEFAULT_LMS_CONFIG = {
  ...learningDefaults,
  race: raceDefaults,
  ...uiDefaults,
  ...userDefaults,
  ai: aiDefaults,
  oj: ojDefaults,
  codeflow: codeflowDefaults,
  ...analyticsDefaults,
}
