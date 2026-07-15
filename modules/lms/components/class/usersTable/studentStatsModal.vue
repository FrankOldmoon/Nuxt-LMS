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
  /** Current selected student id (number or string) */
  userId: { type: [Number, String], default: 0 },
  /** Course id */
  courseId: { type: [Number, String], default: 0 },
  /** Class id (used to fetch student list by class) */
  classId: { type: [Number, String], default: 0 },
  /** Student info (used to display avatar/name in title, optional) */
  user: { type: Object, default: () => null },
})

const isOpen = defineModel('open', { default: false })
const { t } = useI18n()

const ctx = useStudentGrades({
  courseId: computed(() => Number(props.courseId) || 0),
  userId: computed(() => Number(props.userId) || 0),
  classId: computed(() => Number(props.classId) || 0),
}, isOpen)
const { pending } = ctx
provideStudentGrades(ctx)
// Also expose via useGradesContext shape so studentStats.vue can access consistently
provideGrades({
  ...ctx,
  // studentStats.vue only reads statCards / radarOption, already provided in ctx
  // Fallback: fill in fields only used by gradesModal to avoid errors on future misuse
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
  saveExtraScore: async () => {},
  extraScoreSaving: ref(null),
})
</script>
