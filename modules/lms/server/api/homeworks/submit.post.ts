/**
 * 作业提交
 * POST /api/homeworks/submit
 * body: { course_id, chapter_id?, homework_cid, files?, content? }
 *
 * 防刷策略（详见 utils/submit/homework.ts）：
 *  - 首次提交：给 submitExp 经验
 *  - 重提交：在 resubmitCount 限额内给 resubmitExp，超出后 gainedExp=0
 *  - 作业分数由教师批改后通过 score API 更新（此处只更新经验）
 *  - 提交次数记录在 userHomeworks.record._submitCount 内部字段
 */
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { parseSubmitContext } from '../../utils/submit/context'
import { findUserSubmitRecord } from '../../utils/submit/record'
import { notifyCourseProgress, notifyParentCourse } from '../../utils/submit/progress'
import { withSubmitHandler } from '../../utils/submit/handler'

export default withSubmitHandler('提交作业失败', async (event) => {
  const ctx = await parseSubmitContext(event, {
    cidField: 'homework_cid',
    sectionKey: 'homework',
  })
  const { user, courseId, cid: homeworkCid, section: hConfig, body } = ctx

  const { files, content } = body
  const maxResubmitCount = Number(hConfig.maxResubmitCount ?? 3)

  // 1. 查找已有记录
  const existing = await findUserSubmitRecord(user.id, courseId, 'homework', homeworkCid)
  const recordMeta: any = (existing?.record && typeof existing.record === 'object') ? existing.record : {}
  const prevResubmitCount = Number(recordMeta._submitCount || 0)
  const nextResubmitCount = prevResubmitCount + 1

  // 2. 计算经验值 + 金币
  let gainedExp: number
  let gainedCoin: number
  if (!existing) {
    gainedExp = hConfig.submitExp
    gainedCoin = hConfig.submitCoin
  } else if (nextResubmitCount > maxResubmitCount) {
    gainedExp = 0
    gainedCoin = 0
  } else {
    gainedExp = hConfig.resubmitExp
    gainedCoin = hConfig.resubmitCoin
  }

  // 3. 写 userHomeworks
  const writeValues = {
    userId: user.id,
    courseId,
    homeworkCid: Number(homeworkCid),
    files: files || null,
    content: content || null,
    // 首次提交 _submitCount=0；重提交在原记录上 +1
    record: existing ? { ...recordMeta, _submitCount: nextResubmitCount } : { _submitCount: 0 },
  }
  if (existing) {
    await db.update(schema.userHomeworks).set({
      files: writeValues.files,
      content: writeValues.content,
      record: writeValues.record,
    }).where(and(
      eq(schema.userHomeworks.userId, user.id),
      eq(schema.userHomeworks.courseId, courseId),
      eq(schema.userHomeworks.homeworkCid, Number(homeworkCid)),
    ))
  } else {
    // upsert：学生此前可能已被教师打过「仅评分」（record 为空）而存在行，避免主键冲突。
    // set 仅覆盖提交字段，保留教师写入的 score/comment/excellent。
    await db.insert(schema.userHomeworks).values(writeValues).onConflictDoUpdate({
      target: [
        schema.userHomeworks.userId,
        schema.userHomeworks.courseId,
        schema.userHomeworks.homeworkCid,
      ],
      set: {
        files: writeValues.files,
        content: writeValues.content,
        record: writeValues.record,
      },
    })
  }

  // 4. 更新 userCourses.exp + coin + 首次提交章节分；作业分数 = 首次提交章节分，经验/金币 = gained
  const chapterId = Number(ctx.body.chapter_id) || 0
  const submitScore = !existing ? (Number(hConfig.chapterScore) || 0) : 0
  if (chapterId && submitScore > 0) {
    await addChapterScore(user.id, chapterId, submitScore)
  }
  await notifyCourseProgress({
    userId: user.id,
    courseId,
    score: submitScore,
    scoreKey: 'homeworkScore',
    exp: gainedExp,
    coin: gainedCoin,
  })

  // 4.5 被其他课程 iframe 嵌入时，将经验/金币镜像给宿主课程
  const parentCourseId = Number(body.parent_course_id) || 0
  if (parentCourseId && parentCourseId !== courseId) {
    await notifyParentCourse({
      userId: user.id,
      parentCourseId,
      selfCourseId: courseId,
      score: submitScore,
      scoreKey: 'homeworkScore',
      exp: gainedExp,
      coin: gainedCoin,
    })
  }

  // 5. 向班级房间广播 danmaku（fire-and-forget，不影响响应）
  void broadcastSubmitDanmaku({
    userId: user.id,
    kind: 'homework',
    gainedExp,
    gainedCoin,
  })

  return cResp({ gainedExp, gainedCoin })
})
