<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'max-w-2xl' }" scrollable>
    <template #content>
      <div class="p-6 space-y-4 min-w-[480px]">
        <div class="flex items-center gap-3">
          <UAvatar :src="user?.avatarImg || undefined" :alt="user?.name" size="sm" :text="user?.name?.charAt(0)" />
          <div class="min-w-0">
            <h3 class="text-base font-semibold truncate">{{ user?.name || t('classSelector.studentStatsTitle') }}</h3>
            <p v-if="user?.preferName" class="text-xs text-muted truncate">{{ user.preferName }}</p>
          </div>
          <UIcon v-if="pending" name="i-lucide-loader-2" class="size-4 animate-spin text-muted ml-auto" />
        </div>

        <CourseGradesModalStudentStats />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps({
  /** 当前选中学生 id（数字或字符串） */
  userId: { type: [Number, String], default: 0 },
  /** 课程 id */
  courseId: { type: [Number, String], default: 0 },
  /** 班级 id（用于按班级取学生列表） */
  classId: { type: [Number, String], default: 0 },
  /** 学生信息（用于在标题处显示头像/姓名，可选） */
  user: { type: Object, default: () => null },
})

const isOpen = defineModel('open', { default: false })
const { t } = useI18n()
// 父级不一定传 courseId（如班级管理弹窗/recordsModal），回退到课程上下文（route/课程页 provide）
const { courseId: ctxCourseId } = useLmsContext()
const effectiveCourseId = computed(() => Number(props.courseId) || ctxCourseId.value || 0)
console.log('[DEBUG studentStatsModal] setup: props.courseId=', props.courseId, 'ctxCourseId=', ctxCourseId.value, 'effectiveCourseId=', effectiveCourseId.value)

const ctx = useStudentGrades({
  courseId: effectiveCourseId,
  userId: computed(() => Number(props.userId) || 0),
  classId: computed(() => Number(props.classId) || 0),
}, isOpen)
const { pending } = ctx
provideStudentGrades(ctx)
// 同时用 useGradesContext 形状暴露，让 studentStats.vue 内部可一致访问
provideGrades({
  ...ctx,
  // studentStats.vue 仅读取 statCards / radarOption，已在 ctx 中提供
  // 兜底：补齐 gradesModal 才用到的字段，避免未来误用时报错
  rows: ref([]),
  extraColumns: ref([]),
  defaultSort: [{ id: 'total', desc: true }],
  buildRows: () => {},
  loadData: ctx.loadData,
  canEdit: ref(true),
  gradeCriteria: ref(null),
  effectiveCriteria: computed(() => ({ weights: [], levels: [] })),
  criteriaDirty: ref(false),
  computeGrade: () => ({ letter: '-', finalScore: 0 }),
  saveCriteria: async () => {},
  resetCriteria: () => {},
  saveExternalScore: async () => {},
  externalScoreSaving: ref(null),
})
</script>
