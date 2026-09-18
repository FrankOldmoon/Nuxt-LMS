import { defineAsyncComponent } from 'vue'

/**
 * 表个性化覆盖注册插件
 *
 * 仅当 lms 与 admin 模块同时启用时注册 question/homework/comment/quiz/race 表的覆盖组件。
 * 覆盖组件 import LMS 组件（render.vue / edit.vue），若 lms 未启用则不注册、不编译，
 * 避免 useLayoutState 等 LMS 自动导入缺失导致 build 失败。
 *
 * 所有 5 个表都是复合主键（courseId + cid），批量删除需走专用端点。
 *
 * ⚠️ 性能：以下覆盖组件**必须**用 defineAsyncComponent 动态导入，不能写在文件顶部静态 import。
 * 原因：ChapterShow/ChapterForm 等 → ueditorRender → useNodeDispatcher 会牵出
 * 富文本编辑器内核（tiptap/ProseMirror）、katex、lowlight、phaser、monaco 等重依赖；
 * 静态 import 时整棵依赖树会被打进**入口 chunk**（实测入口因此达到 5.4 MB / brotli 1.16 MB，
 * 连学生看首页都要下载编辑器内核）。改懒加载后它们各自成独立 chunk，只有管理员真正
 * 打开对应表格的预览/编辑时才下载。
 *
 * 例外：feedbacks 的预览/单元格组件很轻（base64 图片），保持静态 import 以保证 SSR 直出。
 */
import FeedbackShow from '../overrides/FeedbackShow.vue'
import FeedbackContentCell from '../overrides/FeedbackContentCell.vue'

const QuestionShow = defineAsyncComponent(() => import('../overrides/QuestionShow.vue'))
const QuestionForm = defineAsyncComponent(() => import('../overrides/QuestionForm.vue'))
const HomeworkShow = defineAsyncComponent(() => import('../overrides/HomeworkShow.vue'))
const HomeworkForm = defineAsyncComponent(() => import('../overrides/HomeworkForm.vue'))
const CommentShow = defineAsyncComponent(() => import('../overrides/CommentShow.vue'))
const CommentForm = defineAsyncComponent(() => import('../overrides/CommentForm.vue'))
const QuizShow = defineAsyncComponent(() => import('../overrides/QuizShow.vue'))
const QuizForm = defineAsyncComponent(() => import('../overrides/QuizForm.vue'))
const RaceShow = defineAsyncComponent(() => import('../overrides/RaceShow.vue'))
const RaceForm = defineAsyncComponent(() => import('../overrides/RaceForm.vue'))
const ChapterShow = defineAsyncComponent(() => import('../overrides/ChapterShow.vue'))
const ChapterForm = defineAsyncComponent(() => import('../overrides/ChapterForm.vue'))

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

  // feedbacks: 用户反馈只读预览（无新增/编辑/删除/导入），content 为 base64 图片
  registerTableOverride('feedbacks', {
    readOnly: true,
    show: FeedbackShow,
    cell: { content: FeedbackContentCell },
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
