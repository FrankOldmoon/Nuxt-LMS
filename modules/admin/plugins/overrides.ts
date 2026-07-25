import QuestionShow from '../overrides/QuestionShow.vue'
import QuestionForm from '../overrides/QuestionForm.vue'
import HomeworkShow from '../overrides/HomeworkShow.vue'
import HomeworkForm from '../overrides/HomeworkForm.vue'
import CommentShow from '../overrides/CommentShow.vue'
import CommentForm from '../overrides/CommentForm.vue'
import QuizShow from '../overrides/QuizShow.vue'
import QuizForm from '../overrides/QuizForm.vue'
import RaceShow from '../overrides/RaceShow.vue'
import RaceForm from '../overrides/RaceForm.vue'
import ChapterShow from '../overrides/ChapterShow.vue'
import ChapterForm from '../overrides/ChapterForm.vue'

/**
 * 表个性化覆盖注册插件
 *
 * 仅当 lms 与 admin 模块同时启用时注册 question/homework/comment/quiz/race 表的覆盖组件。
 * 覆盖组件 import LMS 组件（render.vue / edit.vue），若 lms 未启用则不注册、不编译，
 * 避免 useLayoutState 等 LMS 自动导入缺失导致 build 失败。
 *
 * 所有 5 个表都是复合主键（courseId + cid），批量删除需走专用端点。
 */
export default defineNuxtPlugin(() => {
  const { moduleLms, moduleAdmin } = useRuntimeConfig().public
  if (!moduleLms || !moduleAdmin) return

  // questions
  registerTableOverride('questions', {
    show: QuestionShow,
    form: QuestionForm,
    delete: async (rows, action) => {
      return await cRequest('/api/questions/batch', {
        method: 'POST',
        body: {
          rows: rows.map((r) => ({ courseId: Number(r.courseId), cid: Number(r.cid) })),
          action,
        },
      })
    },
  })

  // chapters: content 用 ueditorRender 预览、用 RichEditor 编辑
  // 两者都接收 course-id 让内部 question 等节点能加载
  // chapters 主键是单列 id，不是复合主键
  registerTableOverride('chapters', {
    show: ChapterShow,
    form: ChapterForm,
    delete: async (rows, action) => {
      return await cRequest('/api/chapters/batch', {
        method: 'POST',
        body: {
          ids: rows.map((r) => Number(r.id)),
          action,
        },
      })
    },
  })

  // homeworks
  registerTableOverride('homeworks', {
    show: HomeworkShow,
    form: HomeworkForm,
    delete: async (rows, action) => {
      return await cRequest('/api/homeworks/batch', {
        method: 'POST',
        body: {
          rows: rows.map((r) => ({ courseId: Number(r.courseId), cid: Number(r.cid) })),
          action,
        },
      })
    },
  })

  // comments
  registerTableOverride('comments', {
    show: CommentShow,
    form: CommentForm,
    delete: async (rows, action) => {
      return await cRequest('/api/comments/batch', {
        method: 'POST',
        body: {
          rows: rows.map((r) => ({ courseId: Number(r.courseId), cid: Number(r.cid) })),
          action,
        },
      })
    },
  })

  // quizzes
  registerTableOverride('quizzes', {
    show: QuizShow,
    form: QuizForm,
    delete: async (rows, action) => {
      return await cRequest('/api/quizzes/batch', {
        method: 'POST',
        body: {
          rows: rows.map((r) => ({ courseId: Number(r.courseId), cid: Number(r.cid) })),
          action,
        },
      })
    },
  })

  // races
  registerTableOverride('races', {
    show: RaceShow,
    form: RaceForm,
    delete: async (rows, action) => {
      return await cRequest('/api/races/batch', {
        method: 'POST',
        body: {
          rows: rows.map((r) => ({ courseId: Number(r.courseId), cid: Number(r.cid) })),
          action,
        },
      })
    },
  })
})
