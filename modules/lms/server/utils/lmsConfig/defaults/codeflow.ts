/**
 * LMS Python 在线运行器（codeflow / IDE）默认配置
 *
 * codeflow.url 为 Python 代码块「运行」时打开的在线运行器基址，
 * 由管理后台「系统设置 → LMS 配置」写入 configs 表（lms:codeflow.url）后生效。
 * 为空时前端回退到内置默认常量。
 */
export const codeflowDefaults = {
  url: "http://10.28.1.152/ide",
};
