<template>
  <div class="p-4">
    <!-- Edit mode: directly render HomeworkEdit inline panel -->
    <ClientOnly v-if="props.row">
      <HomeworkEdit
        :homework-id="Number(props.row.cid) || 0"
        :homework="props.row"
        :course-id="props.row.courseId"
        @saved="onSaved"
      />
      <template #fallback><div class="py-8 text-center text-muted text-sm">Loading...</div></template>
    </ClientOnly>

    <!-- Add mode: select course first, then render HomeworkEdit -->
    <template v-else>
      <div v-if="!selectedCourseId" class="space-y-3">
        <h3 class="text-base font-semibold">{{ t('admin.form.selectCourse') }}</h3>
        <USelectMenu
          v-model="selectedCourseId"
          :items="courseOptions"
          value-key="id"
          option-attribute="label"
          :placeholder="t('admin.form.selectCourse')"
          :loading="courseLoading"
          searchable
          size="sm"
          class="w-full"
        />
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" :label="t('admin.form.cancel')" @click="$emit('cancel')" />
        </div>
      </div>
      <ClientOnly v-else>
        <HomeworkEdit
          :homework-id="0"
          :course-id="selectedCourseId || undefined"
          @saved="onSaved"
        />
        <template #fallback><div class="py-8 text-center text-muted text-sm">Loading...</div></template>
      </ClientOnly>
    </template>
  </div>
</template>

<script setup lang="ts">
import HomeworkEdit from '../../lms/components/ueditor/extensions/nodes/vue/homework/edit.vue'

const props = defineProps<{
  row: Record<string, any> | null
}>()

const emit = defineEmits<{
  saved: [data: any]
  cancel: []
}>()

const { t } = useI18n()

// Course selection (add mode)
const selectedCourseId = ref<number | null>(null)
const courseOptions = ref<{ id: number; label: string }[]>([])
const courseLoading = ref(false)

onMounted(async () => {
  if (!props.row) {
    courseLoading.value = true
    try {
      const opts = await cRequest<{ id: number; label: string }[]>(
        '/api/admin/fk-options?table=courses&label=name',
      )
      courseOptions.value = opts || []
    } catch {
      courseOptions.value = []
    } finally {
      courseLoading.value = false
    }
  }
})

function onSaved(data: any) {
  emit('saved', data)
}
</script>
