<template>
  <UModal v-model:open="open" scrollable :ui="{ content: 'w-[80vw] max-w-[80vw]' }">
    <template #content>
      <div class="p-6 w-full">
        <h3 class="text-lg font-semibold mb-4">{{ $t('classSelector.selectClass') }}</h3>

        <!-- Loading -->
        <div v-if="classLoading || myClassLoading" class="py-8 text-center text-muted text-sm">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-5 inline-block" />
        </div>

        <!-- Studentmode：singleClass -->
        <ClassModalStudentMode v-else-if="studentMode" />

        <!-- management mode（admin/teacher） -->
        <ClassModalAdminMode v-else />
      </div>

      <div class="flex justify-end gap-2 pt-4 mt-4 border-t border-default">
        <UButton :label="$t('common.cancel')" color="neutral" variant="ghost" size="sm" @click="close" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

const ctx = useClassModal(open)
provideClassModal(ctx)

const { classLoading, myClassLoading, studentMode } = ctx

function close() {
  open.value = false
}
</script>
