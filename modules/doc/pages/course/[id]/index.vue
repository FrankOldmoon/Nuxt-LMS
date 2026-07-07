<template>
  <div v-if="course" class="flex flex-col gap-10">
    <div class="flex flex-col sm:flex-row gap-6 relative">
      <div v-if="canEdit" class="absolute top-0 right-0 z-10 flex items-center gap-1">
        <CourseEditor :course-id="Number(courseId)" @saved="handleSaved" />
        <UTooltip :text="$t('coursePanel.export')">
          <UButton icon="i-lucide-download" color="success" variant="soft" size="xs" :loading="exporting" @click="exportCourse" />
        </UTooltip>
      </div>

      <div class="w-full sm:w-80 shrink-0">
        <div class="aspect-16/10 rounded-2xl overflow-hidden bg-elevated">
          <img
            v-if="course.coverImg"
            :src="course.coverImg"
            :alt="course.title"
            class="w-full h-full object-cover"
          />
          <img
            v-else
            :src="`https://picsum.photos/seed/course${course.id}/640/400`"
            :alt="course.title"
            class="w-full h-full object-cover"
          />
        </div>
      </div>

      <div class="flex-1 min-w-0 flex flex-col gap-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <UBadge :label="course.level" :color="levelColor(course.level)" variant="subtle" size="sm" />
            <span class="text-sm text-muted">{{ $t('course.chapters', { count: course.chapters.length }) }}</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-highlighted">
            {{ course.title }}
          </h1>
        </div>

        <div v-if="course.tags?.length" class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="tag in course.tags"
            :key="tag"
            :label="tag"
            color="neutral"
            variant="outline"
            size="sm"
          />
        </div>

        <div v-if="course.teachers?.length" class="flex items-center gap-4 text-sm text-muted flex-wrap">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-chalkboard-teacher" class="size-4" />
            <div class="flex -space-x-2">
              <img
                v-for="teacher in course.teachers.slice(0, 5)"
                :key="teacher.userId"
                :src="teacher.avatarImg || ''"
                :alt="teacher.name"
                class="size-6 rounded-full border-2 border-default object-cover bg-elevated"
              />
              <div
                v-if="course.teachers.length > 5"
                class="size-6 rounded-full border-2 border-default bg-elevated flex items-center justify-center text-xs text-muted"
              >
                +{{ course.teachers.length - 5 }}
              </div>
            </div>
            <span>{{ course.teachers.map(t => t.name).join('、') }}</span>
          </div>
        </div>

        <div v-if="firstChapterUrl">
          <UButton
            :to="firstChapterUrl"
            :label="$t('course.startLearning')"
            icon="i-lucide-play"
            color="primary"
            size="lg"
            class="mt-2"
          />
        </div>
      </div>
    </div>

    <!-- 教师团队 -->
    <div v-if="course.teachers?.length || canManageTeachers" id="teachers">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-semibold text-highlighted">{{ $t('course.teachingTeam') }}</h2>
        <UButton
          v-if="canManageTeachers"
          :label="$t('course.manageTeachers')"
          icon="i-lucide-users-cog"
          color="neutral"
          variant="outline"
          size="sm"
          @click="teachersModalOpen = true"
        />
      </div>
      <div v-if="course.teachers?.length" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div
          v-for="teacher in course.teachers"
          :key="teacher.userId"
          class="flex items-center gap-3 p-3 rounded-xl border border-default"
        >
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
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="teachersModalOpen = false" />
          </div>
          <CourseEditorMembersManager ref="membersRef" :course-id="Number(courseId)" />
        </div>
      </template>
    </UModal>

    <div v-if="hasContent">
      <h2 class="text-2xl font-semibold text-highlighted mb-6">
        {{ $t('course.aboutCourse') }}
      </h2>
      <UeditorRender :json="course.content" />
    </div>

    <div>
      <h2 id="chapters" class="text-2xl font-semibold text-highlighted mb-6 scroll-mt-20">
        {{ $t('course.chapterList') }}
      </h2>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <NuxtLink
          v-for="(item, index) in chapterTree"
          :key="item.id"
          :to="item.to"
          class="group block"
        >
          <UCard
            class="transition-all h-full hover:ring-2 hover:ring-primary/30"
            :ui="{ body: 'flex items-center gap-4' }"
          >
            <div class="flex items-center justify-center size-10 rounded-lg bg-elevated shrink-0 font-bold text-muted">
              {{ String(index + 1).padStart(2, '0') }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-base font-medium text-highlighted">
                {{ item.label }}
              </h3>
            </div>
            <UIcon name="i-lucide-arrow-right" class="size-5 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
          </UCard>
        </NuxtLink>
      </div>
    </div>
  </div>

  <div v-else-if="!pending" class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
    <p class="text-lg text-muted mb-4">{{ $t('course.notFound') }}</p>
    <UButton to="/" :label="$t('course.backToHome')" color="primary" variant="outline" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const courseId = computed(() => route.params.id as string)
const apiUrl = computed(() => `/api/courses/show?id=${courseId.value}`)

const { pending, course, canEdit, hasContent, chapterTree, firstChapterUrl,
        exporting, exportCourse, handleSaved,
        teachersModalOpen, membersRef, canManageTeachers } =
  useCourseDetailPage(courseId, apiUrl)
</script>
