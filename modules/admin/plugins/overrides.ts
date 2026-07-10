import QuestionShow from '../overrides/QuestionShow.vue'
import QuestionForm from '../overrides/QuestionForm.vue'

/**
 * 表个性化覆盖注册插件
 *
 * 仅当 lms 与 admin 模块同时启用时注册 question 表的覆盖组件。
 * 覆盖组件 import LMS 组件（render.vue / edit.vue），若 lms 未启用则不注册、不编译，
 * 避免 useLayoutState 等 LMS 自动导入缺失导致 build 失败。
 */
export default defineNuxtPlugin(() => {
  const { moduleLms, moduleAdmin } = useRuntimeConfig().public
  if (!moduleLms || !moduleAdmin) return
  registerTableOverride('questions', {
    show: QuestionShow,
    form: QuestionForm,
    // 复合主键（courseId + cid）表不能走通用 /api/crud/[table]/batch，
    // 注册 delete 覆盖调用 LMS 专用批量端点。
    delete: async (rows: Record<string, any>[], action: 'delete' | 'remove' | 'restore') => {
      return await cRequest('/api/questions/batch', {
        method: 'POST',
        body: {
          rows: rows.map((r) => ({ courseId: Number(r.courseId), cid: Number(r.cid) })),
          action,
        },
      })
    },
  })
})
