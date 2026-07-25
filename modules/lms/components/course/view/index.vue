<template>
  <div v-if="course" class="flex flex-col gap-10">
    <CourseViewHeader
      :course="course" :can-edit="canEdit" :course-id="courseId"
      :first-chapter-url="firstChapterUrl" :exporting="exporting"
      @saved="emit('saved')" @export="emit('export')"
    >
      <template #header-extra="scope"><slot name="header-extra" v-bind="scope" /></template>
      <template #teachers-extra="scope"><slot name="teachers-extra" v-bind="scope" /></template>
    </CourseViewHeader>

    <!-- 教师团队 -->
    <div v-if="course.teachers?.length || canManageTeachers" id="teachers">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-semibold text-highlighted">{{ $t('course.teachingTeam') }}</h2>
        <UButton v-if="canManageTeachers" :label="$t('course.manageTeachers')" icon="i-lucide-users"
          color="primary" variant="outline" size="sm" @click="openTeachersModal" />
      </div>
      <div v-if="course.teachers?.length" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div v-for="teacher in course.teachers" :key="teacher.userId"
          class="flex items-center gap-3 p-3 rounded-xl border border-default">
          <UAvatar :src="teacher.avatarImg || undefined" :alt="teacher.name" size="md" :text="teacher.name?.charAt(0)" />
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">{{ teacher.name }}</p>
            <p class="text-xs text-muted truncate">{{ teacher.username }}</p>
          </div>
        </div>
      </div>
      <p v-else class="text-sm text-muted text-center py-4">{{ $t('course.noTeachers') }}</p>
    </div>

    <!-- 教师管理弹窗 -->
    <UModal v-model:open="teachersModalOpen" :ui="{ content: 'sm:max-w-2xl' }">
      <template #content>
        <div class="p-6 max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">{{ $t('course.manageTeachers') }}</h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm"
              @click="closeTeachersModal" />
          </div>
          <CourseEditorMembersManager ref="membersEl" :course-id="Number(courseId)" />
        </div>
      </template>
    </UModal>

    <!-- 课程内容 -->
    <div v-if="hasContent">
      <h2 class="text-2xl font-semibold text-highlighted mb-6">{{ $t('course.aboutCourse') }}</h2>
      <UeditorRender :json="course.content" />
    </div>

    <!-- 章节目录 -->
    <div>
      <h2 id="chapters" class="text-2xl font-semibold text-highlighted mb-6 scroll-mt-20">
        {{ $t('course.chapterList') }}
      </h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <template v-for="(item, index) in chapterTree" :key="item.id">
          <slot name="chapter-item" :item="item" :index="index">
            <NuxtLink :to="item.to" class="group block">
              <UCard class="transition-all h-full hover:ring-2 hover:ring-primary/30"
                :ui="{ body: 'flex items-center gap-4' }">
                <div class="flex items-center justify-center size-10 rounded-lg bg-elevated shrink-0 font-bold text-muted">
                  {{ String(Number(index) + 1).padStart(2, '0') }}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-base font-medium text-highlighted">{{ item.label }}</h3>
                </div>
                <UIcon name="i-lucide-arrow-right"
                  class="size-5 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
              </UCard>
            </NuxtLink>
          </slot>
        </template>
      </div>
    </div>
  </div>

  <!-- 课程不存在 -->
  <div v-else-if="!pending" class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
    <p class="text-lg text-muted mb-4">{{ $t('course.notFound') }}</p>
    <UButton to="/" :label="$t('course.backToHome')" color="primary" variant="outline" />
  </div>
</template>

<script setup lang="ts">
import type { CourseViewProps } from '../../../composables/useCourseView'

const props = defineProps<CourseViewProps>()
const emit = defineEmits<{ saved: [], export: [] }>()

const { teachersModalOpen, membersEl, openTeachersModal, closeTeachersModal } = useCourseView(props, emit)
</script>
