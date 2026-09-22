/**
 * LMS OJ（在线评测）平台默认配置
 *
 * oj.url 为 OJ 平台基址，供 fetchOj / getOjStatus 拼接题目与判题记录地址。
 * 不做硬编码，也不从环境变量读取——只由管理后台「系统设置 → 学习行为配置 → OJ 基础地址」
 * 写入 configs 表（lms:oj.url）后生效。为空时 OJ 题目拉取与判题状态查询不启用。
 *
 * 脚本侧读同一份配置用 scripts/lib/oj-config.cjs 的 getOjBase()。
 */
export const ojDefaults = {
  url: "",
};
