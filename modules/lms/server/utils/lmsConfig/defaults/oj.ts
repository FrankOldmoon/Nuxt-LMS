/**
 * LMS OJ（在线评测）平台默认配置
 *
 * oj.url 为 OJ 平台基址，供 fetchOj / getOjStatus 拼接题目与判题记录地址。
 * 不做硬编码，也不从环境变量读取——只由管理后台「学习行为配置」写入 configs 表后生效。
 * 为空时 OJ 题目拉取与判题状态查询不启用。
 */
export const ojDefaults = {
  url: "",
};
