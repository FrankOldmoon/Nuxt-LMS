/**
 * 鉴权工具 - 重新导出层
 *
 * 拆分后的子模块：
 * - ./auth/password：密码哈希 / 验证 / token 生成
 * - ./auth/guards：用户上下文解析与角色守卫
 *
 * Nuxt auto-import 仍可识别 utils/auth/* 下的所有 export，
 * 现有调用（requireAuth / getCurrentUser / generateToken 等）无需改动。
 */
export * from './auth/password'
export * from './auth/guards'
