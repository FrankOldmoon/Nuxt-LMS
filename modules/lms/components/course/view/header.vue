<template>
  <!-- 课程头部：左图 + 右信息 -->
  <div class="flex flex-col sm:flex-row gap-6 relative">
    <!-- 右上角工具栏：3D 知识星系入口（所有登录用户）+ 编辑/导出（仅编辑者） -->
    <div class="absolute top-0 right-0 z-10 flex items-center gap-1">
      <UButton icon="i-lucide-orbit" color="primary" variant="soft" size="xs"
        :to="course3dUrl" :aria-label="$t('course3d.open3d')" :title="$t('course3d.open3d')" />
      <template v-if="canEdit">
        <CourseEditor :course-id="Number(courseId)" @saved="emit('saved')" />
        <UTooltip :text="$t('coursePanel.export')">
          <UButton icon="i-lucide-download" color="success" variant="soft" size="xs"
            :loading="exporting" @click="emit('export')" />
        </UTooltip>
      </template>
    </div>

    <!-- 左侧：课程封面 -->
    <div class="w-full sm:w-80 shrink-0">
      <div class="aspect-16/10 rounded-2xl overflow-hidden bg-elevated">
        <img v-if="course.coverImg" :src="course.coverImg" :alt="course.title" class="w-full h-full object-cover" />
        <img v-else :src="`https://picsum.photos/seed/course${course.id}/640/400`" :alt="course.title"
          class="w-full h-full object-cover" />
      </div>
    </div>

    <!-- 右侧：课程信息 -->
    <div class="flex-1 min-w-0 flex flex-col gap-4">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <UBadge :label="course.level" :color="levelColor(course.level)" variant="subtle" size="sm" />
          <span class="text-sm text-muted">{{ $t('course.chapters', { count: course.chapters.length }) }}</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold text-highlighted">{{ course.title }}</h1>
      </div>

      <div v-if="course.tags?.length" class="flex flex-wrap gap-1.5">
        <UBadge v-for="tag in course.tags" :key="tag" :label="tag" color="neutral" variant="outline" size="sm" />
      </div>

      <slot name="header-extra" :course="course" />

      <div v-if="course.teachers?.length || $slots['teachers-extra']" class="flex items-center gap-4 text-sm text-muted flex-wrap">
        <div v-if="course.teachers?.length" class="flex items-center gap-2">
          <UIcon name="i-lucide-user" class="size-4" />
          <div class="flex -space-x-2">
            <div v-for="teacher in course.teachers.slice(0, 5)" :key="teacher.userId"
              class="relative size-6 shrink-0">
              <img v-if="canViewAvatars" :src="teacher.avatarImg || ''" :alt="teacher.name"
                class="size-6 rounded-full border-2 border-default object-cover bg-elevated" />
              <div v-else
                class="size-6 rounded-full border-2 border-default bg-elevated flex items-center justify-center text-[10px] font-medium text-muted select-none">
                {{ teacher.name?.charAt(0) }}
              </div>
              <AvatarFrame v-if="canViewAvatars" :frame="teacher.avatarFrame" class="absolute inset-0 h-full w-full" />
            </div>
            <div v-if="course.teachers.length > 5"
              class="size-6 rounded-full border-2 border-default bg-elevated flex items-center justify-center text-xs text-muted">
              +{{ course.teachers.length - 5 }}
            </div>
          </div>
          <span>{{ course.teachers.map((t: any) => t.name).join('、') }}</span>
        </div>
        <slot name="teachers-extra" :course="course" />
      </div>

      <div v-if="firstChapterUrl || canEdit" class="flex items-center gap-2 mt-2">
        <UButton :label="$t('course.startLearning')" icon="i-lucide-play" color="primary" size="lg"
          :loading="creatingChapter" @click="startLearning" />
        <UButton :label="$t('mmo.title')" v-if="courseBtnsConfig.showMmo" icon="i-lucide-gamepad-2" color="neutral" variant="outline" size="lg"
          :to="mmoUrl" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface HeaderProps {
  course: any
  canEdit: boolean
  courseId: string | number
  firstChapterUrl?: string
  exporting: boolean
}

const props = defineProps<HeaderProps>()
const emit = defineEmits<{ saved: [], export: [] }>()

const { t } = useI18n()
const toast = useToast()
const { canViewAvatars } = useAuth()
const { courseBtnsConfig } = useLayoutState()
const creatingChapter = ref(false)
const mmoUrl = computed(() => `/course/${Number(props.courseId)}/mmo`)
const course3dUrl = computed(() => `/course/${Number(props.courseId)}/3d`)

async function startLearning() {
  if (props.firstChapterUrl) {
    await navigateTo(props.firstChapterUrl)
    return
  }
  if (!props.canEdit) return
  creatingChapter.value = true
  try {
    const resp = await cRequest<any[]>('/api/chapters/add', {
      method: 'POST',
      body: { name: t('course.untitledChapter'), courseId: Number(props.courseId), isOpen: true },
    })
    if (resp?.length) {
      window.location.href = `/course/${props.courseId}/${resp[0]!.id}`
    }
  } catch (err: any) {
    toast.add({ title: t('common.operationFailed'), description: err?.message || String(err), color: 'error' })
  } finally {
    creatingChapter.value = false
  }
}
</script>
