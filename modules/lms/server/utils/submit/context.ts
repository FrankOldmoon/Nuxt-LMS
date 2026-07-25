/**
 * 提交 API 通用上下文解析
 *
 * 提取所有 submit/award API 共有：
 *  - requireAuth
 *  - readBody
 *  - course_id 必填校验 + Number() 转换
 *  - 指定 cid 字段必填校验 + Number() 转换
 *  - getCourseLmsConfig + 取 xxxConfig 子段
 *
 * 调用方只需指定 cid 字段名（question_cid / homework_cid / quiz_cid / race_cid），
 * 返回的 ctx.cid 即为标准化后的数字 cid，可直接用于 findFirst / insert / update。
 *
 * 注：getCourseLmsConfig 通过 Nuxt auto-import 引入（不显式 import），
 *     这样在测试环境中可以被 globalThis 注入的 mock 覆盖。
 */

export interface SubmitContext {
  user: { id: number; roles: string[]; [k: string]: any }
  courseId: number
  cid: number
  config: any
  /** 课程 LMS 配置的子段（config.question / config.homework / config.quiz / config.race） */
  section: any
  body: any
}

export interface SubmitContextOptions {
  /** body 中 cid 字段名，如 'question_cid' / 'homework_cid' / 'quiz_cid' / 'race_cid' */
  cidField: string
  /** LMS config 子段名，如 'question' / 'homework' / 'quiz' / 'race' */
  sectionKey: string
  /** 缺 cid 时返回的提示文案 */
  cidMissingMessage?: string
}

/**
 * 从 event 解析出提交上下文。
 * 缺 course_id 或 cid 时直接抛错，由 withSubmitHandler 统一捕获并返回 cResp。
 */
export async function parseSubmitContext(
  event: any,
  options: SubmitContextOptions,
): Promise<SubmitContext> {
  const cidMissingMessage = options.cidMissingMessage || `缺少 ${options.cidField} 参数`

  const user = await requireAuth(event)
  const body = await readBody(event)
  const { course_id } = body
  if (!course_id) {
    throw new SubmitContextError('缺少 course_id 参数')
  }
  const cidRaw = body[options.cidField]
  if (cidRaw === undefined || cidRaw === null || cidRaw === '') {
    throw new SubmitContextError(cidMissingMessage)
  }

  const courseId = Number(course_id)
  const cid = Number(cidRaw)
  if (!courseId) throw new SubmitContextError('course_id 无效')
  if (!cid) throw new SubmitContextError(`${options.cidField} 无效`)

  // getCourseLmsConfig 由 Nuxt auto-import 引入，测试可通过 globalThis mock
  const config = await getCourseLmsConfig(courseId)
  const section = config?.[options.sectionKey] || {}

  return { user, courseId, cid, config, section, body }
}

/** 带 code 字段的 Error 子类，用于 handler 区分业务校验错误 */
export class SubmitContextError extends Error {
  code: string
  constructor(message: string, code: string = 'invalid') {
    super(message)
    this.code = code
  }
}
