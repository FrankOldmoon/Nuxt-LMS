/**
 * Submit API common context parsing
 *
 * Extracts what all submit/award APIs have in common:
 *  - requireAuth
 *  - readBody
 *  - course_id required validation + Number() conversion
 *  - Specified cid field required validation + Number() conversion
 *  - getCourseLmsConfig + get xxxConfig sub-section
 *
 * The caller only needs to specify the cid field name (question_cid / homework_cid / quiz_cid / race_cid),
 * the returned ctx.cid is the standardized numeric cid, which can be directly used for findFirst / insert / update.
 *
 * Note: getCourseLmsConfig is introduced via Nuxt auto-import (not explicitly imported),
 *     so in the test environment it can be overridden by a mock injected via globalThis.
 */

export interface SubmitContext {
  user: { id: number; roles: string[]; [k: string]: any }
  courseId: number
  cid: number
  config: any
  /** Sub-section of the course LMS config (config.question / config.homework / config.quiz / config.race) */
  section: any
  body: any
}

export interface SubmitContextOptions {
  /** cid field name in body, e.g. 'question_cid' / 'homework_cid' / 'quiz_cid' / 'race_cid' */
  cidField: string
  /** LMS config sub-section name, e.g. 'question' / 'homework' / 'quiz' / 'race' */
  sectionKey: string
  /** Prompt message returned when cid is missing */
  cidMissingMessage?: string
}

/**
 * Parse the submit context from the event.
 * Throws directly when course_id or cid is missing, uniformly caught and returned as cResp by withSubmitHandler.
 */
export async function parseSubmitContext(
  event: any,
  options: SubmitContextOptions,
): Promise<SubmitContext> {
  const cidMissingMessage = options.cidMissingMessage || `Missing ${options.cidField} parameter`

  const user = await requireAuth(event)
  const body = await readBody(event)
  const { course_id } = body
  if (!course_id) {
    throw new SubmitContextError('Missing course_id parameter')
  }
  const cidRaw = body[options.cidField]
  if (cidRaw === undefined || cidRaw === null || cidRaw === '') {
    throw new SubmitContextError(cidMissingMessage)
  }

  const courseId = Number(course_id)
  const cid = Number(cidRaw)
  if (!courseId) throw new SubmitContextError('Invalid course_id')
  if (!cid) throw new SubmitContextError(`Invalid ${options.cidField}`)

  // getCourseLmsConfig is introduced via Nuxt auto-import, can be mocked via globalThis in tests
  const config = await getCourseLmsConfig(courseId)
  const section = config?.[options.sectionKey] || {}

  return { user, courseId, cid, config, section, body }
}

/** Error subclass with a code field, used by the handler to distinguish business validation errors */
export class SubmitContextError extends Error {
  code: string
  constructor(message: string, code: string = 'invalid') {
    super(message)
    this.code = code
  }
}
