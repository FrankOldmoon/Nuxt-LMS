<template>
  <section
    :id="section.id"
  >
    <!-- systemcolumnsTitle -->
    <div class="flex items-center gap-3 mb-6 scroll-mt-20">
      <div class="flex items-center justify-center size-10 rounded-lg bg-primary/10">
        <UIcon :name="section.icon" class="size-5 text-primary" />
      </div>
      <h2 class="text-2xl font-semibold text-highlighted">
        {{ section.title }}
      </h2>
      <span class="text-sm text-muted">
        {{ $t('home.courses', { count: courses.length }) }}
      </span>
    </div>

    <!-- Course Cardgrid（grid mode 3 columns；list mode singlecolumns） -->
    <div
      v-if="viewMode === 'list'"
      class="flex flex-col gap-3"
    >
      <CourseCard
        v-for="course in courses"
        :key="course.id"
        :course="course"
        :highlight="isCourseTeacher(course.id)"
      />
    </div>
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <CourseCard
        v-for="course in courses"
        :key="course.id"
        :course="course"
        :highlight="isCourseTeacher(course.id)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { LmsCourseSummary, LmsSeries } from '#lms/types/lms'

const props = defineProps<{
  section: LmsSeries
  courses: LmsCourseSummary[]
  viewMode?: string
}>()

const { isCourseTeacher } = useAuthLms()
</script>
