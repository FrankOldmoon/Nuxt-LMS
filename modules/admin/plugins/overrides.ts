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
 * Table personalization override registration plugin
 *
 * Only registers override components for question/homework/comment/quiz/race tables when both lms and admin modules are enabled.
 * Override components import LMS components (render.vue / edit.vue), if lms is not enabled they are not registered or compiled,
 * to avoid build failures caused by missing LMS auto-imports like useLayoutState.
 *
 * All 5 tables use composite primary keys (courseId + cid), batch deletion requires dedicated endpoints.
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

  // chapters: content uses ueditorRender for preview, RichEditor for editing
  // Both accept course-id so internal nodes like question can load
  // chapters primary key is single-column id, not composite primary key
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
