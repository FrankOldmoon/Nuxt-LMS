<template>
  <NuxtLink :to="`/course/${course.id}`" class="group block relative">
    <UCard
      class="h-full transition-all hover:ring-2 hover:ring-primary/50 hover:shadow-lg overflow-hidden"
      :class="highlight ? 'ring-2 ring-primary/30 shadow-lg shadow-primary/10' : ''"
      :ui="{ body: 'flex flex-col h-full p-0' }"
    >
      <!-- Cover Imageimage area -->
      <div class="relative aspect-16/10 overflow-hidden bg-elevated">
        <img
          v-if="course.coverImg"
          :src="course.coverImg"
          :alt="course.title"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div
          v-else
          class="flex items-center justify-center w-full h-full"
          :class="colorBgClass(course.color)"
        >
          <UIcon :name="course.icon" class="size-12" :class="colorTextClass(course.color)" />
        </div>
        <!-- difficultyTagoverlayImage top-right corner -->
        <div class="absolute top-3 left-3">
          <UBadge
            :label="course.level"
            :color="levelColor(course.level)"
            variant="subtle"
            size="sm"
          />
        </div>
      </div>

      <!-- Contentarea -->
      <div class="p-4 flex flex-col flex-1">
        <!-- Title -->
        <h3 class="text-lg font-semibold text-highlighted mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {{ course.title }}
        </h3>

        <!-- Tag -->
        <div v-if="course.tags?.length" class="flex flex-wrap gap-1.5 mb-4">
          <UBadge
            v-for="tag in course.tags"
            :key="tag"
            :label="tag"
            color="neutral"
            variant="outline"
            size="sm"
          />
        </div>

        <!-- TeacherInfo -->
        <div v-if="course.teachers?.length" class="flex items-center gap-2 mb-4">
          <div class="flex -space-x-2">
            <img
              v-for="teacher in course.teachers.slice(0, 4)"
              :key="teacher.userId"
              :src="teacher.avatarImg || ''"
              :alt="teacher.name"
              class="size-7 rounded-full border-2 border-default object-cover bg-elevated"
            />
            <div
              v-if="course.teachers.length > 4"
              class="size-7 rounded-full border-2 border-default bg-elevated flex items-center justify-center text-xs text-muted"
            >
              +{{ course.teachers.length - 4 }}
            </div>
          </div>
          <span class="text-xs text-muted truncate">{{ course.teachers.map(t => t.name).join('、') }}</span>
        </div>

        <!-- BottomInfo -->
        <div class="flex items-center justify-between pt-4 mt-auto border-t border-default">
          <span class="flex items-center gap-1.5 text-sm text-muted">
            <UIcon name="i-lucide-list-video" class="size-4" />
            {{ $t('home.chapters', { count: course.chapterCount }) }}
          </span>
          <span class="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
            {{ $t('home.startLearning') }}
            <UIcon name="i-lucide-arrow-right" class="size-4" />
          </span>
        </div>
      </div>
    </UCard>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { LmsCourseSummary } from '#lms/types/lms'

defineProps<{
  course: LmsCourseSummary
  highlight?: boolean
}>()
</script>
