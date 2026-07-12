<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'max-w-6xl' }" scrollable>
    <template #content>
      <div class="p-6 space-y-4 min-w-[600px]">
        <h3 class="text-lg font-semibold">{{ t('announcement.title') }}</h3>

        <CourseAnnouncementsModalCreateForm />
        <CourseAnnouncementsModalList />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps({
  courseId: { type: [String, Number], default: '' },
})


const isOpen = defineModel('open', { default: false })
const { t } = useI18n()

const ctx = useCourseAnnouncements(props, isOpen)
provideAnnouncements(ctx)
</script>
